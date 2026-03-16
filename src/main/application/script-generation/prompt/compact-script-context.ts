import type { StartScriptGenerationInputDto } from '../../../../shared/contracts/script-generation'
import type { CharacterDraftDto, DetailedOutlineSegmentDto } from '../../../../shared/contracts/workflow'

function clipText(value: string, maxLength: number): string {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(20, maxLength - 1)).trim()}…`
}

export function buildCompactedStoryIntentBlock(input: StartScriptGenerationInputDto): string {
  const maxChars = input.plan.runtimeProfile.maxStoryIntentChars
  const raw = [
    input.storyIntent?.titleHint,
    input.storyIntent?.genre,
    input.storyIntent?.tone,
    input.storyIntent?.coreConflict,
    input.storyIntent?.manualRequirementNotes,
    input.storyIntent?.freeChatFinalSummary,
    ...(input.storyIntent?.themeAnchors || []),
    ...(input.storyIntent?.worldAnchors || []),
    ...(input.storyIntent?.relationAnchors || []),
    ...(input.storyIntent?.dramaticMovement || [])
  ]
    .filter(Boolean)
    .join('｜')

  if (!raw.trim()) return '故事意图摘要：当前未提供额外 story intent。'
  return `故事意图摘要：${clipText(raw, maxChars)}`
}

export function buildCompactedCharacterBlock(input: {
  characters: CharacterDraftDto[]
  maxChars: number
}): string {
  let remaining = input.maxChars
  const rows: string[] = []

  for (const character of input.characters) {
    const line = [
      character.name || '未命名角色',
      character.protectTarget ? `最想守=${character.protectTarget}` : '',
      character.fear ? `最怕=${character.fear}` : '',
      character.conflictTrigger ? `炸点=${character.conflictTrigger}` : '',
      character.goal ? `目标=${character.goal}` : '',
      character.advantage ? `优势=${character.advantage}` : '',
      character.weakness ? `短板=${character.weakness}` : '',
      character.arc ? `弧光=${character.arc}` : ''
    ]
      .filter(Boolean)
      .join('｜')
    const clipped = clipText(line, Math.min(220, remaining))
    if (!clipped) continue
    rows.push(`- ${clipped}`)
    remaining -= clipped.length
    if (remaining <= 80 || rows.length >= 8) break
  }

  if (rows.length === 0) return '人物压缩包：当前没有可用人物上下文。'
  return ['人物压缩包：', ...rows].join('\n')
}

export function buildCompactedSegmentBlock(input: {
  segments: DetailedOutlineSegmentDto[]
  maxChars: number
}): string {
  let remaining = input.maxChars
  const rows: string[] = []

  for (const segment of input.segments) {
    const line = clipText(
      `${segment.act}｜${segment.content || '待补内容'}${segment.hookType ? `｜钩子=${segment.hookType}` : ''}`,
      Math.min(260, remaining)
    )
    if (!line) continue
    rows.push(`- ${line}`)
    remaining -= line.length
    if (remaining <= 80 || rows.length >= 4) break
  }

  if (rows.length === 0) return '详纲压缩包：当前没有可用详纲上下文。'
  return ['详纲压缩包：', ...rows].join('\n')
}
