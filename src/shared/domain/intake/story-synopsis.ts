import type { StoryIntentPackageDto, StorySynopsisDto } from '../../contracts/intake.ts'

export interface StorySynopsisReadiness {
  ready: boolean
  missing: string[]
  suggestions: string[]
}

const REQUIRED_FIELDS: Array<{
  key: keyof StorySynopsisDto
  label: string
  suggestion: string
}> = [
  {
    key: 'openingPressureEvent',
    label: '开局压迫事件',
    suggestion: '第一集主角被怎么羞辱/压迫？比如"被当众判废体、逼跪认罪"'
  },
  {
    key: 'firstFaceSlapEvent',
    label: '第一场打脸',
    suggestion: '主角第一次反击是什么结果？比如"测灵石炸裂反噬长老"'
  },
  {
    key: 'protagonistCurrentDilemma',
    label: '主角当前困境',
    suggestion: '主角开局最紧迫的处境是什么？'
  },
  {
    key: 'antagonistForce',
    label: '核心反派/势力',
    suggestion: '第一反派是谁？比如"宗门长老"或"刺客组织首领"'
  },
  {
    key: 'antagonistPressureMethod',
    label: '反派压迫方式',
    suggestion: '反派怎么压主角？用规则、权位、还是利益分化？'
  },
  {
    key: 'stageGoal',
    label: '主角阶段目标',
    suggestion: '前20集主角要达成什么？比如"查清组织黑幕、逃出宗门"'
  },
  {
    key: 'corePayoff',
    label: '核心爽点',
    suggestion: '这部剧最核心的爽感来源是什么？逆袭？身份揭露？权力借用？'
  }
]

const PLACEHOLDER_VALUES = new Set(['待补', '未知', '未定', '无', '暂无', '不详', '待确认'])

function hasMeaningfulText(value: string | undefined | null, minLength = 3): boolean {
  const normalized = (value || '').replace(/\s+/g, '').trim()
  return normalized.length >= minLength && !PLACEHOLDER_VALUES.has(normalized)
}

function extractBriefSection(brief: string, sectionName: string): string {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = brief.match(new RegExp(`【${escaped}】([\\s\\S]*?)(?=\\n【|$)`))
  return match?.[1]?.trim() || ''
}

function extractEpisodeCount(brief: string | undefined): number {
  const match = (brief || '').match(/(?:【项目】[^\n]*?｜|^|\D)(\d{1,3})\s*集/)
  const value = Number(match?.[1] || 0)
  return Number.isFinite(value) ? value : 0
}

function splitNames(text: string): string[] {
  return text
    .split(/[、,，;；\n]/)
    .map(
      (item) =>
        item
          .replace(/^-\s*/, '')
          .split(/[：:｜|]/)[0]
          ?.trim() || ''
    )
    .filter((item) => hasMeaningfulText(item, 2))
}

function countRosterNames(storyIntent: StoryIntentPackageDto): number {
  const brief = storyIntent.generationBriefText || ''
  const names = new Set<string>()

  for (const value of [
    storyIntent.protagonist,
    storyIntent.antagonist,
    ...(storyIntent.officialKeyCharacters || []),
    ...(storyIntent.lockedCharacterNames || []),
    ...splitNames(extractBriefSection(brief, '关键角色')),
    ...splitNames(extractBriefSection(brief, '角色卡')),
    ...splitNames(extractBriefSection(brief, '人物分层'))
  ]) {
    const name = value?.trim()
    if (name && hasMeaningfulText(name, 2)) names.add(name)
  }

  return names.size
}

function hasWorldFoundation(storyIntent: StoryIntentPackageDto): boolean {
  const briefWorld = extractBriefSection(storyIntent.generationBriefText || '', '世界观与故事背景')
  return (
    hasMeaningfulText(briefWorld, 8) ||
    (storyIntent.worldAnchors || []).some((item) => hasMeaningfulText(item, 4))
  )
}

