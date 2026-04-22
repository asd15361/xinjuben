/**
 * src/main/application/workspace/resolve-entity-names.ts
 *
 * Stage 0.5: 实体定名与锚定 (Entity Naming & Binding)。
 *
 * 【切入位置】
 *   StoryIntent 生成之后
 *   ↓
 *   resolveEntityNames(storyIntent)  ← 本阶段
 *   ↓
 *   七问 Agent / 势力矩阵 Agent / 人物小传 Agent（并行）
 *
 * 【解决的问题】
 *   用户在灵感对话中没有给出具体姓名（比如只说"女主"、"霸总"、"恶毒婆婆"）。
 *   下游 Guardian 会因 name 字段为空而拦截，整个链路断裂。
 *
 * 【设计原则】
 *   1. 不在下游打补丁——这是上游的事，下游只管用
 *   2. 结合题材原型库 + 中文名库自动起名
 *   3. 一旦生成即全局锁定——下游所有 Agent 拿到的是"已定名"的 StoryIntent
 *   4. 如果用户说了名字就保留用户的，绝不自作主张覆盖
 *
 * 【输出】
 *   StoryIntentPackageDto（name 字段被自动填充）
 */

import type { StoryIntentPackageDto } from '../../../shared/contracts/intake.ts'
import type { GenreArchetype } from '../../../shared/contracts/prompt-variables.ts'
import { inferGenreArchetype } from '../../../shared/contracts/prompt-variables.ts'

// ─────────────────────────────────────────────────────────────────────────────
// 中文名库：按题材/风格分类
// ─────────────────────────────────────────────────────────────────────────────

/** 姓氏池：按题材风格分组 */
const SURNAME_POOLS: Record<GenreArchetype, string[]> = {
  xianxia: [
    '林',
    '萧',
    '楚',
    '苏',
    '陆',
    '沈',
    '白',
    '叶',
    '江',
    '顾',
    '谢',
    '裴',
    '墨',
    '云',
    '风'
  ],
  modern_revenge: [
    '顾',
    '沈',
    '陆',
    '霍',
    '傅',
    '贺',
    '秦',
    '韩',
    '萧',
    '厉',
    '江',
    '季',
    '周',
    '宋',
    '陈'
  ],
  period_palace: [
    '沈',
    '苏',
    '萧',
    '楚',
    '陆',
    '林',
    '柳',
    '白',
    '云',
    '花',
    '叶',
    '月',
    '柳',
    '宋',
    '江'
  ],
  urban_romance: [
    '苏',
    '林',
    '夏',
    '沈',
    '顾',
    '宋',
    '叶',
    '白',
    '许',
    '唐',
    '程',
    '安',
    '姜',
    '温',
    '方'
  ],
  scifi: ['陆', '顾', '沈', '秦', '贺', '林', '周', '陈', '吴', '张', '李', '刘', '杨', '赵', '黄'],
  fantasy: [
    '墨',
    '萧',
    '楚',
    '云',
    '风',
    '白',
    '叶',
    '江',
    '林',
    '沈',
    '顾',
    '陆',
    '燕',
    '荆',
    '项'
  ],
  default: [
    '林',
    '苏',
    '沈',
    '陆',
    '顾',
    '白',
    '江',
    '叶',
    '陈',
    '周',
    '宋',
    '唐',
    '许',
    '程',
    '安'
  ]
}

