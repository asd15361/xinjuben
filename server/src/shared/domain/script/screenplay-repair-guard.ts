/**
 * Screenplay Repair Guard — repair/audit authority hierarchy:
 *
 * READ-ONLY BOUNDARY (Legacy Adapter):
 * - `screenplay` is the PRIMARY body text and takes priority over legacy fields
 * - `legacyFormat` is migration-display-only and must NOT influence repair/audit/gate decisions
 * - Old three-act format fields (action, dialogue, emotion) are conversion output only
 *
 * DECISION AUTHORITY:
 * All repair decisions are based solely on `screenplay` quality metrics.
 * The legacy adapter (action/dialogue/emotion fields) is read-only for decisions.
 *
 * @see script-segment-text.ts for the full legacy adapter boundary definition
 */
import type { ScriptSegmentDto } from '../../contracts/workflow'
import {
  EPISODE_CHAR_COUNT,
  EPISODE_CHAR_COUNT_MAX,
  EPISODE_CHAR_COUNT_MIN,
  PENALTY_ACTION_INSUFFICIENT,
  PENALTY_DIALOGUE_INSUFFICIENT,
  PENALTY_ROSTER_MISSING,
  PENALTY_SCENE_COUNT_OUT_OF_RANGE,
  SCENE_COUNT_MINIMUM,
  SCENE_COUNT_QUALITY
} from '../workflow/contract-thresholds'
import { extractStructuredSceneFromScreenplay, parseScreenplayScenes } from './screenplay-format'
import { inspectScreenplayQualityEpisode } from './screenplay-quality'

export type EpisodeGuardFailureCode =
  | 'voice_over'
  | 'template_pollution'
  | 'scene_count'
  | 'missing_roster'
  | 'missing_action'
  | 'insufficient_dialogue'
  | 'thin_scene_body'
  | 'truncated_body'
  | 'legacy_marker'
  | 'inner_monologue'
  | 'char_count'

export interface EpisodeGuardFailure {
  code: EpisodeGuardFailureCode
  detail: string
}

function normalize(text: string | undefined): string {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .trim()
}

