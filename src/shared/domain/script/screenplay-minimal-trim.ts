/**
 * src/shared/domain/script/screenplay-minimal-trim.ts
 *
 * Minimal last-scene trim safety valve — NOT repair.
 * Only fires when ALL other quality gates pass EXCEPT word count.
 * Operates on the LAST SCENE ONLY, removing explanation/recollection/summary
 * lines from the middle-to-end portion. Maximum 30% compression.
 * Never touches dialogue, action, hooks, scene structure.
 */
import type { ScriptSegmentDto } from '../../../shared/contracts/workflow'
import { inspectScreenplayQualityEpisode } from './screenplay-quality'
import { extractStructuredSceneFromScreenplay } from './screenplay-format'

// ── Trim patterns ─────────────────────────────────────────────────────────────

const TRIM_PATTERNS = [
  // Recollection / internal reflection — middle/end only
  /^(?!.*[：:])(?=.{0,20}(?:想起|记得|浮现|眼前|耳边|回响|回想起|仿佛看到))/,
  // Explanation / justification lines
  /^(?!.*[：:])(?=.{0,20}(?:因为.|所以.|于是.|其实.|也就是说|换句话说))/,
  // Summary / closure
  /^(?!.*[：:])(?=.{0,20}(?:总之|归根结底|到头来|说到底))/,
  // Passive emotional observation
  /^(?!.*[：:])(?=.{0,20}(?:不禁|不由得|只觉得|感到一股))/,
]

// Hook continuation markers — must never be trimmed
const HOOK_MARKERS = [
  '转身', '扭头', '门外', '下一瞬', '话没说完', '忽然', '外头', '脚步',
  '抬眼', '压低声音', '追', '冲', '扑', '拽', '拉', '扯', '抽出', '掏出',
  '举起', '逼近', '瞪', '愣', '倒退', '退', '迎', '按', '抓住', '按住'
]

// ── Line classifiers ─────────────────────────────────────────────────────────

function isDialogueLine(line: string): boolean {
  return /^[^\s△：:（）()]{1,16}[：:]/.test(line.trim())
}

function isActionLine(line: string): boolean {
  return line.startsWith('△')
}

function isRosterLine(line: string): boolean {
  return /^人物[：:]/.test(line)
}

function isSceneHeading(line: string): boolean {
  return /^\d+\-\d+\s+/.test(line.trim())
}

function isTrimTarget(line: string): boolean {
  if (isDialogueLine(line)) return false
  if (isActionLine(line)) return false
  if (isRosterLine(line)) return false
  if (isSceneHeading(line)) return false
  if (HOOK_MARKERS.some((m) => line.includes(m))) return false
  return TRIM_PATTERNS.some((pat) => pat.test(line))
}

// ── Minimal parse for last-scene trim ─────────────────────────────────────

interface RepairScene {
  sceneHeading: string
  sceneCode: string
  timeOfDay: string
  characterRoster: string[]
  body: string
}

function parseScreenplayScenesForTrim(screenplay: string): RepairScene[] {
  const lines = (screenplay || '')
    .replace(/\r\n/g, '\n')
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const scenes: RepairScene[] = []
  let current: RepairScene | null = null
  for (const line of lines) {
    const headingMatch = line.match(/^(\d+\-\d+)\s+(.+)$/)
    if (headingMatch) {
      if (current) scenes.push(current)
      current = {
        sceneHeading: line,
        sceneCode: headingMatch[1],
        timeOfDay: headingMatch[2],
        characterRoster: [],
        body: ''
      }
      continue
    }
    if (!current) {
      current = {
        sceneHeading: '1-1 待补',
        sceneCode: '1-1',
        timeOfDay: '',
        characterRoster: [],
        body: ''
      }
    }
    if (/^人物[：:]/.test(line)) {
      current.characterRoster = line
        .replace(/^人物[：:]\s*/, '')
        .split(/[，,、]/)
        .map((n) => n.trim())
      current.body += line + '\n'
      continue
    }
    current.body += line + '\n'
  }
  if (current) scenes.push(current)
  return scenes
}

function rebuildScreenplayFromScenes(scenes: RepairScene[], episodeNo: number): string {
  const parts = [`第${episodeNo}集`, '']
  for (const s of scenes) {
    parts.push(s.sceneHeading)
    if (s.characterRoster.length > 0) {
      parts.push(`人物：${s.characterRoster.join('，')}`)
    }
    parts.push((s.body || '').trim())
    parts.push('')
  }
  return parts.join('\n').trim()
}

