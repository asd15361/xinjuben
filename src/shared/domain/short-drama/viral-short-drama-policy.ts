/**
 * 短剧爆款规则资产中心（Viral Short Drama Policy）
 *
 * 原则：
 * 1. 规则抽象成通用表达，不死抄"死人、退婚、丢官"当模板。
 * 2. 具体台词/案例不进常量，只留公式和类型定义。
 * 3. 下游 prompt 只注入"当前集选中规则"，不塞全库。
 */

// ─────────────────────────────────────────────────────────────────────────────
// 一、黄金铁律（抽象版）
// ─────────────────────────────────────────────────────────────────────────────

export interface ViralGoldenRule {
  id: string
  label: string
  /** 抽象规则描述（通用表达，不绑定具体题材） */
  abstractRule: string
  /** 可检测的显性指标 */
  detectableMarkers: string[]
  /** 违反时的降级风险 */
  violationRisk: string
}

export const VIRAL_GOLDEN_RULES: ViralGoldenRule[] = [
  {
    id: 'opening_shock',
    label: '开局冲击',
    abstractRule:
      '首集前30秒必须发生高损失、高羞辱、高危险或高反转事件之一，让观众立刻感到"这局开局就炸了"。',
    detectableMarkers: ['丢', '夺', '废', '逐', '冤', '绑', '杀', '辱', '抢', '毁', '塌', '裂'],
    violationRisk: '用户3秒内划走，完播率崩塌'
  },
  {
    id: 'first_minute_turn',
    label: '首分钟反转',
    abstractRule: '第1分钟必须出现第一次反转或打脸，不能先铺背景再慢慢起事。',
    detectableMarkers: ['反转', '打脸', '反将', '反咬', '反杀', '揭穿', '亮底', '翻盘'],
    violationRisk: '前1分钟没有情绪拐点，留存率断崖'
  },
  {
    id: 'single_episode_single_event',
    label: '单集单事',
    abstractRule: '每集只干一件事：施压 → 反击 → 留钩子。不准同时堆两条主线。',
    detectableMarkers: ['施压', '压', '逼', '反', '留钩', '钩子', '未完'],
    violationRisk: '信息过载，观众记不住，切片点模糊'
  },
  {
    id: 'protagonist_dignity',
    label: '主角风骨',
    abstractRule: '主角可以战略性忍让，但眼神必须冷、定、稳；禁止真窝囊、真崩溃、持续吐血求饶。',
    detectableMarkers: ['忍', '藏', '装', '退', '让'],
    violationRisk: '观众代入主角后感到屈辱，产生弃剧冲动'
  },
  {
    id: 'villain_intelligence',
    label: '反派高智',
    abstractRule: '反派必须用规则、权位、利益分化或布局压人；禁止无脑吼叫、骂街、强行降智。',
    detectableMarkers: ['规则', '权', '势', '分化', '借刀', '布局', '设局'],
    violationRisk: '反派太蠢降低爽感，观众觉得"这也能赢？"'
  },
  {
    id: 'major_payoff_every_5',
    label: '五集一爽',
    abstractRule: '每5集必须来一次 major 级别爽点（当众打脸/身份揭晓/碾压），normal 爽点不能替代。',
    detectableMarkers: ['打脸', '碾压', '揭晓', '身份', '底牌', '社死', '跪'],
    violationRisk: '爽感节奏断层，用户失去追更动力'
  },
  {
    id: 'no_world_building_dialogue',
    label: '零解释',
    abstractRule: '所有解释性台词必须压缩在8秒内，不许讲世界观、背景、来历。',
    detectableMarkers: [],
    violationRisk: '解释台词导致节奏变慢，用户划走'
  },
  {
    id: 'scene_minimalism',
    label: '少场景',
    abstractRule: '场景越少越值钱，优先用2-4个场景拍完一集，不换场等于省钱。',
    detectableMarkers: [],
    violationRisk: '场景多导致制作成本高，同时稀释冲突密度'
  },
  {
    id: 'punchline_is_distribution',
    label: '金句=切片',
    abstractRule: '每集必须有15字以内的短钉子句，绑定当前身份/道具/证据/规则；没有金句=没有切片=没有流量。',
    detectableMarkers: ['你也配', '不够格', '跟谁说话', '给过机会', '动她一下', '连本带利'],
    violationRisk: '没有可传播切片，平台算法不推流'
  },
  {
    id: 'cliffhanger_at_peak',
    label: '钩子钉在最高爽点前0.1秒',
    abstractRule: '结尾必须停在新危机压到眼前的瞬间，最后一句台词扎心，强制看下一集。',
    detectableMarkers: ['门被撞', '血滴', '人堵住', '黑影现', '脚步追', '信拆', '刀抵'],
    violationRisk: '结尾太平，用户不点下一集'
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// 二、单集标准结构
// ─────────────────────────────────────────────────────────────────────────────

export interface ViralEpisodeAct {
  actLabel: string
  timeWindow: string
  audienceEmotion: string
  /** 该幕必须完成的核心任务 */
  coreTask: string
  /** 该幕禁止出现的内容 */
  forbiddenContent: string[]
}

export const VIRAL_EPISODE_STRUCTURE: ViralEpisodeAct[] = [
  {
    actLabel: '施压',
    timeWindow: '0-20秒',
    audienceEmotion: '愤怒、憋屈、想替主角说话',
    coreTask: '反派拿把柄/规则/人质压人，把主角逼到无路可退',
    forbiddenContent: ['解释背景', '回忆过去', '铺设定', '主角主动反击']
  },
  {
    actLabel: '反转',
    timeWindow: '20-45秒',
    audienceEmotion: '卧槽、爽、解气',
    coreTask: '主角拿出证据/底牌/后手，让反派当众吃瘪或损失筹码',
    forbiddenContent: ['主角长篇解释', '旁观者议论', '切换场景', '反派立刻反扑']
  },
  {
    actLabel: '钩子',
    timeWindow: '45-60秒',
    audienceEmotion: '好奇、紧张、必须看下一集',
    coreTask: '反转刚完，新危机立刻到来；最后一句台词扎心留客',
    forbiddenContent: ['圆满收尾', '解释下一步', '切换日常', '主角松懈']
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// 三、主角行为规范（解决"窝囊"问题）
// ─────────────────────────────────────────────────────────────────────────────

export interface ViralProtagonistRule {
  id: string
  stance: string
  /** 允许的行为 */
  allowed: string[]
  /** 禁止的行为 */
  forbidden: string[]
}

export const VIRAL_PROTAGONIST_RULES: ViralProtagonistRule[] = [
  {
    id: 'can_pretend_weak',
    stance: '可以装弱，但不能真弱',
    allowed: ['战略性退让', '暗中布局', '假意服从', '藏住底牌'],
    forbidden: ['真哭', '真崩溃', '持续吐血求饶', '跪地不起', '放弃抵抗']
  },
  {
    id: 'must_retaliate_same_episode',
    stance: '每次受辱，必须在同一集讨回来',
    allowed: ['当场反咬', '稍后打脸', '布局反杀', '证据翻盘'],
    forbidden: ['忍到下一集才反击', '只忍不还', '靠别人救场']
  },
  {
    id: 'no_explanation_only_evidence',
    stance: '绝不解释，只用实力/证据/底牌说话',
    allowed: ['甩证据', '亮底牌', '一句话钉死', '动作证明'],
    forbidden: ['长篇说理', '解释动机', '讲述前史', '自我辩护']
  },
  {
    id: 'eyes_must_be_cold',
    stance: '可以沉默，但眼神必须冷、定、稳',
    allowed: ['冷眼旁观', '定住不动', '稳住阵脚', '藏住情绪'],
    forbidden: ['眼神慌乱', '手足无措', '表情失控', '声音发抖']
  },
  {
    id: 'can_be_hurt_not_broken',
    stance: '可以受伤，但不能崩溃',
    allowed: ['带伤战斗', '硬撑', '流血不退', '重伤仍布局'],
    forbidden: ['受伤后丧失行动力', '伤势导致求饶', '崩溃大哭']
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// 四、反派行为规范（解决"只会吼"问题）
// ─────────────────────────────────────────────────────────────────────────────

export type VillainOppressionMode =
  | '规则压迫'
  | '权位压迫'
  | '利益分化'
  | '借刀杀人'

export const VIRAL_VILLAIN_OPPRESSION_MODES: VillainOppressionMode[] = [
  '规则压迫',
  '权位压迫',
  '利益分化',
  '借刀杀人'
]

export interface ViralVillainRule {
  id: string
  stance: string
  allowed: string[]
  forbidden: string[]
}

export const VIRAL_VILLAIN_RULES: ViralVillainRule[] = [
  {
    id: 'use_rules',
    stance: '用规则杀人',
    allowed: ['拿旧规压人', '卡时限', '设程序陷阱', '用制度逼表态'],
    forbidden: ['无规则强行定罪', '超越权限乱来', '不讲道理纯威胁']
  },
  {
    id: 'use_power',
    stance: '用权位压人',
    allowed: ['身份碾压', '职位压制', '资源封锁', '人脉围堵'],
    forbidden: ['越权乱命', '身份不匹配还硬压', '权位叙事空洞']
  },
  {
    id: 'use_interests',
    stance: '用利益分化',
    allowed: ['挑拨离间', '收买叛徒', '分化站队', '条件交换'],
    forbidden: ['利益诱惑无逻辑', '所有人都叛变', '分化手段重复']
  },
  {
    id: 'use_proxies',
    stance: '用借刀杀人',
    allowed: ['指使手下', '栽赃嫁祸', '制造误会', '引第三方入局'],
    forbidden: ['亲自下场肉搏', '亲自骂人', '亲自做脏活']
  }
]

/** 按集数轮换反派压迫模式的策略 */
export function resolveVillainOppressionModeByEpisode(
  episodeNo: number
): VillainOppressionMode {
  const modes = VIRAL_VILLAIN_OPPRESSION_MODES
  return modes[(episodeNo - 1) % modes.length]
}

// ─────────────────────────────────────────────────────────────────────────────
// 五、爽点类型库（16种）
// ─────────────────────────────────────────────────────────────────────────────

export type ViralPayoffType =
  | '证据打脸'
  | '身份碾压'
  | '羞辱反转'
  | '反派自食其果'
  | '反派被背刺'
  | '隐藏大佬撑腰'
  | '关键证人反水'
  | '你不是一个人'
  | '假证据被戳穿'
  | '反派权力被冻结'
  | '反派当众社死'
  | '反派下跪道歉'
  | '反派被规则反噬'
  | '主角一句话全场震动'
  | '主角一招秒杀全场'
  | '终极底牌亮出'

export const VIRAL_PAYOFF_TYPES: ViralPayoffType[] = [
  '证据打脸',
  '身份碾压',
  '羞辱反转',
  '反派自食其果',
  '反派被背刺',
  '隐藏大佬撑腰',
  '关键证人反水',
  '你不是一个人',
  '假证据被戳穿',
  '反派权力被冻结',
  '反派当众社死',
  '反派下跪道歉',
  '反派被规则反噬',
  '主角一句话全场震动',
  '主角一招秒杀全场',
  '终极底牌亮出'
]

/** 按集数轮换爽点类型 */
export function resolvePayoffTypeByEpisode(episodeNo: number): ViralPayoffType {
  return VIRAL_PAYOFF_TYPES[(episodeNo - 1) % VIRAL_PAYOFF_TYPES.length]
}

/** 判断是否为 major 级别爽点 */
export function isMajorPayoffType(type: ViralPayoffType): boolean {
  const majorTypes: ViralPayoffType[] = [
    '身份碾压',
    '隐藏大佬撑腰',
    '反派权力被冻结',
    '反派当众社死',
    '终极底牌亮出'
  ]
  return majorTypes.includes(type)
}

/** 按集数决定 payoffLevel */
export function resolvePayoffLevelByEpisode(
  episodeNo: number,
  totalEpisodes: number
): 'normal' | 'major' | 'final' {
  if (episodeNo === totalEpisodes) return 'final'
  if (episodeNo % 5 === 0) return 'major'
  return 'normal'
}

// ─────────────────────────────────────────────────────────────────────────────
// 六、金句生成公式（只给公式，不给具体台词）
// ─────────────────────────────────────────────────────────────────────────────

export interface ViralPunchlinePattern {
  id: string
  label: string
  /** 公式描述：如何基于当前剧情元素生成 */
  formula: string
  /** 生成约束 */
  constraints: {
    maxLength: number
    mustBindTo: string[]
    tone: string
  }
  /** 反面示例（不该出现的模板句） */
  antiPatterns: string[]
}

export const VIRAL_PUNCHLINE_PATTERNS: ViralPunchlinePattern[] = [
  {
    id: 'identity_crush',
    label: '身份碾压型',
    formula: '用主角当前真实身份/底牌/筹码，反问对手"你也配？"类句式',
    constraints: {
      maxLength: 15,
      mustBindTo: ['身份', '职位', '底牌', '筹码'],
      tone: '冷、短、狠'
    },
    antiPatterns: ['你也配？', '你知道你在跟谁说话吗？', '你还不够格']
  },
  {
    id: 'cold_threat',
    label: '冷静狠人型',
    formula: '用主角守护的具体人/物/证据，发出保护性威胁',
    constraints: {
      maxLength: 15,
      mustBindTo: ['守护对象', '具体人名', '具体物件'],
      tone: '稳、准、狠'
    },
    antiPatterns: ['我不惹事，但不怕事', '你动她一下，我毁你所有', '我的东西，你也敢碰？']
  },
  {
    id: 'ultimate_pressure',
    label: '终极压迫型',
    formula: '用主角当前掌控的规则/时限/条件，宣告对手没有第二次机会',
    constraints: {
      maxLength: 15,
      mustBindTo: ['规则', '时限', '条件', '筹码'],
      tone: '绝、断、狠'
    },
    antiPatterns: ['从现在起，你没有第二次机会', '规矩我来定，你只需要遵守']
  },
  {
    id: 'reversal_cliffhanger',
    label: '反转打脸型',
    formula: '在反派以为胜券在握时，用一句短句揭示主角早有准备',
    constraints: {
      maxLength: 15,
      mustBindTo: ['反派当前误判', '主角隐藏底牌', '即将发生的反转'],
      tone: '轻、狠、扎心'
    },
    antiPatterns: ['好戏，才刚刚开始', '你真以为我毫无准备？', '你输了，输得很彻底']
  }
]

/** 按集数轮换金句公式类型 */
export function resolvePunchlinePatternByEpisode(
  episodeNo: number
): ViralPunchlinePattern {
  return VIRAL_PUNCHLINE_PATTERNS[(episodeNo - 1) % VIRAL_PUNCHLINE_PATTERNS.length]
}

// ─────────────────────────────────────────────────────────────────────────────
// 七、质量阈值
// ─────────────────────────────────────────────────────────────────────────────

export const VIRAL_QUALITY_THRESHOLDS = {
  /** 开局冲击分阈值 */
  openingShock: { pass: 60, good: 80 },
  /** 金句密度分阈值 */
  punchlineDensity: { pass: 60, good: 80 },
  /** 爽点兑现分阈值 */
  catharsisPayoff: { pass: 60, good: 80 },
  /** 反派压迫质量分阈值 */
  villainOppression: { pass: 60, good: 80 },
  /** 集尾留客分阈值 */
  hookRetention: { pass: 60, good: 80 },
  /** 总体内容质量通过线 */
  overallContentQuality: { pass: 70, good: 85 }
} as const

// ─────────────────────────────────────────────────────────────────────────────
// 八、辅助函数：生成 signatureLineSeed
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 基于当前集的元素生成金句种子。
 * 种子不是最终金句，而是告诉模型：用这些元素生成一句短狠对白。
 */
export function buildSignatureLineSeed(input: {
  episodeNo: number
  protagonistName: string
  antagonistName?: string
  /** 当前集核心道具/证据/规则 */
  coreItem?: string
  /** 当前集主角身份/底牌 */
  identityAnchor?: string
  /** 当前集冲突核心 */
  conflictCore?: string
}): string {
  const pattern = resolvePunchlinePatternByEpisode(input.episodeNo)
  const binds: string[] = []
  if (input.identityAnchor) binds.push(`身份:${input.identityAnchor}`)
  if (input.coreItem) binds.push(`道具:${input.coreItem}`)
  if (input.conflictCore) binds.push(`冲突:${input.conflictCore}`)

  const bindText = binds.length > 0 ? binds.join(' / ') : '当前集核心元素'

  return `${pattern.label} | ${pattern.formula} | 绑定[${bindText}] | ${pattern.constraints.maxLength}字以内 | ${pattern.constraints.tone}`
}

// ─────────────────────────────────────────────────────────────────────────────
// 九、辅助函数：生成 openingShockEvent
// ─────────────────────────────────────────────────────────────────────────────

const OPENING_SHOCK_TYPES = ['高损失', '高羞辱', '高危险', '高反转'] as const

export type OpeningShockType = (typeof OPENING_SHOCK_TYPES)[number]

/** 按集数轮换开局冲击类型（首集强制高损失，后续轮换） */
export function resolveOpeningShockTypeByEpisode(episodeNo: number): OpeningShockType {
  if (episodeNo === 1) return '高损失'
  return OPENING_SHOCK_TYPES[(episodeNo - 1) % OPENING_SHOCK_TYPES.length]
}

/**
 * 生成 openingShockEvent 的 fallback 文本。
 * 不给出具体事件，只给出类型和方向。
 */
export function buildOpeningShockEventFallback(input: {
  episodeNo: number
  shockType?: OpeningShockType
  protagonistName?: string
  antagonistName?: string
}): string {
  const type = input.shockType || resolveOpeningShockTypeByEpisode(input.episodeNo)
  const directionMap: Record<OpeningShockType, string> = {
    高损失: `${input.protagonistName || '主角'}失去最珍视的人/物/地位之一，损失必须具体可见。`,
    高羞辱: `${input.protagonistName || '主角'}在公共场合被${input.antagonistName || '反派'}当众羞辱，羞辱必须落在具体名分/身份/资格上。`,
    高危险: `${input.protagonistName || '主角'}面临即时生命威胁或核心关系断裂，危险必须迫在眉睫。`,
    高反转: `${input.antagonistName || '反派'}以为已经压住${input.protagonistName || '主角'}，但主角早有后手，反转必须立刻发生。`
  }
  return directionMap[type]
}

// ─────────────────────────────────────────────────────────────────────────────
// 十、辅助函数：生成 retentionCliffhanger
// ─────────────────────────────────────────────────────────────────────────────

/** 集尾钩子类型 */
export type RetentionCliffhangerType =
  | '新危机压到眼前'
  | '更大反派登场'
  | '秘密被揭开'
  | '关系突然翻面'
  | '筹码被夺走'
  | '时间倒计时'

export const RETENTION_CLIFFHANGER_TYPES: RetentionCliffhangerType[] = [
  '新危机压到眼前',
  '更大反派登场',
  '秘密被揭开',
  '关系突然翻面',
  '筹码被夺走',
  '时间倒计时'
]

/** 按集数轮换集尾钩子类型 */
export function resolveRetentionCliffhangerTypeByEpisode(
  episodeNo: number
): RetentionCliffhangerType {
  return RETENTION_CLIFFHANGER_TYPES[(episodeNo - 1) % RETENTION_CLIFFHANGER_TYPES.length]
}

export function buildRetentionCliffhangerFallback(input: {
  episodeNo: number
  cliffhangerType?: RetentionCliffhangerType
}): string {
  const type = input.cliffhangerType || resolveRetentionCliffhangerTypeByEpisode(input.episodeNo)
  return `集尾必须停在"${type}"的瞬间，最后一句台词扎心，强制观众点开下一集。`
}

// ─────────────────────────────────────────────────────────────────────────────
// 十一、辅助函数：生成 viralHookType
// ─────────────────────────────────────────────────────────────────────────────

export type ViralHookType =
  | '入局钩子'
  | '升级钩子'
  | '反转钩子'
  | '收束钩子'
  | '打脸钩子'
  | '身份钩子'
  | '关系钩子'

/** 基于集数和 act 位置决定 hook 类型 */
export function resolveViralHookTypeByEpisode(
  episodeNo: number,
  totalEpisodes: number
): ViralHookType {
  if (episodeNo === 1) return '入局钩子'
  if (episodeNo === totalEpisodes) return '收束钩子'
  if (episodeNo % 5 === 0) return '打脸钩子'
  if (episodeNo % 3 === 0) return '身份钩子'
  if (episodeNo % 2 === 0) return '反转钩子'
  return '升级钩子'
}
