/**
 * src/shared/domain/market-playbook/market-playbook-registry.ts
 *
 * MarketPlaybook 注册表。
 *
 * 第一版用代码内置资产，不接数据库。
 * 只返回 status === 'active' 的打法包。
 */

import type {
  MarketPlaybookDto,
  MarketPlaybookSelectionDto,
  AudienceLane,
  MarketPatternDto
} from '../../contracts/market-playbook.ts'

// ============================================================
// 内置打法包：2026-04 男频修仙逆袭 v1
// ============================================================

const MALE_XIUXIAN_PATTERNS: MarketPatternDto[] = [
  {
    id: 'male-xiuxian-opening-humiliation',
    name: '测灵台废体受辱',
    type: 'opening_pressure',
    description: '主角在测灵台被判定废灵根，当众受辱，未婚妻/师门冷眼。开局必须高羞辱。',
    appliesTo: { audienceLane: 'male', subgenre: '修仙逆袭' },
    promptInstruction:
      '开局必须有一场公开场合的高羞辱事件（测灵台、宗门大比、拜师宴），主角被当众判定废物，周围人嘲笑或冷眼。',
    qualitySignal: '读者在前3集必须感受到"这人被冤枉了/被看扁了"的愤怒感',
    examples: [
      '测灵石碎裂，长老当众宣布废灵根',
      '未婚妻当众退婚，投入师兄怀抱',
      '宗门大比被设计陷害，功力被封'
    ]
  },
  {
    id: 'male-xiuxian-seal-leak',
    name: '封印力量外泄',
    type: 'payoff',
    description: '体内封印的上古力量不受控外泄，引发测灵石爆裂或长老反噬。第一次爽点。',
    appliesTo: { audienceLane: 'male', subgenre: '修仙逆袭' },
    promptInstruction:
      '在受辱后1-2集内，主角体内封印力量必须有一次不受控的外泄，造成直接可见的后果（测灵石爆裂、长老吐血、天象异变）。',
    qualitySignal: '读者必须在前5集内看到"这人不是废物"的第一个证据',
    examples: [
      '测灵石爆裂反噬长老',
      '无意间释放威压震退欺凌者',
      '封印裂隙引动天地异象'
    ]
  },
  {
    id: 'male-xiuxian-elder-backlash',
    name: '长老/师兄当众反噬',
    type: 'villain_pressure',
    description: '曾经羞辱主角的长老或师兄在发现主角不简单后，不认错反而加害，制造更大冲突。',
    appliesTo: { audienceLane: 'male', subgenre: '修仙逆袭' },
    promptInstruction:
      '当主角展露一丝实力后，之前羞辱他的权威人物不能认错，必须变本加厉地打压（暗杀、栽赃、追杀），制造更大的压迫。',
    qualitySignal: '反派的不认错让读者愤怒升级，期待更大的打脸',
    examples: [
      '长老发现封印异动后暗中追杀',
      '师兄栽赃主角偷盗宗门至宝',
      '宗门以"邪修"名义通缉主角'
    ]
  },
  {
    id: 'male-xiuxian-card-release',
    name: '底牌分层释放',
    type: 'protagonist_action',
    description: '主角底牌必须分层释放，前50%只能隐忍布局，中段部分暴露，最后25%完全释放。',
    appliesTo: { audienceLane: 'male', subgenre: '修仙逆袭' },
    promptInstruction:
      '底牌释放节奏：前50%集数主角只能隐忍、布局、暗中修炼；第51%-75%身份/实力部分暴露，但最大底牌仍隐藏；最后25%最大底牌完全释放。',
    qualitySignal: '读者必须感到"等到了！终于亮底牌了！"的爽感，而不是"怎么又在装逼"',
    examples: [
      '前10集只用旁门左道，不亮神尊之力',
      '11-15集封印初开，但仍隐藏身份',
      '16-20集神尊之力完全觉醒，清算一切'
    ]
  },
  {
    id: 'male-xiuxian-payoff-rhythm',
    name: '第5/10/15/20集大爽点',
    type: 'payoff',
    description: '每5集必须有一个大爽点：打脸、身份暴露、实力碾压、仇人跪服。',
    appliesTo: { audienceLane: 'male', subgenre: '修仙逆袭' },
    promptInstruction:
      '每5集必须安排一个大爽点（major payoff）。第5集：初次打脸；第10集：身份部分暴露震慑全场；第15集：联合盟友反杀围剿；第20集：最终清算建立新秩序。',
    qualitySignal: '读者每5集必须获得一次强烈的情绪释放',
    examples: [
      '第5集：测灵石爆裂反噬长老，当众打脸',
      '第10集：封印初开震退刺客组织高手',
      '第15集：假意效忠反杀组织高层',
      '第20集：神尊之力觉醒，登顶清算'
    ]
  },
  {
    id: 'male-xiuxian-villain-escalation',
    name: '反派递进：宗门→组织→仙界',
    type: 'villain_pressure',
    description: '反派势力必须逐级递进：宗门小人→刺客组织→仙界腐朽势力。',
    appliesTo: { audienceLane: 'male', subgenre: '修仙逆袭' },
    promptInstruction:
      '反派压迫必须逐级递进。第一阶段反派是宗门内的小人（长老、师兄）；第二阶段是更大的组织（刺客组织、邪修联盟）；第三阶段是仙界级别的腐朽势力。',
    qualitySignal: '读者必须感到"敌人越来越大，但主角也越来越强"',
    examples: [
      '第一阶段：宗门长老栽赃追杀',
      '第二阶段：刺客组织控制主角暗杀',
      '第三阶段：仙界腐朽势力联合围剿'
    ]
  }
]

