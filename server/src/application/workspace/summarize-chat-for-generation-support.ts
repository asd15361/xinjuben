import type { StoryIntentPackageDto } from '../../shared/contracts/intake'

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function uniqueList(values: string[], limit = 8): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    if (seen.has(value)) continue
    seen.add(value)
    result.push(value)
    if (result.length >= limit) break
  }
  return result
}

function extractSectionBody(source: string, title: string): string {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`【${escaped}】([\\s\\S]*?)(?=\\n【|$)`, 'm')
  const match = source.match(pattern)
  return match?.[1]?.trim() || ''
}

function parseCharacterCards(source: string): Array<{ name: string; summary: string }> {
  const body = extractSectionBody(source, '角色卡')
  if (!body) return []

  const lines = body
    .split('\n')
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)

  return lines
    .map((line) => {
      const parts = line.split(/[:：]/)
      const name = cleanText(parts[0])
      const summary = cleanText(parts.slice(1).join('：'))
      return name ? { name, summary } : null
    })
    .filter((item): item is { name: string; summary: string } => Boolean(item))
}

function parseCharacterLayers(source: string): Array<{ name: string; layer: string; duty: string }> {
  const body = extractSectionBody(source, '人物分层')
  if (!body) return []

  const lines = body
    .split('\n')
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)

  return lines
    .map((line) => {
      const parts = line.split(/[:：]/)
      const name = cleanText(parts[0])
      const rest = cleanText(parts.slice(1).join('：'))
      if (!name) return null
      const [layer, ...dutyParts] = rest.split(/[|｜]/)
      return {
        name,
        layer: cleanText(layer),
        duty: cleanText(dutyParts.join('｜'))
      }
    })
    .filter((item): item is { name: string; layer: string; duty: string } => Boolean(item))
}

function parseEpisodeCount(text: string): number {
  const match = text.match(/(\d+)\s*集/)
  const count = Number(match?.[1] || 0)
  return Number.isFinite(count) && count > 0 ? count : 10
}

export function parseStructuredGenerationBrief(
  chatTranscript: string
): Record<string, unknown> | null {
  const source = typeof chatTranscript === 'string' ? chatTranscript : ''
  if (!source.includes('【项目】') || !source.includes('【主角】')) return null

  const projectTitle = cleanText(extractSectionBody(source, '项目'))
  const protagonist = cleanText(extractSectionBody(source, '主角'))
  const antagonist = cleanText(extractSectionBody(source, '对手'))
  const coreConflict = cleanText(extractSectionBody(source, '核心冲突'))
  const sellingPremise = cleanText(extractSectionBody(source, '设定成交句'))
  const endingDirection = cleanText(extractSectionBody(source, '结局方向'))
  const keyCharacters = uniqueList(
    cleanText(extractSectionBody(source, '关键角色'))
      .split(/[、,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean),
    10
  )

  const characterCards = parseCharacterCards(source)
  const characterLayers = parseCharacterLayers(source)

  const storyIntent: Partial<StoryIntentPackageDto> = {
    titleHint: projectTitle,
    protagonist,
    antagonist,
    coreConflict,
    sellingPremise,
    endingDirection,
    officialKeyCharacters: keyCharacters
  }

  return {
    projectTitle,
    episodeCount: parseEpisodeCount(source),
    protagonist,
    antagonist,
    coreConflict,
    sellingPremise,
    endingDirection,
    keyCharacters,
    characterCards,
    characterLayers,
    storyIntent,
    generationBrief: {
      projectTitle,
      protagonist,
      antagonist,
      coreConflict,
      sellingPremise,
      endingDirection,
      characterCards,
      characterLayers
    }
  }
}
