import type { AudienceLane, MarketProfileDto, Subgenre } from '../../contracts/project.ts'

export type GenerationStrategyId =
  | 'male_urban_counterattack'
  | 'male_xianxia'
  | 'male_history_military'
  | 'female_ceo_romance'
  | 'female_ancient_housefight'
  | 'female_modern_counterattack'
  | 'urban_legal'

export type GenerationStrategySource = 'marketProfile' | 'genreFallback' | 'default'
export type StrategyAudienceLane = AudienceLane | 'neutral'
export type StrategySubgenre = Subgenre | '都市律政'

export interface GenerationStrategyLexicon {
  factionTypes: string[]
  roleTitles: string[]
  conflictObjects: string[]
  payoffActions: string[]
}

export interface GenerationStrategyArchetype {
  key: string
  label: string
  dramaticFunction: string
  defaultPressure: string
}

export interface GenerationStrategyFactionBlueprint {
  key: string
  label: string
  type: string
  coreSeats: string[]
}

export interface GenerationStrategyPromptBlocks {
  factionMatrix: string[]
  characterProfile: string[]
  outline: string[]
  screenplay: string[]
}

export interface GenerationStrategyContaminationIssue {
  term: string
  severity: 'warning' | 'error'
  message: string
}

export interface GenerationStrategyContaminationReplacement {
  term: string
  replacement: string
  count: number
}

export interface RepairStrategyContaminationTextResult {
  text: string
  replacements: GenerationStrategyContaminationReplacement[]
}

export interface RepairStrategyContaminationValueResult<T> {
  value: T
  replacements: GenerationStrategyContaminationReplacement[]
}

export interface GenerationStrategy {
  id: GenerationStrategyId
  label: string
  audienceLane: StrategyAudienceLane
  sourceSubgenre: StrategySubgenre
  worldLexicon: GenerationStrategyLexicon
  characterArchetypes: GenerationStrategyArchetype[]
  factionBlueprints: GenerationStrategyFactionBlueprint[]
  promptBlocks: GenerationStrategyPromptBlocks
  forbiddenTerms: string[]
}

export interface ResolveGenerationStrategyInput {
  marketProfile?: MarketProfileDto | null
  genre?: string | null
  storyIntentGenre?: string | null
  title?: string | null
}

export interface GenerationStrategyResolution {
  strategy: GenerationStrategy
  source: GenerationStrategySource
  warnings: string[]
  matchedBy?: string
}

export interface BuildStrategyFactionMatrixPromptBlockInput {
  genre?: string | null
  sourceText?: string | null
}

export interface StrategyProtagonistFallbackInput {
  name: string
  coreItem: string
  mainConflict: string
}

export interface StrategyProtagonistFallback {
  biography: string
  publicMask: string
  hiddenPressure: string
  fear: string
  protectTarget: string
  conflictTrigger: string
  advantage: string
  weakness: string
  goal: string
  arc: string
}

const STRATEGY_BY_SUBGENRE: Record<Subgenre, GenerationStrategyId> = {
  男频都市逆袭: 'male_urban_counterattack',
  男频玄幻修仙: 'male_xianxia',
  男频历史军政: 'male_history_military',
  女频霸总甜宠: 'female_ceo_romance',
  女频古言宅斗: 'female_ancient_housefight',
  女频现代逆袭: 'female_modern_counterattack'
}

const MODERN_FORBIDDEN_TERMS = ['宗门', '仙盟', '魔尊血脉', '灵根', '法阵', '修为', '飞升']
const XIANXIA_FORBIDDEN_TERMS = ['律所', '律师', '法官', '证据链', '总裁', '集团', '侯府']
const FEMALE_MODERN_FORBIDDEN_TERMS = ['宗门', '仙盟', '魔尊血脉', '灵根', '法阵', '长老']
const FEMALE_ANCIENT_FORBIDDEN_TERMS = ['宗门', '仙盟', '魔尊血脉', '灵根', '法阵', '总裁', '律所']