const MALE_XIUXIAN_PLAYBOOK: MarketPlaybookDto = {
  id: 'market-2026-04-male-xiuxian-v1',
  name: '2026-04 男频修仙逆袭打法包 v1',
  audienceLane: 'male',
  subgenre: '修仙逆袭',
  sourceMonth: '2026-04',
  version: 'v1',
  status: 'active',
  summary:
    '男频修仙逆袭核心打法：废体受辱开局、封印力量外泄、底牌分层释放、反派逐级递进、每5集大爽点。主打"被看扁→打脸→再被看扁→更大打脸"的循环升级。',
  patterns: MALE_XIUXIAN_PATTERNS,
  antiPatterns: [
    '主角前5集就亮出最大底牌',
    '反派一次性全出，没有递进',
    '受辱后没有任何铺垫就直接逆袭',
    '女主出场抢主角光环',
    '每集都有大爽点导致爽点贬值',
    '主角性格窝囊、被动等待救援'
  ],
  promptRules: [
    '开局必须有公开场合的高羞辱事件',
    '底牌必须分层释放，前50%只能隐忍布局',
    '每5集必须有一个大爽点',
    '反派势力必须逐级递进',
    '封印力量外泄必须在前5集出现',
    '主角行动必须主动，不能被动等待'
  ],
  qualitySignals: [
    '前3集读者感到"被冤枉"的愤怒',
    '前5集读者看到"不是废物"的第一个证据',
    '每5集有一次强烈的情绪释放',
    '反派不认错让读者愤怒升级',
    '底牌释放时读者感到"等到了！"',
    '结局时读者感到"恶有恶报"的满足'
  ],
  examples: [
    {
      label: '测灵台废体受辱',
      summary: '主角在测灵台被判定废灵根，未婚妻当众退婚',
      extractedPattern: 'opening_pressure + relationship_tension'
    },
    {
      label: '测灵石爆裂反噬',
      summary: '封印力量外泄导致测灵石爆裂，长老被反噬',
      extractedPattern: 'payoff + villain_pressure'
    }
  ],
  createdAt: '2026-04-25T00:00:00Z',
  updatedAt: '2026-04-25T00:00:00Z'
}

// ============================================================
// 内置打法包：2026-04 女频霸总甜宠 v1
// ============================================================

