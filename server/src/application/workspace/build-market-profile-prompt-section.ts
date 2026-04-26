/**
 * MarketProfile Prompt 片段构建器
 *
 * 把 marketProfile 转成各阶段 Prompt 需要的结构化规则片段。
 * 不要复制粘贴，所有阶段统一从这里取。
 */

import type { MarketProfileDto } from '@shared/contracts/project'
import {
  getSubgenrePolicy,
  getAudienceLanePolicy
} from '@shared/domain/short-drama/short-drama-market-policy'
import {
  resolveGenerationStrategy,
  type GenerationStrategy,
  type GenerationStrategyPromptBlocks
} from '@shared/domain/generation-strategy/generation-strategy'
import { CHARACTER_PROFILE_ANTI_PATTERNS } from '@shared/domain/short-drama/character-profile-policy'
import { INFORMATION_DENSITY_RULES } from '@shared/domain/short-drama/information-density-policy'

export type MarketProfileStage =
  | 'roughOutline'
  | 'characters'
  | 'detailedOutline'
  | 'episodeControl'
  | 'scriptGeneration'

export function buildMarketProfilePromptSection(input: {
  marketProfile: MarketProfileDto | null | undefined
  stage: MarketProfileStage
}): string {
  if (!input.marketProfile) {
    return ''
  }

  const policy = getSubgenrePolicy(input.marketProfile.subgenre)
  const lanePolicy = getAudienceLanePolicy(input.marketProfile.audienceLane)
  const strategy = resolveGenerationStrategy({
    marketProfile: input.marketProfile,
    genre: input.marketProfile.subgenre
  }).strategy

  let section = ''
  switch (input.stage) {
    case 'roughOutline':
      section = buildRoughOutlineSection(policy, lanePolicy)
      break
    case 'characters':
      section = buildCharactersSection(policy, lanePolicy)
      break
    case 'detailedOutline':
      section = buildDetailedOutlineSection(policy, lanePolicy)
      break
    case 'episodeControl':
      section = buildEpisodeControlSection(policy, lanePolicy)
      break
    case 'scriptGeneration':
      section = buildScriptGenerationSection(policy, lanePolicy)
      break
    default:
      return ''
  }

  return [section, buildGenerationStrategySection(strategy, input.stage)]
    .filter((part) => part.trim().length > 0)
    .join('\n')
}

function buildRoughOutlineSection(
  policy: ReturnType<typeof getSubgenrePolicy>,
  lanePolicy: ReturnType<typeof getAudienceLanePolicy>
): string {
  const lines = [
    '【市场定位 · 必须遵守】',
    `赛道：${lanePolicy.audienceLane === 'male' ? '男频' : '女频'}`,
    `垂类：${policy.subgenre}`,
    `核心观众：${policy.coreAudience}`,
    `核心爽点：${policy.emotionalPayoffs.join('、')}`,
    `主要冲突类型：${policy.primaryConflictTypes.join('、')}`,
    `推荐阶段节奏：${policy.recommendedEpisodeBeats.map((b) => `${b.phase}(${b.episodes})：${b.focus}`).join('；')}`,
    `必须避免：${policy.avoidRules.join('；')}`,
    ''
  ]

  if (lanePolicy.audienceLane === 'male') {
    lines.push(
      '【男频创作重点】',
      '1. 逆袭链：主角必须有清晰的身份/地位/战力低谷，并逐步逆袭。',
      '2. 升级链：每一阶段都要有具体的实力、资源或身份增长。',
      '3. 底牌链：主角必须持有隐藏底牌，关键时刻亮出翻盘。',
      '4. 反派层级：反派不能单一，要分层级递进，越往后越强。',
      '5. 资源/身份/战力增长：每5集至少一次显性增长。',
      ''
    )
  } else {
    lines.push(
      '【女频创作重点】',
      '1. 情绪代入：让观众强烈代入女主的情绪体验。',
      '2. 关系拉扯：核心关系必须有张力、有推拉、有误解与和解。',
      '3. 权力借用：女主可以通过借用高权力者的力量来反击。',
      '4. 高权力者撑腰：必须有一个或多个高权力者在关键时刻撑女主。',
      '5. 女主成长：女主从被动到主动，从弱到强的内心与行动成长。',
      ''
    )
  }

  return lines.join('\n')
}

