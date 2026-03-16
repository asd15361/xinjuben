import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import { generateTextWithRuntimeRouter } from '../ai/generate-text'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import type { CharacterDraftDto, DetailedOutlineSegmentDto, OutlineDraftDto } from '../../../shared/contracts/workflow'
import { ensureOutlineEpisodeShape } from '../../../shared/domain/workflow/outline-episodes'
import { buildDetailedOutlinePrompt } from './generation-stage-prompts'

interface DetailedOutlinePayload {
  opening?: string
  midpoint?: string
  climax?: string
  ending?: string
}

type DetailedAct = 'opening' | 'midpoint' | 'climax' | 'ending'

function normalizeWhitespace(text: string): string {
  return text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim()
}

function countSentenceLikeParts(text: string): number {
  return text
    .split(/[。！？!?]\s*/)
    .map((part) => part.trim())
    .filter(Boolean).length
}

function safeJsonParse(text: string): unknown {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  const slice = start >= 0 && end >= 0 ? text.slice(start, end + 1) : text
  const normalized = slice
    .replace(/```json|```/gi, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/：/g, ':')
    .replace(/，/g, ',')
    .replace(/\u00A0/g, ' ')
    .replace(/,\s*([}\]])/g, '$1')

  return JSON.parse(normalized)
}

function pickConflictAsset(text: string): string {
  if (text.includes('密库钥匙')) return '密库钥匙'
  if (text.includes('钥匙')) return '钥匙'
  if (text.includes('戏本秘密')) return '戏本秘密'
  if (text.includes('源代码')) return '源代码'
  if (text.includes('证据')) return '关键证据'
  return '关键底牌'
}

function pickCharacter(input: {
  characters: CharacterDraftDto[]
  preferredName?: string
  matcher: (character: CharacterDraftDto) => boolean
}): CharacterDraftDto | null {
  const exact = input.preferredName
    ? input.characters.find((character) => character.name.trim() === input.preferredName?.trim())
    : null
  if (exact) return exact
  return input.characters.find(input.matcher) || null
}

function cleanName(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback
}

function buildFallbackSegments(input: {
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  storyIntent?: StoryIntentPackageDto | null
}): DetailedOutlineSegmentDto[] {
  const normalizedOutline = ensureOutlineEpisodeShape(input.outline)
  const protagonist = cleanName(input.storyIntent?.protagonist || normalizedOutline.protagonist, '主角')
  const antagonist = cleanName(input.storyIntent?.antagonist, '对手')
  const emotionCharacter = pickCharacter({
    characters: input.characters,
    preferredName: input.storyIntent?.officialKeyCharacters?.find((name) => /少女|师妹|前女友|苏婉|小柔/.test(name)),
    matcher: (character) => /筹码|情感|关系变化|看不懂|信人/.test(`${character.biography} ${character.arc} ${character.hiddenPressure}`)
  })
  const externalCharacter = pickCharacter({
    characters: input.characters,
    preferredName: input.storyIntent?.officialKeyCharacters?.find((name) => /妖|冤魂|系统|异动|外压/.test(name)),
    matcher: (character) => /外部危险|外压|妖|冤魂|系统|失控|放大代价/.test(`${character.name} ${character.biography} ${character.hiddenPressure}`)
  })
  const protectTarget = cleanName(emotionCharacter?.name, '关键关系')
  const worldThreat = cleanName(externalCharacter?.name, '外部压力')
  const asset = pickConflictAsset(`${normalizedOutline.mainConflict} ${input.storyIntent?.coreConflict || ''}`)
  const theme = input.storyIntent?.themeAnchors?.[0] || normalizedOutline.theme || '当前选择的代价'

  return [
    {
      act: 'opening',
      content: `${protagonist}这一段最先想守住的是${protectTarget}和${asset}，但${antagonist}先把第一轮压力正面压下来，逼他当场表态。${protagonist}只能先压住自己，边守边试，故事也从这里正式点燃。`,
      hookType: '入局钩子'
    },
    {
      act: 'midpoint',
      content: `${antagonist}继续加码，${worldThreat}也开始把局面往更险处推，${protagonist}不得不从单纯硬扛改成边查边反手布局。到了这一段，代价不再只是吃亏，而是${protectTarget}、身份和局面控制权一起变重。`,
      hookType: '升级钩子'
    },
    {
      act: 'climax',
      content: `${protectTarget}和${asset}这两条线一起被逼到最痛的位置，${protagonist}再不亮底就守不住眼前这一轮。真正的高潮不是继续加压，而是${protagonist}被逼着把最深的底牌和误判一起翻到台前。`,
      hookType: '反转钩子'
    },
    {
      act: 'ending',
      content: `${protagonist}在这一段必须先把这一轮真正落定：做出不能回头的决定，让代价明确落到自己和${protectTarget}身上，并让局面正式变成新的状态。等这一轮收口成立后，${worldThreat}和“${theme}”背后的更大账再继续压到下一轮。`,
      hookType: '收束钩子'
    }
  ]
}

