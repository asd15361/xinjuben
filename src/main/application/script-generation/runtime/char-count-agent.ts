import type { ScriptSegmentDto } from '../../../../shared/contracts/workflow'
import type { RuntimeProviderConfig } from '../../../infrastructure/runtime-env/provider-config'
import { generateTextWithRuntimeRouter } from '../../ai/generate-text.ts'
import { resolveAiStageTimeoutMs } from '../../ai/resolve-ai-stage-timeout.ts'
import type { ModelRouteLane } from '../../../../shared/contracts/ai'
import { EPISODE_CHAR_COUNT } from '../../../../shared/domain/workflow/contract-thresholds.ts'
import { getScreenplay } from '../../../../shared/domain/script/screenplay-quality.ts'
import { parseScreenplayScenes } from '../../../../shared/domain/script/screenplay-format.ts'
import { parseGeneratedScene } from './parse-generated-scene.ts'
import { shouldAcceptRepairCandidate } from '../../../../shared/domain/script/screenplay-repair-guard.ts'

interface GuardFailureLike {
  code: string
  detail: string
}

export type CharCountAgentMode = 'fat' | 'thin'

interface CharCountRewritePlan {
  targetGoal: number
  targetMin: number
  targetMax: number
  ratioTarget: number
  requiredCutChars: number
  requiredAddChars: number
}

interface SceneLengthItem {
  sceneNo: number
  bodyLength: number
}

function countSceneChars(scene: ScriptSegmentDto): number {
  // 口径完全对齐 guard 合同检查：用同一套 getScreenplay 函数。
  const screenplay = getScreenplay(scene)
  return screenplay.replace(/\s+/g, '').length
}

function collectSceneLengths(scene: ScriptSegmentDto): SceneLengthItem[] {
  const screenplay = getScreenplay(scene)
  return parseScreenplayScenes(screenplay)
    .map((item, index) => ({
      sceneNo: index + 1,
      bodyLength: String(item.body || '').replace(/\s+/g, '').length
    }))
    .filter((item) => item.bodyLength > 0)
    .sort((a, b) => b.bodyLength - a.bodyLength)
}

