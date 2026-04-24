/**
 * 执行单集重写
 *
 * 对指定集数进行重写，保持剧情事实和场次不变，基于 guard failures 进行针对性修复
 */
import type { RuntimeProviderConfig } from '../../../infrastructure/runtime-env/provider-config'
import { generateTextWithRuntimeRouter } from '../../ai/generate-text'
import type { ScriptSegmentDto, CharacterDraftDto, OutlineDraftDto } from '@shared/contracts/workflow'
import type { StoryIntentPackageDto } from '@shared/contracts/intake'
import type { ScriptStateLedgerDto } from '@shared/contracts/script-ledger'
import type { EpisodeGuardFailure } from '@shared/domain/script/screenplay-repair-guard'
import type { ScriptGenerationControlPackageDto } from '@shared/contracts/script-generation'
import { parseGeneratedScene } from '../runtime/parse-generated-scene'
import { buildScriptStateLedger } from '../ledger/build-script-ledger'
import { resolveAiStageTimeoutMs } from '../../ai/resolve-ai-stage-timeout'
import {
  buildStoryStateSnapshot,
  buildStoryStateSnapshotPromptBlock
} from '@shared/domain/short-drama/story-state-snapshot'
import { inspectStoryContinuityAgainstSnapshot } from '@shared/domain/script/screenplay-continuity-audit'

export interface ExecuteScriptRewriteInputDto {
  episodeNo: number
  existingScript: ScriptSegmentDto[]
  failures: EpisodeGuardFailure[]
  storyIntent: StoryIntentPackageDto | null | undefined
  outline: OutlineDraftDto | undefined
  characters: CharacterDraftDto[] | undefined
  projectId?: string
  outlineTitle?: string
  theme?: string
  mainConflict?: string
  targetEpisodes?: number
  scriptControlPackage?: ScriptGenerationControlPackageDto
}

export interface ExecuteScriptRewriteResultDto {
  rewrittenScene: ScriptSegmentDto
  ledger: ScriptStateLedgerDto | null
}

/**
 * 计算场景中实际包含的场数
 */
function resolveRewriteSceneCount(scene: ScriptSegmentDto): number {
  if (scene.screenplayScenes && scene.screenplayScenes.length > 0) {
    return scene.screenplayScenes.length
  }
  const headingMatches = scene.screenplay?.match(/(?:^|\n)\d+-\d+\s+/g) || []
  return Math.max(headingMatches.length, 1)
}

/**
 * 构建 guard failure 问题单
 */
function buildEpisodeIssueTicket(
  scene: ScriptSegmentDto,
  failures: EpisodeGuardFailure[]
): string[] {
  const lines: string[] = []

  if (failures.length === 0) {
    lines.push('【无明确问题单】')
    lines.push('用户要求重写这一集，但没有明确的问题列表。')
    lines.push('请保持剧情和场次不变，提升整体质量。')
    return lines
  }

  lines.push('【问题单】')
  lines.push(`共 ${failures.length} 个问题需要修复：`)
  lines.push('')

  for (let i = 0; i < failures.length; i++) {
    const failure = failures[i]
    lines.push(`${i + 1}. [${failure.code}] ${failure.detail}`)
  }

  return lines
}

/**
 * 构建连续性约束提示块
 */
function buildContinuityConstraintBlock(
  auditResult: ReturnType<typeof inspectStoryContinuityAgainstSnapshot>
): string[] {
  if (auditResult.issues.length === 0) return []

  const lines: string[] = []
  lines.push('【连续性约束】')
  lines.push(`连续性问题：共 ${auditResult.issues.length} 项，分数 ${auditResult.score}/100`)
  lines.push('')

  for (let i = 0; i < auditResult.issues.length; i++) {
    const issue = auditResult.issues[i]
    lines.push(`${i + 1}. [${issue.severity === 'high' ? '严重' : issue.severity === 'medium' ? '中等' : '轻微'}] ${issue.detail}`)
    if (issue.evidence.length > 0) {
      lines.push(`   证据：${issue.evidence.join(' / ')}`)
    }
  }

  lines.push('')
  lines.push('修稿时必须确保以上连续性错误被修复，不得穿帮。')
  lines.push('')

  return lines
}

/**
 * 构建单集重写 prompt
 */
