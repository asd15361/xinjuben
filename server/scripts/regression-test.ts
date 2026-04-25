/**
 * 回归测试脚本：真实 20 集生成验收
 *
 * 目标：验证新链路（控制卡 + 内容修稿）是否真正打进生成。
 * 验收项：
 * 1. 每 5 集至少出现一句金句
 * 2. 主角行动类型在 1/5/10/15/20 集有明显变化
 * 3. 修仙/权谋元素在冲突中段真正进入
 * 4. 配角在第 10 集后仍有回收
 * 5. 结局收住主线反派/账目线
 * 6. UI 分数与人读感受一致
 */

import { startScriptGeneration } from '../src/application/script-generation/start-script-generation.js'
import { buildScriptGenerationExecutionPlan } from '../src/application/script-generation/build-execution-plan.js'
import { createInitialProgressBoard } from '../src/application/script-generation/progress-board.js'
import { loadRuntimeProviderConfig, hasValidApiKey } from '../src/infrastructure/runtime-env/provider-config.js'
import type {
  StartScriptGenerationInputDto,
  ScriptGenerationExecutionPlanDto
} from '../src/shared/contracts/script-generation.js'
import type {
  OutlineDraftDto,
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  DetailedOutlineBlockDto,
  DetailedOutlineEpisodeBeatDto,
  ScriptSegmentDto
} from '../src/shared/contracts/workflow.js'
import type { StoryIntentPackageDto } from '../src/shared/contracts/intake.js'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

const PROJECT_ID = 'regression-test-xiuxian-2026-04-24'
const TARGET_EPISODES = 20

// ── 构造 StoryIntent ─────────────────────────────────────────────────────────
const storyIntent: StoryIntentPackageDto = {
  genre: '古装权谋+修仙封印',
  subGenre: '朝堂博弈',
  coreConflict: '沈渊被权臣陆崇远诬陷勾结北境、私吞军饷，必须在朝堂与江湖双重追杀下自证清白并反将一军',
  sellingPremise: '一个被封印了修为的前朝堂天才，在绝境中一点点解封记忆与实力，用智谋和隐藏底牌把陷害他的人一个个拉下马',
  protagonist: '沈渊',
  antagonist: '陆崇远',
  protagonistCoreDrive: '保护家人、自证清白、向陆崇远复仇',
  antagonistPressure: '陆崇远掌控刑部与禁军，随时可以用"叛国罪"灭沈渊满门',
  emotionalPromise: '憋屈之后的爽感释放，每一集都要让主角从被动挨打转到主动设局',
  moralPremise: '真正的强者不是永远不跌倒，而是每次跌倒都能把坑挖得更深让对方掉进去',
  tone: '冷峻、紧凑、反转密集',
  pacing: '每集3场，开场即冲突，中场升级，结尾留钩',
  worldbuildingNotes: '大周朝，修仙者被朝廷登记管控，未登记者视为邪修。沈渊早年是登记在册的天才，后因某事被封印修为，表面沦为文官',
  tags: ['权谋', '修仙', '封印', '朝堂', '复仇', '反转'],
  format: { episodes: 20, durationMinutes: 3, scenesPerEpisode: 3 },
  targetAudience: '25-40岁男性，喜欢智斗和逆袭',
  comparableWorks: ['琅琊榜', '庆余年'],
  protagonistArc: {
    startingPosition: '被打入天牢、修为封印、众叛亲离',
    transformation: '从隐忍装弱到逐步解封修为，最后用智谋+实力双线碾压',
    endingPosition: '朝堂翻案、陆崇远败亡、封印全解'
  },
  antagonistArc: {
    startingPosition: '权倾朝野、掌控刑部、以为吃定沈渊',
    endingPosition: '所有罪行被公开、失去皇帝信任、死于自己布下的局'
  }
}

