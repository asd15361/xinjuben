/**
 * Legacy Adapter Read-Only Boundary
 * ==================================
 * This file provides text extraction functions for ScriptSegmentDto.
 *
 * FIELD HIERARCHY:
 * - `screenplay` is the PRIMARY body text and takes priority over legacy fields
 * - `legacyFormat` is migration-display-only and must NOT influence decisions
 * - `action`, `dialogue`, `emotion` are legacy fields — conversion output only
 *
 * READ-ONLY RULE:
 * Legacy fields (action/dialogue/emotion) are ONLY used as fallbacks when
 * `screenplay` is empty. They must NOT drive repair/audit/gate/main flow decisions.
 *
 * All decision-making functions must prefer `screenplay` first.
 */
import type { ScriptSegmentDto } from '../../contracts/workflow.ts'

function compact(text: string): string {
  return text.replace(/\s+/g, '').trim()
}

function normalize(text: string): string {
  return text.replace(/\r\n/g, '\n').trim()
}

function splitScreenplayLines(screenplay: string): string[] {
  return normalize(screenplay)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function legacyText(scene: Pick<ScriptSegmentDto, 'action' | 'dialogue' | 'emotion'>): string {
  return [scene.action, scene.dialogue, scene.emotion].filter(Boolean).join('\n').trim()
}

export function getScriptSegmentBodyText(
  scene: Pick<ScriptSegmentDto, 'screenplay' | 'action' | 'dialogue' | 'emotion'>
): string {
  return normalize(scene.screenplay || '') || legacyText(scene)
}

export function getScriptSegmentSearchText(
  scene: Pick<ScriptSegmentDto, 'screenplay' | 'action' | 'dialogue' | 'emotion'>
): string {
  const screenplay = normalize(scene.screenplay || '')
  if (screenplay) return screenplay
  return legacyText(scene)
}

export function getScriptSegmentNormalizedSignature(
  scene: Pick<ScriptSegmentDto, 'screenplay' | 'action' | 'dialogue' | 'emotion'>
): string {
  return compact(getScriptSegmentSearchText(scene))
}

export function getScriptSegmentOpeningAction(
  scene: Pick<ScriptSegmentDto, 'screenplay' | 'action'>
): string {
  // Prefer screenplay over legacy action field
  const screenplayLines = splitScreenplayLines(scene.screenplay || '')
  const screenplayAction = screenplayLines.find((line) => line.startsWith('△'))
  if (screenplayAction) return screenplayAction.replace(/^△/, '').trim()

  // Legacy fallback only when screenplay is empty
  return (
    normalize(scene.action || '')
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean) || ''
  )
}

export function getScriptSegmentHookText(
  scene: Pick<ScriptSegmentDto, 'screenplay' | 'action' | 'dialogue' | 'emotion'>
): string {
  const screenplayLines = splitScreenplayLines(scene.screenplay || '')
    .filter((line) => !/^第.+集$/.test(line) && !/^人物[：:]/.test(line))
    .reverse()
  const screenplayHook = screenplayLines.find(
    (line) => line.startsWith('△') || /^[^\s△：:（）()]{1,16}[：:]/.test(line)
  )
  if (screenplayHook) return screenplayHook.replace(/^△/, '').trim()

  return (
    normalize(scene.dialogue || '') ||
    normalize(scene.action || '') ||
    normalize(scene.emotion || '')
  )
}