function buildEpisodeRewritePrompt(input: {
  targetScene: ScriptSegmentDto
  failures: EpisodeGuardFailure[]
  storyIntent: StoryIntentPackageDto | null | undefined
  outline: OutlineDraftDto | undefined
  characters: CharacterDraftDto[] | undefined
  ledger: ScriptStateLedgerDto | null
  projectId?: string
  outlineTitle?: string
  theme?: string
  mainConflict?: string
  targetEpisodes?: number
  scriptControlPackage?: ScriptGenerationControlPackageDto
}): string {
  const { targetScene, failures, storyIntent, outline, characters, ledger, projectId, outlineTitle, theme, mainConflict, targetEpisodes, scriptControlPackage } = input
  const sceneCount = resolveRewriteSceneCount(targetScene)

  const lines: string[] = []

  // 开场白
  lines.push(`你现在不是从零创作第 ${targetScene.sceneNo} 集，而是在修改上一版已经写出的成稿。`)
  lines.push('任务只有一个：在不改剧情事实、不改场次、不改承接关系的前提下，把它按问题单修回正式合同。')
  lines.push('')

  // 改稿任务
  lines.push('【上一版成稿改稿任务】')
  lines.push(`- 当前是第 ${targetScene.sceneNo} 集的自动改稿，而且这次只自动改这一次。`)
  lines.push(`- 当前场数 ${sceneCount} 场，场数和剧情事实必须保持不变。`)
  lines.push('- 你不是整集瞎重写，而是对着下面这版原稿，按问题单把没过的位置改对。')
  lines.push('- 先通读下面这版原稿，再在这版原稿基础上直接改，不要重新发明新写法，不要换剧情，不要换场次。')
  lines.push('- 只输出修改后的完整剧本正文，不要解释，不要分析，不要列改动说明。')
  lines.push('- 必须保留「第X集」标题、原有场号、人物表、△动作和对白格式；禁止输出 Action:/Dialogue:/Emotion: 这类旧三段标签。')
  lines.push('')

  // 问题单
  lines.push(...buildEpisodeIssueTicket(targetScene, failures))
  lines.push('')

  // 上下文信息
  if (storyIntent) {
    lines.push('【故事意图】')
    lines.push(`- 主题：${storyIntent.themeAnchors?.join(', ') || '待补'}`)
    lines.push(`- 核心冲突：${storyIntent.coreConflict || '待补'}`)
    lines.push('')
  }

  if (outline) {
    lines.push('【大纲摘要】')
    lines.push(`- 主角：${outline.protagonist || '待补'}`)
    if (outline.summaryEpisodes?.length) {
      const currentSummary = outline.summaryEpisodes.find(
        (ep) => ep.episodeNo === targetScene.sceneNo
      )
      if (currentSummary?.summary) {
        lines.push(`- 当前集摘要：${currentSummary.summary}`)
      }
    }
    lines.push('')
  }

  if (characters && characters.length > 0) {
    lines.push('【人物信息】')
    for (const char of characters.slice(0, 5)) {
      lines.push(`- ${char.name}：${char.goal || char.biography || '待补'}`)
    }
    lines.push('')
  }

  if (ledger) {
    lines.push('【连续性锚点】')
    lines.push(`- 上一场钩子：${ledger.storyMomentum.previousCliffhanger || '无'}`)
    lines.push(`- 下一步桥接：${ledger.storyMomentum.nextRequiredBridge || '无'}`)
    lines.push(`- 当前冲突线：${ledger.storyMomentum.activeConflictLine || '无'}`)
    lines.push('')
  }

  // Story state snapshot
  if (characters && outline && targetEpisodes) {
    const snapshot = buildStoryStateSnapshot({
      projectId: projectId || outlineTitle || 'unknown',
      outlineTitle: outlineTitle || outline.title || 'unknown',
      theme,
      mainConflict,
      storyIntent,
      outline,
      characters,
      episodeNo: targetScene.sceneNo,
      targetEpisodes,
      existingScript: [],
      ledger
    })
    lines.push(buildStoryStateSnapshotPromptBlock(snapshot))
    lines.push('')

    // 连续性约束（snapshot 驱动）
    const continuityAudit = inspectStoryContinuityAgainstSnapshot({
      snapshot,
      scene: targetScene
    })
    lines.push(...buildContinuityConstraintBlock(continuityAudit))
  }

  // 原稿
  lines.push('【必须改的上一版原稿】')
  lines.push(targetScene.screenplay || '')

  return lines.join('\n')
}

/**
 * 执行单集重写主流程
 */
export async function executeScriptRewrite(input: {
  rewriteInput: ExecuteScriptRewriteInputDto
  runtimeConfig: RuntimeProviderConfig
}): Promise<ExecuteScriptRewriteResultDto> {
  const { rewriteInput, runtimeConfig } = input
  const {
    episodeNo,
    existingScript,
    failures,
    storyIntent,
    outline,
    characters
  } = rewriteInput

  // 找到目标场景
  const targetScene = existingScript.find((s) => s.sceneNo === episodeNo)
  if (!targetScene) {
    throw new Error(`[executeScriptRewrite] Scene ${episodeNo} not found in existing script`)
  }

  // 计算当前 ledger
  const ledger = buildScriptStateLedger({
    storyIntent: storyIntent ?? null,
    outline: outline ?? { title: '', genre: '', theme: '', mainConflict: '', protagonist: '', summary: '', summaryEpisodes: [], facts: [] },
    characters: characters ?? [],
    script: existingScript
  })

  // 构建重写 prompt
  const prompt = buildEpisodeRewritePrompt({
    targetScene,
    failures,
    storyIntent,
    outline,
    characters,
    ledger,
    projectId: rewriteInput.projectId,
    outlineTitle: rewriteInput.outlineTitle,
    theme: rewriteInput.theme,
    mainConflict: rewriteInput.mainConflict,
    targetEpisodes: rewriteInput.targetEpisodes,
    scriptControlPackage: rewriteInput.scriptControlPackage
  })

  // 调用 AI
  const result = await generateTextWithRuntimeRouter(
    {
      task: 'episode_rewrite',
      prompt,
      temperature: 0.45,
      timeoutMs: resolveAiStageTimeoutMs('episode_rewrite', {
        strictness: 'strict',
        isRewriteMode: true
      }),
      runtimeHints: {
        strictness: 'strict',
        isRewriteMode: true
      }
    },
    runtimeConfig
  )

  // 解析结果
  const rewrittenScene = parseGeneratedScene(result.text, episodeNo)

  // 更新剧本
  const updatedScript = existingScript.map((s) =>
    s.sceneNo === episodeNo ? rewrittenScene : s
  )

  // 计算新 ledger
  const newLedger = buildScriptStateLedger({
    storyIntent: storyIntent ?? null,
    outline: outline ?? { title: '', genre: '', theme: '', mainConflict: '', protagonist: '', summary: '', summaryEpisodes: [], facts: [] },
    characters: characters ?? [],
    script: updatedScript
  })

  return {
    rewrittenScene,
    ledger: newLedger
  }
}