// ── 构造 OutlineDraft ────────────────────────────────────────────────────────
const outlineDraft: OutlineDraftDto = {
  title: '修仙传新',
  genre: '古装权谋+修仙封印',
  theme: '被封印的强者用智谋一步步解封并复仇',
  mainConflict: '沈渊被陆崇远诬陷勾结北境、私吞军饷，必须在双重追杀下自证清白并反将一军',
  protagonist: '沈渊',
  summary: '前朝堂天才沈渊被权臣陆崇远诬陷叛国，打入天牢。他表面认罪，暗中通过暗卫陈默、妹妹沈瑶布局反击。随着修为封印逐步解封，沈渊在朝堂与江湖之间游走，收集陆崇远罪证，最终公堂翻案、陆崇远败亡。',
  planningUnitEpisodes: 20,
  summaryEpisodes: Array.from({ length: TARGET_EPISODES }, (_, i) => ({
    episodeNo: i + 1,
    summary: `第${i + 1}集概要占位`
  })),
  outlineBlocks: [
    {
      blockNo: 1,
      label: '第一幕：绝境开局',
      startEpisode: 1,
      endEpisode: 5,
      summary: '沈渊被打入天牢，陆崇远开始清算沈家。沈渊暗中布局，通过陈默和沈瑶收集证据，赵谦首次反水又被迫改口。',
      episodes: []
    },
    {
      blockNo: 2,
      label: '第二幕：暗线反击',
      startEpisode: 6,
      endEpisode: 10,
      summary: '沈渊逃出天牢，隐藏在江湖与朝堂的夹缝中。逐步解封修为，收集陆崇远与北境勾结的铁证。',
      episodes: []
    },
    {
      blockNo: 3,
      label: '第三幕：正面对决',
      startEpisode: 11,
      endEpisode: 15,
      summary: '沈渊带着铁证重返朝堂，与陆崇远正面交锋。双方互设圈套，朝堂局势瞬息万变。',
      episodes: []
    },
    {
      blockNo: 4,
      label: '第四幕：终局收网',
      startEpisode: 16,
      endEpisode: 20,
      summary: '最终公堂对决，陆崇远所有罪行被公开。沈渊封印全解，朝堂翻案，大仇得报。',
      episodes: []
    }
  ],
  facts: [
    {
      id: 'fact-001',
      label: '沈渊被陆崇远诬陷叛国',
      description: '沈渊被陆崇远以勾结北境、私吞军饷的罪名打入天牢',
      linkedToPlot: true,
      linkedToTheme: true,
      authorityType: 'user_declared',
      originAuthorityType: 'user_declared',
      originDeclaredBy: 'user',
      status: 'confirmed',
      level: 'core',
      declaredBy: 'user',
      declaredStage: 'outline',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'fact-002',
      label: '陆崇远掌控刑部与禁军',
      description: '陆崇远作为刑部尚书，掌控刑部和禁军，有权调动全城搜捕',
      linkedToPlot: true,
      linkedToTheme: false,
      authorityType: 'user_declared',
      originAuthorityType: 'user_declared',
      originDeclaredBy: 'user',
      status: 'confirmed',
      level: 'core',
      declaredBy: 'user',
      declaredStage: 'outline',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'fact-003',
      label: '沈渊修为被封印',
      description: '沈渊早年是登记在册的修仙天才，后因某事被封印修为，表面沦为文官',
      linkedToPlot: true,
      linkedToTheme: true,
      authorityType: 'user_declared',
      originAuthorityType: 'user_declared',
      originDeclaredBy: 'user',
      status: 'confirmed',
      level: 'core',
      declaredBy: 'user',
      declaredStage: 'outline',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'fact-004',
      label: '赵谦是翻案关键证人',
      description: '赵谦掌握账目内幕，是公堂上指证陆崇远或沈渊的关键证人',
      linkedToPlot: true,
      linkedToTheme: false,
      authorityType: 'user_declared',
      originAuthorityType: 'user_declared',
      originDeclaredBy: 'user',
      status: 'confirmed',
      level: 'core',
      declaredBy: 'user',
      declaredStage: 'outline',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
}

// ── 构造 CharacterDrafts ─────────────────────────────────────────────────────
const characterDrafts: CharacterDraftDto[] = [
  {
    name: '沈渊',
    biography: '前朝堂天才，早年是登记在册的修仙者，后因某事被封印修为，表面沦为户部侍郎。心思缜密，擅长布局，被封印后反而更依赖智谋。',
    publicMask: '温文尔雅的文官，认罪态度良好',
    hiddenPressure: '修为封印随时可能彻底崩解，一旦暴露会被朝廷当作邪修处死',
    fear: '家人因自己受牵连',
    protectTarget: '妹妹沈瑶和沈家旧部',
    conflictTrigger: '陆崇远的陷害',
    advantage: '智谋过人，早年布下的暗棋遍布朝野',
    weakness: '修为封印，无法正面硬刚高手',
    goal: '自证清白、向陆崇远复仇、保护家人',
    arc: '从隐忍装弱到解封修为，最终双线碾压',
    appearance: '清瘦，眼神深邃，常穿素色官服',
    personality: '冷静、隐忍、记仇、护短',
    identity: '户部侍郎（表面）/ 被封印的修仙天才（真实）',
    values: '家人重于一切，恩怨必报',
    plotFunction: ' protagonist',
    depthLevel: 'core',
    roleLayer: 'core'
  },
  {
    name: '陆崇远',
    biography: '权臣，掌控刑部与禁军，与北境有暗中往来。野心极大，意图借沈渊案清洗朝堂异己。',
    publicMask: '刚正不阿的忠臣，办案如神',
    hiddenPressure: '与北境的往来信件若被曝光，自己也是死罪',
    fear: '失去皇帝信任',
    protectTarget: '自己的权位和家族',
    conflictTrigger: '沈渊是他清洗朝堂的第一个目标',
    advantage: '掌控刑部和禁军，眼线遍布',
    weakness: '过于自信，低估沈渊的暗棋',
    goal: '清洗朝堂异己，为北境合作扫清障碍',
    arc: '从权倾朝野到众叛亲离',
    appearance: '中年，面色阴沉，常穿深紫官服',
    personality: '阴险、多疑、残忍、自负',
    identity: '刑部尚书',
    values: '权位即一切',
    plotFunction: 'antagonist',
    depthLevel: 'core',
    roleLayer: 'core'
  },
  {
    name: '沈瑶',
    biography: '沈渊的妹妹，性格坚韧，不懂修仙但精通医术和情报网。是沈渊在朝堂外的眼睛和手。',
    publicMask: '沈府小姐，柔弱女子',
    hiddenPressure: '沈府被抄后流离失所，靠旧人脉苟活',
    fear: '哥哥死在牢里',
    protectTarget: '哥哥沈渊',
    conflictTrigger: '沈府被抄',
    advantage: '精通医术，有旧人脉情报网',
    weakness: '不会武功，容易被针对',
    goal: '救出哥哥',
    arc: '从柔弱小姐到独当一面的情报枢纽',
    appearance: '年轻女子，眼神倔强',
    personality: '坚韧、聪明、果断',
    identity: '沈府小姐',
    values: '家人至上',
    plotFunction: 'ally',
    depthLevel: 'mid',
    roleLayer: 'active'
  },
  {
    name: '陈默',
    biography: '沈渊早年救下的剑客，现为沈渊暗卫首领。武功高强，沉默寡言，绝对忠诚。',
    publicMask: '江湖游侠',
    hiddenPressure: '当年被沈渊所救的恩情，必须用命来还',
    fear: '保护不了沈渊',
    protectTarget: '沈渊',
    conflictTrigger: '沈渊入狱',
    advantage: '武功高强，江湖人脉广',
    weakness: '不擅朝堂权谋，容易中计',
    goal: '保护沈渊直到他翻案',
    arc: '从沉默剑客到能理解主人谋略的左膀右臂',
    appearance: '黑衣剑客，腰间一柄长剑',
    personality: '沉默、忠诚、果断',
    identity: '暗卫首领',
    values: '恩义重于生死',
    plotFunction: 'ally',
    depthLevel: 'mid',
    roleLayer: 'active'
  },
  {
    name: '赵谦',
    biography: '户部主事，沈渊旧部。被陆崇远胁迫作证陷害沈渊，内心挣扎，最终选择站在正义一边。',
    publicMask: '胆小怕事的户部小官',
    hiddenPressure: '家人被陆崇远控制',
    fear: '家人被害',
    protectTarget: '家人',
    conflictTrigger: '被陆崇远胁迫陷害沈渊',
    advantage: '知道账目内幕',
    weakness: '胆小，容易被胁迫',
    goal: '保住家人，说出真相',
    arc: '从被迫害者到勇敢作证',
    appearance: '中年文官，面带愁容',
    personality: '懦弱但良心未泯',
    identity: '户部主事',
    values: '家人平安',
    plotFunction: 'witness',
    depthLevel: 'mid',
    roleLayer: 'functional'
  }
]

// ── 辅助函数：构造 episode beat ──────────────────────────────────────────────
function makeBeat(episodeNo: number, summary: string, scenes: Array<{
  setup?: string
  tension?: string
  hookEnd?: string
  characterRoster?: string[]
}>): DetailedOutlineEpisodeBeatDto {
  return {
    episodeNo,
    summary,
    sceneByScene: scenes.map((s, idx) => ({
      sceneNo: idx + 1,
      sceneCode: `${episodeNo}-${idx + 1}`,
      sceneHeading: `场景${idx + 1}`,
      characterRoster: s.characterRoster || [],
      setup: s.setup || '',
      tension: s.tension || '',
      hookEnd: s.hookEnd || ''
    }))
  }
}

// ── 构造 DetailedOutlineSegments ─────────────────────────────────────────────
const segmentBeats: DetailedOutlineEpisodeBeatDto[] = [
  // 第一幕 1-5
  makeBeat(1, '沈渊被打入天牢，表面认罪，暗中通过狱卒甲传信。陈默在城外破庙发现老张尸体和赵家玉佩。', [
    { setup: '天牢审讯堂，陆崇远审问沈渊', tension: '沈渊认罪但眼神平静', hookEnd: '沈渊将密信塞给狱卒甲', characterRoster: ['陆崇远', '沈渊', '狱卒甲'] },
    { setup: '城外破庙，陈默发现老张尸体', tension: '陈默找到赵家玉佩', hookEnd: '陈默被追杀，跳窗逃走', characterRoster: ['陈默'] },
    { setup: '天牢死牢，沈渊与赵谦隔墙对话', tension: '沈渊透露已送信', hookEnd: '沈渊说天亮前会有人来', characterRoster: ['沈渊', '赵谦'] }
  ]),
  makeBeat(2, '陆崇远亲信搜查沈府，沈瑶暗中观察。陈默到城东当铺取旧账并调包。', [
    { setup: '沈府被搜查', tension: '沈瑶藏在屏风后', hookEnd: '沈渊通过纸条让沈瑶去取旧账', characterRoster: ['陆崇远亲信', '沈瑶', '管家'] },
    { setup: '天牢探监', tension: '沈渊暗示沈瑶去城东当铺', hookEnd: '沈渊塞纸条给沈瑶', characterRoster: ['沈瑶', '沈渊', '狱卒甲'] },
    { setup: '城东当铺，陈默取旧账', tension: '陈默用假账调包', hookEnd: '陈默被斗笠人跟踪', characterRoster: ['陈默', '掌柜', '跟踪者'] }
  ]),
  makeBeat(3, '陆崇远胁迫赵谦家人逼其翻供。赵谦公堂上临时反水指证陆崇远。陆崇远震怒下令提前押送沈渊。', [
    { setup: '陆府密室，陆崇远威胁赵谦', tension: '赵谦被迫答应', hookEnd: '陆崇远离开，赵谦攥紧玉簪', characterRoster: ['陆崇远', '赵谦'] },
    { setup: '天牢探监，沈渊告诉赵谦家人已安全', tension: '赵谦震惊', hookEnd: '沈渊暗示公堂上自由发挥', characterRoster: ['沈渊', '赵谦', '狱卒甲'] },
    { setup: '刑部公堂，赵谦反水', tension: '赵谦当众指证陆崇远', hookEnd: '陆崇远下令押送沈渊复审', characterRoster: ['陆崇远', '赵谦', '主审官', '衙役甲'] }
  ]),
  makeBeat(4, '押送途中沈渊被劫，展示隐藏武力。陆崇远封锁城门搜查。沈渊重伤被陈默救到医庐。', [
    { setup: '城外官道，劫囚', tension: '沈渊夺刀杀敌', hookEnd: '沈渊重伤倒地', characterRoster: ['沈渊', '杀手甲', '杀手乙', '陈默'] },
    { setup: '城门，陆崇远下令封城', tension: '全城搜捕', hookEnd: '陆崇远冷笑离开', characterRoster: ['陆崇远', '城门校尉', '兵卒甲'] },
    { setup: '医庐内室，大夫救治沈渊', tension: '沈渊伤势严重', hookEnd: '大夫说血堵心脉', characterRoster: ['陈默', '大夫', '沈渊'] }
  ]),
  makeBeat(5, '沈渊在医庐疗伤，陈默汇报赵谦二次改口。沈渊安排暗账送御史台，并伪造南山逃跑痕迹。', [
    { setup: '医庐内室，沈渊安排暗账送御史台', tension: '沈渊伤势未愈但思路清晰', hookEnd: '陈默带着暗账离开', characterRoster: ['沈渊', '陈默'] },
    { setup: '南山小路，陈默伪造逃跑痕迹', tension: '故意留下线索引开追兵', hookEnd: '陆崇远的人果然中计', characterRoster: ['陈默'] },
    { setup: '医庐，沈渊独自疗伤', tension: '封印出现裂痕，修为开始恢复', hookEnd: '沈渊感受到体内灵力涌动', characterRoster: ['沈渊'] }
  ]),
  // 第二幕 6-10
  makeBeat(6, '沈渊转移到安全据点，开始系统整理陆崇远罪证。沈瑶通过旧人脉接触到御史台王主事。', [
    { setup: '安全据点，沈渊整理罪证', tension: '发现陆崇远与北境往来信件', hookEnd: '决定从北境线人入手', characterRoster: ['沈渊', '陈默'] },
    { setup: '沈瑶接触御史台王主事', tension: '王主事犹豫是否介入', hookEnd: '沈瑶用医术救下王主事之子', characterRoster: ['沈瑶', '王主事'] },
    { setup: '北境线人出现，提供关键情报', tension: '线人要求保护', hookEnd: '沈渊答应安排', characterRoster: ['沈渊', '北境线人', '陈默'] }
  ]),
  makeBeat(7, '陆崇远发现沈渊没死，派出杀手追杀。沈渊设局反杀，展示已恢复的部分修为。', [
    { setup: '杀手夜袭安全据点', tension: '沈渊设陷阱反杀', hookEnd: '沈渊留下活口审讯', characterRoster: ['沈渊', '陈默', '杀手'] },
    { setup: '审讯活口', tension: '杀手供出陆崇远与北境交易地点', hookEnd: '沈渊决定亲自前往', characterRoster: ['沈渊', '陈默', '杀手'] },
    { setup: '陆崇远得知杀手失败', tension: '陆崇远震怒', hookEnd: '决定亲自出手', characterRoster: ['陆崇远'] }
  ]),
  makeBeat(8, '沈渊潜入北境交易地点，获取陆崇远通敌铁证。封印进一步解封，修为恢复到五成。', [
    { setup: '潜入交易地点', tension: '避开守卫', hookEnd: '找到密信', characterRoster: ['沈渊', '陈默'] },
    { setup: '被发现，激战', tension: '沈渊展示恢复的五成修为', hookEnd: '成功脱身', characterRoster: ['沈渊', '陈默', '守卫'] },
    { setup: '安全返回，沈渊感受修为', tension: '封印裂痕扩大', hookEnd: '预计十集内可完全解封', characterRoster: ['沈渊'] }
  ]),
  makeBeat(9, '沈瑶通过医术救下皇帝宠妃，获得面圣机会。沈渊准备通过沈瑶将证据呈给皇帝。', [
    { setup: '沈瑶救治宠妃', tension: '病情危急', hookEnd: '成功救治', characterRoster: ['沈瑶', '宠妃', '宫女'] },
    { setup: '宠妃引荐沈瑶面圣', tension: '皇帝对沈渊案已有耳闻', hookEnd: '皇帝同意重审', characterRoster: ['沈瑶', '皇帝'] },
    { setup: '沈渊得知面圣成功', tension: '准备正式重返朝堂', hookEnd: '但决定先收集更多证据', characterRoster: ['沈渊', '沈瑶'] }
  ]),
  makeBeat(10, '陆崇远察觉到沈渊的动向，设局试图在朝堂上先发制人。赵谦被二次胁迫，但沈渊已提前保护其家人。', [
    { setup: '陆崇远在朝堂上弹劾沈渊', tension: '群臣观望', hookEnd: '皇帝说等证据齐全再议', characterRoster: ['陆崇远', '皇帝'] },
    { setup: '陆崇远派人抓赵谦家人', tension: '发现已被转移', hookEnd: '陆崇远意识到沈渊棋高一着', characterRoster: ['陆崇远', '手下'] },
    { setup: '赵谦与沈渊秘密会面', tension: '赵谦决定彻底站队', hookEnd: '赵谦交出陆崇远更多罪证', characterRoster: ['赵谦', '沈渊'] }
  ]),
  // 第三幕 11-15
  makeBeat(11, '沈渊正式重返朝堂，与陆崇远首次正面交锋。双方各执一词，皇帝决定三日后公堂对质。', [
    { setup: '朝堂对峙', tension: '沈渊与陆崇远各执一词', hookEnd: '皇帝定下三日后公堂对质', characterRoster: ['沈渊', '陆崇远', '皇帝'] },
    { setup: '陆崇远暗中布置', tension: '准备伪造证据', hookEnd: '沈渊早已料到', characterRoster: ['陆崇远'] },
    { setup: '沈渊与陈默商议', tension: '准备最终决战', hookEnd: '决定在三日内布下天罗地网', characterRoster: ['沈渊', '陈默'] }
  ]),
  makeBeat(12, '沈渊通过旧部收集到陆崇远历年贪墨的证据。沈瑶发现陆崇远与北境的密信往来有暗号。', [
    { setup: '沈渊收集贪墨证据', tension: '涉及金额巨大', hookEnd: '足以扳倒陆崇远', characterRoster: ['沈渊', '旧部'] },
    { setup: '沈瑶破解暗号', tension: '发现北境行动计划', hookEnd: '陆崇远打算里应外合', characterRoster: ['沈瑶'] },
    { setup: '沈渊整合所有证据', tension: '证据链完整', hookEnd: '等待公堂', characterRoster: ['沈渊', '沈瑶'] }
  ]),
  makeBeat(13, '陆崇远派杀手暗杀关键证人，陈默与之激战。沈渊修为恢复到八成，首次展示真实实力。', [
    { setup: '杀手夜袭证人', tension: '陈默奋力保护', hookEnd: '沈渊赶到', characterRoster: ['陈默', '杀手', '证人'] },
    { setup: '沈渊展示八成修为', tension: '实力震惊众人', hookEnd: '杀手全灭', characterRoster: ['沈渊', '陈默'] },
    { setup: '陆崇远得知失败', tension: '开始慌乱', hookEnd: '决定铤而走险', characterRoster: ['陆崇远'] }
  ]),
  makeBeat(14, '陆崇远铤而走险，试图在公堂前夜暗杀沈渊。沈渊将计就计，反将陆崇远的杀手引到皇帝面前。', [
    { setup: '陆崇远派出全部杀手', tension: '沈渊早有准备', hookEnd: '杀手被引到皇宫', characterRoster: ['陆崇远', '沈渊'] },
    { setup: '皇宫激战', tension: '沈渊保护皇帝', hookEnd: '皇帝亲眼看到陆崇远的杀手', characterRoster: ['沈渊', '皇帝', '杀手'] },
    { setup: '皇帝震怒', tension: '下令彻查陆崇远', hookEnd: '公堂提前到明日', characterRoster: ['皇帝', '陆崇远'] }
  ]),
  makeBeat(15, '公堂对质开始，双方举证。沈渊步步紧逼，陆崇远节节败退，但仍试图狡辩。', [
    { setup: '公堂对质开始', tension: '双方举证', hookEnd: '沈渊证据充分', characterRoster: ['沈渊', '陆崇远', '主审官'] },
    { setup: '陆崇远狡辩', tension: '试图转移焦点', hookEnd: '沈渊拿出通敌密信', characterRoster: ['陆崇远', '沈渊'] },
    { setup: '密信验证为真', tension: '陆崇远面色铁青', hookEnd: '但他说还有后手', characterRoster: ['主审官', '陆崇远', '沈渊'] }
  ]),
  // 第四幕 16-20
  makeBeat(16, '陆崇远狗急跳墙，调动禁军试图控制朝堂。沈渊修为完全解封，以一己之力阻止禁军。', [
    { setup: '陆崇远调动禁军', tension: '朝堂危急', hookEnd: '沈渊修为完全解封', characterRoster: ['陆崇远', '禁军'] },
    { setup: '沈渊阻止禁军', tension: '展示全盛修为', hookEnd: '禁军被震慑', characterRoster: ['沈渊', '禁军'] },
    { setup: '陆崇远逃跑', tension: '沈渊追击', hookEnd: '追到陆府密室', characterRoster: ['沈渊', '陆崇远'] }
  ]),
  makeBeat(17, '沈渊在陆府密室与陆崇远最终对峙。陆崇远拿出最后底牌——沈渊当年被封印的真相。', [
    { setup: '密室对峙', tension: '陆崇远说出封印真相', hookEnd: '原来当年封印沈渊的就是陆崇远', characterRoster: ['沈渊', '陆崇远'] },
    { setup: '沈渊震惊', tension: '但很快冷静', hookEnd: '新仇旧恨一起算', characterRoster: ['沈渊'] },
    { setup: '激战', tension: '两人都是高手', hookEnd: '陆崇远受伤', characterRoster: ['沈渊', '陆崇远'] }
  ]),
  makeBeat(18, '陆崇远败逃，试图向北境求援。沈渊通过沈瑶的情报网截获消息，在北境援军入境前设伏。', [
    { setup: '陆崇远逃向北境', tension: '求援信被截', hookEnd: '沈渊设伏', characterRoster: ['陆崇远', '沈瑶'] },
    { setup: '边境伏击', tension: '北境援军被全歼', hookEnd: '陆崇远彻底孤立', characterRoster: ['沈渊', '陈默'] },
    { setup: '陆崇远被抓', tension: '跪地求饶', hookEnd: '沈渊说不杀你，送你去该去的地方', characterRoster: ['沈渊', '陆崇远'] }
  ]),
  makeBeat(19, '最终公堂审判，陆崇远所有罪行被公开。皇帝下旨满门抄斩，沈渊当庭翻案成功。', [
    { setup: '最终公堂', tension: '陆崇远罪行公开', hookEnd: '证据确凿', characterRoster: ['主审官', '陆崇远', '群臣'] },
    { setup: '皇帝下旨', tension: '满门抄斩', hookEnd: '陆崇远面如死灰', characterRoster: ['皇帝', '陆崇远'] },
    { setup: '沈渊翻案', tension: '恢复名誉', hookEnd: '皇帝加封', characterRoster: ['沈渊', '皇帝'] }
  ]),
  makeBeat(20, '大结局。沈渊封印全解，修为更胜从前。沈瑶开设医馆，陈默继续守护。朝堂换血，天下太平。', [
    { setup: '沈渊解封修为', tension: '实力更胜从前', hookEnd: '但选择继续做官', characterRoster: ['沈渊'] },
    { setup: '沈瑶开设医馆', tension: '陈默帮忙', hookEnd: '新生活开始', characterRoster: ['沈瑶', '陈默'] },
    { setup: '朝堂新局', tension: '沈渊成为新任刑部尚书', hookEnd: '天下太平', characterRoster: ['沈渊', '皇帝'] }
  ])
]

// 将 beats 分组到 segments
const detailedOutlineSegments: DetailedOutlineSegmentDto[] = [
  {
    act: 'opening',
    blockNo: 1,
    segmentNo: 1,
    startEpisode: 1,
    endEpisode: 5,
    title: '第一幕：绝境开局',
    content: '沈渊被陆崇远诬陷勾结北境、私吞军饷，以叛国罪名打入天牢。陆崇远掌控刑部与禁军，开始清算沈家。沈渊修为被封印，无法正面反抗，只能暗中布局，通过暗卫陈默和妹妹沈瑶收集证据。赵谦是翻案关键证人，被陆崇远胁迫作证陷害沈渊。沈渊表面认罪，暗中通过狱卒甲传信。陈默在城外破庙发现老张尸体和赵家玉佩。沈瑶暗中观察沈府被搜查。陈默到城东当铺取旧账并调包。陆崇远胁迫赵谦家人逼其翻供。赵谦公堂上临时反水指证陆崇远。陆崇远震怒下令提前押送沈渊。押送途中沈渊被劫，展示隐藏武力。陆崇远封锁城门搜查。沈渊重伤被陈默救到医庐。沈渊在医庐疗伤，安排暗账送御史台，并伪造南山逃跑痕迹。',
    hookType: '悬念开场',
    episodeBeats: segmentBeats.slice(0, 5)
  },
  {
    act: 'midpoint',
    blockNo: 2,
    segmentNo: 2,
    startEpisode: 6,
    endEpisode: 10,
    title: '第二幕：暗线反击',
    content: '沈渊逃出天牢，隐藏在江湖与朝堂的夹缝中。沈渊修为被封印，但封印出现裂痕，修为开始逐步恢复。沈渊转移到安全据点，开始系统整理陆崇远罪证。陆崇远掌控刑部与禁军，派出杀手追杀沈渊。沈渊设局反杀，展示已恢复的部分修为。沈渊潜入北境交易地点，获取陆崇远通敌铁证。封印进一步解封，修为恢复到五成。沈瑶通过医术救下皇帝宠妃，获得面圣机会。沈渊准备通过沈瑶将证据呈给皇帝。陆崇远察觉到沈渊的动向，设局试图在朝堂上先发制人。赵谦被二次胁迫，但沈渊已提前保护其家人。赵谦是翻案关键证人，决定彻底站队沈渊。',
    hookType: '中段转折',
    episodeBeats: segmentBeats.slice(5, 10)
  },
  {
    act: 'climax',
    blockNo: 3,
    segmentNo: 3,
    startEpisode: 11,
    endEpisode: 15,
    title: '第三幕：正面对决',
    content: '沈渊被陆崇远诬陷叛国的案子迎来转折点。沈渊带着铁证重返朝堂，与陆崇远正面交锋。陆崇远掌控刑部与禁军，双方各执一词，皇帝决定三日后公堂对质。沈渊通过旧部收集到陆崇远历年贪墨的证据。沈瑶发现陆崇远与北境的密信往来有暗号。陆崇远派杀手暗杀关键证人，陈默与之激战。沈渊修为被封印的状态进一步解除，恢复到八成，首次展示真实实力。陆崇远铤而走险，试图在公堂前夜暗杀沈渊。沈渊将计就计，反将陆崇远的杀手引到皇帝面前。公堂对质开始，双方举证。沈渊步步紧逼，陆崇远节节败退，但仍试图狡辩。赵谦是翻案关键证人，当庭作证。',
    hookType: '高潮逼近',
    episodeBeats: segmentBeats.slice(10, 15)
  },
  {
    act: 'ending',
    blockNo: 4,
    segmentNo: 4,
    startEpisode: 16,
    endEpisode: 20,
    title: '第四幕：终局收网',
    content: '最终公堂对决，沈渊被陆崇远诬陷叛国的冤案迎来大结局。陆崇远狗急跳墙，调动禁军试图控制朝堂。沈渊修为被封印的封印完全解封，以一己之力阻止禁军。沈渊在陆府密室与陆崇远最终对峙。陆崇远拿出最后底牌，说出沈渊当年被封印的真相——原来当年封印沈渊的就是陆崇远。陆崇远败逃，试图向北境求援。沈渊通过沈瑶的情报网截获消息，在北境援军入境前设伏。最终公堂审判，陆崇远所有罪行被公开。皇帝下旨满门抄斩，沈渊当庭翻案成功。沈渊封印全解，修为更胜从前。沈瑶开设医馆，陈默继续守护。朝堂换血，天下太平。赵谦是翻案关键证人，得到赦免和重用。',
    hookType: '结局收束',
    episodeBeats: segmentBeats.slice(15, 20)
  }
]

const detailedOutlineBlocks: DetailedOutlineBlockDto[] = [
  {
    blockNo: 1,
    startEpisode: 1,
    endEpisode: 5,
    summary: '沈渊被打入天牢，陆崇远开始清算沈家。',
    episodeBeats: segmentBeats.slice(0, 5)
  },
  {
    blockNo: 2,
    startEpisode: 6,
    endEpisode: 10,
    summary: '沈渊逃出天牢，逐步解封修为。',
    episodeBeats: segmentBeats.slice(5, 10)
  },
  {
    blockNo: 3,
    startEpisode: 11,
    endEpisode: 15,
    summary: '沈渊重返朝堂，与陆崇远正面交锋。',
    episodeBeats: segmentBeats.slice(10, 15)
  },
  {
    blockNo: 4,
    startEpisode: 16,
    endEpisode: 20,
    summary: '最终公堂对决，沈渊封印全解。',
    episodeBeats: segmentBeats.slice(15, 20)
  }
]

// ── 主函数 ───────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log('=== 回归测试：修仙传 20 集真实生成 ===')
  console.log(`时间: ${new Date().toISOString()}`)
  console.log(`目标集数: ${TARGET_EPISODES}`)

  const runtimeConfig = loadRuntimeProviderConfig()
  if (!hasValidApiKey(runtimeConfig)) {
    console.error('错误: 没有可用的 AI API Key')
    process.exit(1)
  }

  console.log('AI 配置:')
  console.log(`  DeepSeek: ${runtimeConfig.deepseek.model} @ ${runtimeConfig.deepseek.baseUrl}`)
  console.log(`  超时: ${runtimeConfig.deepseek.timeoutMs}ms`)

  // 构建执行计划
  const plan = buildScriptGenerationExecutionPlan(
    {
      storyIntent,
      outline: outlineDraft,
      characters: characterDrafts,
      segments: detailedOutlineSegments,
      detailedOutlineBlocks,
      script: []
    },
    { mode: 'fresh_start', targetEpisodes: TARGET_EPISODES }
  )

  console.log(`\n执行计划:`)
  console.log(`  ready: ${plan.ready}`)
  console.log(`  targetEpisodes: ${plan.targetEpisodes}`)
  console.log(`  blockedBy: [${plan.blockedBy.map((b) => b.code).join(', ')}]`)
  console.log(`  recommendedBatchSize: ${plan.runtimeProfile.recommendedBatchSize}`)
  console.log(`  episodePlans: ${plan.episodePlans.length}`)

  if (!plan.ready) {
    console.error('错误: 执行计划未就绪')
    process.exit(1)
  }

  const initialBoard = createInitialProgressBoard(plan, null)

  const generationInput: StartScriptGenerationInputDto = {
    projectId: PROJECT_ID,
    plan,
    outlineTitle: outlineDraft.title,
    theme: storyIntent.sellingPremise || '',
    mainConflict: storyIntent.coreConflict || '',
    charactersSummary: characterDrafts.map((c) => c.name),
    storyIntent,
    scriptControlPackage: plan.scriptControlPackage,
    outline: outlineDraft,
    characters: characterDrafts,
    segments: detailedOutlineSegments,
    detailedOutlineBlocks,
    existingScript: []
  }

  const startTime = Date.now()
  const progressLog: Array<{ phase: string; detail: string; timestamp: number }> = []

  try {
    const result = await startScriptGeneration(
      generationInput,
      runtimeConfig,
      initialBoard,
      {
        outline: outlineDraft,
        characters: characterDrafts,
        existingScript: []
      },
      {
        onProgress: (payload) => {
          const elapsed = Math.round((Date.now() - startTime) / 1000)
          progressLog.push({ phase: payload.phase, detail: payload.detail, timestamp: elapsed })
          console.log(`[${elapsed}s] ${payload.phase}: ${payload.detail} (已生成 ${payload.generatedScenes.length} 集)`)
        }
      }
    )

    const totalTime = Math.round((Date.now() - startTime) / 1000)

    console.log(`\n=== 生成完成 ===`)
    console.log(`总耗时: ${totalTime}s`)
    console.log(`成功: ${result.success}`)
    console.log(`生成集数: ${result.generatedScenes.length}`)
    console.log(`失败信息: ${result.failure ? result.failure.reason : '无'}`)

    // 保存完整剧本
    const scriptLines: string[] = [`# 修仙传新｜回归测试剧本\n`, `- 项目ID：${PROJECT_ID}`, `- 计划集数：${TARGET_EPISODES} 集`, `- 实际生成：${result.generatedScenes.length} 集`, `- 总耗时：${totalTime}s`, `- 生成时间：${new Date().toISOString()}`, `- 成功状态：${result.success}`, `\n---\n`]

    for (const scene of result.generatedScenes) {
      scriptLines.push(`## 第 ${scene.sceneNo} 集\n`)
      scriptLines.push('```text')
      scriptLines.push(scene.screenplay || '// 无剧本内容')
      scriptLines.push('```\n')
    }

    const scriptPath = resolve(process.cwd(), 'regression-output-script.md')
    writeFileSync(scriptPath, scriptLines.join('\n'), 'utf-8')
    console.log(`\n剧本已保存: ${scriptPath}`)

    // 保存 contentQuality
    const qualityPath = resolve(process.cwd(), 'regression-output-quality.json')
    writeFileSync(
      qualityPath,
      JSON.stringify(
        {
          meta: {
            projectId: PROJECT_ID,
            targetEpisodes: TARGET_EPISODES,
            generatedEpisodes: result.generatedScenes.length,
            success: result.success,
            totalTimeSeconds: totalTime,
            generatedAt: new Date().toISOString()
          },
          contentQuality: result.postflight?.contentQuality ?? null,
          postflight: result.postflight ?? null,
          ledger: result.ledger ?? null,
          failure: result.failure ?? null,
          progressLog,
          board: result.board
        },
        null,
        2
      ),
      'utf-8'
    )
    console.log(`质量报告已保存: ${qualityPath}`)

    // 控制台摘要
    const cq = result.postflight?.contentQuality
    if (cq) {
      console.log(`\n=== 内容质量摘要 ===`)
      console.log(`  集数: ${cq.episodeCount}`)
      console.log(`  需返修: ${cq.episodesNeedingRepair} 集`)
      console.log(`  情节新鲜度: ${cq.averagePlotNoveltyScore}`)
      console.log(`  主题锚定: ${cq.averageThemeAnchoringScore}`)
      console.log(`  金句密度: ${cq.signatureLineDensityScore}`)
      console.log(`  题材融合: ${cq.genreElementFusionScore}`)
      console.log(`  弧线变换: ${cq.protagonistArcRotationScore}`)
      console.log(`  配角回收: ${cq.supportingCharacterRecyclingScore}`)
      if (cq.repairRecommendations.length > 0) {
        console.log(`  返修建议: ${cq.repairRecommendations.length} 条`)
        const high = cq.repairRecommendations.filter((r) => r.priority === 'high')
        if (high.length > 0) {
          console.log(`  高优先级:`)
          for (const r of high.slice(0, 5)) {
            console.log(`    - 第${r.episodeNo}集 ${r.type}: ${r.reason}`)
          }
        }
      }
      if (cq.loopProblemSummary.totalLoops > 0) {
        console.log(`  循环问题: ${cq.loopProblemSummary.totalLoops} 个`)
      }
    }

    // 收集改进片段（每5集取一段）
    console.log(`\n=== 改进片段采样 ===`)
    for (const epNo of [1, 5, 10, 15, 20]) {
      const scene = result.generatedScenes.find((s) => s.sceneNo === epNo)
      if (scene?.screenplay) {
        const lines = scene.screenplay.split('\n').filter((l) => l.trim())
        const sample = lines.slice(0, Math.min(8, lines.length)).join('\n')
        console.log(`\n--- 第 ${epNo} 集 前8行 ---`)
        console.log(sample)
      }
    }

    console.log(`\n=== 回归测试完成 ===`)
    process.exit(result.success ? 0 : 1)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`\n生成过程中发生错误: ${msg}`)
    process.exit(1)
  }
}

main()
