import type { ShortDramaConstitutionDto, StoryIntentPackageDto } from '../../contracts/intake.ts'

const DEFAULT_CORE_PRINCIPLE = '快节奏、强冲突、稳情绪'
const DEFAULT_CORE_EMOTION = '爽感持续兑现'
const DEFAULT_INCITING_TIMING = '30 秒炸场，最晚不超过第 1 集结尾'
const DEFAULT_POV_RESTRICTION = '默认单主角视角，其他视角只能补主线必要信息。'
const DEFAULT_EPISODE_HOOK_RULE = '集集有小高潮，集尾必须留强钩子。'
const DEFAULT_FINALE_RULE = '结局总爆发，并回打开篇激励事件。'
const DEFAULT_CHARACTER_POLICY_STATE_RULE = '一切冲突升级都必须基于人物当下心理状态和当前压力触发。'
const DEFAULT_CHARACTER_POLICY_STUPIDITY_RULE =
  '严禁为了强行反转让人物突然降智、突然看不见明牌风险。'
const DEFAULT_CHARACTER_POLICY_MUTATION_RULE =
  '严禁人物无铺垫性格突变；真要变招，必须先有欲望、恐惧或压强升级。'

function cleanText(value: string | undefined, fallback = ''): string {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
  return text || fallback
}

function cleanStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => cleanText(item))
        .filter(Boolean)
    : []
}

function pickFirstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const text = cleanText(value)
    if (text) return text
  }
  return ''
}

export function normalizeShortDramaConstitution(
  constitution: Partial<ShortDramaConstitutionDto> | null | undefined
): ShortDramaConstitutionDto | null {
  if (!constitution || typeof constitution !== 'object') return null

  const allowedAuxiliaryViewpoints = cleanStringArray(
    constitution.povPolicy?.allowedAuxiliaryViewpoints
  )

  return {
    corePrinciple: cleanText(constitution.corePrinciple, DEFAULT_CORE_PRINCIPLE),
    coreEmotion: cleanText(constitution.coreEmotion, DEFAULT_CORE_EMOTION),
    worldViewBrief: cleanText(constitution.worldViewBrief),
    macGuffinDefinition: cleanText(constitution.macGuffinDefinition),
    villainCoreMotivation: cleanText(constitution.villainCoreMotivation),
    protagonistHiddenTrumpCard: cleanText(constitution.protagonistHiddenTrumpCard),
    themeAndValue: cleanText(constitution.themeAndValue),
    pacingLevel: constitution.pacingLevel || '高',
    episodeTotal:
      typeof constitution.episodeTotal === 'number' ? constitution.episodeTotal : undefined,
    incitingIncident: {
      timingRequirement: cleanText(
        constitution.incitingIncident?.timingRequirement,
        DEFAULT_INCITING_TIMING
      ),
      disruption: cleanText(constitution.incitingIncident?.disruption),
      mainLine: cleanText(constitution.incitingIncident?.mainLine)
    },
    protagonistArc: {
      flawBelief: cleanText(constitution.protagonistArc?.flawBelief),
      growthMode: cleanText(constitution.protagonistArc?.growthMode),
      payoff: cleanText(constitution.protagonistArc?.payoff)
    },
    povPolicy: {
      mode:
        constitution.povPolicy?.mode === 'controlled_multi'
          ? 'controlled_multi'
          : 'single_protagonist',
      allowedAuxiliaryViewpoints,
      restriction: cleanText(constitution.povPolicy?.restriction, DEFAULT_POV_RESTRICTION)
    },
    climaxPolicy: {
      episodeHookRule: cleanText(
        constitution.climaxPolicy?.episodeHookRule,
        DEFAULT_EPISODE_HOOK_RULE
      ),
      finalePayoffRule: cleanText(constitution.climaxPolicy?.finalePayoffRule, DEFAULT_FINALE_RULE),
      callbackRequirement: cleanText(constitution.climaxPolicy?.callbackRequirement)
    },
    characterPolicy: {
      stateDrivenConflictRule: cleanText(
        constitution.characterPolicy?.stateDrivenConflictRule,
        DEFAULT_CHARACTER_POLICY_STATE_RULE
      ),
      noForcedStupidityRule: cleanText(
        constitution.characterPolicy?.noForcedStupidityRule,
        DEFAULT_CHARACTER_POLICY_STUPIDITY_RULE
      ),
      noAbruptMutationRule: cleanText(
        constitution.characterPolicy?.noAbruptMutationRule,
        DEFAULT_CHARACTER_POLICY_MUTATION_RULE
      )
    },
    forbiddenContent: cleanText(constitution.forbiddenContent)
  }
}

