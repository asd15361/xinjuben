/**
 * 剧本生成路由
 *
 * POST /api/script-generation/start     - 启动整季生成
 * POST /api/script-generation/pause     - 暂停当前生成
 * POST /api/script-generation/resume    - 恢复暂停的生成
 * POST /api/script-generation/stop      - 强制停止生成
 * POST /api/script-generation/rewrite   - 单集重写
 */

import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { CreditService } from '../../services/credit-service'
import { ProjectRepository } from '../../infrastructure/pocketbase/project-repository'
import { loadRuntimeProviderConfig, hasValidApiKey } from '../../infrastructure/runtime-env/provider-config'
import { buildScriptGenerationExecutionPlan } from '../../application/script-generation/build-execution-plan'
import { createInitialProgressBoard } from '../../application/script-generation/progress-board'
import { startScriptGeneration } from '../../application/script-generation/start-script-generation'
import type {
  ScriptGenerationProgressBoardDto,
  ScriptGenerationFailureResolutionDto,
  ScriptEpisodeStatusDto,
  StartScriptGenerationInputDto
} from '@shared/contracts/script-generation'
import type { ScriptSegmentDto } from '@shared/contracts/workflow'

export const scriptsRouter = Router()

const creditService = new CreditService()
const projectRepo = new ProjectRepository()

// Phase 8.2: 最大允许集数上限
const MAX_TARGET_EPISODES = 2

// ============================================================
// Type Extensions
// ============================================================

declare global {
  namespace Express {
    interface Request {
      creditDeduction?: {
        userId: string
        amount: number
      }
      user?: {
        id: string
        email: string
        name: string
      }
    }
  }
}

// ============================================================
// 后台任务追踪
// ============================================================

interface RunningTask {
  projectId: string
  userId: string
  status: 'running' | 'paused' | 'stopped' | 'completed' | 'failed'
  board: ScriptGenerationProgressBoardDto
  completedEpisodes: number
  totalEpisodes: number
  startedAt: Date
  abortController?: AbortController
}

const runningTasks = new Map<string, RunningTask>()

// ============================================================
// 积分扣费中间件（每集 1 积分）
// ============================================================

interface StartScriptRequest {
  projectId: string
  mode?: 'fresh_start' | 'resume'
  targetEpisodes?: number
}

async function checkCreditsMiddleware(req: Request, res: Response, next: Function) {
  if (!req.user) {
    res.status(401).json({ error: 'not_authenticated', message: '请先登录' })
    return
  }

  const body: StartScriptRequest = req.body
  const targetEpisodes = Math.min(body.targetEpisodes || MAX_TARGET_EPISODES, MAX_TARGET_EPISODES)

  try {
    const balance = await creditService.getBalance(req.user.id)
    const requiredCredits = targetEpisodes

    if (balance.balance < requiredCredits) {
      res.status(402).json({
        error: 'insufficient_credits',
        message: `积分不足，生成 ${targetEpisodes} 集剧本需要 ${requiredCredits} 积分，当前余额 ${balance.balance}`,
        balance: balance.balance,
        required: requiredCredits
      })
      return
    }

    req.creditDeduction = { userId: req.user.id, amount: requiredCredits }
    next()
  } catch (error) {
    res.status(500).json({ error: 'credit_check_failed', message: '积分检查失败' })
  }
}

// ============================================================
// 真实剧本生成 Worker（Phase 8.2）
// ============================================================

async function persistBoard(
  userId: string,
  projectId: string,
  board: ScriptGenerationProgressBoardDto,
  generatedScenes: StartScriptGenerationInputDto['existingScript'],
  failure?: ScriptGenerationFailureResolutionDto | null,
  ledger?: unknown | null
): Promise<void> {
  try {
    await projectRepo.saveScriptState({
      userId,
      projectId,
      scriptDraft: generatedScenes,
      scriptProgressBoard: board,
      scriptFailureResolution: failure ?? null,
      scriptStateLedger: (ledger as any) ?? null
    })
  } catch (err) {
    console.error('[ScriptGeneration] Failed to persist board:', err)
  }
}