function buildCharactersSection(
  policy: ReturnType<typeof getSubgenrePolicy>,
  lanePolicy: ReturnType<typeof getAudienceLanePolicy>
): string {
  const lines = [
    '【人物小传市场定位要求】',
    `赛道：${lanePolicy.audienceLane === 'male' ? '男频' : '女频'}，垂类：${policy.subgenre}`,
    '',
    '人物小传必须包含五要素：外在形象、性格特征、身份处境、价值观、剧情功能。',
    '禁止把人物小传写成剧情梗概。',
    '禁止写"第几集他做了什么"这种流水账。',
    '禁止只有身份标签，没有欲望和剧情功能。',
    '反派不能只会吼，要有规则、资源、压迫方式。',
    ''
  ]

  if (lanePolicy.audienceLane === 'male') {
    lines.push(
      '【男频人物重点】',
      '- 谁压主角：明确每一层级反派如何压迫主角。',
      '- 谁提供升级资源：谁给主角提供功法、信息、人脉或物质资源。',
      '- 谁见证打脸：谁在场见证主角逆袭反杀，提供情绪放大。',
      '- 谁是下一层级反派：当前反派被打倒后，谁成为新的更强反派。',
      ''
    )
  } else {
    lines.push(
      '【女频人物重点】',
      '- 谁掌握权力：剧中权力最高的人是谁，如何运用权力。',
      '- 谁借用权力：女主如何借用他人权力来保护自己或反击。',
      '- 谁制造情绪压迫：谁给女主制造情绪上的痛苦、委屈、羞辱。',
      '- 谁提供情绪补偿：谁在女主受伤后提供安慰、支持、撑腰。',
      ''
    )
  }

  lines.push('【人物小传反模式 · 必须避免】')
  for (const pattern of CHARACTER_PROFILE_ANTI_PATTERNS.slice(0, 4)) {
    lines.push(`- ${pattern.label}：${pattern.repairDirection}`)
  }
  lines.push('')

  return lines.join('\n')
}

function buildDetailedOutlineSection(
  policy: ReturnType<typeof getSubgenrePolicy>,
  lanePolicy: ReturnType<typeof getAudienceLanePolicy>
): string {
  const lines = [
    '【信息密度要求 · 每集必须执行】',
    ...INFORMATION_DENSITY_RULES.map((r) => `- ${r.name}：${r.description}`),
    '',
    '每集必须至少包含以下四要素各1处：',
    '- 冲突载体：通过冲突场景传递核心信息，而非解释台词',
    '- 道具载体：至少一个道具承载人设/剧情/钩子三重功能',
    '- 潜台词：至少一句台词包含未说透的信息',
    '- 动作情绪节拍：至少一个动作携带明确情绪信息',
    ''
  ]

  if (lanePolicy.audienceLane === 'male') {
    lines.push(
      '【男频详纲额外要求】',
      '- 每5集至少一次身份/地位/战力反转爽点',
      '- 每集都要体现主角实力或资源的显性增长',
      '- 反派压迫必须具体：规则、权位、利益分化，不能只会吼'
    )
  } else {
    lines.push(
      '【女频详纲额外要求】',
      '- 每集都要有情绪高潮或情绪转折',
      '- 核心关系必须有至少一次推拉或张力变化',
      '- 高权力者必须在关键时刻出现撑女主或制造压迫'
    )
  }

  lines.push('')

  return lines.join('\n')
}

function buildEpisodeControlSection(
  policy: ReturnType<typeof getSubgenrePolicy>,
  lanePolicy: ReturnType<typeof getAudienceLanePolicy>
): string {
  const lines = [
    '【控制卡市场定位要求】',
    `赛道：${lanePolicy.audienceLane === 'male' ? '男频' : '女频'}，垂类：${policy.subgenre}`,
    `核心爽点：${policy.emotionalPayoffs.join('、')}`,
    `常见 payoff 节拍：${policy.commonPayoffBeats.join('、')}`,
    ''
  ]

  if (lanePolicy.audienceLane === 'male') {
    lines.push(
      '【男频控制卡重点 · 每集必检】',
      '- statusReversalBeat：本集是否有身份/地位反转爽点',
      '- powerProgressionBeat：本集主角实力/资源是否有显性增长',
      '- goldenFingerBeat：本集是否亮出隐藏底牌或金手指',
      '- villainLevelUp：反派是否升级或出现更强层级反派'
    )
  } else {
    lines.push(
      '【女频控制卡重点 · 每集必检】',
      '- powerBorrowingBeat：本集是否有借用高权力者力量',
      '- relationshipTensionBeat：本集核心关系是否有张力变化',
      '- emotionalIdentificationBeat：本集是否有强情绪代入点',
      '- supportingPowerReveal：本集是否有撑腰者出场或撑腰动作'
    )
  }

  lines.push('')

  lines.push('【必须避免】')
  for (const rule of policy.avoidRules) {
    lines.push(`- ${rule}`)
  }
  lines.push('')

  return lines.join('\n')
}

