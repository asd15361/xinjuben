/**
 * 执行剧本修复
 *
 * 调用 AI 按修复建议重写指定场景，更新 ledger，返回修复后的剧本
 */
import type { RuntimeProviderConfig } from '../../../infrastructure/runtime-env/provider-config'
import { generateTextWithRuntimeRouter } from '../../ai/generate-text'
import type {
  ScriptSegmentDto,
  CharacterDraftDto,
  OutlineDraftDto,
  DetailedOutlineSegmentDto,
  DetailedOutlineBlockDto
} from '@shared/contracts/workflow'
import type {
  ExecuteScriptRepairInputDto,
  ExecuteScriptRepairResultDto,
  ScriptRepairSuggestionDto
} from '@shared/contracts/script-audit'
import type { StoryIntentPackageDto } from '@shared/contracts/intake'
import type { ScriptStateLedgerDto } from '@shared/contracts/script-ledger'
import { parseGeneratedScene } from '../runtime/parse-generated-scene'
import { buildScriptStateLedger } from '../ledger/build-script-ledger'
import { buildRepairPromptRules } from '@shared/domain/policy/repair/repair-policy'
import { resolveAiStageTimeoutMs } from '../../ai/resolve-ai-stage-timeout'

/**
 * 构建单场景修复 prompt
 */
function buildSceneRepairPrompt(input: {
  targetScene: ScriptSegmentDto
  suggestion: ScriptRepairSuggestionDto
  storyIntent: StoryIntentPackageDto | null | undefined
  outline: OutlineDraftDto | undefined
  characters: CharacterDraftDto[] | undefined
  ledger: ScriptStateLedgerDto | null
}): string {
  const { targetScene, suggestion, storyIntent, outline, characters, ledger } = input

  const lines: string[] = []

  // 上下文
  lines.push(`你正在修改短剧剧本的第 ${targetScene.sceneNo} 场。`)
  lines.push('')

  // 修复指令
  lines.push('【修复指令】')
  lines.push(`- 目标场景：第 ${targetScene.sceneNo} 场`)
  lines.push(`- 修复策略：${suggestion.policyKey}`)
  lines.push(`- 关注重点：${suggestion.focus.join('、')}`)
  lines.push(`- 证据提示：${suggestion.evidenceHint}`)
  lines.push(`- 具体要求：${suggestion.instruction}`)
  lines.push('')

  // 原稿
  lines.push('【当前原稿】')
  if (targetScene.screenplay) {
    lines.push(targetScene.screenplay)
  } else {
    if (targetScene.action) lines.push(targetScene.action)
    if (targetScene.dialogue) lines.push(targetScene.dialogue)
    if (targetScene.emotion) lines.push(targetScene.emotion)
  }
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

  // 修复规则
  lines.push('【修复规则】')
  lines.push(...buildRepairPromptRules())
  lines.push('')

  // 输出要求
  lines.push('【输出要求】')
  lines.push('只输出修改后的完整剧本正文，不要解释，不要分析。')
  lines.push('必须保留场景标题、人物表、△动作和对白格式。')
  lines.push('禁止输出 Action:/Dialogue:/Emotion: 这类旧三段标签。')

  return lines.join('\n')
}

/**
 * 执行单个场景修复
 */
async function repairSingleScene(input: {
  targetScene: ScriptSegmentDto
  suggestion: ScriptRepairSuggestionDto
  storyIntent: StoryIntentPackageDto | null | undefined
  outline: OutlineDraftDto | undefined
  characters: CharacterDraftDto[] | undefined
  ledger: ScriptStateLedgerDto | null
  runtimeConfig: RuntimeProviderConfig
}): Promise<ScriptSegmentDto> {
  const prompt = buildSceneRepairPrompt({
    targetScene: input.targetScene,
    suggestion: input.suggestion,
    storyIntent: input.storyIntent,
    outline: input.outline,
    characters: input.characters,
    ledger: input.ledger
  })

  const result = await generateTextWithRuntimeRouter(
    {
      task: 'scene_repair',
      prompt,
      temperature: 0.55,
      timeoutMs: resolveAiStageTimeoutMs('scene_repair', {})
    },
    input.runtimeConfig
  )

  return parseGeneratedScene(result.text, input.targetScene.sceneNo)
}

/**
 * 执行剧本修复主流程
 */
export async function executeScriptRepair(input: {
  repairInput: ExecuteScriptRepairInputDto
  runtimeConfig: RuntimeProviderConfig
}): Promise<ExecuteScriptRepairResultDto> {
  const { repairInput, runtimeConfig } = input
  const {
    storyIntent,
    outline,
    characters,
    script,
    suggestions
  } = repairInput

  // 按 targetSceneNo 分组
  const suggestionsByScene = new Map<number | null, ScriptRepairSuggestionDto[]>()
  for (const suggestion of suggestions) {
    const key = suggestion.targetSceneNo
    const existing = suggestionsByScene.get(key) || []
    existing.push(suggestion)
    suggestionsByScene.set(key, existing)
  }

  // 复制剧本用于修改
  const repairedScript = [...script]
  const repairedSceneNos = new Set<number>()

  // 逐场景修复
  for (const [sceneNo, sceneSuggestions] of suggestionsByScene) {
    if (sceneNo === null) continue

    const targetScene = script.find((s) => s.sceneNo === sceneNo)
    if (!targetScene) continue

    // 计算当前 ledger
    const ledger = buildScriptStateLedger({
      storyIntent: storyIntent ?? null,
      outline: outline ?? { title: '', genre: '', theme: '', mainConflict: '', protagonist: '', summary: '', summaryEpisodes: [], facts: [] },
      characters: characters ?? [],
      script: repairedScript
    })

    // 合并该场景的所有修复建议
    const mergedSuggestion: ScriptRepairSuggestionDto = {
      targetSceneNo: sceneNo,
      policyKey: sceneSuggestions[0].policyKey,
      source: sceneSuggestions[0].source,
      focus: [...new Set(sceneSuggestions.flatMap((s) => s.focus))],
      evidenceHint: sceneSuggestions.map((s) => s.evidenceHint).join('；'),
      instruction: sceneSuggestions.map((s) => s.instruction).join('；')
    }

    try {
      const repairedScene = await repairSingleScene({
        targetScene,
        suggestion: mergedSuggestion,
        storyIntent,
        outline,
        characters,
        ledger,
        runtimeConfig
      })

      // 替换修复后的场景
      const index = repairedScript.findIndex((s) => s.sceneNo === sceneNo)
      if (index >= 0) {
        repairedScript[index] = repairedScene
        repairedSceneNos.add(sceneNo)
      }
    } catch (error) {
      console.error(
        `[executeScriptRepair] Scene ${sceneNo} repair failed:`,
        error instanceof Error ? error.message : error
      )
      // 失败时保留原场景
    }
  }

  // 计算最终 ledger
  const finalLedger = buildScriptStateLedger({
    storyIntent: storyIntent ?? null,
    outline: outline ?? { title: '', genre: '', theme: '', mainConflict: '', protagonist: '', summary: '', summaryEpisodes: [], facts: [] },
    characters: characters ?? [],
    script: repairedScript
  })

  return {
    repairedScript,
    ledger: finalLedger
  }
}