function clipText(text: string, maxChars: number): string {
  const normalized = normalize(text)
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(8, maxChars - 1))}…`
}

function isDialogueLine(line: string): boolean {
  return /^[^\s△：:（）()]{1,16}[：:]/.test(line.trim())
}

function ensureActionLine(line: string, maxChars: number): string {
  const normalized = clipText(line.replace(/^△+/, '').trim(), maxChars)
  return normalized ? `△${normalized}` : ''
}

function ensureDialogueLine(line: string, maxChars: number): string {
  const trimmed = line.trim()
  if (!trimmed) return ''
  const match = trimmed.match(/^([^\s△：:（）()]{1,16}[：:])\s*(.*)$/)
  if (!match) return clipText(trimmed, maxChars)
  return `${match[1]}${clipText(match[2], maxChars)}`
}

function toSceneLines(
  body: string
): Array<{ kind: 'action' | 'dialogue'; line: string; index: number }> {
  return normalize(body)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^人物[：:]/.test(line) && !/^字幕[：:]/.test(line))
    .map((line, index) => ({
      kind: isDialogueLine(line) ? 'dialogue' : 'action',
      line,
      index
    }))
}

function pickLineIndexes(
  lines: Array<{ kind: 'action' | 'dialogue'; line: string; index: number }>,
  isLastScene: boolean
): number[] {
  const actionIndexes = lines.filter((item) => item.kind === 'action').map((item) => item.index)
  const dialogueIndexes = lines.filter((item) => item.kind === 'dialogue').map((item) => item.index)
  const picked = new Set<number>()

  if (actionIndexes.length > 0) {
    picked.add(actionIndexes[0])
    if (actionIndexes.length > 1) picked.add(actionIndexes[actionIndexes.length - 1])
    if (isLastScene && actionIndexes.length > 2) picked.add(actionIndexes[actionIndexes.length - 2])
  }

  if (dialogueIndexes.length > 0) picked.add(dialogueIndexes[0])
  if (dialogueIndexes.length > 1) {
    picked.add(dialogueIndexes[dialogueIndexes.length - 1])
  } else if (actionIndexes.length > 2) {
    picked.add(actionIndexes[Math.min(1, actionIndexes.length - 1)])
  }

  return [...picked].sort((left, right) => left - right)
}

function rebuildCompactScreenplay(scene: ScriptSegmentDto): string | null {
  const screenplay = normalize(scene.screenplay)
  const scenes = parseScreenplayScenes(screenplay)
  if (scenes.length < 2 || scenes.length > 4) return null

  const compactScenes = scenes.map((item, sceneIndex) => {
    const lines = toSceneLines(item.body || '')
    const pickedIndexes = pickLineIndexes(lines, sceneIndex === scenes.length - 1)
    const compactLines = pickedIndexes
      .map((index) => lines.find((itemLine) => itemLine.index === index))
      .filter(Boolean)
      .map((itemLine) =>
        itemLine!.kind === 'dialogue'
          ? ensureDialogueLine(itemLine!.line, sceneIndex === scenes.length - 1 ? 34 : 30)
          : ensureActionLine(itemLine!.line, sceneIndex === scenes.length - 1 ? 58 : 44)
      )
      .filter(Boolean)

    const actionCount = compactLines.filter((line) => line.startsWith('△')).length
    const dialogueCount = compactLines.filter((line) => isDialogueLine(line)).length
    if (actionCount < 1 || dialogueCount < 2) return null

    const roster =
      (item.characterRoster || []).length > 0
        ? `人物：${(item.characterRoster || []).join('，')}`
        : '人物：待补'

    return [(item.sceneHeading || '').trim(), roster, ...compactLines].join('\n')
  })

  if (compactScenes.some((item) => !item)) return null
  return [`第${scene.sceneNo}集`, '', ...compactScenes].join('\n\n').trim()
}

function toPenalty(scene: ScriptSegmentDto): number {
  const report = inspectScreenplayQualityEpisode(scene)
  const minChars = EPISODE_CHAR_COUNT_MIN
  const maxChars = EPISODE_CHAR_COUNT_MAX
  let penalty = report.problems.length * 1000
  if (report.sceneCount < SCENE_COUNT_MINIMUM || report.sceneCount > SCENE_COUNT_QUALITY.max) {
    penalty += PENALTY_SCENE_COUNT_OUT_OF_RANGE
  }
  if (report.charCount > maxChars) penalty += report.charCount - maxChars
  if (report.charCount < minChars) penalty += minChars - report.charCount
  if (report.rosterCount < report.sceneCount) penalty += PENALTY_ROSTER_MISSING
  if (report.perScene.some((item) => item.actionCount < 1)) penalty += PENALTY_ACTION_INSUFFICIENT
  if (report.perScene.some((item) => item.dialogueCount < 2))
    penalty += PENALTY_DIALOGUE_INSUFFICIENT
  return penalty
}

export function chooseBetterRepairedScene(
  current: ScriptSegmentDto,
  candidate: ScriptSegmentDto
): ScriptSegmentDto {
  const currentPenalty = toPenalty(current)
  const candidatePenalty = toPenalty(candidate)
  const currentReport = inspectScreenplayQualityEpisode(current)
  const candidateReport = inspectScreenplayQualityEpisode(candidate)

  // NOTE: legacyFormat is migration-display-only and does NOT influence repair decisions.
  // screenplay is the PRIMARY body text — repair decisions are based solely on quality metrics.
  if (
    currentReport.sceneCount >= SCENE_COUNT_MINIMUM &&
    candidateReport.sceneCount < SCENE_COUNT_MINIMUM
  ) {
    return current
  }
  if (candidatePenalty < currentPenalty) return candidate
  if (candidatePenalty === currentPenalty && candidateReport.charCount < currentReport.charCount) {
    return candidate
  }
  return current
}

export function collectEpisodeGuardFailures(scene: ScriptSegmentDto): EpisodeGuardFailure[] {
  const quality = inspectScreenplayQualityEpisode(scene)
  const failures: EpisodeGuardFailure[] = []

  for (const problem of quality.problems) {
    if (problem === '含画外音/旁白/OS') {
      failures.push({ code: 'voice_over', detail: problem })
      continue
    }
    if (problem === '正文仍含待补/模板/伪剧本污染') {
      failures.push({ code: 'template_pollution', detail: problem })
      continue
    }
    if (/^场次数不在/.test(problem)) {
      failures.push({ code: 'scene_count', detail: problem })
      continue
    }
    if (problem === '至少有一场缺人物表') {
      failures.push({ code: 'missing_roster', detail: problem })
      continue
    }
    if (problem === '至少有一场缺△动作') {
      failures.push({ code: 'missing_action', detail: problem })
      continue
    }
    if (problem === '至少有一场对白不足2句') {
      failures.push({ code: 'insufficient_dialogue', detail: problem })
      continue
    }
    if (problem === '至少有一场有效内容不足4行') {
      failures.push({ code: 'thin_scene_body', detail: problem })
      continue
    }
    if (problem === '正文含截断残句') {
      failures.push({ code: 'truncated_body', detail: problem })
      continue
    }
    if (problem === '残留Action/Dialogue/Emotion标记') {
      failures.push({ code: 'legacy_marker', detail: problem })
      continue
    }
    if (problem === '含不可拍心理描写') {
      failures.push({ code: 'inner_monologue', detail: problem })
      continue
    }
    if (problem === '集尾钩子偏弱') {
      continue
    }
  }

  const sceneCount = scene.screenplayScenes?.length || 2
  const charCount = quality.charCount ?? 0
  const min = EPISODE_CHAR_COUNT.min(sceneCount)
  const max = EPISODE_CHAR_COUNT_MAX
  if (charCount > 0 && (charCount < min || charCount > max)) {
    const direction = charCount < min ? '偏瘦' : '偏胖'
    const diff = charCount < min ? min - charCount : charCount - max
    failures.push({
      code: 'char_count',
      detail: `字数${direction}（当前约${charCount}字，目标${min}-${max}字，差${diff}字）`
    })
  }

  return failures
}

function scoreGuardFailures(failures: EpisodeGuardFailure[]): number {
  return failures.reduce((sum, failure) => {
    switch (failure.code) {
      case 'scene_count':
      case 'template_pollution':
      case 'legacy_marker':
        return sum + 4
      case 'missing_roster':
      case 'missing_action':
      case 'insufficient_dialogue':
      case 'thin_scene_body':
      case 'truncated_body':
      case 'inner_monologue':
        return sum + 3
      case 'voice_over':
        return sum + 3
      case 'char_count': {
        const gap = extractCharCountGap([failure])
        const severity = Math.min(4, 1 + Math.ceil(gap / 400))
        return sum + severity
      }
      default:
        return sum + 1
    }
  }, 0)
}

function extractCharCountGap(failures: EpisodeGuardFailure[]): number {
  const detail = failures.find((failure) => failure.code === 'char_count')?.detail || ''
  const match = detail.match(/差(\d+)字/)
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY
}

function extractCharCountDirection(failures: EpisodeGuardFailure[]): 'fat' | 'thin' | null {
  const detail = failures.find((failure) => failure.code === 'char_count')?.detail || ''
  if (detail.includes('偏胖')) return 'fat'
  if (detail.includes('偏瘦')) return 'thin'
  return null
}

function collectSceneCodes(scene: ScriptSegmentDto): string[] {
  return (scene.screenplayScenes || [])
    .map((item) => String(item.sceneCode || '').trim())
    .filter(Boolean)
}

function preservesSceneCodeShape(
  originalScene: ScriptSegmentDto,
  candidateScene: ScriptSegmentDto
): boolean {
  const originalCodes = collectSceneCodes(originalScene)
  const candidateCodes = collectSceneCodes(candidateScene)

  if (originalCodes.length === 0 || candidateCodes.length === 0) {
    return true
  }

  if (new Set(candidateCodes).size !== candidateCodes.length) {
    return false
  }

  if (originalCodes.length !== candidateCodes.length) {
    return false
  }

  return originalCodes.every((code, index) => code === candidateCodes[index])
}

export function shouldReplaceBestAttempt(
  currentBest: { failures: EpisodeGuardFailure[] },
  candidate: { failures: EpisodeGuardFailure[] }
): boolean {
  const bestScore = scoreGuardFailures(currentBest.failures)
  const candidateScore = scoreGuardFailures(candidate.failures)
  if (candidateScore < bestScore) return true
  if (candidateScore > bestScore) return false

  const bestCharGap = extractCharCountGap(currentBest.failures)
  const candidateCharGap = extractCharCountGap(candidate.failures)
  if (candidateCharGap < bestCharGap) return true
  if (candidateCharGap > bestCharGap) return false

  return candidate.failures.length < currentBest.failures.length
}

export function shouldAcceptRepairCandidate(
  originalScene: ScriptSegmentDto,
  candidateScene: ScriptSegmentDto
): boolean {
  if (!preservesSceneCodeShape(originalScene, candidateScene)) {
    return false
  }

  const originalFailures = collectEpisodeGuardFailures(originalScene)
  const candidateFailures = collectEpisodeGuardFailures(candidateScene)
  const originalCharDirection = extractCharCountDirection(originalFailures)
  const candidateCharDirection = extractCharCountDirection(candidateFailures)

  if (
    originalCharDirection &&
    candidateCharDirection &&
    originalCharDirection !== candidateCharDirection
  ) {
    return false
  }

  if (shouldReplaceBestAttempt({ failures: originalFailures }, { failures: candidateFailures })) {
    return true
  }

  if (shouldReplaceBestAttempt({ failures: candidateFailures }, { failures: originalFailures })) {
    return false
  }

  return candidateScene.screenplay === originalScene.screenplay
}

export function compactOverlongScreenplay(scene: ScriptSegmentDto): ScriptSegmentDto {
  const report = inspectScreenplayQualityEpisode(scene)
  if (
    report.charCount <= EPISODE_CHAR_COUNT_MAX ||
    report.sceneCount < SCENE_COUNT_MINIMUM ||
    report.sceneCount > SCENE_COUNT_QUALITY.max
  ) {
    return scene
  }

  const compactScreenplay = rebuildCompactScreenplay(scene)
  if (!compactScreenplay) return scene

  const structured = extractStructuredSceneFromScreenplay(compactScreenplay, scene.sceneNo)
  const compactedScene = {
    ...scene,
    screenplay: structured.screenplay,
    screenplayScenes: structured.screenplayScenes,
    legacyFormat: structured.legacyFormat,
    action: structured.action,
    dialogue: structured.dialogue,
    emotion: structured.emotion
  }
  const compactedReport = inspectScreenplayQualityEpisode(compactedScene)
  const originalPenalty = toPenalty(scene)
  const compactedPenalty = toPenalty(compactedScene)

  if (!compactedReport.pass && compactedPenalty >= originalPenalty) {
    return scene
  }
  if (compactedReport.charCount < EPISODE_CHAR_COUNT_MIN) {
    return scene
  }
  if (compactedReport.problems.includes('正文含截断残句')) {
    return scene
  }
  if (
    compactedReport.problems.includes('集尾钩子偏弱') &&
    !report.problems.includes('集尾钩子偏弱')
  ) {
    return scene
  }
  return compactedScene
}
