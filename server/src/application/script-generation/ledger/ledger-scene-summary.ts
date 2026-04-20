import type { ScriptSegmentDto } from '@shared/contracts/workflow'

function clipText(value: string, maxLength: number): string {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(20, maxLength - 1)).trim()}…`
}

function pickSummaryLines(text: string, limit: number): string[] {
  return text
    .split(/[。！？!?；\n]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^\d+-\d+(\s|$)/.test(line))
    .filter((line) => !/^第[一二三四五六七八九十百零\d]+集$/.test(line))
    .filter((line) => !/^人物[:：]/.test(line))
    .slice(0, limit)
}

export function summarizeSceneFragment(
  scene: ScriptSegmentDto | undefined,
  options?: {
    maxLength?: number
    sentenceLimit?: number
    fallback?: string
  }
): string {
  const maxLength = options?.maxLength ?? 120
  const sentenceLimit = options?.sentenceLimit ?? 3
  const fallback = options?.fallback ?? '待补'

  if (!scene) return fallback

  const screenplaySummary = (scene.screenplayScenes || [])
    .slice(0, sentenceLimit)
    .map((item) => clipText(String(item.body || '').replace(/\s+/g, ' ').trim(), 40))
    .filter(Boolean)
    .join('；')
  if (screenplaySummary) return clipText(screenplaySummary, maxLength)

  const screenplayLines = pickSummaryLines(String(scene.screenplay || ''), sentenceLimit).filter(
    (line) => !/^第[一二三四五六七八九十百零\d]+集$/.test(line) && !/^人物[:：]/.test(line)
  )
  if (screenplayLines.length > 0) return clipText(screenplayLines.join('；'), maxLength)

  const mixed = pickSummaryLines(
    [scene.action, scene.dialogue, scene.emotion].join('\n'),
    sentenceLimit
  )
  if (mixed.length > 0) return clipText(mixed.join('；'), maxLength)

  return fallback
}
