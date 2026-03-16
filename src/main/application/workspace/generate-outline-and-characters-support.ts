import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import { generateTextWithRuntimeRouter } from '../ai/generate-text'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import type { CharacterDraftDto } from '../../../shared/contracts/workflow'
import { parseCharacterBundleText } from './parse-character-bundle'
import { buildCharacterGenerationPrompt, buildOutlineGenerationPrompt } from './generation-stage-prompts'
import { parseStructuredGenerationBrief } from './summarize-chat-for-generation-support'

const OUTLINE_BUNDLE_STAGE_TIMEOUT_MS = 45_000
const CHARACTER_BUNDLE_STAGE_TIMEOUT_MS = 45_000

export interface OutlineBundlePayload {
  storyIntent?: Partial<StoryIntentPackageDto>
  outline?: {
    title?: string
    genre?: string
    theme?: string
    protagonist?: string
    mainConflict?: string
    summary?: string
    episodes?: Array<{
      episodeNo?: number
      summary?: string
    }>
    facts?: Array<{
      label?: string
      description?: string
      level?: 'core' | 'supporting'
      linkedToPlot?: boolean
      linkedToTheme?: boolean
    }>
  }
}

interface CharacterBundlePayload {
  characters?: CharacterDraftDto[]
}

function cleanJsonLikeText(text: string): string {
  return text
    .replace(/```json|```/gi, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/：/g, ':')
    .replace(/，/g, ',')
    .replace(/\u00A0/g, ' ')
    .replace(/,\s*([}\]])/g, '$1')
    .trim()
}

function tryParseObject(text: string): Record<string, unknown> | null {
  const normalized = cleanJsonLikeText(text)
  const firstBrace = normalized.indexOf('{')
  if (firstBrace < 0) return null

  for (let end = normalized.lastIndexOf('}'); end > firstBrace; end = normalized.lastIndexOf('}', end - 1)) {
    const slice = normalized.slice(firstBrace, end + 1)
    try {
      const parsed = JSON.parse(slice)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      continue
    }
  }

  return null
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => toStringOrEmpty(item)).filter(Boolean)
}

function pickFirstMatch(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const hit = text.match(pattern)?.[1]?.trim()
    if (hit) return hit
  }
  return ''
}

function normalizePossibleName(raw: string): string {
  const text = raw.trim()
  if (!text) return ''
  const exact = text.match(/^([一-龥]{2,3}?)(曾|是|被|要|拿|压|想|手|藏|表|实|让|给)/)
  if (exact?.[1]) return exact[1]
  const short = text.match(/^([一-龥]{2,3})/)
  if (short?.[1]) return short[1]
  return text.split(/[，,。；、\s]/)[0]?.trim() || ''
}

function inferProtectTarget(text: string): string {
  if (text.includes('小姨') && text.includes('弟弟')) return '小姨和弟弟'
  if (text.includes('小柔')) return '小柔'
  if (text.includes('家人')) return '家人'
  return ''
}

function inferKeyAsset(text: string): string {
  if (text.includes('原始证据')) return '原始证据'
  if (text.includes('U盘') || text.includes('u盘')) return 'U盘证据'
  if (text.includes('钥匙')) return '密库钥匙'
  if (text.includes('婚约')) return '婚约真相'
  return ''
}

function inferFromTranscript(chatTranscript: string): Partial<StoryIntentPackageDto> {
  const lines = chatTranscript
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const merged = lines.join(' ')
  const protagonist = normalizePossibleName(
    pickFirstMatch(merged, [
      /主角[：: ]*([^\n]+)/,
      /男主[：: ]*([^\n]+)/,
      /女主[：: ]*([^\n]+)/,
      /男主([^\n]+)/,
      /女主([^\n]+)/
    ])
  )
  const antagonist = normalizePossibleName(
    pickFirstMatch(merged, [/反派[：: ]*([^\n]+)/, /反派([^\n]+)/])
  )
  const genre = merged.includes('古装')
    ? '古装'
    : merged.includes('都市')
      ? '都市'
      : merged.includes('悬疑')
        ? '悬疑'
        : ''
  const protectTarget = inferProtectTarget(merged)
  const keyAsset = inferKeyAsset(merged)
  const conflictSummary =
    protagonist && antagonist
      ? `${protagonist}${keyAsset ? `手里握着${keyAsset}，` : ''}却被${antagonist}${protectTarget ? `拿${protectTarget}` : '持续'}施压，必须在守住重要的人和启动翻盘之间做选择。`
      : merged.slice(0, 120)

  return {
    titleHint: protagonist ? `《${protagonist}》` : '',
    genre,
    tone: '',
    audience: '',
    protagonist,
    antagonist,
    coreConflict: conflictSummary,
    endingDirection: '',
    officialKeyCharacters: toStringArray([protagonist, antagonist, protectTarget]),
    lockedCharacterNames: toStringArray([protagonist, antagonist]),
    themeAnchors: [],
    worldAnchors: [],
    relationAnchors: toStringArray([protectTarget ? `${protagonist}想守住${protectTarget}` : '']),
    dramaticMovement: [],
    manualRequirementNotes: '',
    freeChatFinalSummary: [merged.slice(0, 220), conflictSummary].filter(Boolean).join(' ')
  }
}