const STRATEGIES: Record<GenerationStrategyId, GenerationStrategy> = {
  male_urban_counterattack: {
    id: 'male_urban_counterattack',
    label: '男频都市逆袭',
    audienceLane: 'male',
    sourceSubgenre: '男频都市逆袭',
    worldLexicon: {
      factionTypes: ['公司', '家族', '商会', '地下势力'],
      roleTitles: ['董事长', '总经理', '保镖', '赘婿', '继承人'],
      conflictObjects: ['黑卡', '合同', '股权', '身份文件', '项目资源'],
      payoffActions: ['身份揭晓', '当众打脸', '资源碾压', '收回股权']
    },
    characterArchetypes: [
      {
        key: 'hidden_power_protagonist',
        label: '隐藏强者主角',
        dramaticFunction: '以低位身份承压，关键时刻亮出真实资源反杀',
        defaultPressure: '真实身份不能过早暴露，否则会引来更高层围剿'
      },
      {
        key: 'snobbish_oppressor',
        label: '势利压迫者',
        dramaticFunction: '用财富、职位和人脉羞辱主角，制造打脸场',
        defaultPressure: '越依赖信息差，越怕主角身份被证实'
      }
    ],
    factionBlueprints: [
      {
        key: 'protagonist_side',
        label: '主角暗线势力',
        type: '都市势力',
        coreSeats: ['继承人位', '助理位', '保镖位', '资源位']
      },
      {
        key: 'oppressor_side',
        label: '现实压迫势力',
        type: '公司/家族',
        coreSeats: ['老板位', '执行位', '情报位', '打手位']
      }
    ],
    promptBlocks: {
      factionMatrix: ['用公司、家族、资源、人脉组织势力；旧素材里不属于都市逆袭的世界词一律改写为现实势力。'],
      characterProfile: ['人物冲突落在身份差、资源差、职场羞辱和当众反杀上。'],
      outline: ['每阶段必须有身份或资源的可见升级。'],
      screenplay: ['正式剧本用现实场景推进：会议室、宴会、公司、医院、家族场。']
    },
    forbiddenTerms: MODERN_FORBIDDEN_TERMS
  },
  male_xianxia: {
    id: 'male_xianxia',
    label: '男频玄幻修仙',
    audienceLane: 'male',
    sourceSubgenre: '男频玄幻修仙',
    worldLexicon: {
      factionTypes: ['宗门', '仙盟', '世家', '魔道余部'],
      roleTitles: ['掌门', '长老', '护法', '亲传弟子', '外门弟子'],
      conflictObjects: ['血脉', '灵根', '法宝', '功法', '秘境令牌'],
      payoffActions: ['境界突破', '越级反杀', '血脉觉醒', '宗门大比翻盘']
    },
    characterArchetypes: [
      {
        key: 'hidden_bloodline_protagonist',
        label: '隐藏血脉主角',
        dramaticFunction: '在宗门压迫下隐藏魔尊血脉，靠觉醒和反杀推进主线',
        defaultPressure: '血脉暴露会引发宗门审判和仙盟围剿'
      },
      {
        key: 'guardian_heroine',
        label: '暗中守护女主',
        dramaticFunction: '用身份、密道、秘宝和情报保护主角，把暗线推到台前',
        defaultPressure: '保护主角会逼她与父亲、宗门或正道规矩冲突'
      },
      {
        key: 'sect_enforcer',
        label: '宗门执行爪牙',
        dramaticFunction: '把长老命令落实成刁难、监视、围杀和处刑现场',
        defaultPressure: '靠山一旦暴露，他会成为主角清算的第一批人'
      }
    ],
    factionBlueprints: [
      {
        key: 'sect',
        label: '主角宗门',
        type: '宗门',
        coreSeats: ['掌门位', '长老位', '护法位', '亲传弟子位', '门下弟子位']
      },
      {
        key: 'righteous_alliance',
        label: '正道仙盟',
        type: '组织',
        coreSeats: ['盟主位', '特使位', '情报位', '执行位', '世家合作者位']
      }
    ],
    promptBlocks: {
      factionMatrix: ['允许宗门、仙盟、世家、魔道余部，但成员表只写主归属。'],
      characterProfile: ['人物必须围绕血脉秘密、宗门规矩、仙盟伪善和修为压力产生戏。'],
      outline: ['用宗门审判、秘境、血脉暴露、越级反杀制造阶段推进。'],
      screenplay: ['正式剧本可使用山门、演武场、禁地、密室、仙盟大殿等场景。']
    },
    forbiddenTerms: XIANXIA_FORBIDDEN_TERMS
  },
  male_history_military: {
    id: 'male_history_military',
    label: '男频历史军政',
    audienceLane: 'male',
    sourceSubgenre: '男频历史军政',
    worldLexicon: {
      factionTypes: ['朝堂', '军营', '藩镇', '敌国'],
      roleTitles: ['皇帝', '将军', '谋士', '保守派大臣', '边军统领'],
      conflictObjects: ['军令', '粮草', '兵权', '奏折', '城防图'],
      payoffActions: ['朝堂反压', '战术破局', '改革见效', '兵权到手']
    },
    characterArchetypes: [
      {
        key: 'modern_knowledge_protagonist',
        label: '新知破局主角',
        dramaticFunction: '用超前知识和军政判断压倒旧规',
        defaultPressure: '新法越有效，越会触动旧派利益'
      }
    ],
    factionBlueprints: [
      {
        key: 'reform_side',
        label: '主角改革派',
        type: '朝堂势力',
        coreSeats: ['主公位', '谋士位', '武将位', '财政位']
      },
      {
        key: 'conservative_side',
        label: '保守派',
        type: '朝堂势力',
        coreSeats: ['大臣位', '御史位', '门阀位', '军中阻力位']
      }
    ],
    promptBlocks: {
      factionMatrix: ['用朝堂、军营、门阀、敌国组织冲突。'],
      characterProfile: ['人物压力落在兵权、祖制、粮草、改革和君臣猜忌上。'],
      outline: ['每阶段要有职位、军权、改革成果或战场胜利的变化。'],
      screenplay: ['正式剧本优先朝堂辩论、军帐议事、战场反转和城防危机。']
    },
    forbiddenTerms: ['宗门', '仙盟', '魔尊血脉', '总裁', '律所', '法官']
  },
  female_ceo_romance: {
    id: 'female_ceo_romance',
    label: '女频霸总甜宠',
    audienceLane: 'female',
    sourceSubgenre: '女频霸总甜宠',
    worldLexicon: {
      factionTypes: ['集团', '豪门', '职场', '家族'],
      roleTitles: ['总裁', '特助', '未婚妻', '白月光', '董事长'],
      conflictObjects: ['契约', '婚约', '股权', '亲子鉴定', '舆论热搜'],
      payoffActions: ['撑腰护短', '身份揭晓', '误会解除', '追妻反转']
    },
    characterArchetypes: [
      {
        key: 'resilient_heroine',
        label: '被低估女主',
        dramaticFunction: '从被轻视到被看见，在关系和事业中获得主动权',
        defaultPressure: '越被高权力者偏爱，越会被豪门和舆论攻击'
      },
      {
        key: 'powerful_love_interest',
        label: '高权力男主',
        dramaticFunction: '在关键场面提供撑腰，但不能替女主完成全部成长',
        defaultPressure: '家族利益和情感选择发生冲突'
      }
    ],
    factionBlueprints: [
      {
        key: 'heroine_side',
        label: '女主成长线',
        type: '职场/情感阵营',
        coreSeats: ['女主位', '闺蜜位', '事业助力位', '秘密身份位']
      },
      {
        key: 'elite_pressure_side',
        label: '豪门压力线',
        type: '豪门/集团',
        coreSeats: ['总裁位', '长辈位', '女二位', '执行位']
      }
    ],
    promptBlocks: {
      factionMatrix: ['用集团、豪门、职场、舆论组织势力；旧素材里不属于霸总甜宠的世界词一律改写为现实关系和权力场。'],
      characterProfile: ['人物冲突落在关系权力、误会、身份差和撑腰反击上。'],
      outline: ['误会不能拖太久，女主每阶段要有自己的主动选择。'],
      screenplay: ['正式剧本用办公室、宴会、医院、家族会议、媒体场推进。']
    },
    forbiddenTerms: FEMALE_MODERN_FORBIDDEN_TERMS
  },
  female_ancient_housefight: {
    id: 'female_ancient_housefight',
    label: '女频古言宅斗',
    audienceLane: 'female',
    sourceSubgenre: '女频古言宅斗',
    worldLexicon: {
      factionTypes: ['侯府', '后宅', '宫廷', '外戚家族'],
      roleTitles: ['嫡女', '庶女', '主母', '王爷', '嬷嬷'],
      conflictObjects: ['婚约', '账本', '嫁妆', '药方', '宫宴请帖'],
      payoffActions: ['用规矩反压', '揭穿陷害', '夺回嫁妆', '宫宴翻盘']
    },
    characterArchetypes: [
      {
        key: 'wronged_heroine',
        label: '被害嫡庶女主',
        dramaticFunction: '用规矩、证据和布局反杀后宅压迫',
        defaultPressure: '每次反击都会牵动家族名声和婚姻筹码'
      },
      {
        key: 'household_matriarch',
        label: '后宅掌权者',
        dramaticFunction: '用礼法、账本和长辈权威压制女主',
        defaultPressure: '越维持体面，越怕旧账被当众揭开'
      }
    ],
    factionBlueprints: [
      {
        key: 'heroine_household',
        label: '女主府宅线',
        type: '家族',
        coreSeats: ['女主位', '丫鬟位', '旧仆位', '证据位']
      },
      {
        key: 'housefight_pressure',
        label: '后宅压迫线',
        type: '侯府/宫廷',
        coreSeats: ['主母位', '姐妹位', '长辈位', '外部权贵位']
      }
    ],
    promptBlocks: {
      factionMatrix: ['用侯府、后宅、宫廷、外戚组织势力；旧素材里不属于古言宅斗的世界词一律改写为府宅、礼法和家族压力。'],
      characterProfile: ['人物压力落在嫡庶、婚约、名声、账本、嫁妆和礼法上。'],
      outline: ['每阶段要有一次规矩反压或证据反杀。'],
      screenplay: ['正式剧本用内宅、祠堂、宫宴、账房、花厅等场景。']
    },
    forbiddenTerms: FEMALE_ANCIENT_FORBIDDEN_TERMS
  },
  female_modern_counterattack: {
    id: 'female_modern_counterattack',
    label: '女频现代逆袭',
    audienceLane: 'female',
    sourceSubgenre: '女频现代逆袭',
    worldLexicon: {
      factionTypes: ['职场', '家庭', '舆论场', '学校'],
      roleTitles: ['前夫', '上司', '同事', '闺蜜', '投资人'],
      conflictObjects: ['离婚协议', '项目方案', '热搜证据', '学历证明', '创业资金'],
      payoffActions: ['经济独立', '职场翻盘', '渣男后悔', '舆论反转']
    },
    characterArchetypes: [
      {
        key: 'independent_heroine',
        label: '现代逆袭女主',
        dramaticFunction: '从情感或职场低位中夺回选择权',
        defaultPressure: '成长越快，越会被旧关系和舆论拉回原位'
      }
    ],
    factionBlueprints: [
      {
        key: 'heroine_growth_side',
        label: '女主成长势力',
        type: '职场/生活',
        coreSeats: ['女主位', '好友位', '事业贵人位', '证据位']
      },
      {
        key: 'old_life_pressure',
        label: '旧关系压迫线',
        type: '家庭/职场',
        coreSeats: ['前夫位', '上司位', '亲戚位', '舆论位']
      }
    ],
    promptBlocks: {
      factionMatrix: ['用职场、家庭、学校、舆论场组织势力；旧素材里不属于现代逆袭的世界词一律改写为现实生活压力。'],
      characterProfile: ['人物冲突落在经济独立、情感解绑、职场证明和舆论反转上。'],
      outline: ['每阶段必须让女主获得具体能力、职位、资源或关系主动权。'],
      screenplay: ['正式剧本用办公室、家中、学校、直播间、发布会等现实场景。']
    },
    forbiddenTerms: FEMALE_MODERN_FORBIDDEN_TERMS
  },
  urban_legal: {
    id: 'urban_legal',
    label: '都市律政',
    audienceLane: 'neutral',
    sourceSubgenre: '都市律政',
    worldLexicon: {
      factionTypes: ['律所', '法院', '检方', '企业法务部', '媒体'],
      roleTitles: ['律师', '合伙人', '法官', '检察官', '委托人', '证人'],
      conflictObjects: ['证据链', '卷宗', '合同原件', '监控录像', '庭审记录'],
      payoffActions: ['庭审反转', '证据补强', '交叉询问', '当庭翻供']
    },
    characterArchetypes: [
      {
        key: 'principled_lawyer',
        label: '原则型律师主角',
        dramaticFunction: '在证据、职业伦理和委托人隐瞒之间推进真相',
        defaultPressure: '坚持真相可能输掉案子，也可能得罪律所和客户'
      },
      {
        key: 'opposing_counsel',
        label: '对方律师',
        dramaticFunction: '用程序、证据漏洞和舆论压力逼主角犯错',
        defaultPressure: '赢案压力越大，越容易越过职业边界'
      }
    ],
    factionBlueprints: [
      {
        key: 'law_firm_side',
        label: '主角律所线',
        type: '律所',
        coreSeats: ['主办律师位', '合伙人位', '助理位', '委托人位', '证据位']
      },
      {
        key: 'case_pressure_side',
        label: '案件对抗线',
        type: '司法/企业',
        coreSeats: ['对方律师位', '法官位', '证人位', '媒体位', '幕后委托方位']
      }
    ],
    promptBlocks: {
      factionMatrix: ['用律所、法院、检方、企业法务、媒体组织势力；旧素材里不属于律政题材的世界词一律改写为案件、程序和证据压力。'],
      characterProfile: ['人物冲突必须落在证据链、职业伦理、委托人隐瞒、庭审策略上。'],
      outline: ['每阶段要有新证据、新证词、程序风险或庭审反转。'],
      screenplay: ['正式剧本优先律所会议、取证现场、调解室、法庭、媒体采访。']
    },
    forbiddenTerms: ['宗门', '仙盟', '魔尊血脉', '灵根', '法阵', '修为', '飞升', '侯府', '王爷']
  }
}