function buildSceneLengthSummary(scene: ScriptSegmentDto): string[] {
  const lengths = collectSceneLengths(scene)

  if (lengths.length === 0) return []

  const longest = lengths[0]
  const shortest = lengths.at(-1)
  return [
    `- 当前最胖的是第${longest?.sceneNo}场，约${longest?.bodyLength}字。`,
    `- 当前最瘦的是第${shortest?.sceneNo}场，约${shortest?.bodyLength}字。`
  ]
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function buildCharCountRewritePlan(input: {
  currentChars: number
  minChars: number
  maxChars: number
}): CharCountRewritePlan {
  const { currentChars, minChars, maxChars } = input
  const targetGoal = clampNumber(1000, minChars, maxChars)
  const targetMin = clampNumber(900, minChars, maxChars)
  const targetMax = clampNumber(1200, minChars, maxChars)
  return {
    targetGoal,
    targetMin,
    targetMax,
    ratioTarget: Math.max(20, Math.round((targetGoal / Math.max(currentChars, 1)) * 100)),
    requiredCutChars: Math.max(0, currentChars - targetMax),
    requiredAddChars: Math.max(0, targetMin - currentChars)
  }
}

function buildFatSceneDirectives(scene: ScriptSegmentDto, plan: CharCountRewritePlan): string[] {
  const lengths = collectSceneLengths(scene)
  const directives: string[] = [`- 你至少要实删 ${plan.requiredCutChars} 字以上；如果删不够，这一版仍然不合格。`]
  if (lengths.length === 0) {
    directives.push('- 如果暂时分不清哪一场最胖，就默认从最长那段对峙、最长那段解释、最长那段动作开始硬删，直到总字数压回合同内。')
    return directives
  }

  const perSceneBudget = Math.round(plan.targetMax / Math.max(lengths.length, 1))
  const allowance = lengths.length >= 3 ? 80 : 120
  directives.push(
    `- 本次压缩目标不是“整体少一点”，而是把超胖场硬压回单场预算。默认单场上限约 ${perSceneBudget + allowance} 字。`
  )

  for (const item of lengths.slice(0, Math.min(3, lengths.length))) {
    const cap = Math.min(item.bodyLength - 80, perSceneBudget + allowance)
    directives.push(
      `- 第${item.sceneNo}场当前约${item.bodyLength}字，必须压到 ${Math.max(cap, perSceneBudget)} 字以内；优先删这一场里的重复动作、重复逼问、重复解释。`
    )
  }

  directives.push('- 如果某一场还在连写三轮以上同义对峙、重复威胁、重复观察，就继续删到只剩一轮最有效的冲突。')
  return directives
}

export function resolveCharCountAgentMode(failures: GuardFailureLike[]): CharCountAgentMode | null {
  const charFailure = failures.find((item) => item.code === 'char_count')
  if (!charFailure) return null
  if (charFailure.detail.includes('偏胖')) return 'fat'
  if (charFailure.detail.includes('偏瘦')) return 'thin'
  return null
}

export function buildCharCountAgentPrompt(input: {
  previousScene: ScriptSegmentDto
  failures: GuardFailureLike[]
}): string {
  const { previousScene, failures } = input
  const mode = resolveCharCountAgentMode(failures)
  if (!mode) {
    throw new Error('char_count_agent_requires_char_count_failure')
  }

  const sceneCount = previousScene.screenplayScenes?.length || 2
  const currentChars = countSceneChars(previousScene)
  const minChars = EPISODE_CHAR_COUNT.min(sceneCount)
  const maxChars = EPISODE_CHAR_COUNT.max
  const plan = buildCharCountRewritePlan({
    currentChars,
    minChars,
    maxChars
  })
  const fatSceneDirectives = mode === 'fat' ? buildFatSceneDirectives(previousScene, plan) : []

  const lines = [
    '【上一版成稿改稿任务】',
    `- 你现在是${mode === 'fat' ? '胖稿压缩' : '瘦稿补厚'}字数代理（char-count-agent）。`,
    '- 你只负责把上一版剧本的字数改回正式合同，不负责另起炉灶重写新故事。',
    `- 当前是第 ${previousScene.sceneNo} 集的二次/三次改稿，不是从零重写。`,
    `- 上一版当前约 ${currentChars} 字，当前共 ${sceneCount} 场，正式硬红线 ${minChars}-${maxChars} 字。必须把字数压到 ${plan.targetMin}-${plan.targetMax} 字区间内。`,
    `- 场数必须保持 ${sceneCount} 场，不准新增场、不准拆场。`,
    `- 只在本场内压缩或扩写，不准增加新场景、不准添加新人物、不准改变场景标题。`,
    ...buildSceneLengthSummary(previousScene)
  ]

  if (mode === 'fat') {
    lines.push(
      `- 压缩硬指令：字数必须从当前约 ${currentChars} 字压到 ${plan.targetMin}-${plan.targetMax} 字，这是合同硬红线，不是建议。超 ${plan.targetMax} 字就是不合格。`
    )
    lines.push(`- 压缩比例参考：最终大约只保留当前体量的 ${plan.ratioTarget}% 左右；超过这个量，大概率还会超线。`)
    lines.push(`- 每场字数预算 = ${plan.targetMax}/${sceneCount} ≈ ${Math.round(plan.targetMax / sceneCount)} 字。密度高的场必须多删，密度低的场少删或不删。`)
    lines.push(...fatSceneDirectives)
    lines.push('- 优先删：重复动作描述、同义对白（两个人说同一个意思）、过长解释、缓冲过渡句。')
    lines.push('- 能一句说完的，不准拆成三句；能一个动作落地的，不准补三层环境、心理和反应。')
    lines.push('- 最低保真约束：原有每个场号都必须保留，而且每个场号只能出现一次；绝不允许把同一个场号重复写两遍。')
    lines.push('- 最低保真约束：每一场至少保留 1 条有效△动作 + 2 条有效对白；不准把剧本压成只剩标题、人物表或一句提纲。')
    lines.push('- 最低保真约束：禁止输出 `#` / `##` markdown 场头、`人物：人物`、`人物：场景`、`△# 第X集`、`待补` 这类 placeholder 壳。')
    lines.push('- 集尾钩子场要保住结果感，但不能无限延伸。')
    lines.push('- 不准新增人物、不准新增场景、不准改变集尾结果。')
  } else {
    lines.push(
      `- 补厚硬指令：字数必须从当前约 ${currentChars} 字扩到 ${plan.targetMin}-${plan.targetMax} 字，这是合同硬红线。低于 ${plan.targetMin} 字就是不合格。`
    )
    lines.push(`- 本次至少要补足 ${plan.requiredAddChars} 字以上；补不够，这一版仍然不合格。`)
    lines.push('- 先补最瘦场里的对手回应、当场结果、局面变化和硬对白，再补承接动作。')
    lines.push('- 只做加法补厚，不准靠空情绪、感叹句和解释句灌水。')
    lines.push('- 每场至少保住双方各 1-2 轮有效对白，补的是冲突和结果，不是空话。')
    lines.push('- 结构保真约束：原有每个场号都必须保留，而且每个场号只能出现一次；不准把旧场号写丢，也不准重复场号。')
    lines.push('- 结构保真约束：禁止输出 `#` / `##` markdown 场头、`人物：人物`、`人物：场景`、`△# 第X集`、`待补` 这类 placeholder 壳。')
    lines.push('- 不准增加新人物、不准新增场景、不准添加新的情节点。只在本场内容里补实。')
  }

  lines.push('- 必须基于下面原稿直接改稿，不准从零重写，不准换剧情，不准换场次。')
  lines.push('- 只输出修改后的完整剧本正文，不要解释，不要分析，不要列改动说明。')
  lines.push(
    '- 必须保留「第X集」标题、原有场号、人物表、△动作和对白格式；禁止输出 Action:/Dialogue:/Emotion: 这类旧三段标签。'
  )
  lines.push('【必须改的上一版原稿】')
  lines.push(previousScene.screenplay || '')

  return [
    `你现在不是从零创作第 ${previousScene.sceneNo} 集，而是作为单职责字数代理，直接修改上一版已经写出的成稿。`,
    '你的目标只有一个：基于原稿直接删改或补厚，把它修回正式字数合同，同时保持剧情事实和场次结构不变。',
    ...lines
  ].join('\n')
}

export async function repairWithCharCountAgent(input: {
  generationInput: {
    plan: {
      targetEpisodes: number
      episodePlans: Array<{ episodeNo: number; lane?: ModelRouteLane; runtimeHints?: Record<string, unknown> }>
      recommendedPrimaryLane: ModelRouteLane
    }
  }
  runtimeConfig: RuntimeProviderConfig
  previousScene: ScriptSegmentDto
  failures: GuardFailureLike[]
  generateText?: typeof generateTextWithRuntimeRouter
}): Promise<{
  repairedScene: ScriptSegmentDto
  changed: boolean
}> {
  const generateText = input.generateText ?? generateTextWithRuntimeRouter
  const prompt = buildCharCountAgentPrompt({
    previousScene: input.previousScene,
    failures: input.failures
  })

  const lane =
    input.generationInput.plan.episodePlans.find(
      (item) => item.episodeNo === input.previousScene.sceneNo
    )?.lane ?? input.generationInput.plan.recommendedPrimaryLane

  const runtimeHints = {
    episode: input.previousScene.sceneNo,
    totalEpisodes: input.generationInput.plan.targetEpisodes,
    strictness: 'strict' as const,
    isRewriteMode: true
  }

  const result = await generateText(
    {
      task: 'episode_rewrite',
      prompt,
      preferredLane: lane,
      allowFallback: false,
      temperature: 0.35,
      timeoutMs: resolveAiStageTimeoutMs('episode_rewrite', runtimeHints),
      runtimeHints
    },
    input.runtimeConfig
  )

  const candidateScene = parseGeneratedScene(result.text, input.previousScene.sceneNo)
  const changed = shouldAcceptRepairCandidate(input.previousScene, candidateScene)

  return {
    repairedScene: changed ? candidateScene : input.previousScene,
    changed
  }
}