/** 男性名池：按风格 */
const MALE_NAME_POOLS: Record<GenreArchetype, string[]> = {
  xianxia: [
    '晨',
    '渊',
    '寒',
    '无尘',
    '长风',
    '明轩',
    '子墨',
    '逸风',
    '天行',
    '凌霄',
    '破军',
    '惊云',
    '玄冥',
    '星河'
  ],
  modern_revenge: [
    '霆深',
    '景行',
    '承泽',
    '修远',
    '司爵',
    '寒洲',
    '砚辞',
    '叙白',
    '沉舟',
    '牧野',
    '寒州',
    '时晏',
    '薄言',
    '砚清'
  ],
  period_palace: [
    '景珩',
    '承影',
    '修齐',
    '明珏',
    '长风',
    '子衿',
    '怀瑾',
    '握瑜',
    '清远',
    '景行',
    '云峥',
    '晏清',
    '修竹',
    '寒松'
  ],
  urban_romance: [
    '言深',
    '景川',
    '子墨',
    '逸尘',
    '星河',
    '晨风',
    '明朗',
    '时安',
    '清和',
    '砚白',
    '叙风',
    '沐辰',
    '瑾瑜',
    '知远'
  ],
  scifi: [
    '远',
    '航',
    '辰',
    '宇航',
    '泽宇',
    '天明',
    '思远',
    '博文',
    '浩然',
    '志远',
    '明哲',
    '俊杰',
    '伟宸',
    '煜城'
  ],
  fantasy: [
    '惊蛰',
    '破军',
    '长风',
    '凌霄',
    '逐风',
    '斩月',
    '焚天',
    '裂空',
    '星河',
    '苍澜',
    '玄冥',
    '惊云',
    '天纵',
    '无双'
  ],
  default: [
    '晨',
    '渊',
    '明',
    '远',
    '寒',
    '轩',
    '墨',
    '风',
    '云',
    '行',
    '辰',
    '安',
    '言',
    '清',
    '白'
  ]
}

/** 女性名池：按风格 */
const FEMALE_NAME_POOLS: Record<GenreArchetype, string[]> = {
  xianxia: [
    '雪',
    '月',
    '灵',
    '清歌',
    '若雪',
    '琉璃',
    '晚晴',
    '初雪',
    '霜华',
    '落雪',
    '沐雪',
    '素衣',
    '紫萱',
    '轻歌'
  ],
  modern_revenge: [
    '清歌',
    '晚晴',
    '念初',
    '南乔',
    '初雪',
    '知意',
    '语柔',
    '安然',
    '清欢',
    '若初',
    '苏清',
    '时念',
    '知微',
    '南星'
  ],
  period_palace: [
    '婉清',
    '如霜',
    '芷若',
    '清漪',
    '素心',
    '晚晴',
    '若兰',
    '清歌',
    '念慈',
    '如萱',
    '月婵',
    '灵犀',
    '清漪',
    '凝霜'
  ],
  urban_romance: [
    '初夏',
    '清歌',
    '晚晚',
    '苏苏',
    '浅浅',
    '知意',
    '安若',
    '南乔',
    '清欢',
    '语嫣',
    '夏沫',
    '星阑',
    '初晴',
    '念安'
  ],
  scifi: ['星', '月', '灵', '雨', '清', '思', '梦', '瑶', '晶', '雪', '慧', '敏', '静', '丽', '琳'],
  fantasy: [
    '灵',
    '雪',
    '月',
    '琉璃',
    '清歌',
    '落雪',
    '紫萱',
    '霜华',
    '轻歌',
    '暮雪',
    '紫陌',
    '青鸾',
    '瑶光',
    '星阑'
  ],
  default: [
    '雪',
    '月',
    '清',
    '灵',
    '若',
    '晚',
    '初',
    '知',
    '念',
    '安',
    '语',
    '晴',
    '欢',
    '意',
    '柔'
  ]
}

/**
 * 从名池中随机选一个名字（伪随机，基于输入种子的确定性选择）。
 */
function pickFromPool(pool: string[], seed: string): string {
  // 用种子字符串的 hash 值做索引，确保同一项目多次调用结果一致
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  return pool[Math.abs(hash) % pool.length]
}

/**
 * 生成符合题材调性的中文姓名。
 */
function generateNameForRole(
  archetype: GenreArchetype,
  role: 'male' | 'female' | 'unknown',
  roleLabel: string,
  seed: string
): string {
  const surnames = SURNAME_POOLS[archetype]
  const pool =
    role === 'female'
      ? FEMALE_NAME_POOLS[archetype]
      : role === 'male'
        ? MALE_NAME_POOLS[archetype]
        : [...MALE_NAME_POOLS[archetype], ...FEMALE_NAME_POOLS[archetype]]

  const surname = pickFromPool(surnames, seed + '_surname')
  const givenName = pickFromPool(pool, seed + '_given_' + roleLabel)

  return surname + givenName
}

// ─────────────────────────────────────────────────────────────────────────────
// 角色性别推断
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 根据角色标签和上下文推断性别倾向。
 */