export const ALL_GENERATION_STRATEGY_IDS = Object.keys(
  STRATEGIES
) as GenerationStrategyId[]

export function getGenerationStrategyById(id: GenerationStrategyId): GenerationStrategy {
  return STRATEGIES[id]
}

export function resolveGenerationStrategy(
  input: ResolveGenerationStrategyInput
): GenerationStrategyResolution {
  const marketSubgenre = input.marketProfile?.subgenre
  if (marketSubgenre) {
    const id = STRATEGY_BY_SUBGENRE[marketSubgenre]
    if (id) {
      return {
        strategy: getGenerationStrategyById(id),
        source: 'marketProfile',
        warnings: []
      }
    }
  }

  const fallbackCandidates = [input.genre, input.storyIntentGenre, input.title]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim())

  for (const candidate of fallbackCandidates) {
    const fallbackId = inferStrategyIdFromText(candidate)
    if (fallbackId) {
      return {
        strategy: getGenerationStrategyById(fallbackId),
        source: 'genreFallback',
        warnings: [],
        matchedBy: candidate
      }
    }
  }

  return {
    strategy: getGenerationStrategyById('male_urban_counterattack'),
    source: 'default',
    warnings: ['未能从 marketProfile 或题材文本确认题材策略，已使用男频都市逆袭默认策略。']
  }
}