const FEMALE_CEO_PATTERNS: MarketPatternDto[] = [
  {
    id: 'female-ceo-relationship-pressure',
    name: '关系压迫',
    type: 'relationship_tension',
    description: '女主在关系中处于弱势地位，被误解、被冷落、被利用。开局必须有关系层面的压迫。',
    appliesTo: { audienceLane: 'female', subgenre: '霸总甜宠' },
    promptInstruction:
      '开局必须有一场关系层面的压迫事件：被当众羞辱、被误会身份、被利用感情、被抛弃。女主必须在关系中处于弱势。',
    qualitySignal: '读者在前3集必须感到"这个女主太委屈了"的心疼感',
    examples: [
      '被当成替身新娘嫁入豪门',
      '被前男友和闺蜜联手背叛',
      '被误认为拜金女当众羞辱'
    ]
  },
  {
    id: 'female-ceo-identity-misunderstanding',
    name: '身份误解',
    type: 'hook',
    description: '女主真实身份被隐藏或被误解，周围人不知道她的真正价值。',
    appliesTo: { audienceLane: 'female', subgenre: '霸总甜宠' },
    promptInstruction:
      '女主必须有一个隐藏的真实身份（豪门千金、天才设计师、隐藏大佬），周围人不知道，持续产生误解。',
    qualitySignal: '读者必须感到"你们都不知道她有多厉害"的期待感',
    examples: [
      '被当成灰姑娘其实是隐藏千金',
      '被看不起的小设计师其实是国际大奖得主',
      '被嫌弃的乡下丫头其实是某大佬的女儿'
    ]
  },
  {
    id: 'female-ceo-power-borrowing',
    name: '权力借用',
    type: 'protagonist_action',
    description: '女主借用男主或第三方的力量解决问题，但不是被动等待，而是主动谋划。',
    appliesTo: { audienceLane: 'female', subgenre: '霸总甜宠' },
    promptInstruction:
      '女主可以借用男主的权力或资源，但必须是她主动谋划、主动出击，而不是被动等待男主来救。她必须有自己的判断和决策。',
    qualitySignal: '读者必须感到"这个女主有脑子"而不是"这个女主只会靠男人"',
    examples: [
      '主动利用男主的资源反击陷害者',
      '借势男主的权位揭穿闺蜜阴谋',
      '用男主的平台展示自己的才华'
    ]
  },
  {
    id: 'female-ceo-male-support',
    name: '高权力者撑腰但不抢光环',
    type: 'relationship_tension',
    description: '男主或高权力者为女主撑腰，但不能抢走女主的主角光环。女主必须是解决问题的核心。',
    appliesTo: { audienceLane: 'female', subgenre: '霸总甜宠' },
    promptInstruction:
      '男主可以为女主撑腰、提供资源，但最终解决问题的必须是女主自己。男主是助力不是替代。女主的胜利必须来自她自己的智慧和行动。',
    qualitySignal: '读者必须感到"她靠自己赢了"而不是"男主帮她赢了"',
    examples: [
      '男主提供平台，女主用才华征服全场',
      '男主给资源，女主用智慧反杀对手',
      '男主挡刀，但最终是女主揭穿真相'
    ]
  },
  {
    id: 'female-ceo-emotional-payoff',
    name: '情绪补偿',
    type: 'payoff',
    description: '前期受的委屈必须在后期得到情绪补偿：道歉、追妻、公开正名、权力反转。',
    appliesTo: { audienceLane: 'female', subgenre: '霸总甜宠' },
    promptInstruction:
      '前期女主受的每一份委屈，后期都必须有对应的情绪补偿。道歉必须真诚、追妻必须有诚意、正名必须公开、反转必须彻底。',
    qualitySignal: '读者必须感到"终于等到这一天"的满足感',
    examples: [
      '曾经羞辱她的人当众道歉',
      '男主追妻火葬场，被拒多次后才被接受',
      '隐藏身份公开，全场震惊',
      '曾经看不起她的人来求她帮忙'
    ]
  },
  {
    id: 'female-ceo-growth-rhythm',
    name: '追妻/反转/成长节奏',
    type: 'payoff',
    description: '节奏必须是：受委屈→暗中成长→部分反转→追妻→完全反转→大团圆。',
    appliesTo: { audienceLane: 'female', subgenre: '霸总甜宠' },
    promptInstruction:
      '整体节奏：前1/3受委屈+暗中成长；中1/3部分反转+男主追妻；后1/3完全反转+大团圆。追妻阶段男主必须吃苦头。',
    qualitySignal: '读者必须经历"心疼→期待→满足"的完整情绪弧线',
    examples: [
      '前5集：被欺负、被误解、暗中学习成长',
      '中10集：部分实力展露、男主开始追妻、被拒',
      '后5集：身份公开、完全反转、大团圆'
    ]
  }
]