function buildScriptGenerationSection(
  policy: ReturnType<typeof getSubgenrePolicy>,
  lanePolicy: ReturnType<typeof getAudienceLanePolicy>
): string {
  const lines = [
    '【剧本市场定位执行规则】',
    `赛道：${lanePolicy.audienceLane === 'male' ? '男频' : '女频'}，垂类：${policy.subgenre}`,
    `核心爽点：${policy.emotionalPayoffs.join('、')}`,
    `主要冲突类型：${policy.primaryConflictTypes.join('、')}`,
    ''
  ]

  if (lanePolicy.audienceLane === 'male') {
    lines.push(
      '【男频剧本执行重点】',
      '1. 逆袭链执行：开场必须写出主角身份/地位/战力的具体低谷状态（通过对手羞辱、规则剥夺、资源被抢等可见动作体现），不能只用旁白交代。',
      '2. 升级链执行：每场主角必须有具体的能力/资源/身份增长痕迹（获得新功法、得到关键信息、收服新人、突破境界等），通过△动作和对白同时体现。',
      '3. 底牌链执行：底牌必须在前3集内埋下伏笔（道具/信息/关系），亮出时必须通过具体动作和对白爆发，不能突然凭空出现。',
      '4. 反派层级执行：低级反派用言语羞辱+小手段施压；中级反派用规则/权位/利益分化；高级反派用布局/借刀杀人。不同层级反派的对话风格和压迫手段必须有明显差异。',
      '5. 爽点三步执行：①压（反派用具体手段把主角逼入绝境，有可见动作）②反（主角亮出底牌/布局反咬，有具体动作和对白）③震（旁观者震惊反应，反派实质受损）。'
    )
  } else {
    lines.push(
      '【女频剧本执行重点】',
      '1. 情绪代入执行：女主的情绪体验必须通过具体动作和短对白传递，不要写情绪总结句。委屈时写具体的身体反应（攥紧衣角/后退半步/声音发抖），不要写"她很委屈"。',
      '2. 关系拉扯执行：核心关系的张力变化必须通过对话的语速、措辞、留白来体现。推拉场景：一方逼近→另一方退或挡→再逼近→再化解/破裂。',
      '3. 权力借用执行：女主借权反击时，必须通过具体动作展现借力过程（展示信物/引述规则/搬出靠山名字），不能只用一句"我有靠山"。',
      '4. 高权力者撑腰执行：撑腰场景必须写出权力者的具体动作（亲自到场/派人传话/展示特权），以及周围人的反应变化，不能只写"某人帮了她"。',
      '5. 女主成长执行：从被动到主动的转变必须通过对话风格变化体现。前期台词短、带疑问、有退让；后期台词直接、带反问、有主动权。'
    )
  }

  lines.push('')
  lines.push('【信息密度四要素 · 剧本执行】')
  lines.push('- 冲突载体：用具体对峙场景传递信息，不要角色A向角色B解释背景')
  lines.push('- 道具载体：关键道具必须在△动作中出现，并承载人设/剧情/钩子三重功能')
  lines.push('- 潜台词：对白中必须包含未说透的信息，用停顿、反问、半截话体现')
  lines.push('- 动作情绪节拍：△动作必须携带明确情绪信息，如"△她攥紧袖口，指甲陷进掌心"')

  lines.push('')
  lines.push('【人物五要素 · 剧本执行】')
  lines.push('- 外在形象：通过服装、姿态、出场方式在△动作中体现')
  lines.push('- 性格特征：通过对白的措辞、节奏、习惯用语体现')
  lines.push('- 身份处境：通过与其他角色的权力关系互动体现')
  lines.push('- 价值观：通过在冲突中的选择体现')
  lines.push('- 剧情功能：通过本场次的具体行动目标体现')

  lines.push('')
  lines.push('【必须避免】')
  for (const rule of policy.avoidRules) {
    lines.push(`- ${rule}`)
  }
  lines.push('')

  return lines.join('\n')
}

function buildGenerationStrategySection(
  strategy: GenerationStrategy,
  stage: MarketProfileStage
): string {
  const promptBlockKey = resolveStrategyPromptBlockKey(stage)
  const promptBlocks = strategy.promptBlocks[promptBlockKey]
  const lines = [
    '【题材策略 · 不得串味】',
    `策略：${strategy.label}`,
    `势力类型：${strategy.worldLexicon.factionTypes.join('、')}`,
    `角色称谓：${strategy.worldLexicon.roleTitles.join('、')}`,
    `冲突物件：${strategy.worldLexicon.conflictObjects.join('、')}`,
    `爽点动作：${strategy.worldLexicon.payoffActions.join('、')}`,
    `核心人物位：${strategy.characterArchetypes
      .map((archetype) => `${archetype.label}：${archetype.dramaticFunction}`)
      .join('；')}`,
    `势力席位：${strategy.factionBlueprints
      .map((blueprint) => `${blueprint.label}(${blueprint.coreSeats.join('、')})`)
      .join('；')}`,
    '本阶段题材规则：',
    ...promptBlocks.map((block) => `- ${block}`),
    strategy.id === 'male_xianxia'
      ? `禁用题材词：${strategy.forbiddenTerms.join('、')}`
      : '题材边界：只使用上方策略词库；旧素材里不属于当前策略的世界词不要沿用。',
    ''
  ]

  return lines.join('\n')
}

function resolveStrategyPromptBlockKey(
  stage: MarketProfileStage
): keyof GenerationStrategyPromptBlocks {
  if (stage === 'characters') return 'characterProfile'
  if (stage === 'scriptGeneration') return 'screenplay'
  return 'outline'
}
