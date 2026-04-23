/**
 * src/shared/contracts/prompt-variables.ts
 *
 * Prompt 变量化系统。
 *
 * 核心设计原则：
 * 1. 所有 Agent 的提示词中禁止硬编码具体人名/地名/物品名
 * 2. 使用 {{变量名}} 占位符，由 PromptTemplate 动态填充
 * 3. 变量来源优先级：storyIntent 显式值 > 用户输入 > 原型库默认值
 *
 * 这是根除"过度拟合"病灶的关键机制。
 * 错误：如果李科拿小柔威胁黎明……
 * 正确：如果 {{antagonist}} 拿 {{leverage_character}} 威胁 {{protagonist}}……
 */

import type { StoryIntentPackageDto } from './intake'

// ─────────────────────────────────────────────────────────────────────────────
// Prompt 变量接口
// ─────────────────────────────────────────────────────────────────────────────

/** Prompt 变量集合，从 StoryIntent 动态提取 */
export interface PromptVariables {
  // ── 核心角色（必填） ──
  /** 主角名称 */
  protagonist: string
  /** 对手/反派名称 */
  antagonist: string
  /** 情感杠杆角色（被用来施压的关键人物） */
  leverageCharacter: string

  // ── 核心物品/设定（必填） ──
  /** 核心争夺物/钥匙/MacGuffin */
  coreItem: string
  /** 组织/宗门/家族名称 */
  organization: string
  /** 额外世界观元素（妖兽/神器/封印等） */
  worldElement: string

  // ── 可选补充角色 ──
  /** 规则杠杆角色（师父/长老/上级） */
  ruleLeverCharacter: string
  /** 额外角色名列表（残党/对手手下等） */
  extraCharacters: string[]

  // ── 题材信息 ──
  /** 题材类型（修仙/现代/民国/科幻/霸总等） */
  genre: string
  /** 题材原型（决定默认值风格） */
  genreArchetype: GenreArchetype
}

/** 题材原型枚举——决定原型库默认值 */
export type GenreArchetype =
  | 'xianxia' // 修仙/玄幻
  | 'modern_revenge' // 现代逆袭/霸总
  | 'period_palace' // 古装宫斗/权谋
  | 'urban_romance' // 都市言情
  | 'scifi' // 科幻/末日
  | 'fantasy' // 奇幻/魔幻
  | 'default' // 通用默认

// ─────────────────────────────────────────────────────────────────────────────
// 题材原型库
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 题材原型库：每个题材提供一套爆发力极强的默认值。
 *
 * 铁律：禁止平庸。如果用户没填，我们给的不是"性格温和"，
 * 而是能让戏炸起来的"性格冷峻、有仇必报、掌控全局"。
 */
export const GENRE_ARCHETYPE_DEFAULTS: Record<
  GenreArchetype,
  Omit<PromptVariables, 'genre' | 'genreArchetype'>