export function detectStrategyContamination(
  strategy: GenerationStrategy,
  text: string
): GenerationStrategyContaminationIssue[] {
  const normalizedText = text.trim()
  if (!normalizedText) return []

  return strategy.forbiddenTerms
    .filter((term) => normalizedText.includes(term))
    .map((term) => ({
      term,
      severity: 'error' as const,
      message: `当前题材策略「${strategy.label}」不应出现「${term}」。`
    }))
}

export function repairStrategyContaminationText(
  strategy: GenerationStrategy,
  text: string
): RepairStrategyContaminationTextResult {
  if (!text) {
    return { text, replacements: [] }
  }

  let nextText = text
  const replacements: GenerationStrategyContaminationReplacement[] = []
  const orderedForbiddenTerms = strategy.forbiddenTerms
    .map((term, index) => ({ term, index }))
    .sort((left, right) => right.term.length - left.term.length || left.index - right.index)

  for (const { term } of orderedForbiddenTerms) {
    const count = countLiteralOccurrences(nextText, term)
    if (count === 0) continue

    const replacement = resolveStrategyTermReplacement(strategy, term)
    if (!replacement || replacement === term) continue

    nextText = nextText.split(term).join(replacement)
    replacements.push({ term, replacement, count })
  }

  return {
    text: nextText,
    replacements
  }
}