export function buildShortDramaConstitutionFromStoryIntent(
  storyIntent: Partial<StoryIntentPackageDto> | null | undefined
): ShortDramaConstitutionDto {
  const existing = normalizeShortDramaConstitution(storyIntent?.shortDramaConstitution)
  if (existing) return existing

  const protagonist = cleanText(storyIntent?.protagonist, '主角')
  const antagonist = cleanText(storyIntent?.antagonist, '对手')
  const coreConflict = pickFirstNonEmpty(storyIntent?.coreConflict, storyIntent?.sellingPremise)
  const firstMovement = storyIntent?.dramaticMovement?.[0]
  const secondMovement = storyIntent?.dramaticMovement?.[1]
  const emotion = pickFirstNonEmpty(
    storyIntent?.emotionalPayoff,
    storyIntent?.themeAnchors?.[0],
    DEFAULT_CORE_EMOTION
  )
  const disruption = pickFirstNonEmpty(
    storyIntent?.sellingPremise,
    coreConflict,
    `${protagonist}被${antagonist}强行拖进主冲突。`
  )
  const mainLine = pickFirstNonEmpty(
    firstMovement,
    coreConflict,
    `${protagonist}必须立刻回应这条主线。`
  )
  const flawBelief = pickFirstNonEmpty(
    storyIntent?.coreDislocation,
    storyIntent?.relationAnchors?.[0],
    `${protagonist}原本的安全感或旧判断会被剧情打脸。`
  )
  const growthMode = pickFirstNonEmpty(
    secondMovement,
    firstMovement,
    `${protagonist}必须边扛压力边改打法。`
  )
  const payoff = pickFirstNonEmpty(
    storyIntent?.endingDirection,
    storyIntent?.emotionalPayoff,
    `${protagonist}最终要把这轮主冲突打回去。`
  )
  const callbackRequirement = pickFirstNonEmpty(
    storyIntent?.sellingPremise,
    storyIntent?.coreConflict,
    `${protagonist}的结局必须回打开篇激励事件。`
  )

  return {
    corePrinciple: DEFAULT_CORE_PRINCIPLE,
    coreEmotion: emotion,
    incitingIncident: {
      timingRequirement: DEFAULT_INCITING_TIMING,
      disruption,
      mainLine
    },
    protagonistArc: {
      flawBelief,
      growthMode,
      payoff
    },
    povPolicy: {
      mode: 'single_protagonist',
      allowedAuxiliaryViewpoints: cleanText(antagonist) ? [antagonist] : [],
      restriction: DEFAULT_POV_RESTRICTION
    },
    climaxPolicy: {
      episodeHookRule: DEFAULT_EPISODE_HOOK_RULE,
      finalePayoffRule: pickFirstNonEmpty(storyIntent?.endingDirection, DEFAULT_FINALE_RULE),
      callbackRequirement
    },
    characterPolicy: {
      stateDrivenConflictRule: DEFAULT_CHARACTER_POLICY_STATE_RULE,
      noForcedStupidityRule: DEFAULT_CHARACTER_POLICY_STUPIDITY_RULE,
      noAbruptMutationRule: DEFAULT_CHARACTER_POLICY_MUTATION_RULE
    }
  }
}

export function renderShortDramaConstitutionPromptBlock(
  constitution: ShortDramaConstitutionDto | null | undefined
): string {
  const normalized = normalizeShortDramaConstitution(constitution)
  if (!normalized) return '当前未提供短剧创作宪法'

  const lines = [
    `【短剧爆款黄金铁律】`,
    `1. 施压→反击→留钩子：每集只干这一件事。`,
    `2. 主角风骨：可以战略性退让，绝对禁止表现畏缩、无能、窝囊、崩溃。`,
    `3. 高智反派：用规则/权谋/利益分化，禁止无脑吼叫/骂街。`,
    `4. 爽点密度：30秒入戏，1分钟反转，集尾留钩，5集一大爽。`,
    `5. 对白精简：解释台词<8秒，不讲世界观，只讲利益生死。`,
    ``,
    `【项目级宪法】`,
    `- 核心原则：${normalized.corePrinciple}`,
    `- 核心情绪：${normalized.coreEmotion}`,
    `- 世界观简述：${normalized.worldViewBrief || '待补'}`,
    `- 核心MacGuffin：${normalized.macGuffinDefinition || '待补'}`,
    `- 反派终极动机：${normalized.villainCoreMotivation || '待补'}`,
    `- 主角隐藏底牌：${normalized.protagonistHiddenTrumpCard || '待补'}`,
    `- 主题与价值：${normalized.themeAndValue || '待补'}`,
    `- 节奏等级：${normalized.pacingLevel || '高'}`,
    `- 激励事件：${normalized.incitingIncident.timingRequirement}｜打破平静=${normalized.incitingIncident.disruption || '待补'}｜主线=${normalized.incitingIncident.mainLine || '待补'}`,
    `- 主角弧光：错误信念=${normalized.protagonistArc.flawBelief || '待补'}｜成长方式=${normalized.protagonistArc.growthMode || '待补'}｜回收=${normalized.protagonistArc.payoff || '待补'}`,
    `- 视角规则：${normalized.povPolicy.restriction}`,
    `- 高潮规则：单集=${normalized.climaxPolicy.episodeHookRule}｜结局=${normalized.climaxPolicy.finalePayoffRule}｜回打=${normalized.climaxPolicy.callbackRequirement || '待补'}`,
    `- 人物行为边界：冲突=${normalized.characterPolicy?.stateDrivenConflictRule || '待补'}｜禁降智=${normalized.characterPolicy?.noForcedStupidityRule || '待补'}｜禁突变=${normalized.characterPolicy?.noAbruptMutationRule || '待补'}`
  ]

  if (normalized.forbiddenContent) {
    lines.push(`- 禁止内容：${normalized.forbiddenContent}`)
  }

  return lines.join('\n')
}