export function buildFallbackStoryIntent(chatTranscript: string): StoryIntentPackageDto {
  const structured = parseStructuredGenerationBrief(chatTranscript)
  if (structured?.storyIntent && typeof structured.storyIntent === 'object') {
    const storyIntent = structured.storyIntent as Partial<StoryIntentPackageDto>
    return {
      titleHint: storyIntent.titleHint || '',
      genre: storyIntent.genre || '',
      tone: storyIntent.tone || '',
      audience: storyIntent.audience || '',
      protagonist: storyIntent.protagonist || '',
      antagonist: storyIntent.antagonist || '',
      coreConflict: storyIntent.coreConflict || '',
      endingDirection: storyIntent.endingDirection || '',
      officialKeyCharacters: storyIntent.officialKeyCharacters || [],
      lockedCharacterNames: storyIntent.lockedCharacterNames || [],
      themeAnchors: storyIntent.themeAnchors || [],
      worldAnchors: storyIntent.worldAnchors || [],
      relationAnchors: storyIntent.relationAnchors || [],
      dramaticMovement: storyIntent.dramaticMovement || [],
      manualRequirementNotes: storyIntent.manualRequirementNotes || '',
      freeChatFinalSummary: storyIntent.freeChatFinalSummary || ''
    }
  }

  const inferred = inferFromTranscript(chatTranscript)
  return {
    titleHint: inferred.titleHint || '',
    genre: inferred.genre || '',
    tone: inferred.tone || '',
    audience: inferred.audience || '',
    protagonist: inferred.protagonist || '',
    antagonist: inferred.antagonist || '',
    coreConflict: inferred.coreConflict || '',
    endingDirection: inferred.endingDirection || '',
    officialKeyCharacters: inferred.officialKeyCharacters || [],
    lockedCharacterNames: inferred.lockedCharacterNames || [],
    themeAnchors: inferred.themeAnchors || [],
    worldAnchors: inferred.worldAnchors || [],
    relationAnchors: inferred.relationAnchors || [],
    dramaticMovement: inferred.dramaticMovement || [],
    manualRequirementNotes: inferred.manualRequirementNotes || '',
    freeChatFinalSummary: inferred.freeChatFinalSummary || chatTranscript.slice(0, 220)
  }
}

export async function generateOutlineBundle(input: {
  generationBriefText: string
  runtimeConfig: RuntimeProviderConfig
}): Promise<OutlineBundlePayload | null> {
  const prompt = buildOutlineGenerationPrompt(input.generationBriefText)

  const result = await generateTextWithRuntimeRouter(
    {
      task: 'decision_assist',
      prompt,
      allowFallback: true,
      temperature: 0.5,
      timeoutMs: OUTLINE_BUNDLE_STAGE_TIMEOUT_MS
    },
    input.runtimeConfig
  )

  const parsed = tryParseObject(result.text)
  return parsed as OutlineBundlePayload | null
}

export async function generateCharacterBundle(input: {
  generationBriefText: string
  runtimeConfig: RuntimeProviderConfig
  storyIntent: StoryIntentPackageDto
  outlineSummary: string
}): Promise<CharacterBundlePayload | null> {
  const prompt = buildCharacterGenerationPrompt({
    generationBriefText: input.generationBriefText,
    protagonist: input.storyIntent.protagonist || '',
    antagonist: input.storyIntent.antagonist || '',
    conflict: input.storyIntent.coreConflict || '',
    outlineSummary: input.outlineSummary
  })

  const result = await generateTextWithRuntimeRouter(
    {
      task: 'decision_assist',
      prompt,
      allowFallback: true,
      temperature: 0.5,
      timeoutMs: CHARACTER_BUNDLE_STAGE_TIMEOUT_MS
    },
    input.runtimeConfig
  )

  return parseCharacterBundleText(result.text)
}