export function repairStrategyContaminationValue<T>(
  strategy: GenerationStrategy,
  value: T
): RepairStrategyContaminationValueResult<T> {
  if (typeof value === 'string') {
    const repaired = repairStrategyContaminationText(strategy, value)
    return {
      value: repaired.text as T,
      replacements: repaired.replacements
    }
  }

  if (Array.isArray(value)) {
    const replacements: GenerationStrategyContaminationReplacement[] = []
    const nextItems = value.map((item) => {
      const repaired = repairStrategyContaminationValue(strategy, item)
      replacements.push(...repaired.replacements)
      return repaired.value
    })
    return { value: nextItems as T, replacements }
  }

  if (value && typeof value === 'object') {
    const replacements: GenerationStrategyContaminationReplacement[] = []
    const nextEntries = Object.entries(value as Record<string, unknown>).map(([key, item]) => {
      const repaired = repairStrategyContaminationValue(strategy, item)
      replacements.push(...repaired.replacements)
      return [key, repaired.value]
    })
    return {
      value: Object.fromEntries(nextEntries) as T,
      replacements
    }
  }

  return { value, replacements: [] }
}

export function summarizeStrategyContaminationReplacements(
  replacements: GenerationStrategyContaminationReplacement[]
): string {
  const grouped = new Map<string, GenerationStrategyContaminationReplacement>()
  for (const replacement of replacements) {
    const key = `${replacement.term}->${replacement.replacement}`
    const current = grouped.get(key)
    if (current) {
      current.count += replacement.count
    } else {
      grouped.set(key, { ...replacement })
    }
  }

  return Array.from(grouped.values())
    .map((replacement) => `${replacement.term}→${replacement.replacement}×${replacement.count}`)
    .join('、')
}

