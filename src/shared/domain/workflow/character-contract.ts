import type { StoryIntentPackageDto } from '../../contracts/intake'
import type { CharacterDraftDto, OutlineDraftDto } from '../../contracts/workflow'
import type { CharacterProfileV2Dto } from '../../contracts/character-profile-v2'

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

export interface CharacterContractIssueDto {
  name: string
  missingLegacyFields: string[]
  missingV2Fields: string[]
}

function collectMissingLegacyFields(character: CharacterContractCandidate): string[] {
  const missing: string[] = []
  if (!hasText(character.name)) missing.push('name')
  if (!hasText(character.biography)) missing.push('biography')
  if (!hasText(character.goal)) missing.push('goal')
  if (!hasText(character.advantage)) missing.push('advantage')
  if (!hasText(character.weakness)) missing.push('weakness')
  if (!hasText(character.arc)) missing.push('arc')
  return missing
}

function collectMissingV2Fields(character: CharacterContractCandidate): string[] {
  const missing: string[] = []
  if (!hasText(character.name)) missing.push('name')
  if (!hasText(character.appearance)) missing.push('appearance')
  if (!hasText(character.personality)) missing.push('personality')
  if (!hasText(character.identity)) missing.push('identity')
  if (!hasText(character.values)) missing.push('values')
  if (!hasText(character.plotFunction)) missing.push('plotFunction')
  return missing
}

export function getCharacterContractIssues(character: CharacterDraftDto): CharacterContractIssueDto | null {
  const candidate = character as CharacterContractCandidate
  const missingLegacyFields = collectMissingLegacyFields(candidate)
  const missingV2Fields = collectMissingV2Fields(candidate)
  if (missingLegacyFields.length === 0 || missingV2Fields.length === 0) {
    return null
  }
  return {
    name: character.name?.trim() || '未命名人物',
    missingLegacyFields,
    missingV2Fields
  }
}

export function isCharacterDraftStructurallyComplete(character: CharacterDraftDto): boolean {
  return getCharacterContractIssues(character) === null
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

export function getCharacterBundleContractIssues(input: {
  characters: CharacterDraftDto[]
  protagonist?: string
  antagonist?: string
}): {
  incompleteCharacters: CharacterContractIssueDto[]
  protagonistCovered: boolean
  antagonistCovered: boolean
} {
  const characters = Array.isArray(input.characters) ? input.characters : []
  const names = characters.map((item) => item.name.trim()).filter(Boolean)
  return {
    incompleteCharacters: characters
      .map((item) => getCharacterContractIssues(item))
      .filter((item): item is CharacterContractIssueDto => Boolean(item)),
    protagonistCovered: input.protagonist?.trim()
      ? names.some((name) => isFuzzyNameMatch(name, input.protagonist!.trim()))
      : true,
    antagonistCovered: input.antagonist?.trim()
      ? names.some((name) => isFuzzyNameMatch(name, input.antagonist!.trim()))
      : true
  }
}

export function isCharacterBundleStructurallyComplete(input: {
  characters: CharacterDraftDto[]
  protagonist?: string
  antagonist?: string
}): boolean {
  const characters = Array.isArray(input.characters) ? input.characters : []
  if (characters.length === 0) return false

  const issues = getCharacterBundleContractIssues(input)
  if (issues.incompleteCharacters.length > 0) return false
  if (!issues.protagonistCovered) return false
  if (!issues.antagonistCovered) return false

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