async function launchScriptGenerationWorker(
  projectId: string,
  userId: string,
  targetEpisodes: number,
  mode: 'fresh_start' | 'resume' = 'fresh_start'
): Promise<ScriptGenerationProgressBoardDto> {
  const runtimeConfig = loadRuntimeProviderConfig()
  if (!hasValidApiKey(runtimeConfig)) {
    throw new Error('no_valid_api_key: 当前没有可用的 AI 通道，请检查环境变量配置。')
  }

  const snapshot = await projectRepo.getProject(userId, projectId)
  if (!snapshot) {
    throw new Error('project_not_found: 项目不存在。')
  }

  if (!snapshot.outlineDraft) {
    throw new Error('missing_outline: 项目缺少粗纲，无法启动剧本生成。')
  }
  if (!snapshot.characterDrafts || snapshot.characterDrafts.length === 0) {
    throw new Error('missing_characters: 项目缺少人物小传，无法启动剧本生成。')
  }
  if (!snapshot.detailedOutlineSegments || snapshot.detailedOutlineSegments.length === 0) {
    throw new Error('missing_detailed_outline: 项目缺少详细大纲，无法启动剧本生成。')
  }

  const plan = buildScriptGenerationExecutionPlan(
    {
      storyIntent: snapshot.storyIntent,
      outline: snapshot.outlineDraft,
      characters: snapshot.characterDrafts,
      segments: snapshot.detailedOutlineSegments,
      detailedOutlineBlocks: snapshot.detailedOutlineBlocks,
      script: snapshot.scriptDraft ?? []
    },
    { mode, targetEpisodes }
  )

  if (!plan.ready) {
    const blocked = plan.blockedBy.map((b) => b.code).join(', ')
    throw new Error(`plan_blocked: 执行计划不满足条件，被阻塞：${blocked}`)
  }

  const initialBoard = createInitialProgressBoard(plan, null)

  const task: RunningTask = {
    projectId,
    userId,
    status: 'running',
    board: initialBoard,
    completedEpisodes: 0,
    totalEpisodes: targetEpisodes,
    startedAt: new Date()
  }
  runningTasks.set(projectId, task)

  const existingScript = snapshot.scriptDraft ?? []

  const generationInput: StartScriptGenerationInputDto = {
    projectId,
    plan,
    outlineTitle: snapshot.outlineDraft.title || snapshot.name,
    theme: snapshot.storyIntent?.sellingPremise || '',
    mainConflict: snapshot.storyIntent?.coreConflict || '',
    charactersSummary: snapshot.characterDrafts.map((c) => c.name),
    storyIntent: snapshot.storyIntent,
    scriptControlPackage: plan.scriptControlPackage,
    outline: snapshot.outlineDraft,
    characters: snapshot.characterDrafts,
    entityStore: snapshot.entityStore,
    activeCharacterBlocks: snapshot.activeCharacterBlocks,
    segments: snapshot.detailedOutlineSegments,
    detailedOutlineBlocks: snapshot.detailedOutlineBlocks,
    existingScript
  }

  // 异步后台执行 - track generated scenes incrementally
  let incrementalScenes: ScriptSegmentDto[] = []
  ;(async () => {
    try {
      const result = await startScriptGeneration(
        generationInput,
        runtimeConfig,
        initialBoard,
        {
          outline: snapshot.outlineDraft!,
          characters: snapshot.characterDrafts,
          existingScript
        },
        {
          onProgress: async (payload) => {
            const currentTask = runningTasks.get(projectId)
            if (!currentTask) return

            currentTask.board = payload.board
            const completedCount = payload.board.episodeStatuses.filter(
              (e) => e.status === 'completed'
            ).length
            currentTask.completedEpisodes = completedCount

            // Only persist board during progress, scenes come from incrementalScenes
            const allScenes = [...existingScript, ...incrementalScenes]
            await persistBoard(
              userId,
              projectId,
              payload.board,
              allScenes,
              null,
              null
            )

            console.log(
              `[ScriptGeneration] projectId=${projectId} phase=${payload.phase} detail=${payload.detail}`
            )
          }
        }
      )

      const currentTask = runningTasks.get(projectId)
      if (currentTask) {
        currentTask.board = result.board
        currentTask.completedEpisodes = result.generatedScenes.length
        incrementalScenes = result.generatedScenes

        if (result.success) {
          currentTask.status = 'completed'
        } else {
          currentTask.status = 'failed'
        }
      }

      // 最终落盘：写入完整剧本 + board + ledger + failure
      const allScenes = [...existingScript, ...result.generatedScenes]
      await persistBoard(
        userId,
        projectId,
        result.board,
        allScenes,
        result.failure,
        result.ledger
      )

      // 成功后扣费：按实际完成的集数扣
      if (result.success && result.generatedScenes.length > 0) {
        const episodesToCharge = result.generatedScenes.length
        try {
          await creditService.deductCredits(userId, episodesToCharge, {
            task: 'script_generation',
            projectId,
            lane: plan.recommendedPrimaryLane,
            model: runtimeConfig.deepseek.model
          })
          console.log(
            `[ScriptGeneration] Charged ${episodesToCharge} credits for userId=${userId} projectId=${projectId}`
          )
        } catch (creditErr) {
          console.error('[ScriptGeneration] Credit deduction failed:', creditErr)
        }
      }

      console.log(
        `[ScriptGeneration] projectId=${projectId} finished success=${result.success} episodes=${result.generatedScenes.length}`
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error || 'unknown_error')
      console.error(`[ScriptGeneration] projectId=${projectId} fatal error: ${errorMessage}`)

      const currentTask = runningTasks.get(projectId)
      if (currentTask) {
        currentTask.status = 'failed'
      }
    }
  })()

  return initialBoard
}

