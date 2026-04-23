import { extractSceneSections } from '../scene/extract-scene-sections'
import {
  extractStructuredSceneFromScreenplay,
  looksLikeScreenplayFormat,
  parseScreenplayScenes
} from '@shared/domain/script/screenplay-format'
import type { ScriptSegmentDto } from '@shared/contracts/workflow'

// Strips residual A/D/E section markers that may contaminate extracted content
// when the model generates "Action:" / "Dialogue:" / "Emotion:" as part of character speech
const ADERESIDUE = /^[ \t]*(?:Action|action|Dialogue|dialogue|Emotion|emotion)[：:][ \t]*$/gmu

function stripADEResidue(text: string): string {
  return text
    .replace(ADERESIDUE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractCharacterNamesFromDialogue(dialogue: string): string[] {
  const names = new Set<string>()
  for (const line of dialogue.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const match = trimmed.match(/^([^\s△：:（）()]{1,16})[：:]/)
    if (match) names.add(match[1])
  }
  return Array.from(names)
}

/**
 * Parse a generated scene from raw model output.
 *
 * Routing priority (Plan A — screenplay-first):
 * 1. Route 1.5 [sceneCount CLOSURE]: If raw text contains ≥2 scene headings → treat as
 *    screenplay → preserve multi-scene. This bypasses the hasPollutedContent gate (which
 *    rejects A/D/E+heading mixes) and fixes the ep2/ep4/ep5/ep6/ep7 multi-scene collapse.
 * 2. If raw text looks like screenplay format (第X集 + headings, no polluted markers)
 *    → extractStructuredSceneFromScreenplay
 * 3. If raw text has A/D/E structure but no headings → A/D/E path → single-scene rebuild
 * 4. Otherwise → try screenplay parsing as fallback
 *
 * sceneCount CLOSURE confirmed:
 * - Route 1.5 (≥2 headings) covers inputs where real model outputs headings + A/D/E markers.
 * - Repair chain protection: executeScriptRepair only overwrites screenplayScenes when
 *   looksLikeScreenplayFormat(rawText) === true (A/D/E repair outputs return false).
 * - Representative evidence: ep7 (GEN=2, REPAIR throws → screenplayScenes preserved).
 */
export function parseGeneratedScene(text: string, sceneNo: number): ScriptSegmentDto {
  // Normalize text by stripping ** bold markers that wrap scene headings (e.g. "**6-1 日**").
  // Without this, the Route 1.5 regex fails to find headings that the model wraps in markdown bold.
  const normalizedText = text.replace(/\*\*([^\n]+)\*\*/g, '$1')

  // Route 1: ≥2 scene headings → screenplay path directly (bypasses hasPollutedContent gate)
  // Real model output has headings + A/D/E markers but no 第X集 → hasPollutedContent rejects it
  const headingMatches = normalizedText.match(/(?:^|\n)\d+-\d+\s+/g) || []
  if (headingMatches.length >= 2) {
    return {
      sceneNo,
      ...extractStructuredSceneFromScreenplay(normalizedText, sceneNo)
    }
  }

  // Route 2: looks like screenplay (第X集 + clean content) → preserve multi-scene
  // Use normalizedText because episode/scene headings may be wrapped in **bold** markers
  if (looksLikeScreenplayFormat(normalizedText)) {
    return {
      sceneNo,
      ...extractStructuredSceneFromScreenplay(normalizedText, sceneNo)
    }
  }

  // Route 3: A/D/E structure without headings → single-scene rebuild
  const sections = extractSceneSections(text)
  if (sections) {
    const cleanAction = stripADEResidue(sections.action)
    const cleanDialogue = stripADEResidue(sections.dialogue)
    const cleanEmotion = stripADEResidue(sections.emotion)

    const charNames = extractCharacterNamesFromDialogue(cleanDialogue)
    const charRoster = charNames.length > 0 ? `人物：${charNames.join('、')}` : '人物：待补'

    const actionContent = cleanAction.replace(/^△/, '').trim()
    const emotionContent = cleanEmotion.replace(/^△/, '').trim()

    const heading = `${sceneNo}-1 日`
    const screenplayParts = [`第${sceneNo}集`, '', heading, charRoster]
    if (actionContent) screenplayParts.push('', `△${actionContent}`)
    if (cleanDialogue) screenplayParts.push('', cleanDialogue)
    if (emotionContent) screenplayParts.push('', `△${emotionContent}`)
    const screenplay = screenplayParts.join('\n').trim()

    const screenplayScenes = parseScreenplayScenes(screenplay)

    return {
      sceneNo,
      action: sections.action,
      dialogue: sections.dialogue,
      emotion: sections.emotion,
      screenplay,
      screenplayScenes
    }
  }

  // Route 3: fallback — try screenplay parsing on raw text
  return {
    sceneNo,
    ...extractStructuredSceneFromScreenplay(text, sceneNo)
  }
}