function countFactionOrFieldSignals(storyIntent: StoryIntentPackageDto): number {
  const combinedText = [
    ...(storyIntent.worldAnchors || []),
    ...(storyIntent.relationAnchors || []),
    extractBriefSection(storyIntent.generationBriefText || '', '世界观与故事背景'),
    extractBriefSection(storyIntent.generationBriefText || '', '关键角色'),
    extractBriefSection(storyIntent.generationBriefText || '', '角色卡'),
    extractBriefSection(storyIntent.generationBriefText || '', '人物分层')
  ].join('\n')

  const signals = combinedText.match(
    /阵营|势力|派系|组织|公司|集团|宗门|门派|朝廷|官府|皇宫|王府|家族|豪门|学校|医院|军队|警局|帮派|村|镇|城|国|天庭|龙宫|寺庙|场域|地点|据点|基地/g
  )

  return new Set(signals || []).size
}

function hasCrowdOrFunctionalRoles(storyIntent: StoryIntentPackageDto): boolean {
  const combinedText = [
    ...(storyIntent.officialKeyCharacters || []),
    ...(storyIntent.lockedCharacterNames || []),
    storyIntent.generationBriefText || ''
  ].join('\n')

  return /群像|功能角色|跑龙套|龙套|路人|群众|村民|大臣|下属|弟子|士兵|侍卫|护卫|伙计|小孩|孩童|同学|同事|甲|乙/.test(
    combinedText
  )
}

/**
 * 检测故事梗概是否达到最低可用标准。
 *
 * 返回 missing 供 UI 提示用户补充。
 */
export function inspectStorySynopsisReadiness(
  synopsis: StorySynopsisDto | undefined | null
): StorySynopsisReadiness {
  if (!synopsis) {
    return {
      ready: false,
      missing: REQUIRED_FIELDS.map((f) => f.label),
      suggestions: REQUIRED_FIELDS.map((f) => f.suggestion)
    }
  }

  const missing: string[] = []
  const suggestions: string[] = []

  for (const field of REQUIRED_FIELDS) {
    const value = synopsis[field.key]
    if (!value || (typeof value === 'string' && value.trim().length < 3)) {
      missing.push(field.label)
      suggestions.push(field.suggestion)
    }
  }

  return {
    ready: missing.length === 0,
    missing,
    suggestions
  }
}

export function inspectProjectIntakeReadiness(
  storyIntent: StoryIntentPackageDto | undefined | null
): StorySynopsisReadiness {
  const synopsisReadiness = inspectStorySynopsisReadiness(storyIntent?.storySynopsis)
  const missing = [...synopsisReadiness.missing]
  const suggestions = [...synopsisReadiness.suggestions]

  if (!storyIntent) {
    missing.push('世界观与故事背景', '阵营/场域底账', '角色名册')
    suggestions.push(
      '先说明故事发生在什么世界、时代、规则和基本背景。',
      '至少说清楚主要阵营、组织、地点或场域，不要只给一个孤立主角。',
      '先列出核心角色、功能角色和群像位，再进入人物小传。'
    )
    return {
      ready: false,
      missing,
      suggestions
    }
  }

  if (!hasWorldFoundation(storyIntent)) {
    missing.push('世界观与故事背景')
    suggestions.push('补一句这个故事发生在什么世界、时代、规则、社会背景或行业背景。')
  }

  const episodeCount = extractEpisodeCount(storyIntent.generationBriefText)
  const requiredFactionSignals = episodeCount >= 30 ? 2 : 1
  if (countFactionOrFieldSignals(storyIntent) < requiredFactionSignals) {
    missing.push('阵营/场域底账')
    suggestions.push('补主要阵营、组织、地点或场域，比如朝廷/宗门/公司/村镇/敌对势力。')
  }

  const rosterCount = countRosterNames(storyIntent)
  const requiredRosterCount = episodeCount >= 60 ? 8 : episodeCount >= 20 ? 6 : 4
  if (rosterCount < requiredRosterCount) {
    suggestions.push(
      '角色名册不是让用户自己取名；如果用户授权 AI 取名，系统应直接补一版含真实中文姓氏、身份、阵营和职责的角色清单。'
    )
  }

  if (episodeCount >= 30 && !hasCrowdOrFunctionalRoles(storyIntent)) {
    missing.push('群像/功能角色位')
    suggestions.push('30集以上需要提前放入跑龙套、群像或功能角色位，后面分集才有可调度的人。')
  }

  return {
    ready: missing.length === 0,
    missing,
    suggestions
  }
}
