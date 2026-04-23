/**
 * Stage Contract 路由
 *
 * POST /api/stage/validate-contract - 阶段放行校验
 */
import { Router, type Request, type Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { ProjectRepository } from '../../infrastructure/pocketbase/project-repository'
import { validateStageInputContract } from '../../application/input-contract/validate-stage-input'
import type { StageContractType } from '@shared/contracts/stage-contract'

export const stageContractRouter = Router()

const projectRepository = new ProjectRepository()

function requireUser(
  req: Request,
  res: Response
): { id: string; email: string; name: string } | null {
  if (!req.user) {
    res.status(401).json({
      error: 'not_authenticated',
      message: '请先登录'
    })
    return null
  }
  return req.user
}

/**
 * POST /api/stage/validate-contract
 *
 * 阶段放行校验 - 判断是否可以进入下一阶段
 */
stageContractRouter.post('/validate-contract', authMiddleware, async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return

  const { projectId, targetStage } = req.body as {
    projectId: string
    targetStage: StageContractType
  }

  if (!projectId || typeof projectId !== 'string') {
    res.status(400).json({
      error: 'missing_project_id',
      message: '请提供项目 ID'
    })
    return
  }

  if (!targetStage || !['outline', 'character', 'detailed_outline', 'script'].includes(targetStage)) {
    res.status(400).json({
      error: 'invalid_target_stage',
      message: '请提供有效的目标阶段'
    })
    return
  }

  try {
    const project = await projectRepository.getProject(user.id, projectId)
    if (!project) {
      res.status(404).json({
        error: 'project_not_found',
        message: '项目不存在，或你没有权限访问'
      })
      return
    }

    const validation = validateStageInputContract(targetStage, {
      storyIntent: project.storyIntent,
      outline: project.outlineDraft ?? {
        title: '',
        genre: '',
        theme: '',
        mainConflict: '',
        protagonist: '',
        summary: '',
        summaryEpisodes: [],
        facts: []
      },
      characters: project.characterDrafts ?? [],
      segments: project.detailedOutlineSegments ?? [],
      // Script content is local-only; this contract currently validates upstream metadata only.
      script: []
    })

    res.json(validation)
  } catch (error) {
    console.error('[StageContract] validate-contract failed:', error)
    res.status(500).json({
      error: 'validate_contract_failed',
      message: error instanceof Error ? error.message : '阶段放行校验失败'
    })
  }
})