export function buildStrategyFactionMatrixPromptBlock(
  strategy: GenerationStrategy,
  input: BuildStrategyFactionMatrixPromptBlockInput = {}
): string {
  const sourceText = `${input.genre || ''}\n${input.sourceText || ''}`
  const lines = [
    '【题材策略层 · 势力拆解规则】',
    `- 当前策略：${strategy.label}`,
    `- 可用势力类型：${strategy.worldLexicon.factionTypes.join('、')}`,
    `- 可用角色称谓：${strategy.worldLexicon.roleTitles.join('、')}`,
    `- 可用冲突物件：${strategy.worldLexicon.conflictObjects.join('、')}`,
    strategy.id === 'male_xianxia'
      ? `- 禁用题材词：${strategy.forbiddenTerms.join('、')}`
      : '- 题材边界：只使用上方策略词库；旧素材里不属于当前策略的世界词不要沿用。',
    ...strategy.promptBlocks.factionMatrix.map((block) => `- ${block}`)
  ]

  if (strategy.id === 'male_xianxia' && isHiddenBloodlineXianxiaText(sourceText)) {
    lines.push(
      '',
      '【隐藏血脉修仙项目 · 额外铁律】',
      '1. 如果底稿写的是“废柴被封印/隐藏魔尊血脉/吊坠觉醒”，魔尊血脉是主角身上的秘密和危险，不等于主角已经拥有一个公开魔尊组织。',
      '2. 禁止把主角前期写成魔渊宗宗主、魔界少主、旧部首领、已掌权魔尊；他前期必须是不知真相、被宗门压住和误解的废柴。',
      '3. 一级势力优先拆成：保护/压制主角的宗门掌门方、伪善利用主角的正道仙盟方；只有底稿明确出现魔界旧部时，才允许单独生成魔尊旧部势力。',
      '4. 真女主和反派大小姐必须分开：真女主=宗门老大女儿/暗中守护；反派大小姐=名门正派/仙盟嫡女/伪善利用。禁止合并成同一个人物。',
      '5. 母亲吊坠/吊坠碎片是贯穿线索或关键物件，不要只当第一集觉醒触发器。',
      '6. 禁止自动加入退婚、未婚妻、改嫁仙盟天才、婚约羞辱；除非底稿明确出现“退婚/婚约/未婚妻”。反派大小姐的核心打法是伪装善意、骗信任、夺血脉。'
    )
  }

  return lines.join('\n')
}

