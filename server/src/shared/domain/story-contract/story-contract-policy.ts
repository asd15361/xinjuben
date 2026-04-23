import type { StoryIntentPackageDto } from '../../contracts/intake'
import type { StoryContractDto, UserAnchorLedgerDto } from '../../contracts/story-contract'
import type { CharacterDraftDto, OutlineDraftDto } from '../../contracts/workflow'
import { getConfirmedFormalFacts } from '../formal-fact/selectors'

function unique(values: Array<string | undefined | null>): string[] {
  const used = new Set<string>()
  return values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .filter((value) => {
      if (used.has(value)) return false
      used.add(value)
      return true
    })
}

function normalizeAnchorName(value: string | undefined | null): string {
  const text = String(value || '').trim()
  if (!text) return ''
  if (!/[，,。；、\s]/.test(text) && !/(盯上|被当|异动|持续施压|做筹码|交出)/.test(text))
    return text

  const roleMatch = text.match(/(少年守钥人|小镇少女|恶霸|反派|仇家|族长|城主|掌柜|恶少|师父|师妹)/)
  if (roleMatch) return roleMatch[1]

  return text
    .replace(/^[一-龥]{0,4}(盯上|拿着|带着|围着|被当成).*/, '')
    .replace(/(盯上|被当|异动|持续施压|做筹码|交出).*$/, '')
    .trim()
}

function containsAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text))
}

function findCharacterByKeyword(characters: CharacterDraftDto[], pattern: RegExp): string {
  const matched = characters.find((character) =>
    pattern.test(
      `${character.goal} ${character.arc} ${character.advantage} ${character.weakness} ${character.fear} ${character.protectTarget} ${character.conflictTrigger} ${character.hiddenPressure}`
    )
  )
  return matched?.name.trim() || ''
}

function buildHardFacts(outline: OutlineDraftDto): string[] {
  const formalFacts = getConfirmedFormalFacts(outline).map(
    (fact) => `${fact.label}：${fact.description}`
  )
  return unique([outline.mainConflict, outline.theme, ...formalFacts]).slice(0, 6)
}

function buildSoftFacts(
  intent: StoryIntentPackageDto | null,
  characters: CharacterDraftDto[]
): string[] {
  return unique([
    ...(intent?.themeAnchors || []),
    ...(intent?.worldAnchors || []),
    ...(intent?.relationAnchors || []),
    ...(intent?.dramaticMovement || []),
    ...characters.flatMap((character) => [
      character.goal,
      character.arc,
      character.fear,
      character.protectTarget,
      character.conflictTrigger
    ])
  ]).slice(0, 8)
}

export function buildStoryContract(input: {
  storyIntent?: StoryIntentPackageDto | null
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
}): StoryContractDto {
  const intent = input.storyIntent || null
  const mergedIntentText = [
    intent?.titleHint,
    intent?.genre,
    intent?.tone,
    intent?.audience,
    intent?.protagonist,
    intent?.antagonist,
    intent?.coreConflict,
    intent?.endingDirection,
    ...(intent?.themeAnchors || []),
    ...(intent?.worldAnchors || []),
    ...(intent?.relationAnchors || []),
    ...(intent?.dramaticMovement || []),
    intent?.manualRequirementNotes,
    intent?.freeChatFinalSummary,
    input.outline.title,
    input.outline.theme,
    input.outline.mainConflict,
    ...getConfirmedFormalFacts(input.outline).flatMap((fact) => [fact.label, fact.description]),
    ...input.characters.flatMap((character) => [
      character.name,
      character.goal,
      character.arc,
      character.advantage,
      character.weakness,
      character.publicMask,
      character.hiddenPressure,
      character.fear,
      character.protectTarget,
      character.conflictTrigger
    ])
  ]
    .filter(Boolean)
    .join('\n')
  const heroineHint =
    unique([
      ...(intent?.relationAnchors || []).filter((item) =>
        /(女主|爱人|恋人|伴侣|心上人)/.test(item)
      ),
      findCharacterByKeyword(input.characters, /(爱人|恋人|伴侣|心上人|情感|关系)/)
    ])[0] || ''

  const mentorHint = findCharacterByKeyword(input.characters, /(师父|师傅|老师|导师|引路)/)
  const hardFacts = buildHardFacts(input.outline)
  const softFacts = buildSoftFacts(intent, input.characters)
  const requireHiddenCapabilityForeshadow = containsAny(mergedIntentText, [
    /隐藏.{0,8}(能力|武功|本事|实力|修为)/,
    /藏.{0,6}(锋|拙|武|能力)/,
    /不露.{0,6}(武功|实力|修为)/,
    /假装不会/
  ])
  const requireAntagonistLoveConflict = containsAny(mergedIntentText, [
    /对手.{0,18}(觊觎|强占|强娶|逼婚|夺走|抢走|霸占)/,
    /(觊觎|强占|强娶|逼婚|夺走|抢走|霸占).{0,18}(所爱|爱人|女主|恋人|伴侣|心上人)/
  ])
  const requireHealingTechnique = containsAny(mergedIntentText, [
    /(术法|秘术|法门|疗法|法诀|功法).{0,12}(救治|疗伤|治疗|救人)/,
    /(救治|疗伤|治疗|救人).{0,12}(术法|秘术|法门|疗法|法诀|功法)/
  ])

  return {
    characterSlots: {
      protagonist:
        input.outline.protagonist.trim() ||
        intent?.protagonist?.trim() ||
        input.characters[0]?.name ||
        '',
      antagonist: normalizeAnchorName(intent?.antagonist) || input.characters[1]?.name || '',
      heroine: heroineHint,
      mentor: mentorHint
    },
    eventSlots: {
      finalePayoff: intent?.endingDirection?.trim() || input.outline.mainConflict.trim(),
      antagonistPressure: intent?.coreConflict?.trim() || input.outline.mainConflict.trim(),
      antagonistLoveConflict: requireAntagonistLoveConflict ? '对手对主角所爱持续施压或争夺' : '',
      relationshipShift: intent?.relationAnchors?.[0]?.trim() || '',
      healingTechnique: requireHealingTechnique ? '关键术法/手段救治事件' : '',
      themeRealization: input.outline.theme.trim()
    },
    requirements: {
      requireFinalePayoff: Boolean(
        intent?.endingDirection?.trim() || input.outline.mainConflict.trim()
      ),
      requireHiddenCapabilityForeshadow,
      requireAntagonistContinuity: Boolean(intent?.antagonist?.trim()),
      requireAntagonistLoveConflict,
      requireRelationshipShift: Boolean(heroineHint || intent?.relationAnchors?.length),
      requireHealingTechnique,
      requireThemeRealization: Boolean(input.outline.theme.trim())
    },
    hardFacts,
    softFacts
  }
}

