function compactLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

type SpeakerRole = 'user' | 'assistant' | 'unknown'

function stripSpeakerPrefix(line: string): { role: SpeakerRole; text: string } {
  const normalized = line.trim()
  if (normalized.startsWith('用户：') || normalized.startsWith('用户:')) {
    return { role: 'user', text: compactLine(normalized.replace(/^用户[：:]\s*/, '')) }
  }
  if (normalized.startsWith('剧情执笔人：') || normalized.startsWith('剧情执笔人:')) {
    return { role: 'assistant', text: compactLine(normalized.replace(/^剧情执笔人[：:]\s*/, '')) }
  }
  return { role: 'unknown', text: compactLine(normalized) }
}

export function normalizeChatTranscriptForGeneration(chatTranscript: string): string {
  const lines = chatTranscript
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return ''

  const grouped: Array<{ role: SpeakerRole; lines: string[] }> = []

  for (const rawLine of lines) {
    const parsed = stripSpeakerPrefix(rawLine)
    const last = grouped[grouped.length - 1]

    if (parsed.role === 'unknown') {
      if (last) {
        last.lines.push(parsed.text)
      } else {
        grouped.push({ role: 'unknown', lines: [parsed.text] })
      }
      continue
    }

    grouped.push({ role: parsed.role, lines: [parsed.text] })
  }

  const userBlocks = grouped
    .filter((block) => block.role === 'user')
    .map((block) => block.lines.map(compactLine).filter(Boolean).join('\n'))
    .filter(Boolean)

  if (userBlocks.length > 0) {
    return userBlocks.join('\n')
  }

  return grouped
    .filter((block) => block.role !== 'assistant')
    .map((block) => block.lines.map(compactLine).filter(Boolean).join('\n'))
    .filter(Boolean)
    .join('\n')
}
