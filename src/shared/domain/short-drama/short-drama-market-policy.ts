/**
 * 短剧市场规则资产（Short Drama Market Policy）
 *
 * 原则：
 * 1. 按 audienceLane + subgenre 结构化拆分，男频/女频爽点模型完全不同。
 * 2. 每个垂类给出创作指导字段，不是 prompt 原文，是结构化规则。
 * 3. 下游调用方用 getSubgenrePolicy() / getAudienceLanePolicy() 按需取用。
 */

import type { AudienceLane, Subgenre } from '../../contracts/project.ts'

// ─────────────────────────────────────────────────────────────────────────────
// 一、类型定义
// ─────────────────────────────────────────────────────────────────────────────

export interface SubgenrePolicy {
  /** 受众赛道 */
  audienceLane: AudienceLane
  /** 垂类标识（中文） */
  subgenre: Subgenre
  /** 核心受众描述 */
  coreAudience: string
  /** 核心情绪爽点（按优先级） */
  emotionalPayoffs: string[]
  /** 主要冲突类型 */
  primaryConflictTypes: string[]
  /** 主角设计原则 */
  protagonistDesign: {
    startingPosition: string
    growthArc: string
    hiddenStrength: string
    mustAvoid: string[]
  }
  /** 反派设计原则 */
  antagonistDesign: {
    oppressionStyle: string
    powerSource: string
    weaknessPattern: string
    mustAvoid: string[]
  }
  /** 关系模型 */
  relationshipModel: {
    coreDynamic: string
    keyRelationships: string[]
    betrayalRules: string[]
  }
  /** 权力/升级模型 */
  powerModel: {
    progressionType: string
    powerSources: string[]
    setbackRules: string[]
  }
  /** 常见爽点节拍（每集可用） */
  commonPayoffBeats: string[]
  /** 必须避免的创作禁忌 */
  avoidRules: string[]
  /** 推荐的集数节奏模板 */
  recommendedEpisodeBeats: {
    phase: string
    episodes: string
    focus: string
  }[]
}

export interface AudienceLanePolicy {
  audienceLane: AudienceLane
  /** 该赛道的底层爽点逻辑 */
  coreLogic: string
  /** 与另一赛道最显著的区别 */
  keyDifferentiator: string
  /** 通用创作原则 */
  universalRules: string[]
  /** 包含的垂类列表 */
  subgenres: Subgenre[]
}

// ─────────────────────────────────────────────────────────────────────────────
// 二、男频赛道政策
// ─────────────────────────────────────────────────────────────────────────────

const MALE_LANE_POLICY: AudienceLanePolicy = {
  audienceLane: 'male',
  coreLogic:
    '男频爽点 = 逆袭 + 升级 + 碾压 + 底牌。观众代入的是"从弱到强、从低到高"的权力/资源/战力增长曲线。',
  keyDifferentiator: '男频靠"自身实力增长"获得爽感，不靠他人撑腰；反派必须层级递进，不能一次性打完。',
  universalRules: [
    '主角必须在每一集获得可见的成长（资源/身份/战力/信息）',
    '反派必须分层级：小喽啰 → 中层 → 大BOSS → 终极Boss',
    '每集必须有明确的"升级动作"，不能只有情绪没有收获',
    '底牌要层层揭开，不能一次性亮完',
    '打脸必须当场兑现，不能拖',
    '禁止靠女主/女配/师父替主角收账',
    '主角可以隐忍，但眼神必须冷、定、稳'
  ],
  subgenres: ['男频都市逆袭', '男频玄幻修仙', '男频历史军政']
}

// ─────────────────────────────────────────────────────────────────────────────
// 三、女频赛道政策
// ─────────────────────────────────────────────────────────────────────────────