const FEMALE_CEO_PLAYBOOK: MarketPlaybookDto = {
  id: 'market-2026-04-female-ceo-v1',
  name: '2026-04 女频霸总甜宠打法包 v1',
  audienceLane: 'female',
  subgenre: '霸总甜宠',
  sourceMonth: '2026-04',
  version: 'v1',
  status: 'active',
  summary:
    '女频霸总甜宠核心打法：关系压迫开局、身份误解制造悬念、权力借用但女主主导、情绪补偿兑现、追妻反转成长节奏。主打"受委屈→暗中成长→反转打脸→追妻大团圆"的情绪弧线。',
  patterns: FEMALE_CEO_PATTERNS,
  antiPatterns: [
    '女主全程被动等待男主救援',
    '男主抢走女主的主角光环',
    '受的委屈没有情绪补偿',
    '反转太早导致后面没有悬念',
    '追妻太容易没有诚意',
    '女主性格圣母、无底线原谅'
  ],
  promptRules: [
    '开局必须有关系层面的压迫事件',
    '女主必须有隐藏的真实身份',
    '女主借用力量必须是主动谋划',
    '男主撑腰但不能抢光环',
    '前期委屈后期必须有情绪补偿',
    '追妻阶段男主必须吃苦头'
  ],
  qualitySignals: [
    '前3集读者感到"太委屈了"的心疼',
    '读者期待"你们都不知道她有多厉害"',
    '女主行动时读者感到"有脑子"',
    '男主撑腰时读者不觉得"靠男人"',
    '情绪补偿时读者感到"终于等到"',
    '结局时读者感到"圆满了"的满足'
  ],
  examples: [
    {
      label: '替身新娘受辱',
      summary: '女主被当成替身嫁入豪门，被全家看不起',
      extractedPattern: 'relationship_tension + opening_pressure'
    },
    {
      label: '才华征服全场',
      summary: '男主提供平台，女主用才华让所有质疑者闭嘴',
      extractedPattern: 'payoff + protagonist_action'
    }
  ],
  createdAt: '2026-04-25T00:00:00Z',
  updatedAt: '2026-04-25T00:00:00Z'
}

// ============================================================
// 注册表
// ============================================================

const BUILT_IN_PLAYBOOKS: MarketPlaybookDto[] = [
  MALE_XIUXIAN_PLAYBOOK,
  FEMALE_CEO_PLAYBOOK
]

export interface MarketPlaybookRegistrySourceInput {
  customPlaybooks?: MarketPlaybookDto[]
}

function resolveRegistryPlaybooks(input?: MarketPlaybookRegistrySourceInput): MarketPlaybookDto[] {
  return [...(input?.customPlaybooks ?? []), ...BUILT_IN_PLAYBOOKS]
}

function comparePlaybookFreshness(a: MarketPlaybookDto, b: MarketPlaybookDto): number {
  const sourceMonth = b.sourceMonth.localeCompare(a.sourceMonth)
  if (sourceMonth !== 0) return sourceMonth
  const updatedAt = b.updatedAt.localeCompare(a.updatedAt)
  if (updatedAt !== 0) return updatedAt
  return b.version.localeCompare(a.version)
}

/**
 * 获取所有 active 状态的打法包。
 * 可按 audienceLane 和 subgenre 过滤。
 */
export function getActiveMarketPlaybooks(input?: {
  audienceLane?: AudienceLane
  subgenre?: string
  customPlaybooks?: MarketPlaybookDto[]
}): MarketPlaybookDto[] {
  let results = resolveRegistryPlaybooks(input).filter((p) => p.status === 'active')

  if (input?.audienceLane) {
    results = results.filter((p) => p.audienceLane === input.audienceLane)
  }

  if (input?.subgenre) {
    results = results.filter((p) => p.subgenre === input.subgenre)
  }

  return results
}