export function buildStrategyProtagonistFallback(
  strategy: GenerationStrategy,
  input: StrategyProtagonistFallbackInput
): StrategyProtagonistFallback {
  if (strategy.id === 'male_xianxia') {
    return {
      biography: `${input.name}是被宗门长期当成废柴的男主，体内封着足以引发正道争夺的魔尊血脉。他因${input.coreItem}被毁开始觉醒，在误信伪善对手和忽视暗中守护者之间不断受挫，最终查清父母旧案并学会掌控血脉。`,
      publicMask: '表面是修炼迟滞、处处被嘲笑的宗门底层弟子。',
      hiddenPressure: '他不知道自己为何被压成废柴，也不知道体内魔尊血脉一旦暴露会牵动整个仙盟。',
      fear: `失去${input.coreItem}、身世真相和暗中守护自己的人。`,
      protectTarget: `${input.coreItem}、自己的身世真相和真正守护他的人。`,
      conflictTrigger: `有人踩碎、抢夺或利用${input.coreItem}，或拿暗中守护者逼他交出血脉秘密。`,
      advantage: '魔尊血脉一旦被逼醒，能在绝境中爆发出压倒性力量。',
      weakness: '前期自卑又缺真相，容易被伪善对手骗取信任。',
      goal: '查清父母被害真相，弄清魔尊血脉来源，完成逆袭复仇并守住世界。',
      arc: '从被蒙蔽的废柴，到识破利用、掌控血脉、愿意承担守护责任的强者。'
    }
  }

  if (strategy.id === 'urban_legal') {
    return {
      biography: `${input.name}是被案件推到风口的主角，围绕${input.coreItem}和证据链查明真相，在委托人隐瞒、对方律师设局和庭审压力中完成反击。`,
      publicMask: '表面是只按程序办案的律师，所有判断都必须落在证据上。',
      hiddenPressure: '关键证据还不完整，委托人和律所都可能隐藏真正风险。',
      fear: `失去${input.coreItem}、关键证人和职业信誉。`,
      protectTarget: `${input.coreItem}、委托人的真实处境和自己的职业底线。`,
      conflictTrigger: `对方律师抢先攻击证据链，或委托人隐瞒事实导致庭审失控。`,
      advantage: '能从卷宗、证词和现场细节里找到对手忽略的证据漏洞。',
      weakness: '太相信证据闭环，一旦当事人说谎，就容易在程序上被反咬。',
      goal: '补齐证据链，守住职业伦理，并在庭审中逼出真相。',
      arc: '从只相信程序的办案者，到能在证据、伦理和人性之间主动控局的律师。'
    }
  }

  const conflictObject = strategy.worldLexicon.conflictObjects[0] || input.coreItem
  const payoffAction = strategy.worldLexicon.payoffActions[0] || '完成反击'
  const roleTitle = strategy.worldLexicon.roleTitles[0] || '主角'

  return {
    biography: `${input.name}是${strategy.label}里的${roleTitle}型主角，围绕${input.mainConflict || conflictObject}持续受压、查明真相并完成${payoffAction}。`,
    publicMask: '表面被局势压住，只能先忍住寻找破局点。',
    hiddenPressure: `${conflictObject}和真正底牌还不能提前暴露。`,
    fear: `失去${input.coreItem}、身边支持和关键证据。`,
    protectTarget: `${input.coreItem}、身边人和自己的选择权。`,
    conflictTrigger: `对手拿身边人或${conflictObject}逼他低头。`,
    advantage: '能在压力场里藏锋、观察和反设局。',
    weakness: '前期信息不足，容易误判真正敌友。',
    goal: `查清真相并完成${payoffAction}。`,
    arc: '从被动受压到主动掌控局面。'
  }
}