// ── Core trim function ───────────────────────────────────────────────────────

function trimLastSceneBody(body: string, maxCompressionRatio = 0.3): {
  trimmed: string
  trimmedChars: number
} {
  const lines = body.split('\n')
  // Skip first 3 lines (opening beat protection)
  const midIndex = Math.max(3, Math.floor(lines.length * 0.4))
  const trimTargetLines: Array<{ index: number; line: string }> = []
  for (let i = midIndex; i < lines.length; i++) {
    if (isTrimTarget(lines[i])) {
      trimTargetLines.push({ index: i, line: lines[i] })
    }
  }
  if (trimTargetLines.length === 0) {
    return { trimmed: body, trimmedChars: 0 }
  }
  const maxCharsToRemove = Math.floor(body.length * maxCompressionRatio)
  let removedChars = 0
  const removeIndices = new Set<number>()
  for (const { index, line } of trimTargetLines) {
    if (removedChars + line.length > maxCharsToRemove) break
    removeIndices.add(index)
    removedChars += line.length
  }
  const trimmedLines = lines.map((line, i) => (removeIndices.has(i) ? '' : line))
  // Clean up blank lines but preserve structure
  const cleaned = trimmedLines.filter((line, i) => {
    if (line !== '') return true
    const prev = trimmedLines[i - 1]
    const next = trimmedLines[i + 1]
    return prev !== '' && next !== ''
  })
  return {
    trimmed: cleaned.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    trimmedChars: removedChars
  }
}

// ── Trim trigger whitelist / blocklist ─────────────────────────────────────────

/**
 * Problems that ARE allowed to coexist with word count in trim trigger.
 * These are "tail pollution" problems that trim might incidentally improve.
 */
const TRIM_OK_PROBLEMS = new Set([
  '含不可拍心理描写',
  '集尾钩子偏弱'
])

/**
 * Problems that BLOCK trim entirely — structural problems needing rewrite,
 * not tail cleanup. Trim cannot fix these; triggering would cause harm.
 */
const TRIM_BLOCKED_PROBLEMS = new Set([
  '至少有一场对白不足2句',
  '场次数不在2-4场',
  '至少有一场缺人物表',
  '至少有一场缺△动作',
  '正文含截断残句'
])

/**
 * Determine if trim is allowed to trigger for a given quality report.
 * Returns { allowed, reason } where reason explains why (for evidence).
 */
function checkTrimTrigger(report: ReturnType<typeof inspectScreenplayQualityEpisode>): {
  allowed: boolean
  reason: string
} {
  const wordCountProblems = report.problems.filter((p) => p.includes('字数'))
  if (wordCountProblems.length === 0) {
    return { allowed: false, reason: 'no_word_count_problem' }
  }

  const blocked = report.problems.filter((p) => TRIM_BLOCKED_PROBLEMS.has(p))
  if (blocked.length > 0) {
    return { allowed: false, reason: `blocked_by:${blocked.join(',')}` }
  }

  const nonWordProblems = report.problems.filter((p) => !p.includes('字数'))
  const notWhitelisted = nonWordProblems.filter((p) => !TRIM_OK_PROBLEMS.has(p))
  if (notWhitelisted.length > 0) {
    return { allowed: false, reason: `unlisted_problem:${notWhitelisted.join(',')}` }
  }

  return { allowed: true, reason: 'ok' }
}

/**
 * Minimal safety valve — trims explanation/recollection/summary tail from last scene.
 * Only triggers when: has word count problem + no blocked problems + non-word-count
 * problems are only from the OK whitelist.
 * Max 30% compression. Never touches dialogue, action, hooks, scene structure.
 */
export function trimLastSceneExcess(scene: ScriptSegmentDto): ScriptSegmentDto {
  const report = inspectScreenplayQualityEpisode(scene)
  if (report.charCount <= 1200) return scene
  const { allowed } = checkTrimTrigger(report)
  if (!allowed) return scene

  const screenplay = scene.screenplay || ''
  const scenes = parseScreenplayScenesForTrim(screenplay)
  if (scenes.length < 1) return scene

  const lastScene = scenes[scenes.length - 1]
  const { trimmed, trimmedChars } = trimLastSceneBody(lastScene.body || '', 0.3)

  if (trimmedChars === 0) return scene

  // Reconstruct: all scenes except last with original body, last with trimmed body
  const reconstructedScenes = scenes.map((s, i) =>
    i === scenes.length - 1 ? { ...s, body: trimmed } : s
  )
  const rebuiltScreenplay = rebuildScreenplayFromScenes(reconstructedScenes, scene.sceneNo)
  const extracted = extractStructuredSceneFromScreenplay(rebuiltScreenplay, scene.sceneNo)

  return {
    ...scene,
    screenplay: rebuiltScreenplay,
    screenplayScenes: extracted.screenplayScenes,
    legacyFormat: extracted.legacyFormat,
    action: extracted.action,
    dialogue: extracted.dialogue,
    emotion: extracted.emotion
  }
}