const FEMALE_LANE_POLICY: AudienceLanePolicy = {
  audienceLane: 'female',
  coreLogic:
    '女频爽点 = 代入 + 情绪补偿 + 关系拉扯 + 权力借用。观众代入的是"被看见、被保护、被选中"的情感满足。',
  keyDifferentiator:
    '女频靠"关系中的权力变化"获得爽感，高权力者（男主/长辈/隐藏身份）撑腰是核心机制；女主成长是"从依附到被看见"。',
  universalRules: [
    '每一集必须有情绪代入点，让观众感到"我也经历过"',
    '权力借用必须成立：高权力者与女主的隐秘关系要在关键时刻揭晓',
    '关系拉扯要有效：女主与关键人物之间必须有张力，不能一步到位',
    '女主成长要具体：从依赖到独立，每一步都要可见',
    '高权力者撑腰要爽：反派以为自己占上风时，被更高层规则反压',
    '情绪补偿要到位：前半集受的委屈，后半集必须连本带利还',
    '禁止把女主写成只会等救援的"花瓶"'
  ],
  subgenres: ['女频霸总甜宠', '女频古言宅斗', '女频现代逆袭']
}

// ─────────────────────────────────────────────────────────────────────────────
// 四、垂类政策（6个）
// ─────────────────────────────────────────────────────────────────────────────