function isHiddenBloodlineXianxiaText(text: string): boolean {
  return (
    /修仙|玄幻|仙盟|宗门/u.test(text) &&
    /魔尊|血脉|封印|废柴|废材|吊坠|身世/u.test(text)
  )
}

function countLiteralOccurrences(text: string, term: string): number {
  if (!text || !term) return 0
  return text.split(term).length - 1
}

function resolveStrategyTermReplacement(
  strategy: GenerationStrategy,
  term: string
): string {
  if (isFactionContaminationTerm(term)) {
    return pickStrategyReplacement(strategy, term, strategy.worldLexicon.factionTypes)
  }

  if (isRoleContaminationTerm(term)) {
    return pickStrategyReplacement(strategy, term, strategy.worldLexicon.roleTitles)
  }

  if (isPayoffContaminationTerm(term)) {
    return pickStrategyReplacement(strategy, term, [
      ...strategy.worldLexicon.payoffActions,
      ...strategy.worldLexicon.conflictObjects
    ])
  }

  return pickStrategyReplacement(strategy, term, [
    ...strategy.worldLexicon.conflictObjects,
    ...strategy.worldLexicon.payoffActions
  ])
}

function pickStrategyReplacement(
  strategy: GenerationStrategy,
  term: string,
  candidates: string[]
): string {
  return (
    candidates.find(
      (candidate) =>
        candidate.trim().length > 0 &&
        candidate !== term &&
        !strategy.forbiddenTerms.includes(candidate)
    ) || ''
  )
}

function isFactionContaminationTerm(term: string): boolean {
  return /^(宗门|仙盟|律所|集团|侯府|公司|朝堂|军营)$/u.test(term)
}

function isRoleContaminationTerm(term: string): boolean {
  return /^(长老|律师|法官|总裁|王爷|皇帝|将军)$/u.test(term)
}

function isPayoffContaminationTerm(term: string): boolean {
  return /^(飞升)$/u.test(term)
}

function inferStrategyIdFromText(text: string): GenerationStrategyId | null {
  if (!text.trim()) return null

  if (/(律师|律所|法庭|法院|检察官|判案|证据链|庭审)/u.test(text)) return 'urban_legal'
  if (/(玄幻|修仙|仙侠|宗门|仙盟|魔尊|血脉|灵根|法阵|飞升)/u.test(text)) {
    return 'male_xianxia'
  }
  if (/(历史|军政|朝堂|皇帝|将军|谋士|边军|敌国)/u.test(text)) {
    return 'male_history_military'
  }
  if (/(霸总|总裁|甜宠|契约婚姻|豪门|白月光|追妻)/u.test(text)) {
    return 'female_ceo_romance'
  }
  if (/(古言|宅斗|侯府|嫡女|庶女|主母|王爷|宫宴|嫁妆)/u.test(text)) {
    return 'female_ancient_housefight'
  }
  if (/(女频现代|离婚|前夫|职场逆袭|独立女性|渣男后悔)/u.test(text)) {
    return 'female_modern_counterattack'
  }
  if (/(都市|逆袭|赘婿|战神|神豪|公司|家族|黑卡)/u.test(text)) {
    return 'male_urban_counterattack'
  }

  return null
}