export function buildUserAnchorLedger(input: {
  storyIntent?: StoryIntentPackageDto | null
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
}): UserAnchorLedgerDto {
  const intent = input.storyIntent || null
  const confirmedFacts = getConfirmedFormalFacts(input.outline)
  const relationAnchors = intent?.relationAnchors || []
  const heroineHint =
    relationAnchors.find((item) => /(女主|爱人|恋人|伴侣|心上人)/.test(item)) ||
    findCharacterByKeyword(input.characters, /(爱人|恋人|伴侣|心上人|情感|关系)/)

  return {
    anchorNames: unique([
      input.outline.protagonist,
      normalizeAnchorName(intent?.protagonist),
      normalizeAnchorName(intent?.antagonist),
      ...(intent?.officialKeyCharacters || []).map((item) => normalizeAnchorName(item)),
      ...(intent?.lockedCharacterNames || []).map((item) => normalizeAnchorName(item)),
      ...input.characters.map((character) => character.name)
    ]),
    protectedFacts: unique([
      ...confirmedFacts.map((fact) => fact.label),
      input.outline.theme,
      input.outline.mainConflict,
      ...(intent?.themeAnchors || []),
      ...(intent?.worldAnchors || []),
      ...relationAnchors
    ]),
    heroineRequired: Boolean(heroineHint),
    heroineHint: heroineHint || ''
  }
}

export function collectMissingUserAnchorNames(
  ledger: UserAnchorLedgerDto,
  characters: CharacterDraftDto[]
): string[] {
  const roster = new Set(
    characters.map((character) => normalizeAnchorName(character.name)).filter(Boolean)
  )
  return ledger.anchorNames
    .map((name) => normalizeAnchorName(name))
    .filter(Boolean)
    .filter((name, index, list) => list.indexOf(name) === index)
    .filter((name) => {
      if (roster.has(name)) return false
      for (const charName of roster) {
        if (charName.includes(name) || name.includes(charName)) return false
      }
      return true
    })
}

export function hasHeroineAnchorCoverage(
  ledger: UserAnchorLedgerDto,
  characters: CharacterDraftDto[]
): boolean {
  if (!ledger.heroineRequired) return true
  const merged = characters
    .flatMap((character) => [
      character.name,
      character.goal,
      character.arc,
      character.advantage,
      character.weakness,
      character.fear,
      character.protectTarget,
      character.conflictTrigger
    ])
    .join(' ')
  if (!merged.trim()) return false
  if (ledger.heroineHint && merged.includes(ledger.heroineHint)) return true
  return /(女主|爱人|恋人|伴侣|心上人)/.test(merged)
}