// ============================================================
// 路由：POST /api/script-generation/start
// ============================================================

scriptsRouter.post(
  '/start',
  authMiddleware,
  checkCreditsMiddleware,
  async (req: Request, res: Response) => {
    const body: StartScriptRequest = req.body

    if (!body.projectId || typeof body.projectId !== 'string') {
      res.status(400).json({
        error: 'missing_project_id',
        message: '请提供项目 ID'
      })
      return
    }

    const existingTask = runningTasks.get(body.projectId)
    if (existingTask && existingTask.status === 'running') {
      res.status(409).json({
        error: 'already_running',
        message: '该项目已有生成任务正在运行'
      })
      return
    }

    const targetEpisodes = Math.min(body.targetEpisodes || MAX_TARGET_EPISODES, MAX_TARGET_EPISODES)
    const mode = body.mode || 'fresh_start'

    try {
      const initialBoard = await launchScriptGenerationWorker(
        body.projectId,
        req.user!.id,
        targetEpisodes,
        mode
      )

      res.status(202).json({
        success: true,
        taskId: body.projectId,
        board: initialBoard,
        status: 'running',
        message: `已启动 ${targetEpisodes} 集剧本生成任务，请通过 GET /api/projects/:projectId 轮询进度`
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error || 'unknown_error')
      const statusCode = errorMessage.includes('not_found') || errorMessage.includes('missing_')
        ? 400
        : errorMessage.includes('no_valid_api_key')
          ? 503
          : 500

      res.status(statusCode).json({
        error: 'script_generation_start_failed',
        message: errorMessage,
        success: false
      })
    }
  }
)

// ============================================================
// 路由：POST /api/script-generation/pause
// ============================================================

scriptsRouter.post(
  '/pause',
  authMiddleware,
  async (req: Request, res: Response) => {
    const { projectId } = req.body

    if (!projectId || typeof projectId !== 'string') {
      res.status(400).json({
        error: 'missing_project_id',
        message: '请提供项目 ID'
      })
      return
    }

    const task = runningTasks.get(projectId)
    if (!task) {
      res.status(404).json({
        error: 'task_not_found',
        message: '未找到该项目的生成任务'
      })
      return
    }

    if (task.status !== 'running') {
      res.status(400).json({
        error: 'cannot_pause',
        message: `当前任务状态为 ${task.status}，无法暂停`
      })
      return
    }

    task.status = 'paused'

    res.json({
      success: true,
      status: 'paused',
      message: `已暂停剧本生成，当前已完成 ${task.completedEpisodes}/${task.totalEpisodes} 集`,
      completedEpisodes: task.completedEpisodes,
      totalEpisodes: task.totalEpisodes
    })
  }
)

// ============================================================
// 路由：POST /api/script-generation/resume
// ============================================================

scriptsRouter.post(
  '/resume',
  authMiddleware,
  checkCreditsMiddleware,
  async (req: Request, res: Response) => {
    const { projectId } = req.body

    if (!projectId || typeof projectId !== 'string') {
      res.status(400).json({
        error: 'missing_project_id',
        message: '请提供项目 ID'
      })
      return
    }

    const task = runningTasks.get(projectId)
    if (!task) {
      res.status(404).json({
        error: 'task_not_found',
        message: '未找到该项目的生成任务'
      })
      return
    }

    if (task.status !== 'paused') {
      res.status(400).json({
        error: 'cannot_resume',
        message: `当前任务状态为 ${task.status}，无法恢复`
      })
      return
    }

    const remainingEpisodes = task.totalEpisodes - task.completedEpisodes
    try {
      const initialBoard = await launchScriptGenerationWorker(
        projectId,
        req.user!.id,
        remainingEpisodes,
        'resume'
      )

      res.status(202).json({
        success: true,
        taskId: projectId,
        board: initialBoard,
        status: 'running',
        message: `已恢复剧本生成，从第 ${task.completedEpisodes + 1} 集继续`,
        resumeFromEpisode: task.completedEpisodes + 1
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error || 'unknown_error')
      res.status(500).json({
        error: 'script_generation_resume_failed',
        message: errorMessage,
        success: false
      })
    }
  }
)

// ============================================================
// 路由：POST /api/script-generation/stop
// ============================================================

scriptsRouter.post(
  '/stop',
  authMiddleware,
  async (req: Request, res: Response) => {
    const { projectId } = req.body

    if (!projectId || typeof projectId !== 'string') {
      res.status(400).json({
        error: 'missing_project_id',
        message: '请提供项目 ID'
      })
      return
    }

    const task = runningTasks.get(projectId)
    if (!task) {
      res.status(404).json({
        error: 'task_not_found',
        message: '未找到该项目的生成任务'
      })
      return
    }

    task.status = 'stopped'

    res.json({
      success: true,
      status: 'stopped',
      message: `已强制停止剧本生成，当前已完成 ${task.completedEpisodes}/${task.totalEpisodes} 集`,
      completedEpisodes: task.completedEpisodes,
      totalEpisodes: task.totalEpisodes
    })
  }
)

// ============================================================
// 路由：POST /api/script-generation/rewrite
// ============================================================

scriptsRouter.post(
  '/rewrite',
  authMiddleware,
  async (req: Request, res: Response) => {
    const { projectId, episodeNo } = req.body

    if (!projectId || typeof projectId !== 'string') {
      res.status(400).json({
        error: 'missing_project_id',
        message: '请提供项目 ID'
      })
      return
    }

    if (!episodeNo || typeof episodeNo !== 'number' || episodeNo < 1) {
      res.status(400).json({
        error: 'invalid_episode_no',
        message: '请提供有效的集数（正整数）'
      })
      return
    }

    if (!req.user) {
      res.status(401).json({ error: 'not_authenticated', message: '请先登录' })
      return
    }

    try {
      const balance = await creditService.getBalance(req.user.id)
      if (balance.balance < 1) {
        res.status(402).json({
          error: 'insufficient_credits',
          message: `积分不足，单集重写需要 1 积分，当前余额 ${balance.balance}`,
          balance: balance.balance,
          required: 1
        })
        return
      }
    } catch (error) {
      res.status(500).json({ error: 'credit_check_failed', message: '积分检查失败' })
      return
    }

    // Phase 8.2: 单集重写暂未实现，返回占位
    res.status(202).json({
      success: true,
      message: `已启动第 ${episodeNo} 集重写任务（Phase 8.2 单集重写待实现）`,
      projectId,
      episodeNo
    })
  }
)

// ============================================================
// 路由：GET /api/script-generation/status (调试口)
// ============================================================

scriptsRouter.get(
  '/status/:projectId',
  authMiddleware,
  async (req: Request, res: Response) => {
    const { projectId } = req.params

    const task = runningTasks.get(projectId)
    if (!task) {
      res.status(404).json({
        error: 'task_not_found',
        message: '未找到该项目的生成任务'
      })
      return
    }

    res.json({
      projectId: task.projectId,
      userId: task.userId,
      status: task.status,
      totalEpisodes: task.totalEpisodes,
      completedEpisodes: task.completedEpisodes,
      startedAt: task.startedAt.toISOString(),
      board: task.board,
      progress: `${task.completedEpisodes}/${task.totalEpisodes} (${Math.round(task.completedEpisodes / task.totalEpisodes * 100)}%)`
    })
  }
)