/**
 * Apply minimal trim to all episodes.
 * Returns the trimmed scenes and a summary including skip reasons when trim did not fire.
 */
export function applyMinimalTrim(
  scenes: ScriptSegmentDto[],
  env?: { E2E_CASE_ID?: string }
): {
  trimmedScenes: ScriptSegmentDto[]
  trimSummary: Array<{
    sceneNo: number
    beforeLen: number
    afterLen: number
    trimmedChars: number
    wasTrimmed: boolean
    skipReason?: string
    hitProblems?: string[]
  }>
} {
  const results: ReturnType<typeof trimLastSceneExcess>[] = []
  const summary: ReturnType<typeof applyMinimalTrim>['trimSummary'] = []

  for (const scene of scenes) {
    const before = scene.screenplay || ''
    const report = inspectScreenplayQualityEpisode(scene)
    const trigger = checkTrimTrigger(report)

    if (!trigger.allowed) {
      results.push(scene)
      summary.push({
        sceneNo: scene.sceneNo,
        beforeLen: before.length,
        afterLen: before.length,
        trimmedChars: 0,
        wasTrimmed: false,
        skipReason: trigger.reason,
        hitProblems: report.problems
      })

      // Write skip evidence for every non-triggered episode (synchronous, non-blocking)
      if (env?.E2E_CASE_ID) {
        writeTrimSkipEvidence(env.E2E_CASE_ID, scene.sceneNo, report, trigger.reason)
      }
      continue
    }

    const after = trimLastSceneExcess(scene)
    const afterLen = (after.screenplay || '').length
    const trimmedChars = before.length - afterLen
    results.push(after)
    summary.push({
      sceneNo: scene.sceneNo,
      beforeLen: before.length,
      afterLen,
      trimmedChars,
      wasTrimmed: trimmedChars > 0,
      hitProblems: report.problems
    })

    // Write trim evidence when trim fires (synchronous, non-blocking)
    if (env?.E2E_CASE_ID && trimmedChars > 0) {
      writeTrimEvidence(env.E2E_CASE_ID, scene.sceneNo, before, after.screenplay || '', {
        beforeLen: before.length,
        afterLen,
        trimmedChars
      })
    }
  }

  return { trimmedScenes: results, trimSummary: summary }
}

// ── Evidence helpers ──────────────────────────────────────────────────────────────

function writeTrimEvidence(
  caseId: string,
  episodeNo: number,
  before: string,
  after: string,
  meta: { beforeLen: number; afterLen: number; trimmedChars: number }
): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path')
    // Write trim evidence to the same directory as episode evidence
    const outDir = path.join(process.cwd(), 'tools', 'e2e', 'out', `evidence-${caseId}`)
    fs.writeFileSync(path.join(outDir, `ep${episodeNo}-trim-before.txt`), before, 'utf8')
    fs.writeFileSync(path.join(outDir, `ep${episodeNo}-trim-after.txt`), after, 'utf8')
    fs.writeFileSync(
      path.join(outDir, `ep${episodeNo}-trim-meta.json`),
      JSON.stringify({ sceneNo: episodeNo, ...meta }, null, 2),
      'utf8'
    )
  } catch {
    // non-blocking
  }
}

function writeTrimSkipEvidence(
  caseId: string,
  episodeNo: number,
  report: ReturnType<typeof inspectScreenplayQualityEpisode>,
  skipReason: string
): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path')
    // Write skip evidence to the same directory as episode evidence for easier verification
    const outDir = path.join(process.cwd(), 'tools', 'e2e', 'out', `evidence-${caseId}`)
    fs.writeFileSync(
      path.join(outDir, `ep${episodeNo}-skip.json`),
      JSON.stringify(
        {
          sceneNo: episodeNo,
          skipReason,
          charCount: report.charCount,
          sceneCount: report.sceneCount,
          hitProblems: report.problems
        },
        null,
        2
      ),
      'utf8'
    )
  } catch {
    // non-blocking
  }
}