function normalizeSegmentContent(value: unknown, fallback: string): string {
  return normalizeWhitespace(typeof value === 'string' ? value : '') || fallback
}

function segmentHasStageDuty(act: DetailedAct, content: string): boolean {
  const text = normalizeWhitespace(content)
  if (!text) return false
  if (/这一段主要讲的是|这一段说明了|这一段展示了|这一段是/.test(text)) return false

  const sentenceCount = countSentenceLikeParts(text)
  if (sentenceCount < 2 || sentenceCount > 6) return false

  const rules: Record<DetailedAct, RegExp[]> = {
    opening: [/想守|守住/, /压力|逼|点燃|入局/],
    midpoint: [/更难|升级|加码|变重/, /应对|布局|反手|代价/],
    climax: [/最痛|亮底|退路|翻面|逼到/, /底牌|真相|误判/],
    ending: [/收口|收束|落定|决定|新状态/, /代价|下一轮|继续/]
  }

  return rules[act].every((pattern) => pattern.test(text))
}

export async function generateDetailedOutlineFromContext(input: {
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  storyIntent?: StoryIntentPackageDto | null
  runtimeConfig: RuntimeProviderConfig
}): Promise<DetailedOutlineSegmentDto[]> {
  const normalizedOutline = ensureOutlineEpisodeShape(input.outline)
  const fallback = buildFallbackSegments({
    outline: normalizedOutline,
    characters: input.characters,
    storyIntent: input.storyIntent
  })
  const prompt = buildDetailedOutlinePrompt({
    outline: normalizedOutline,
    characters: input.characters,
    storyIntent: input.storyIntent
  })

  try {
    const result = await generateTextWithRuntimeRouter(
      {
        task: 'decision_assist',
        prompt,
        allowFallback: true,
        temperature: 0.5
      },
      input.runtimeConfig
    )
    const payload = safeJsonParse(result.text) as DetailedOutlinePayload
    const opening = normalizeSegmentContent(payload.opening, fallback[0].content)
    const midpoint = normalizeSegmentContent(payload.midpoint, fallback[1].content)
    const climax = normalizeSegmentContent(payload.climax, fallback[2].content)
    const ending = normalizeSegmentContent(payload.ending, fallback[3].content)

    return [
      {
        act: 'opening',
        content: segmentHasStageDuty('opening', opening) ? opening : fallback[0].content,
        hookType: '入局钩子'
      },
      {
        act: 'midpoint',
        content: segmentHasStageDuty('midpoint', midpoint) ? midpoint : fallback[1].content,
        hookType: '升级钩子'
      },
      {
        act: 'climax',
        content: segmentHasStageDuty('climax', climax) ? climax : fallback[2].content,
        hookType: '反转钩子'
      },
      {
        act: 'ending',
        content: segmentHasStageDuty('ending', ending) ? ending : fallback[3].content,
        hookType: '收束钩子'
      }
    ]
  } catch {
    return fallback
  }
}
