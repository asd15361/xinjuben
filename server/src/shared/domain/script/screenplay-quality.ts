import type { ScriptSegmentDto } from '../../contracts/workflow'
import { EPISODE_CHAR_COUNT, SCENE_COUNT_QUALITY } from '../workflow/contract-thresholds'
import { hasConcreteHardHook, pickHardHookWindow } from './hard-hook'
import {
  hasMeaningfulCharacterRoster,
  hasPollutedScreenplayContent,
  hasStructurallyUsableScreenplay,
  hasVoiceOverLeak,
  isDialogueBodyLine,
  isMeaningfulActionLine,
  parseScreenplayScenes
} from './screenplay-format'

function normalize(text: string | undefined): string {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .trim()
}

export function getScreenplay(scene: ScriptSegmentDto): string {
  const screenplay = normalize(scene.screenplay)
  if (screenplay) return screenplay
  return normalize([scene.action, scene.dialogue, scene.emotion].join('\n'))
}

function getScreenplayLines(screenplay: string): string[] {
  return normalize(screenplay)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function countDialogueLines(lines: string[]): number {
  return lines.filter((line) => isDialogueBodyLine(line)).length
}

function countActionLines(lines: string[]): number {
  return lines.filter((line) => isMeaningfulActionLine(line)).length
}

function countMeaningfulLines(lines: string[]): number {
  return lines.filter((line) => isDialogueBodyLine(line) || isMeaningfulActionLine(line)).length
}

function hasTruncatedEllipsisResidue(lines: string[]): boolean {
  const lastLine = [...lines].reverse().find((line) => line.trim())
  if (!lastLine || !/(…|\.\.\.)$/.test(lastLine)) return false
  const stripped = lastLine.replace(/(…|\.\.\.)+$/g, '').trim()
  if (!stripped) return true
  return stripped.length <= 12 || /[：:（(]$/.test(stripped)
}

function hasUnfilmableInnerMonologue(lines: string[]): boolean {
  return lines.some((line) => {
    if (!line || /^\*\*[^*\n]+\*\*：/.test(line)) return false
    if (/\((V\.O\.|O\.S\.)\)/.test(line)) return false
    return /(心里想|心头一紧|脑海中|想起|回响|耳边回响|一股.+从心底升起|意识到|顿悟|明悟|知道自己|仿佛透过)/.test(
      line
    )
  })
}

function hasEpisodeHeading(screenplay: string): boolean {
  const normalized = screenplay.replace(/\*\*/g, '').trim()
  return /^第[一二三四五六七八九十百零\d]+集$/m.test(normalized)
}

function resolveSceneCountContract(): { min: number; max: number; label: string } {
  return {
    min: SCENE_COUNT_QUALITY.min,
    max: SCENE_COUNT_QUALITY.max,
    label: SCENE_COUNT_QUALITY.label
  }
}

function resolveCharCountContract(sceneCount: number): { min: number; max: number } {
  const min =
    typeof EPISODE_CHAR_COUNT.min === 'function'
      ? EPISODE_CHAR_COUNT.min(sceneCount)
      : EPISODE_CHAR_COUNT.min
  return { min, max: EPISODE_CHAR_COUNT.max }
}

export interface ScreenplayQualityEpisodeReport {
  sceneNo: number | null
  screenplay: string
  charCount: number
  hasEpisodeHeading: boolean
  hasLegacyMarkers: boolean
  sceneCount: number
  rosterCount: number
  actionCount: number
  dialogueCount: number
  perScene: Array<{ dialogueCount: number; actionCount: number }>
  hookWindow: string[]
  hookLine: string
  pass: boolean
  problems: string[]
  /** Problems that should trigger automatic repair — excludes observe-only issues like hook_weak */
  actionableProblems: string[]
  /** Problems that are observed but do NOT block pass or trigger auto-repair */
  observeOnlyProblems: string[]
  /** Normalized repair routing for actionable problems */
  repairAssignments: EpisodeRepairAssignment[]
}

export interface ScreenplayQualityBatchReport {
  episodeCount: number
  passedEpisodes: number
  averageCharCount: number
  weakEpisodes: ScreenplayQualityEpisodeReport[]
  episodes: ScreenplayQualityEpisodeReport[]
  pass: boolean
}

export type AgentKind =
  | 'format_pollution'
  | 'scene_structure'
  | 'char_count'
  | 'episode_engine'
  | 'arc_control'
  | 'emotion_lane'
  | 'observe_only'

export type RepairProblemCode =
  | 'missing_episode_heading'
  | 'scene_count'
  | 'template_pollution'
  | 'voice_over'
  | 'missing_roster'
  | 'missing_action'
  | 'insufficient_dialogue'
  | 'thin_scene_body'
  | 'char_count'
  | 'truncated_body'
  | 'legacy_marker'
  | 'inner_monologue'
  | 'hook_weak'

export interface EpisodeRepairAssignment {
  problem: string
  code: RepairProblemCode
  agent: AgentKind
}

const BLOCKING_QUALITY_PROBLEMS = new Set([
  '缺少第X集标题',
  '场次数不在2-4场',
  '正文仍含待补/模板/伪剧本污染',
  '含画外音/旁白/OS',
  '至少有一场缺人物表',
  '残留Action/Dialogue/Emotion标记',
  '含不可拍心理描写'
])

// Problems that are observed but never block pass or trigger auto-repair.
// These do not enter actionable failures; they only appear in the observation report.
const OBSERVE_ONLY_QUALITY_PROBLEMS = new Set(['集尾钩子偏弱'])

const QUALITY_PROBLEM_PENALTIES: Array<{ pattern: RegExp; penalty: number }> = [
  { pattern: /^至少有一场缺△动作$/, penalty: 18 },
  { pattern: /^至少有一场对白不足2句$/, penalty: 18 },
  { pattern: /^至少有一场有效内容不足4行$/, penalty: 16 },
  { pattern: /^字数低于\d+字合同$/, penalty: 24 },
  { pattern: /^字数超过\d+字合同$/, penalty: 24 },
  { pattern: /^集尾钩子偏弱$/, penalty: 8 }
]

export function classifyRepairProblem(problem: string): RepairProblemCode {
  if (problem === '缺少第X集标题') return 'missing_episode_heading'
  if (/^场次数不在/.test(problem)) return 'scene_count'
  if (problem === '正文仍含待补/模板/伪剧本污染') return 'template_pollution'
  if (problem === '含画外音/旁白/OS') return 'voice_over'
  if (problem === '至少有一场缺人物表') return 'missing_roster'
  if (problem === '至少有一场缺△动作') return 'missing_action'
  if (problem === '至少有一场对白不足2句') return 'insufficient_dialogue'
  if (problem === '至少有一场有效内容不足4行') return 'thin_scene_body'
  if (/^字数(低于|超过)\d+字合同$/.test(problem)) return 'char_count'
  if (problem === '正文含截断残句') return 'truncated_body'
  if (problem === '残留Action/Dialogue/Emotion标记') return 'legacy_marker'
  if (problem === '含不可拍心理描写') return 'inner_monologue'
  return 'hook_weak'
}

export function mapRepairProblemToAgent(code: RepairProblemCode): AgentKind {
  switch (code) {
    case 'template_pollution':
    case 'voice_over':
    case 'legacy_marker':
      return 'format_pollution'
    case 'missing_episode_heading':
    case 'scene_count':
    case 'missing_roster':
    case 'missing_action':
    case 'insufficient_dialogue':
    case 'thin_scene_body':
    case 'truncated_body':
      return 'scene_structure'
    case 'char_count':
      return 'char_count'
    case 'inner_monologue':
      return 'episode_engine'
    case 'hook_weak':
      return 'observe_only'
  }
}

export function deriveEpisodeRepairAssignments(problems: string[]): EpisodeRepairAssignment[] {
  return problems.map((problem) => {
    const code = classifyRepairProblem(problem)
    return {
      problem,
      code,
      agent: mapRepairProblemToAgent(code)
    }
  })
}

export function hasBlockingScreenplayQualityProblems(
  report: Pick<ScreenplayQualityEpisodeReport, 'problems'>
): boolean {
  return report.problems.some((problem) => BLOCKING_QUALITY_PROBLEMS.has(problem))
}

export function scoreScreenplayQualityProblems(
  report: Pick<ScreenplayQualityEpisodeReport, 'problems'>
): number {
  let score = 100
  for (const problem of report.problems) {
    if (BLOCKING_QUALITY_PROBLEMS.has(problem)) {
      score -= 40
      continue
    }
    const matchedPenalty =
      QUALITY_PROBLEM_PENALTIES.find((item) => item.pattern.test(problem))?.penalty ?? 6
    score -= matchedPenalty
  }
  return Math.max(0, score)
}

export function inspectScreenplayQualityEpisode(
  scene: Pick<
    ScriptSegmentDto,
    'sceneNo' | 'screenplay' | 'action' | 'dialogue' | 'emotion' | 'screenplayScenes'
  >
): ScreenplayQualityEpisodeReport {
  const screenplay = getScreenplay(scene as ScriptSegmentDto)
  const lines = getScreenplayLines(screenplay)
  const scenes = parseScreenplayScenes(screenplay)
  const perScene = scenes.map((item) => {
    const itemLines = getScreenplayLines(item.body || '')
    return {
      dialogueCount: countDialogueLines(itemLines),
      actionCount: countActionLines(itemLines)
    }
  })
  const hookWindow = pickHardHookWindow(lines)
  const problems: string[] = []
  const actionableProblems: string[] = []
  const observeOnlyProblems: string[] = []
  const charCount = screenplay.replace(/\s+/g, '').length
  const hasVoiceOver = hasVoiceOverLeak(screenplay)
  const hasPollutedContent = hasPollutedScreenplayContent(screenplay)
  const hasUsableStructure = hasStructurallyUsableScreenplay(screenplay)
  // Prefer screenplayScenes.length (from generation parse, multi-scene) over scenes.length
  // (from parseScreenplayScenes of rebuilt screenplay, may be 1 after A/D/E rebuild).
  // A/D/E rebuild loses embedded scene headings → parseScreenplayScenes(screenplay) returns 1.
  // screenplayScenes preserves the correct multi-scene count from generation.
  // rosterCount must come from scenes (A/D/E parsed), not screenplayScenes (may have empty characterRoster).
  const sceneCountFromScenes =
    (scene as ScriptSegmentDto).screenplayScenes?.length &&
    (scene as ScriptSegmentDto).screenplayScenes!.length > 0
      ? (scene as ScriptSegmentDto).screenplayScenes!.length
      : scenes.length
  const sceneCountContract = resolveSceneCountContract()
  const charCountContract = resolveCharCountContract(sceneCountFromScenes)
  const rosterCount = scenes.filter((item) =>
    hasMeaningfulCharacterRoster(item.characterRoster || [])
  ).length
  const actionCount = perScene.reduce((sum, item) => sum + item.actionCount, 0)
  const dialogueCount = perScene.reduce((sum, item) => sum + item.dialogueCount, 0)
  const meaningfulLineCounts = scenes.map((item) =>
    countMeaningfulLines(getScreenplayLines(item.body || ''))
  )

  const rawProblems = {
    heading: !hasEpisodeHeading(screenplay),
    sceneCount:
      sceneCountFromScenes < sceneCountContract.min ||
      sceneCountFromScenes > sceneCountContract.max,
    voiceOver: hasVoiceOver,
    polluted: (!hasVoiceOver && !hasUsableStructure) || (!hasVoiceOver && hasPollutedContent),
    roster: rosterCount < scenes.length,
    action: actionCount < scenes.length,
    dialogue: perScene.some((item) => item.dialogueCount < 2),
    meaningful: meaningfulLineCounts.some((count) => count < 4),
    underChar: charCount < charCountContract.min,
    overChar: charCount > charCountContract.max,
    truncated: hasTruncatedEllipsisResidue(lines),
    legacy: /Action[:：]|Dialogue[:：]|Emotion[:：]/i.test(screenplay),
    monologue: hasUnfilmableInnerMonologue(lines),
    hookWeak: !hookWindow.some((line) => hasConcreteHardHook(line))
  }

  if (rawProblems.heading) problems.push('缺少第X集标题')
  if (rawProblems.sceneCount) problems.push(`场次数不在${sceneCountContract.label}`)
  if (rawProblems.voiceOver) problems.push('含画外音/旁白/OS')
  if (rawProblems.polluted) problems.push('正文仍含待补/模板/伪剧本污染')
  if (rawProblems.roster) problems.push('至少有一场缺人物表')
  if (rawProblems.action) problems.push('至少有一场缺△动作')
  if (rawProblems.dialogue) problems.push('至少有一场对白不足2句')
  if (rawProblems.meaningful) problems.push('至少有一场有效内容不足4行')
  if (rawProblems.underChar) problems.push(`字数低于${charCountContract.min}字合同`)
  if (rawProblems.overChar) problems.push(`字数超过${charCountContract.max}字合同`)
  if (rawProblems.truncated) problems.push('正文含截断残句')
  if (rawProblems.legacy) problems.push('残留Action/Dialogue/Emotion标记')
  if (rawProblems.monologue) problems.push('含不可拍心理描写')
  if (rawProblems.hookWeak) problems.push('集尾钩子偏弱')

  // Build actionable list: all problems EXCEPT observe-only ones
  for (const p of problems) {
    if (!OBSERVE_ONLY_QUALITY_PROBLEMS.has(p)) {
      actionableProblems.push(p)
    }
  }
  // Build observe-only list
  for (const p of problems) {
    if (OBSERVE_ONLY_QUALITY_PROBLEMS.has(p)) {
      observeOnlyProblems.push(p)
    }
  }

  const qualityScore = scoreScreenplayQualityProblems({ problems: actionableProblems })
  const repairAssignments = deriveEpisodeRepairAssignments(actionableProblems)

  return {
    sceneNo: scene.sceneNo || null,
    screenplay,
    charCount,
    hasEpisodeHeading: hasEpisodeHeading(screenplay),
    hasLegacyMarkers: /Action[:：]|Dialogue[:：]|Emotion[:：]/i.test(screenplay),
    sceneCount: sceneCountFromScenes,
    rosterCount,
    actionCount,
    dialogueCount,
    perScene,
    hookWindow,
    hookLine: hookWindow.at(-1) || '',
    // pass is determined ONLY by actionable problems, not observe-only ones
    pass:
      !hasBlockingScreenplayQualityProblems({ problems: actionableProblems }) && qualityScore >= 80,
    problems,
    actionableProblems,
    observeOnlyProblems,
    repairAssignments
  }
}

export function inspectScreenplayQualityBatch(
  script: ScriptSegmentDto[]
): ScreenplayQualityBatchReport {
  const episodes = script.map((scene) => inspectScreenplayQualityEpisode(scene))
  const passedEpisodes = episodes.filter((item) => item.pass).length
  const weakEpisodes = episodes.filter((item) => !item.pass)
  const averageCharCount =
    episodes.length > 0
      ? Math.round(episodes.reduce((sum, item) => sum + item.charCount, 0) / episodes.length)
      : 0

  return {
    episodeCount: episodes.length,
    passedEpisodes,
    averageCharCount,
    weakEpisodes,
    episodes,
    pass: episodes.length > 0 && weakEpisodes.length === 0
  }
}