const SUBGENRE_POLICIES: Record<Subgenre, SubgenrePolicy> = {
  男频都市逆袭: {
    audienceLane: 'male',
    subgenre: '男频都市逆袭',
    coreAudience: '追求现实逆袭感的男性观众，偏好系统流、战神回归、万亿遗产等',
    emotionalPayoffs: ['身份揭晓的碾压感', '资源/财富增长的爽感', '反派当场被打脸的快感', '系统/金手指带来的确定性'],
    primaryConflictTypes: ['身份错位', '资源争夺', '规则碾压', '当众羞辱与反杀'],
    protagonistDesign: {
      startingPosition: '表面弱势（外卖员/保安/赘婿），但隐藏真实身份或获得系统',
      growthArc: '从被羞辱到身份揭晓，从资源匮乏到财富碾压',
      hiddenStrength: '真实身份/系统能力/隐藏资产/过人技能',
      mustAvoid: ['真窝囊', '靠女人救', '系统解释超过8秒', '升级靠运气不靠努力']
    },
    antagonistDesign: {
      oppressionStyle: '用权位、财富、人脉当众羞辱主角',
      powerSource: '家族背景/公司职位/社会关系',
      weaknessPattern: '目中无人、信息差（不知道主角真实身份）',
      mustAvoid: ['无脑吼叫', '重复同一招', '降智送经验']
    },
    relationshipModel: {
      coreDynamic: '表面羞辱者 vs 隐藏强者',
      keyRelationships: ['主角 vs 反派上司', '主角 vs 势利亲戚', '主角 vs 势利女友/未婚妻'],
      betrayalRules: ['前女友/未婚妻的背叛必须在开局兑现', '势利亲戚的羞辱要层层递进']
    },
    powerModel: {
      progressionType: '显性升级：财富/身份/技能逐集增长',
      powerSources: ['系统奖励', '隐藏资产解锁', '真实身份逐步揭露', '技能提升'],
      setbackRules: [' setbacks 必须是为了更大的反击', '不能真输，只能假退']
    },
    commonPayoffBeats: [
      '反派当众羞辱 → 主角亮出真实身份',
      '反派以为主角没钱 → 主角掏出黑卡/系统奖励到账',
      '反派找打手 → 主角战神身份暴露，保镖跪地',
      '反派设局陷害 → 主角反将一军，反派自食其果'
    ],
    avoidRules: [
      '系统规则解释不能超过8秒',
      '不能连续两集用同一种打脸方式',
      '女主/女配不能替主角解决核心冲突',
      '反派不能一次性全部出场'
    ],
    recommendedEpisodeBeats: [
      { phase: '开局绝境', episodes: '1-5', focus: '身份隐藏、当众羞辱、首次小反击' },
      { phase: '搅动局面', episodes: '6-15', focus: '身份逐步揭露、中层反派破防、资源增长' },
      { phase: '势力成型', episodes: '16-30', focus: '建立势力、收服盟友、大反派登场' },
      { phase: '中层清算', episodes: '31-45', focus: '清算中层反派、大反派施压、底牌亮相' },
      { phase: '终极博弈', episodes: '46-55', focus: '终极对决、身份完全揭晓、反派绝望' },
      { phase: '登顶收官', episodes: '56-60', focus: '登顶巅峰、关系圆满、完美闭环' }
    ]
  },

  男频玄幻修仙: {
    audienceLane: 'male',
    subgenre: '男频玄幻修仙',
    coreAudience: '偏好热血升级、力量体系的男性观众',
    emotionalPayoffs: ['境界突破的爽感', '越级挑战的胜利', '法宝/功法获得的满足', '宗门地位提升的荣耀'],
    primaryConflictTypes: ['境界压制', '资源争夺', '宗门斗争', '正邪对抗'],
    protagonistDesign: {
      startingPosition: '废柴/外门弟子/被逐者，但获得上古传承或特殊体质',
      growthArc: '从废柴到仙尊，每一境界都有明确的突破事件',
      hiddenStrength: '上古传承/特殊体质/隐藏功法/神秘法宝',
      mustAvoid: ['升级靠运气不靠努力', '功法解释超过8秒', '师父替主角打架']
    },
    antagonistDesign: {
      oppressionStyle: '用境界、宗门规则、资源封锁压制主角',
      powerSource: '高境界/宗门地位/稀有资源',
      weaknessPattern: '傲慢、低估主角、固守旧规则',
      mustAvoid: ['境界高还亲自动手打小辈', '重复同一招打压', '无脑喊"蝼蚁"']
    },
    relationshipModel: {
      coreDynamic: '弱者挑战强者规则',
      keyRelationships: ['主角 vs 宗门长老', '主角 vs 同门天才', '主角 vs 敌对宗门'],
      betrayalRules: ['同门背叛要具体有动机', '宗门抛弃主角要落在规则不公上']
    },
    powerModel: {
      progressionType: '境界升级 + 法宝/功法获取',
      powerSources: ['境界突破', '法宝炼化', '功法修炼', '丹药/灵石'],
      setbackRules: ['突破失败必须引出更大机缘', '法宝被夺必须是为了更好的法宝']
    },
    commonPayoffBeats: [
      '反派用境界压人 → 主角越级挑战成功',
      '反派嘲笑主角没法宝 → 主角亮出上古神器',
      '宗门大比 → 主角一鸣惊人',
      '秘境探险 → 主角获得最大机缘'
    ],
    avoidRules: [
      '境界名称解释不能超过8秒',
      '不能连续两集同一种战斗套路',
      '禁止"你这种蝼蚁"重复出现',
      '升级必须伴随具体事件，不能空喊突破'
    ],
    recommendedEpisodeBeats: [
      { phase: '废柴开局', episodes: '1-5', focus: '被逐/被辱、获得传承、首次突破' },
      { phase: '初露锋芒', episodes: '6-15', focus: '宗门测试、越级挑战、获得第一法宝' },
      { phase: '声名鹊起', episodes: '16-30', focus: '宗门大比、秘境探险、建立势力' },
      { phase: '搅动风云', episodes: '31-45', focus: '敌对宗门冲突、大长老打压、底牌亮相' },
      { phase: '巅峰对决', episodes: '46-55', focus: '正邪大战、终极传承、仙尊之路' },
      { phase: '登顶封神', episodes: '56-60', focus: '最终突破、宗门重建、圆满收官' }
    ]
  },

  男频历史军政: {
    audienceLane: 'male',
    subgenre: '男频历史军政',
    coreAudience: '偏好历史权谋、军事策略、家国天下的男性观众',
    emotionalPayoffs: ['知识降维打击的优越感', '权谋博弈的胜利', '军队/国力增长的成就感', '改变历史走向的宏大感'],
    primaryConflictTypes: ['朝堂斗争', '军事对抗', '改革阻力', '外敌入侵'],
    protagonistDesign: {
      startingPosition: '现代人穿越/重生，拥有超前知识但地位低微',
      growthArc: '从边缘人到掌权者，用现代知识改造古代',
      hiddenStrength: '现代知识/历史预见/科技/管理才能',
      mustAvoid: ['现代科技解释超过8秒', '改革一蹴而就', '靠暴力解决所有问题']
    },
    antagonistDesign: {
      oppressionStyle: '用传统规则、祖制、派系利益阻挠主角',
      powerSource: '传统地位/祖制解释权/派系势力',
      weaknessPattern: '固守旧规则、低估新知识、内斗优先',
      mustAvoid: ['反派全是蠢货', '改革没有任何阻力', '朝堂斗争靠杀人解决']
    },
    relationshipModel: {
      coreDynamic: '新知 vs 旧规',
      keyRelationships: ['主角 vs 保守派大臣', '主角 vs 皇帝/主公', '主角 vs 敌国将领'],
      betrayalRules: ['盟友背叛要落在利益冲突上', '皇帝猜忌要有具体事件触发']
    },
    powerModel: {
      progressionType: '权力逐步获取 + 国力/军力增长',
      powerSources: ['职位提升', '军队建设', '科技发明', '经济改革'],
      setbackRules: ['改革受挫要引出更大的改革机会', '战败必须是为了更大的胜利']
    },
    commonPayoffBeats: [
      '保守派用祖制压人 → 主角用更古老的祖制反压',
      '敌国入侵 → 主角用现代战术大破敌军',
      '朝堂辩论 → 主角一句话让保守派哑口无言',
      '经济困境 → 主角用现代商业思维翻盘'
    ],
    avoidRules: [
      '现代科技原理解释不能超过8秒',
      '不能连续两集同一种朝堂套路',
      '禁止篡改重要历史人物的核心性格',
      '战争戏不能只靠主角一人翻盘'
    ],
    recommendedEpisodeBeats: [
      { phase: '穿越入局', episodes: '1-5', focus: '身份危机、首次用现代知识破局、获得第一个盟友' },
      { phase: '初建根基', episodes: '6-15', focus: '小官职、首次改革、军事初胜' },
      { phase: '势力扩张', episodes: '16-30', focus: '经济建设、军队扩建、朝堂站稳脚跟' },
      { phase: '大破大立', episodes: '31-45', focus: '重大改革、敌国大战、保守派反扑' },
      { phase: '终极博弈', episodes: '46-55', focus: '朝堂终极对决、敌国决战、历史转折' },
      { phase: '盛世收官', episodes: '56-60', focus: '改革大成、天下安定、圆满闭环' }
    ]
  },

  女频霸总甜宠: {
    audienceLane: 'female',
    subgenre: '女频霸总甜宠',
    coreAudience: '偏好甜蜜爱情、被保护感的女性观众',
    emotionalPayoffs: ['被高权力者偏爱的安全感', '关系中的甜蜜互动', '身份揭晓时的爽感', '误会解除后的加倍宠爱'],
    primaryConflictTypes: ['身份差距', '误会冲突', '恶毒女二阻挠', '家族反对'],
    protagonistDesign: {
      startingPosition: '平凡但有闪光点的女主，或隐藏身份的大小姐',
      growthArc: '从被轻视到被看见，从被动到主动争取爱情',
      hiddenStrength: '隐藏身份/特殊才能/善良坚韧的性格',
      mustAvoid: ['真傻白甜', '只会等男主救', '没有自己的追求']
    },
    antagonistDesign: {
      oppressionStyle: '用身份差距、舆论、家族压力打压女主',
      powerSource: '家族背景/社会地位/舆论操控',
      weaknessPattern: '傲慢、嫉妒、低估女主',
      mustAvoid: ['女二无脑使坏', '家族反对没有理由', '反派全是女人']
    },
    relationshipModel: {
      coreDynamic: '表面不对等 → 双向奔赴',
      keyRelationships: ['女主 vs 霸总男主', '女主 vs 恶毒女二', '女主 vs 势利长辈'],
      betrayalRules: ['闺蜜背叛要有具体动机', '男主误会要快速解开']
    },
    powerModel: {
      progressionType: '情感权力转移：从男主主导到双向平等',
      powerSources: ['男主偏爱', '女主隐藏身份揭露', '女主自身能力提升', '关键人物撑腰'],
      setbackRules: ['误会不能拖过3集', '女主受委屈后必须有加倍补偿']
    },
    commonPayoffBeats: [
      '女二当众羞辱女主 → 男主出现护短',
      '家族逼婚 → 男主当众宣示主权',
      '女主身份被质疑 → 隐藏身份揭晓震惊全场',
      '误会分手 → 男主追妻火葬场'
    ],
    avoidRules: [
      '禁止"你这种女人也配"重复出现',
      '误会不能超过3集不解开',
      '女主不能全程被动等救',
      '甜宠细节要具体，不能空喊"对你好"'
    ],
    recommendedEpisodeBeats: [
      { phase: '偶遇入局', episodes: '1-5', focus: '初次相遇、误会/契约产生交集、首次心动' },
      { phase: '甜蜜升温', episodes: '6-15', focus: '日常互动、男主默默守护、女主闪光点暴露' },
      { phase: '冲突考验', episodes: '16-30', focus: '女二使坏、家族反对、女主隐藏身份逐步揭露' },
      { phase: '身份揭晓', episodes: '31-45', focus: '女主真实身份曝光、反派打脸、关系确认' },
      { phase: '终极守护', episodes: '46-55', focus: '男主全面护短、共同对抗最大阻碍' },
      { phase: '甜蜜收官', episodes: '56-60', focus: '婚礼/承诺、圆满结局、彩蛋撒糖' }
    ]
  },

  女频古言宅斗: {
    audienceLane: 'female',
    subgenre: '女频古言宅斗',
    coreAudience: '偏好古代权谋、宅斗智计、女性成长的女性观众',
    emotionalPayoffs: ['用古代规则反杀的智计爽感', '身份地位提升的满足', '被高权力者（王爷/皇帝）偏爱的安全感', '从被害者到掌权者的成长感'],
    primaryConflictTypes: ['嫡庶之争', '后宅权谋', '宫廷斗争', '家族利益'],
    protagonistDesign: {
      startingPosition: '被陷害的嫡女/庶女/弃妃，重生或穿越',
      growthArc: '从被害者到宅斗高手，从依附到掌权',
      hiddenStrength: '重生记忆/现代知识/医术/商业头脑/隐忍智慧',
      mustAvoid: ['靠男人解决所有问题', '复仇靠运气不靠布局', '古代知识解释超过8秒']
    },
    antagonistDesign: {
      oppressionStyle: '用古代规矩、家族地位、嫡庶制度打压女主',
      powerSource: '正室地位/家族长辈偏爱/古代礼教',
      weaknessPattern: '傲慢、守旧、低估女主智计',
      mustAvoid: ['反派全是泼妇', '宅斗手段重复', '靠鬼神解决冲突']
    },
    relationshipModel: {
      coreDynamic: '低地位者用智慧逆袭高地位者',
      keyRelationships: ['女主 vs 嫡母/主母', '女主 vs 姐妹/妾室', '女主 vs 王爷/皇帝'],
      betrayalRules: ['丫鬟背叛要落在利益威胁上', '姐妹反目要有具体事件']
    },
    powerModel: {
      progressionType: '地位逐步提升 + 智计升级',
      powerSources: ['重生先知', '医术/商业技能', '王爷/皇帝宠爱', '家族权力转移'],
      setbackRules: ['被害必须引出更大的反击', '暂时失势必须是为了彻底翻盘']
    },
    commonPayoffBeats: [
      '嫡母用规矩压人 → 女主用更硬的规矩反压',
      '姐妹陷害 → 女主当众揭穿，反让姐妹自食其果',
      '被退婚羞辱 → 更高身份的人当众求娶',
      '被陷害失宠 → 女主用医术/才智重新获宠'
    ],
    avoidRules: [
      '古代规矩解释不能超过8秒',
      '不能连续两集同一种陷害方式',
      '禁止靠超自然力量解决核心冲突',
      '女主复仇必须靠自己布局，不能全靠男主'
    ],
    recommendedEpisodeBeats: [
      { phase: '被害开局', episodes: '1-5', focus: '被害场景、重生/穿越、首次小反击' },
      { phase: '站稳脚跟', episodes: '6-15', focus: '用规矩反制、建立盟友、首次大胜' },
      { phase: '搅动宅斗', episodes: '16-30', focus: '嫡母破防、姐妹反目、地位提升' },
      { phase: '权谋升级', episodes: '31-45', focus: '宫廷介入、更大反派、女主全面掌权' },
      { phase: '终极清算', episodes: '46-55', focus: '所有反派清算、身份完全恢复、大婚' },
      { phase: '圆满收官', episodes: '56-60', focus: '家族掌权、朝堂立足、完美闭环' }
    ]
  },

  女频现代逆袭: {
    audienceLane: 'female',
    subgenre: '女频现代逆袭',
    coreAudience: '偏好职场成长、离婚逆袭、校园重生的女性观众',
    emotionalPayoffs: ['职场/学业逆袭的成就感', '被前夫/渣男后悔的爽感', '经济独立的满足感', '被更好的人爱上的幸福感'],
    primaryConflictTypes: ['职场打压', '婚姻背叛', '校园霸凌', '经济困境'],
    protagonistDesign: {
      startingPosition: '被背叛的全职太太/被霸凌的学生/被打压的职场新人',
      growthArc: '从依附他人到经济独立、人格独立',
      hiddenStrength: '被忽视的才能/重生记忆/隐藏学历/商业头脑',
      mustAvoid: ['逆袭靠男人', '只有情绪没有行动', '成长空喊口号']
    },
    antagonistDesign: {
      oppressionStyle: '用职场规则、舆论、经济控制打压女主',
      powerSource: '职位权力/经济控制/舆论操控',
      weaknessPattern: '傲慢、看不起女主、信息落后',
      mustAvoid: ['反派全是女人', '职场打压手段重复', '舆论反转太容易']
    },
    relationshipModel: {
      coreDynamic: '从依附到独立的自我证明',
      keyRelationships: ['女主 vs 前夫/渣男', '女主 vs 职场上司', '女主 vs 新追求者'],
      betrayalRules: ['闺蜜背叛要落在嫉妒/利益上', '前夫后悔要有具体触发事件']
    },
    powerModel: {
      progressionType: '能力/经济/地位逐步提升',
      powerSources: ['能力提升', '经济独立', '社会地位上升', '关键人物赏识'],
      setbackRules: ['挫折必须引出更大的成长', '暂时失败必须是为了更好的成功']
    },
    commonPayoffBeats: [
      '前夫/渣男当众羞辱 → 女主亮出新身份/成就反打脸',
      '职场被抢功 → 女主用实力拿下更大项目',
      '经济困境 → 女主用才能创业成功',
      '校园被霸凌 → 女主用成绩/能力让霸凌者后悔'
    ],
    avoidRules: [
      '禁止逆袭全靠男人帮',
      '禁止空喊口号没有具体行动',
      '禁止"你会后悔的"重复出现',
      '女主成长必须有具体事件支撑'
    ],
    recommendedEpisodeBeats: [
      { phase: '绝境开局', episodes: '1-5', focus: '背叛/打压场景、下定决心、首次小胜' },
      { phase: '初露锋芒', episodes: '6-15', focus: '能力展现、首次反击、建立新关系' },
      { phase: '逆风翻盘', episodes: '16-30', focus: '事业起步、前夫/渣男开始后悔、新追求者出现' },
      { phase: '全面崛起', episodes: '31-45', focus: '事业大成、反派全面破防、女主人格独立' },
      { phase: '终极对决', episodes: '46-55', focus: '与前夫/最大反派的终极对决、彻底赢回尊严' },
      { phase: '新生收官', episodes: '56-60', focus: '事业巅峰、新感情确认、完美闭环' }
    ]
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 五、导出 API
// ─────────────────────────────────────────────────────────────────────────────

export function getAudienceLanePolicy(audienceLane: AudienceLane): AudienceLanePolicy {
  if (audienceLane === 'male') return MALE_LANE_POLICY
  return FEMALE_LANE_POLICY
}

export function getSubgenrePolicy(subgenre: Subgenre): SubgenrePolicy {
  const policy = SUBGENRE_POLICIES[subgenre]
  if (!policy) {
    throw new Error(`Unknown subgenre: ${subgenre}`)
  }
  return policy
}

export function getSubgenrePolicyOrNull(subgenre: Subgenre): SubgenrePolicy | null {
  return SUBGENRE_POLICIES[subgenre] ?? null
}

/** 获取某赛道下的所有垂类政策 */
export function getSubgenrePoliciesByLane(audienceLane: AudienceLane): SubgenrePolicy[] {
  return Object.values(SUBGENRE_POLICIES).filter((p) => p.audienceLane === audienceLane)
}

/** 验证 subgenre 是否属于 audienceLane */
export function isSubgenreValidForLane(
  audienceLane: AudienceLane,
  subgenre: Subgenre
): boolean {
  const policy = SUBGENRE_POLICIES[subgenre]
  if (!policy) return false
  return policy.audienceLane === audienceLane
}

/** 所有支持的垂类列表 */
export const ALL_SUBGENRES: Subgenre[] = Object.keys(SUBGENRE_POLICIES) as Subgenre[]

/** 所有支持的赛道列表 */
export const ALL_AUDIENCE_LANES: AudienceLane[] = ['male', 'female']
