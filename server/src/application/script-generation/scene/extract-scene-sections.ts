export interface ExtractedSceneSections {
  action: string
  dialogue: string
  emotion: string
}

interface SectionMarkerMatch {
  key: keyof ExtractedSceneSections
  index: number
  contentStart: number
}

const SECTION_PATTERNS: Array<{ key: keyof ExtractedSceneSections; pattern: RegExp }> = [
  {
    key: 'action',
    pattern:
      /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*{1,2}\s*)?(?:第?\s*\d+\s*[.)、:：-]?\s*)?(?:Action|动作|舞台动作|场景动作)(?:\s*\*{1,2})?\s*(?:[:：]|$)/gi
  },
  {
    key: 'dialogue',
    pattern:
      /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*{1,2}\s*)?(?:第?\s*\d+\s*[.)、:：-]?\s*)?(?:Dialogue|对白|台词)(?:\s*\*{1,2})?\s*(?:[:：]|$)/gi
  },
  {
    key: 'emotion',
    pattern:
      /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*{1,2}\s*)?(?:第?\s*\d+\s*[.)、:：-]?\s*)?(?:Emotion|情绪|情感|情绪推进)(?:\s*\*{1,2})?\s*(?:[:：]|$)/gi
  }
]

function stripMarkerLine(value: string): string {
  return value
    .replace(/^\s*(?:#{1,6}\s*)?/, '')
    .replace(/^\*{1,2}\s*/, '')
    .replace(/\s*\*{1,2}\s*$/, '')
    .replace(/^\s*第?\s*\d+\s*[.)、:：-]?\s*/, '')
    .trim()
}

function normalizeBlocks(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
}

function looksLikeDialogue(block: string): boolean {
  return /[\u4e00-\u9fa5A-Za-z0-9]+[：:][^\n]+/.test(block) || /"\u201c[^"]+""|"[^"]+"/.test(block)
}

function looksLikeEmotion(block: string): boolean {
  return /(情绪|情感|心头|心里|胸口|愤怒|恐惧|失望|惊惧|钝痛|压抑|崩塌|发酸|发紧|一颤|心头一紧)/.test(block)
}

function extractByBlockFallback(text: string): ExtractedSceneSections | null {
  const blocks = normalizeBlocks(text)
    .map((block) => block.split('\n').filter((line) => !/^(Action|动作|舞台动作|场景动作|Dialogue|对白|台词|Emotion|情绪|情感|情绪推进)\b/i.test(stripMarkerLine(line))).join('\n').trim())
    .filter(Boolean)

  if (blocks.length < 3) return null

  const dialogueIndex = blocks.findIndex((block) => looksLikeDialogue(block))
  const emotionIndex = blocks.findIndex((block, index) => index !== dialogueIndex && looksLikeEmotion(block))

  if (dialogueIndex === -1 || emotionIndex === -1) return null

  const actionIndex = blocks.findIndex((_, index) => index !== dialogueIndex && index !== emotionIndex)
  if (actionIndex === -1) return null

  const action = blocks[actionIndex]
  const dialogue = blocks[dialogueIndex]
  const emotion = blocks[emotionIndex]
  if (!action || !dialogue || !emotion) return null

  return { action, dialogue, emotion }
}

function collectSectionMarkers(text: string): SectionMarkerMatch[] {
  const normalizedText = text.replace(/\r\n/g, '\n')
  const matches: SectionMarkerMatch[] = []

  SECTION_PATTERNS.forEach(({ key, pattern }) => {
    pattern.lastIndex = 0
    for (const match of normalizedText.matchAll(pattern)) {
      if (typeof match.index !== 'number') continue
      matches.push({
        key,
        index: match.index,
        contentStart: match.index + match[0].length
      })
    }
  })

  return matches.sort((left, right) => left.index - right.index)
}

export function extractSceneSections(text: string): ExtractedSceneSections | null {
  const normalizedText = text.replace(/\r\n/g, '\n')
  const markers = collectSectionMarkers(normalizedText)

  for (const actionMarker of markers.filter((item) => item.key === 'action')) {
    const dialogueMarker = markers.find((item) => item.key === 'dialogue' && item.index > actionMarker.index)
    if (!dialogueMarker) continue

    const emotionMarker = markers.find((item) => item.key === 'emotion' && item.index > dialogueMarker.index)
    if (!emotionMarker) continue

    const action = normalizedText.slice(actionMarker.contentStart, dialogueMarker.index).trim()
    const dialogue = normalizedText.slice(dialogueMarker.contentStart, emotionMarker.index).trim()
    const emotion = normalizedText.slice(emotionMarker.contentStart).trim()

    if (!action || !dialogue || !emotion) {
      continue
    }

    return {
      action,
      dialogue,
      emotion
    }
  }

  return extractByBlockFallback(normalizedText)
}
