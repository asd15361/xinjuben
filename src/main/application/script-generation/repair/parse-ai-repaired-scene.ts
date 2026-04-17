import { extractSceneSections } from '../scene/extract-scene-sections.ts'
import {
  extractStructuredSceneFromScreenplay,
  looksLikeScreenplayFormat,
  parseScreenplayScenes
} from '../../../../shared/domain/script/screenplay-format.ts'
import type { ScriptSegmentDto } from '../../../../shared/contracts/workflow.ts'

// Strips residual A/D/E section markers that may contaminate extracted content
const ADERESIDUE = /^[ \t]*(?:Action|action|Dialogue|dialogue|Emotion|emotion)[：:][ \t]*$/gmu

// Detects ellipsis-compressed drafts where most content lines end with …
const ELLIPSIS尾 = /\…$/

function isEllipsisCompressedDraft(text: string): boolean {
  const lines = text.split('\n').filter((l) => l.trim())
  if (lines.length < 3) return false
  const ellipsisLines = lines.filter((l) => ELLIPSIS尾.test(l))
  return ellipsisLines.length >= 3
}

function stripADEResidue(text: string): string {
  return text.replace(ADERESIDUE, '').replace(/\n{3,}/g, '\n\n').trim()
}

function rebuildScreenplayFromADESections(
  sceneNo: number,
  action: string,
  dialogue: string,
  emotion: string
): { screenplay: string; screenplayScenes: ReturnType<typeof parseScreenplayScenes> } {
  const cleanAction = stripADEResidue(action)
  const cleanDialogue = stripADEResidue(dialogue)
  const cleanEmotion = stripADEResidue(emotion)

  const charNames: string[] = []
  for (const line of cleanDialogue.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const match = trimmed.match(/^([^\s△：:（）()]{1,16})[：:]/)
    if (match) charNames.push(match[1])
  }
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

  return { screenplay, screenplayScenes }
}

/**
 * Parse AI-repaired scene output.
 *
 * The repair contract expects A/D/E format. If the repair output contains scene headings,
 * it is treated as screenplay (multi-scene capable). Otherwise, A/D/E content is
 * used to rebuild a single-scene screenplay.
 *
 * Returns action/dialogue/emotion (always) plus screenplay/screenplayScenes (refreshed).
 */
export function parseAiRepairedScene(text: string, fallbackScene: ScriptSegmentDto): ScriptSegmentDto {
  // Reject ellipsis-compressed drafts before any other processing
  if (isEllipsisCompressedDraft(text)) {
    throw new Error('repair_scene_parse_failed')
  }

  // If the repaired text looks like screenplay (has headings), use screenplay path
  if (looksLikeScreenplayFormat(text)) {
    try {
      const structured = extractStructuredSceneFromScreenplay(text, fallbackScene.sceneNo)
      return {
        sceneNo: fallbackScene.sceneNo,
        action: structured.action ?? fallbackScene.action,
        dialogue: structured.dialogue ?? fallbackScene.dialogue,
        emotion: structured.emotion ?? fallbackScene.emotion,
        screenplay: structured.screenplay,
        screenplayScenes: structured.screenplayScenes,
        legacyFormat: false
      }
    } catch {
      throw new Error('repair_scene_parse_failed')
    }
  }

  // A/D/E path
  const sections = extractSceneSections(text)
  if (!sections?.action || !sections.dialogue || !sections.emotion) {
    throw new Error('repair_scene_parse_failed')
  }

  const { screenplay, screenplayScenes } = rebuildScreenplayFromADESections(
    fallbackScene.sceneNo,
    sections.action,
    sections.dialogue,
    sections.emotion
  )

  return {
    sceneNo: fallbackScene.sceneNo,
    action: sections.action,
    dialogue: sections.dialogue,
    emotion: sections.emotion,
    screenplay,
    screenplayScenes,
    legacyFormat: false
  }
}