/**
 * 根据用户项目信息选择默认打法包。
 *
 * 规则：
 * 1. 只返回 status === 'active'
 * 2. audienceLane 必须匹配
 * 3. subgenre 优先精确匹配
 * 4. 没有精确匹配时返回同 audienceLane 的通用打法包（subgenre 最接近的）
 * 5. 不允许返回 archived
 * 6. 不允许 silent fallback 到错误性别
 */
export function selectDefaultMarketPlaybook(input: {
  audienceLane: AudienceLane
  subgenre: string
  currentMonth?: string
  customPlaybooks?: MarketPlaybookDto[]
}): MarketPlaybookDto | null {
  const { audienceLane, subgenre } = input
  const playbooks = resolveRegistryPlaybooks(input)

  // 先精确匹配 audienceLane + subgenre
  const exactMatches = playbooks
    .filter(
      (p) =>
        p.status === 'active' && p.audienceLane === audienceLane && p.subgenre === subgenre
    )
    .sort(comparePlaybookFreshness)
  const exactMatch = exactMatches[0]
  if (exactMatch) return exactMatch

  // 没有精确匹配 → 返回同 audienceLane 的最新 active
  const laneFallback = playbooks
    .filter(
      (p) => p.status === 'active' && p.audienceLane === audienceLane
    )
    .sort(comparePlaybookFreshness)[0]
  return laneFallback ?? null
}

/**
 * 按 ID 获取打法包（不限状态）。
 */
export function getMarketPlaybookById(
  id: string,
  input?: MarketPlaybookRegistrySourceInput
): MarketPlaybookDto | null {
  return resolveRegistryPlaybooks(input).find((p) => p.id === id) ?? null
}

// ============================================================
// 项目级版本选择解析
// ============================================================

export interface ResolvedPlaybookSelection {
  playbook: MarketPlaybookDto | null
  selection: MarketPlaybookSelectionDto | null
  reason: 'existing_locked' | 'manual_selected' | 'auto_latest' | 'not_found'
}

/**
 * 解析项目应该使用哪个打法包。
 *
 * 规则：
 * 1. 如果 existingSelection.selectedPlaybookId 能找到 playbook（active 或 archived），优先返回。
 * 2. locked/manual 版本即使 archived 也返回（老项目需要复现）。
 * 3. 新项目没有 selection 时，选最新 active。
 * 4. 不允许跨 audienceLane 错选。
 * 5. 找不到时返回 not_found，不 silent fallback。
 */
export function resolveMarketPlaybookSelection(input: {
  audienceLane: AudienceLane
  subgenre: string
  existingSelection?: MarketPlaybookSelectionDto | null
  currentMonth?: string
  customPlaybooks?: MarketPlaybookDto[]
}): ResolvedPlaybookSelection {
  const { audienceLane, subgenre, existingSelection } = input

  // 有已锁定/手动选择的 playbook
  if (existingSelection?.selectedPlaybookId) {
    const existing = getMarketPlaybookById(existingSelection.selectedPlaybookId, input)

    if (existing) {
      // 校验 audienceLane 不能跨性别
      if (existing.audienceLane !== audienceLane) {
        return { playbook: null, selection: existingSelection, reason: 'not_found' }
      }

      const reason =
        existingSelection.selectionMode === 'manual' ? 'manual_selected' : 'existing_locked'
      return { playbook: existing, selection: existingSelection, reason }
    }

    // selectedPlaybookId 在注册表里找不到
    return { playbook: null, selection: existingSelection, reason: 'not_found' }
  }

  // 新项目，自动选最新 active
  const defaultPlaybook = selectDefaultMarketPlaybook({ audienceLane, subgenre, customPlaybooks: input.customPlaybooks })

  if (defaultPlaybook) {
    const newSelection: MarketPlaybookSelectionDto = {
      selectedPlaybookId: defaultPlaybook.id,
      selectionMode: 'locked',
      lockedAt: new Date().toISOString(),
      selectedVersion: defaultPlaybook.version,
      selectedSourceMonth: defaultPlaybook.sourceMonth
    }
    return { playbook: defaultPlaybook, selection: newSelection, reason: 'auto_latest' }
  }

  return { playbook: null, selection: null, reason: 'not_found' }
}
