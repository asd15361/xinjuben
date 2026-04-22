import type { StoryIntentPackageDto } from '../../contracts/intake.ts'
import type { StoryContractDto, UserAnchorLedgerDto } from '../../contracts/story-contract.ts'
import type { CharacterDraftDto, OutlineDraftDto } from '../../contracts/workflow.ts'
import { getConfirmedFormalFacts } from '../formal-fact/selectors.ts'

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
  // 【第二刀延伸】模糊匹配：如果锚点名字被人物名字包含，视为已覆盖
  return ledger.anchorNames
    .map((name) => normalizeAnchorName(name))
    .filter(Boolean)
    .filter((name, index, list) => list.indexOf(name) === index)
    .filter((name) => {
      // 严格匹配
      if (roster.has(name)) return false
      // 模糊匹配：人物名字包含锚点名字，或锚点名字包含人物名字
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

export function renderStoryContractPromptBlock(
  contract: StoryContractDto,
  ledger: UserAnchorLedgerDto
): string {
  return [
    '【故事合同】',
    `- 主角槽位：${contract.characterSlots.protagonist || '待定义'}`,
    `- 对手槽位：${contract.characterSlots.antagonist || '待定义'}`,
    contract.characterSlots.heroine
      ? `- 情感槽位：${contract.characterSlots.heroine}`
      : '- 情感槽位：当前未锁定',
    contract.characterSlots.mentor
      ? `- 导师槽位：${contract.characterSlots.mentor}`
      : '- 导师槽位：当前未锁定',
    contract.requirements.requireFinalePayoff
      ? `- 终局必须回收：${contract.eventSlots.finalePayoff}`
      : '- 终局回收：当前待补',
    contract.requirements.requireHiddenCapabilityForeshadow
      ? '- 前段必须埋隐藏能力/克制出手伏笔'
      : '- 隐藏能力伏笔：当前未强制',
    contract.requirements.requireAntagonistContinuity
      ? `- 对手必须贯穿：${contract.eventSlots.antagonistPressure}`
      : '- 对手贯穿：当前未强制',
    contract.requirements.requireAntagonistLoveConflict
      ? `- 对手情感争夺：${contract.eventSlots.antagonistLoveConflict}`
      : '- 对手情感争夺：当前未强制',
    contract.requirements.requireHealingTechnique
      ? `- 关键救治事件：${contract.eventSlots.healingTechnique}`
      : '- 关键救治事件：当前未强制',
    contract.requirements.requireThemeRealization
      ? `- 主题必须兑现：${contract.eventSlots.themeRealization}`
      : '- 主题兑现：当前待补',
    contract.hardFacts.length > 0
      ? `- 硬事实：${contract.hardFacts.join('；')}`
      : '- 硬事实：当前待补',
    contract.softFacts.length > 0
      ? `- 软事实：${contract.softFacts.join('；')}`
      : '- 软事实：当前待补',
    ledger.anchorNames.length > 0
      ? `- 用户锚点名册：${ledger.anchorNames.join('、')}`
      : '- 用户锚点名册：当前为空',
    ledger.protectedFacts.length > 0
      ? `- 受保护事实：${ledger.protectedFacts.join('；')}`
      : '- 受保护事实：当前为空',
    ledger.heroineRequired
      ? `- 情感锚点必须覆盖：${ledger.heroineHint || '已声明情感对象'}`
      : '- 当前没有强制情感锚点'
  ].join('\n')
}
