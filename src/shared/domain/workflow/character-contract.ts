import type { StoryIntentPackageDto } from '../../contracts/intake'
import type { CharacterDraftDto, OutlineDraftDto } from '../../contracts/workflow'
import type { CharacterProfileV2Dto } from '../../contracts/character-profile-v2.ts'

function hasText(value: string | undefined): boolean {
  return Boolean(value && value.trim())
}

/**
 * 【第二刀】模糊名称匹配：支持子串包含和括号后缀清洗
 *
 * 匹配规则：
 * 1. 去除括号及括号内内容：黎明（男主）→ 黎明
 * 2. 去除常见前缀：被逼的黎明 → 黎明
 * 3. 子串包含匹配：只要任意一方包含另一方，即视为匹配
 */
function fuzzyNormalizeName(name: string): string {
  return name
    .replace(/[（(][^)）]*[)）]/g, '') // 去除括号及内容
    .replace(/^(被|被逼的?|表面|暗里)/, '') // 去除常见前缀
    .trim()
}

function isFuzzyNameMatch(characterName: string, anchorName: string): boolean {
  const normalizedChar = fuzzyNormalizeName(characterName)
  const normalizedAnchor = fuzzyNormalizeName(anchorName)

  // 完全匹配
  if (normalizedChar === normalizedAnchor) return true
  // 子串包含匹配
  if (normalizedChar.includes(normalizedAnchor) || normalizedAnchor.includes(normalizedChar)) return true
  // 原始名称子串匹配（兼容未清洗的情况）
  if (characterName.includes(anchorName) || anchorName.includes(characterName)) return true

  return false
}

type CharacterContractCandidate = CharacterDraftDto &
  Partial<
    Pick<
      CharacterProfileV2Dto,
      | 'depthLevel'
      | 'appearance'
      | 'personality'
      | 'identity'
      | 'values'
      | 'plotFunction'
      | 'hiddenPressure'
      | 'fear'
      | 'protectTarget'
      | 'conflictTrigger'
      | 'advantage'
      | 'weakness'
      | 'goal'
      | 'arc'
      | 'publicMask'
    >
  >

function isLegacyCharacterDraftStructurallyComplete(character: CharacterContractCandidate): boolean {
  return (
    hasText(character.name) &&
    hasText(character.biography) &&
    hasText(character.goal) &&
    hasText(character.advantage) &&
    hasText(character.weakness) &&
    hasText(character.arc)
  )
}

function isCharacterProfileV2StructurallyComplete(character: CharacterContractCandidate): boolean {
  if (
    !hasText(character.name) ||
    !hasText(character.appearance) ||
    !hasText(character.personality) ||
    !hasText(character.identity) ||
    !hasText(character.values) ||
      !hasText(character.plotFunction)
  ) {
    return false
  }
  return true
}

export function isCharacterDraftStructurallyComplete(character: CharacterDraftDto): boolean {
  const candidate = character as CharacterContractCandidate
  return (
    isLegacyCharacterDraftStructurallyComplete(candidate) ||
    isCharacterProfileV2StructurallyComplete(candidate)
  )
}

export function resolveCharacterContractAnchors(input: {
  storyIntent?: StoryIntentPackageDto | null
  outline?: Pick<OutlineDraftDto, 'protagonist'> | null
}): { protagonist?: string; antagonist?: string } {
  const protagonist = input.storyIntent?.protagonist?.trim() || input.outline?.protagonist?.trim() || ''
  const antagonist = input.storyIntent?.antagonist?.trim() || ''

  return {
    protagonist: protagonist || undefined,
    antagonist: antagonist || undefined
  }
}

export function isCharacterBundleStructurallyComplete(input: {
  characters: CharacterDraftDto[]
  protagonist?: string
  antagonist?: string
}): boolean {
  const characters = Array.isArray(input.characters) ? input.characters : []
  if (characters.length === 0) return false
  if (!characters.every(isCharacterDraftStructurallyComplete)) return false

  const names = characters.map((item) => item.name.trim()).filter(Boolean)
  // 【第二刀】模糊门禁比对：用 isFuzzyNameMatch 替代严格 names.includes()
  if (input.protagonist?.trim() && !names.some((name) => isFuzzyNameMatch(name, input.protagonist!.trim()))) return false
  if (input.antagonist?.trim() && !names.some((name) => isFuzzyNameMatch(name, input.antagonist!.trim()))) return false

  return true
}

export function isOutlineReadyForCharacterStage(
  outline: Pick<OutlineDraftDto, 'title' | 'theme' | 'mainConflict' | 'summary'>
): boolean {
  return (
    hasText(outline.title) &&
    hasText(outline.theme) &&
    hasText(outline.mainConflict) &&
    hasText(outline.summary)
  )
}

export function isCharacterStageReady(input: {
  outline: Pick<OutlineDraftDto, 'title' | 'theme' | 'mainConflict' | 'summary' | 'protagonist'>
  characters: CharacterDraftDto[]
  storyIntent?: StoryIntentPackageDto | null
}): boolean {
  if (!isOutlineReadyForCharacterStage(input.outline)) return false

  const anchors = resolveCharacterContractAnchors({
    storyIntent: input.storyIntent,
    outline: input.outline
  })

  return isCharacterBundleStructurallyComplete({
    characters: input.characters,
    protagonist: anchors.protagonist,
    antagonist: anchors.antagonist
  })
}
