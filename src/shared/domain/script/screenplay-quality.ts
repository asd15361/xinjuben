import type { ScriptSegmentDto } from '../../contracts/workflow.ts'
import { EPISODE_CHAR_COUNT, SCENE_COUNT_QUALITY } from '../workflow/contract-thresholds.ts'
import { hasConcreteHardHook, pickHardHookWindow } from './hard-hook.ts'
import {
  hasMeaningfulCharacterRoster,
  hasPollutedScreenplayContent,
  hasStructurallyUsableScreenplay,
  isDialogueBodyLine,
  isMeaningfulActionLine,
  parseScreenplayScenes
} from './screenplay-format.ts'

function normalize(text: string | undefined): string {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .trim()
}

function getScreenplay(scene: ScriptSegmentDto): string {
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

function resolveCharCountContract(_sceneCount: number): { min: number; max: number } {
  return { min: EPISODE_CHAR_COUNT.min, max: EPISODE_CHAR_COUNT.max }
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
}

export interface ScreenplayQualityBatchReport {
  episodeCount: number
  passedEpisodes: number
  averageCharCount: number
  weakEpisodes: ScreenplayQualityEpisodeReport[]
  episodes: ScreenplayQualityEpisodeReport[]
  pass: boolean
}

const BLOCKING_QUALITY_PROBLEMS = new Set([
  '缺少第X集标题',
  '场次数不在2-4场',
  '正文仍含待补/模板/伪剧本污染',
  '至少有一场缺人物表',
  '残留Action/Dialogue/Emotion标记',
  '含不可拍心理描写'
])

const QUALITY_PROBLEM_PENALTIES: Array<{ pattern: RegExp; penalty: number }> = [
  { pattern: /^至少有一场缺△动作$/, penalty: 18 },
  { pattern: /^至少有一场对白不足2句$/, penalty: 18 },
  { pattern: /^至少有一场有效内容不足4行$/, penalty: 16 },
  { pattern: /^字数低于800字合同$/, penalty: 24 },
  { pattern: /^字数超过1200字合同$/, penalty: 12 },
  { pattern: /^集尾钩子偏弱$/, penalty: 8 }
]

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
  scene: Pick<ScriptSegmentDto, 'sceneNo' | 'screenplay' | 'action' | 'dialogue' | 'emotion' | 'screenplayScenes'>
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
  const charCount = screenplay.replace(/\s+/g, '').length
  // Prefer screenplayScenes.length (from generation parse, multi-scene) over scenes.length
  // (from parseScreenplayScenes of rebuilt screenplay, may be 1 after A/D/E rebuild).
  // A/D/E rebuild loses embedded scene headings → parseScreenplayScenes(screenplay) returns 1.
  // screenplayScenes preserves the correct multi-scene count from generation.
  // rosterCount must come from scenes (A/D/E parsed), not screenplayScenes (may have empty characterRoster).
  const sceneCountFromScenes = (scene as ScriptSegmentDto).screenplayScenes?.length && (scene as ScriptSegmentDto).screenplayScenes!.length > 0
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

  if (!hasEpisodeHeading(screenplay)) problems.push('缺少第X集标题')
  if (sceneCountFromScenes < sceneCountContract.min || sceneCountFromScenes > sceneCountContract.max) {
    problems.push(`场次数不在${sceneCountContract.label}`)
  }
  if (!hasStructurallyUsableScreenplay(screenplay) || hasPollutedScreenplayContent(screenplay)) {
    problems.push('正文仍含待补/模板/伪剧本污染')
  }
  if (rosterCount < scenes.length) problems.push('至少有一场缺人物表')
  if (actionCount < scenes.length) problems.push('至少有一场缺△动作')
  if (perScene.some((item) => item.dialogueCount < 2)) problems.push('至少有一场对白不足2句')
  if (meaningfulLineCounts.some((count) => count < 4)) problems.push('至少有一场有效内容不足4行')
  if (charCount < charCountContract.min) problems.push(`字数低于${charCountContract.min}字合同`)
  if (charCount > charCountContract.max) problems.push(`字数超过${charCountContract.max}字合同`)
  if (hasTruncatedEllipsisResidue(lines)) problems.push('正文含截断残句')
  if (/Action[:：]|Dialogue[:：]|Emotion[:：]/i.test(screenplay)) {
    problems.push('残留Action/Dialogue/Emotion标记')
  }
  if (hasUnfilmableInnerMonologue(lines)) problems.push('含不可拍心理描写')
  if (!hookWindow.some((line) => hasConcreteHardHook(line))) problems.push('集尾钩子偏弱')

  const qualityScore = scoreScreenplayQualityProblems({ problems })

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
    pass: !hasBlockingScreenplayQualityProblems({ problems }) && qualityScore >= 80,
    problems
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