function inferGender(roleLabel: string, briefText: string): 'male' | 'female' | 'unknown' {
  const combined = `${roleLabel} ${briefText}`.toLowerCase()

  if (/女|妻|妾|婆|媳|妈|娘|姐|妹|姑|嫂|婶|妃|姬|媛|婆|媳/.test(combined)) return 'female'
  if (/男|夫|父|爷|叔|哥|弟|伯|舅|公|侯|爷|爷|郎|相|公|婿|爹/.test(combined)) return 'male'

  return 'unknown'
}

// ─────────────────────────────────────────────────────────────────────────────
// 角色标签提取
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 从 storyIntent 中提取"需要定名的实体角色"。
 *
 * 扫描来源：
 * 1. officialKeyCharacters 中的模糊标签（如"女主"、"霸总"、"恶毒婆婆"）
 * 2. generationBriefText 中的【主角】【对手】段落
 * 3. protagonist / antagonist 字段如果是描述而非人名
 */
function extractEntityCandidates(storyIntent: StoryIntentPackageDto): Array<{
  label: string
  category: 'protagonist' | 'antagonist' | 'keyCharacter'
}> {
  const candidates: Array<{
    label: string
    category: 'protagonist' | 'antagonist' | 'keyCharacter'
  }> = []

  const brief = storyIntent.generationBriefText || ''

  // 扫描 protagonist 字段
  if (storyIntent.protagonist) {
    const p = storyIntent.protagonist.trim()
    if (p && !isProperName(p)) {
      candidates.push({ label: p, category: 'protagonist' })
    }
  }

  // 扫描 antagonist 字段
  if (storyIntent.antagonist) {
    const a = storyIntent.antagonist.trim()
    if (a && !isProperName(a)) {
      candidates.push({ label: a, category: 'antagonist' })
    }
  }

  // 扫描 officialKeyCharacters
  if (storyIntent.officialKeyCharacters) {
    for (const char of storyIntent.officialKeyCharacters) {
      const c = char.trim()
      if (c && !isProperName(c) && !candidates.some((x) => x.label === c)) {
        candidates.push({ label: c, category: 'keyCharacter' })
      }
    }
  }

  // 从 generationBriefText 中提取【主角】【对手】段落中的角色描述
  const protagonistMatch = brief.match(/【主角】\s*([^\n]+)/)
  if (protagonistMatch) {
    const desc = protagonistMatch[1].trim()
    if (desc && !isProperName(desc) && !candidates.some((x) => x.category === 'protagonist')) {
      candidates.push({ label: desc, category: 'protagonist' })
    }
  }

  const antagonistMatch = brief.match(/【对手】\s*([^\n]+)/)
  if (antagonistMatch) {
    const desc = antagonistMatch[1].trim()
    if (desc && !isProperName(desc) && !candidates.some((x) => x.category === 'antagonist')) {
      candidates.push({ label: desc, category: 'antagonist' })
    }
  }

  return candidates
}

/**
 * 判断一个字符串是否已经是人名（而非角色描述）。
 *
 * 简单启发式规则：
 * - 2-4 个中文字符且不含功能词 → 很可能是人名
 * - 包含"主"、"角"、"总"、"婆"、"爷"、"霸"等功能词 → 不是人名
 */
function isProperName(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (t.length > 4 || t.length < 1) return false

  // 功能词黑名单——包含这些词的几乎都不是人名
  const roleWords =
    /主角|女主|男主|配角|对手|反派|霸总|总裁|婆婆|恶毒|千金|假千金|真千金|继母|养女|继女|少爷|管家|助理|闺蜜|情敌|未婚妻|未婚夫|前妻|前夫|小三|炮灰|路人|丫鬟|侍女|侍卫|执事|长老|师父|道长|少年|少女|少年人|中年人|老头|老太|看门|守门|守钥|乞丐|农夫|村姑|渔夫|猎人|商人|书生|武将|皇帝|皇后|太子|公主|王爷|王妃|太后|太监|宰相|将军|丞相|县令|捕快|镖头|掌柜|店小|小二/
  if (roleWords.test(t)) return false

  // 包含抽象描述性词语
  const abstractWords =
    /表面|无武功|无|有|被|的|很|最|应该|必须|想要|为了|因为|所以|但是|虽然|如果|可能|已经|正在|将要/
  if (abstractWords.test(t)) return false

  // 剩下的 1-4 个中文字符，很可能是人名
  return /^[\u4e00-\u9fff]{1,4}$/.test(t)
}