> = {
  xianxia: {
    protagonist: '主角',
    antagonist: '对手',
    leverageCharacter: '义妹',
    coreItem: '秘宝钥匙',
    organization: '宗门',
    worldElement: '妖兽',
    ruleLeverCharacter: '师父',
    extraCharacters: ['长老', '残党首领']
  },
  modern_revenge: {
    protagonist: '主角',
    antagonist: '对手',
    leverageCharacter: '至亲',
    coreItem: '股权书/遗嘱/核心证据',
    organization: '集团/家族',
    worldElement: '行业黑幕',
    ruleLeverCharacter: '老友/前辈',
    extraCharacters: ['商业对手', '线人']
  },
  period_palace: {
    protagonist: '主角',
    antagonist: '对手',
    leverageCharacter: '贴身侍从/红颜',
    coreItem: '虎符/密旨/传位诏书',
    organization: '朝廷/王府',
    worldElement: '边关战事',
    ruleLeverCharacter: '老臣/太傅',
    extraCharacters: ['奸党', '暗探']
  },
  urban_romance: {
    protagonist: '主角',
    antagonist: '对手',
    leverageCharacter: '闺蜜/发小',
    coreItem: '身世证明/核心合同',
    organization: '公司/豪门',
    worldElement: '商业阴谋',
    ruleLeverCharacter: '前辈/长辈',
    extraCharacters: ['情敌', '商业对手']
  },
  scifi: {
    protagonist: '主角',
    antagonist: '对手',
    leverageCharacter: '同伴/搭档',
    coreItem: '数据核心/密钥',
    organization: '联邦/组织',
    worldElement: '异变体/AI失控',
    ruleLeverCharacter: '长官/导师',
    extraCharacters: ['叛军首领', '黑客']
  },
  fantasy: {
    protagonist: '主角',
    antagonist: '对手',
    leverageCharacter: '同族/契约者',
    coreItem: '圣器/封印物',
    organization: '公会/王国',
    worldElement: '暗潮/魔物',
    ruleLeverCharacter: '老者/守护者',
    extraCharacters: ['叛徒', '异族首领']
  },
  default: {
    protagonist: '主角',
    antagonist: '对手',
    leverageCharacter: '关键人物',
    coreItem: '核心筹码',
    organization: '组织',
    worldElement: '外部威胁',
    ruleLeverCharacter: '规则掌控者',
    extraCharacters: ['残党', '线人']
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 从 StoryIntent 提取 Prompt 变量
// ─────────────────────────────────────────────────────────────────────────────

/** 从 StoryIntent 动态提取 Prompt 变量，缺失字段用原型库填充 */
export function extractPromptVariables(storyIntent: StoryIntentPackageDto): PromptVariables {
  const genreArchetype = inferGenreArchetype(
    storyIntent.genre || '',
    storyIntent.generationBriefText || '',
    storyIntent.shortDramaConstitution?.worldViewBrief || ''
  )

  const defaults = GENRE_ARCHETYPE_DEFAULTS[genreArchetype]

  // 从真源提取核心角色名
  const protagonist = extractProtagonist(storyIntent, defaults.protagonist)
  const antagonist = extractAntagonist(storyIntent, defaults.antagonist)
  const leverageCharacter = extractLeverageCharacter(storyIntent, defaults.leverageCharacter)
  const ruleLeverCharacter = extractRuleLeverCharacter(storyIntent, defaults.ruleLeverCharacter)

  // 从真源提取核心物品/设定
  const coreItem = extractCoreItem(storyIntent, defaults.coreItem)
  const organization = extractOrganization(storyIntent, defaults.organization)
  const worldElement = extractWorldElement(storyIntent, defaults.worldElement)

  // 额外角色
  const extraCharacters = extractExtraCharacters(storyIntent, defaults.extraCharacters)

  return {
    protagonist,
    antagonist,
    leverageCharacter,
    coreItem,
    organization,
    worldElement,
    ruleLeverCharacter,
    extraCharacters,
    genre: storyIntent.genre || '短剧',
    genreArchetype
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 模板填充引擎
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 将模板中的 {{变量名}} 占位符替换为实际值。
 *
 * 用法：
 *   fillTemplate('如果{{antagonist}}拿{{leverage_character}}威胁{{protagonist}}', vars)
 *   → '如果李科拿小柔威胁黎明'
 */
export function fillTemplate(template: string, vars: PromptVariables): string {
  const varMap: Record<string, string> = {
    protagonist: vars.protagonist,
    antagonist: vars.antagonist,
    leverage_character: vars.leverageCharacter,
    leverageCharacter: vars.leverageCharacter,
    core_item: vars.coreItem,
    coreItem: vars.coreItem,
    organization: vars.organization,
    world_element: vars.worldElement,
    worldElement: vars.worldElement,
    rule_lever_character: vars.ruleLeverCharacter,
    ruleLeverCharacter: vars.ruleLeverCharacter,
    genre: vars.genre,
    extra_characters: vars.extraCharacters.join('、'),
    extraCharacters: vars.extraCharacters.join('、')
  }

  let result = template
  for (const [key, value] of Object.entries(varMap)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  return result
}

/**
 * 批量填充模板数组。
 */
export function fillTemplates(templates: string[], vars: PromptVariables): string[] {
  return templates.map((t) => fillTemplate(t, vars))
}

// ─────────────────────────────────────────────────────────────────────────────
// 题材推断
// ─────────────────────────────────────────────────────────────────────────────

/** 根据题材、世界观等信息推断原型 */
export function inferGenreArchetype(
  genre: string,
  briefText: string,
  worldViewBrief: string
): GenreArchetype {
  const combined = `${genre} ${briefText} ${worldViewBrief}`.toLowerCase()

  if (/修仙|仙侠|玄幻|宗门|道观|灵气|功法/.test(combined)) return 'xianxia'
  if (/现代|都市|霸总|豪门|总裁|公司|集团|商战/.test(combined)) return 'modern_revenge'
  if (/古装|宫斗|权谋|朝堂|王府|将军|帝|皇/.test(combined)) return 'period_palace'
  if (/言情|甜宠|恋爱|cp|情侣|闪婚/.test(combined)) return 'urban_romance'
  if (/科幻|末日|赛博|星球|联邦|未来|AI|异变/.test(combined)) return 'scifi'
  if (/奇幻|魔幻|公会|王国|魔法|精灵/.test(combined)) return 'fantasy'

  return 'default'
}

// ─────────────────────────────────────────────────────────────────────────────
// 提取辅助函数
// ─────────────────────────────────────────────────────────────────────────────

function extractProtagonist(storyIntent: StoryIntentPackageDto, fallback: string): string {
  if (storyIntent.protagonist && storyIntent.protagonist.trim()) {
    return storyIntent.protagonist.trim()
  }
  // 从 generationBriefText 中提取主角名
  const match = storyIntent.generationBriefText?.match(/【主角】\s*(.+?)[，。\n]/)
  if (match?.[1]) return match[1].trim()

  // 从 officialKeyCharacters 提取第一个
  if (storyIntent.officialKeyCharacters?.length) {
    return storyIntent.officialKeyCharacters[0]
  }

  return fallback
}

function extractAntagonist(storyIntent: StoryIntentPackageDto, fallback: string): string {
  if (storyIntent.antagonist && storyIntent.antagonist.trim()) {
    return storyIntent.antagonist.trim()
  }
  const match = storyIntent.generationBriefText?.match(/【对手】\s*(.+?)[，。\n]/)
  if (match?.[1]) return match[1].trim()

  return fallback
}

function extractLeverageCharacter(storyIntent: StoryIntentPackageDto, fallback: string): string {
  // 从关系锚点中寻找"被用来施压"的角色
  const relationAnchors = storyIntent.relationAnchors || []
  const leverageAnchor = relationAnchors.find((a) => /拿|逼|威胁|筹码|要挟|人质/.test(a))
  if (leverageAnchor) {
    // 尝试从锚点文本中提取角色名
    const nameMatch = leverageAnchor.match(/拿(.+?)(去|逼|威胁|要挟)/)
    if (nameMatch?.[1]) return nameMatch[1].trim()
  }

  // 从 officialKeyCharacters 中找第三个角色（通常是情感杠杆）
  const chars = storyIntent.officialKeyCharacters || []
  if (chars.length >= 3) return chars[2]

  return fallback
}

function extractRuleLeverCharacter(storyIntent: StoryIntentPackageDto, fallback: string): string {
  // 从 generationBriefText 或角色列表中寻找规则杠杆角色
  const characters = storyIntent.officialKeyCharacters || []
  const ruleKeywords = /师父|师父|长老|上级|老板|太后|王爷|官长|导师/

  const match = characters.find((c) => ruleKeywords.test(c))
  if (match) return match

  return fallback
}

function extractCoreItem(storyIntent: StoryIntentPackageDto, fallback: string): string {
  // 从 constitutionalMacGuffin 或 coreDislocation 中提取
  const macGuffin = storyIntent.shortDramaConstitution?.macGuffinDefinition
  if (macGuffin && macGuffin.trim()) return macGuffin.trim()

  // 从核心冲突中提取
  const conflict = storyIntent.coreConflict || ''
  const keyMatch = conflict.match(
    /(?:钥匙|秘宝|证据|密诏|虎符|合同|遗产|遗嘱|芯片|密钥|封印物|圣器)/
  )
  if (keyMatch) return keyMatch[0]

  return fallback
}

function extractOrganization(storyIntent: StoryIntentPackageDto, fallback: string): string {
  const brief = storyIntent.generationBriefText || ''
  const worldView = storyIntent.shortDramaConstitution?.worldViewBrief || ''

  const orgMatch = `${brief} ${worldView}`.match(
    /(?:宗门|道观|集团|公司|家族|朝廷|王府|公会|组织|联邦|王国|豪门)[^，。；、\n]{0,4}/
  )
  if (orgMatch) return orgMatch[0].trim()

  return fallback
}

function extractWorldElement(storyIntent: StoryIntentPackageDto, fallback: string): string {
  const brief = storyIntent.generationBriefText || ''
  const worldView = storyIntent.shortDramaConstitution?.worldViewBrief || ''

  const combined = `${brief} ${worldView}`
  const elementMatch = combined.match(
    /(?:妖兽|蛇子|怪物|暗潮|异变|AI|魔物|黑幕|封印|灾变)[^，。；、\n]{0,6}/
  )
  if (elementMatch) return elementMatch[0].trim()

  return fallback
}

function extractExtraCharacters(storyIntent: StoryIntentPackageDto, fallback: string[]): string[] {
  const chars = storyIntent.officialKeyCharacters || []
  // 取第4个及以后的角色作为额外角色
  if (chars.length > 3) return chars.slice(3)

  return fallback
}