// ─────────────────────────────────────────────────────────────────────────────
// 核心函数：resolveEntityNames
// ─────────────────────────────────────────────────────────────────────────────

/** resolveEntityNames 的结果 */
export interface EntityNameResolutionResult {
  /** 是否需要自动起名 */
  needed: boolean
  /** 被自动起名的角色列表 */
  resolved: Array<{
    /** 原始标签（如"女主"、"霸总"） */
    originalLabel: string
    /** 生成的名字 */
    resolvedName: string
    /** 角色类别 */
    category: 'protagonist' | 'antagonist' | 'keyCharacter'
  }>
  /** 更新后的 StoryIntent */
  updatedIntent: StoryIntentPackageDto
}

/**
 * Stage 0.5 核心函数：实体定名与锚定。
 *
 * 扫描 StoryIntent，发现缺少具体姓名的角色，
 * 结合题材原型库自动起名，并更新全局上下文。
 *
 * @param storyIntent 用户输入的原始故事梗概
 * @returns 更新后的 StoryIntent + 起名记录
 */
export function resolveEntityNames(storyIntent: StoryIntentPackageDto): EntityNameResolutionResult {
  const archetype = inferGenreArchetype(
    storyIntent.genre || '',
    storyIntent.generationBriefText || '',
    storyIntent.shortDramaConstitution?.worldViewBrief || ''
  )

  const candidates = extractEntityCandidates(storyIntent)
  const resolved: EntityNameResolutionResult['resolved'] = []

  // 生成种子——基于项目标题+题材，确保同一项目多次调用结果一致
  const seed =
    `${storyIntent.titleHint || 'project'}_${storyIntent.genre || 'drama'}_${storyIntent.sellingPremise || ''}`.slice(
      0,
      60
    )

  for (const candidate of candidates) {
    const gender = inferGender(candidate.label, storyIntent.generationBriefText || '')
    const generatedName = generateNameForRole(
      archetype,
      gender,
      candidate.label,
      seed + '_' + candidate.label
    )

    resolved.push({
      originalLabel: candidate.label,
      resolvedName: generatedName,
      category: candidate.category
    })
  }

  // 构建更新后的 StoryIntent
  const updatedIntent = { ...storyIntent }

  // 更新 protagonist / antagonist
  if (resolved.length > 0) {
    const protagonistResolutions = resolved.filter((r) => r.category === 'protagonist')
    const antagonistResolutions = resolved.filter((r) => r.category === 'antagonist')

    if (protagonistResolutions.length > 0) {
      updatedIntent.protagonist = protagonistResolutions[0].resolvedName
    }
    if (antagonistResolutions.length > 0) {
      updatedIntent.antagonist = antagonistResolutions[0].resolvedName
    }

    // 更新 officialKeyCharacters：把模糊标签替换为具体名字
    if (updatedIntent.officialKeyCharacters) {
      const nameMap = new Map(resolved.map((r) => [r.originalLabel, r.resolvedName]))
      updatedIntent.officialKeyCharacters = updatedIntent.officialKeyCharacters.map((char) => {
        return nameMap.get(char) || char
      })
    }

    // 更新 lockedCharacterNames
    if (updatedIntent.lockedCharacterNames) {
      const nameMap = new Map(resolved.map((r) => [r.originalLabel, r.resolvedName]))
      updatedIntent.lockedCharacterNames = updatedIntent.lockedCharacterNames.map((char) => {
        return nameMap.get(char) || char
      })
    }

    // 更新 generationBriefText：把标签替换为名字
    if (updatedIntent.generationBriefText) {
      let text = updatedIntent.generationBriefText
      for (const resolution of resolved) {
        text = text.replace(new RegExp(resolution.originalLabel, 'g'), resolution.resolvedName)
      }
      updatedIntent.generationBriefText = text
    }
  }

  return {
    needed: resolved.length > 0,
    resolved,
    updatedIntent
  }
}

/**
 * 便捷函数：在流水线上调用 resolveEntityNames 并返回更新后的 StoryIntent。
 * 如果不需起名，直接返回原值。
 */
export function resolveEntityNamesOrPassThrough(
  storyIntent: StoryIntentPackageDto
): StoryIntentPackageDto {
  const result = resolveEntityNames(storyIntent)
  return result.updatedIntent
}
