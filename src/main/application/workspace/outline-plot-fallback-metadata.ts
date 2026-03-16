import { parseStructuredGenerationBrief } from './summarize-chat-for-generation-support'

export function deriveFallbackTitle(input: { genre: string; protagonist: string; mainConflict: string }): string {
  const g = input.genre?.trim()
  const p = input.protagonist?.trim()
  if (g && p) return `${g}《${p}》`
  if (p) return `《${p}》`
  if (g) return `${g}短剧`
  const c = input.mainConflict?.trim()
  if (c) return `《${c.slice(0, 10)}》`
  return '未命名短剧'
}

export function deriveFallbackSummary(input: {
  protagonist: string
  mainConflict: string
  theme: string
  facts: Array<{ label: string; description: string }>
}): string {
  const protagonist = input.protagonist?.trim() || '主角'
  const conflict = input.mainConflict?.trim() || '被迫面对越来越强的外部压力'
  const theme = input.theme?.trim() || '完成自我反转'
  const topFacts = input.facts
    .slice(0, 3)
    .map((fact) => fact.description.trim())
    .filter(Boolean)
    .join('；')

  return [
    `${protagonist}一开始被卷进${conflict}，必须先守住眼前最重要的人和秘密。`,
    topFacts ? `随着${topFacts}逐步压近，主角表面的隐忍会被一层层逼到极限。` : '随着多线压力不断叠加，主角表面的隐忍会被一层层逼到极限。',
    `中段开始，主角必须把藏着的底牌一点点亮出来，让冲突从局部碰撞升级成无法回头的正面对决。`,
    `临近终局时，主角既要完成反转，也要为自己的选择付出代价，最后把主题落回“${theme}”。`
  ].join('')
}

export function deriveFallbackProtectTargetText(text: string): string {
  if (text.includes('小镇少女')) return '小镇少女'
  if (text.includes('台柱师妹')) return '台柱师妹'
  if (text.includes('前女友记者')) return '前女友记者'
  if (text.includes('小姨') && text.includes('弟弟')) return '小姨和弟弟'
  if (text.includes('小柔')) return '小柔'
  if (text.includes('家人')) return '家人'
  return text.match(/([一-龥]{2,10})被当成施压筹码/)?.[1] || text.match(/([一-龥]{2,10})被当筹码/)?.[1] || text.match(/([一-龥]{2,10})被扣在/)?.[1] || ''
}

export function deriveFallbackAssetText(text: string): string {
  if (text.includes('原始证据')) return '原始证据'
  if (text.includes('U盘') || text.includes('u盘')) return 'U盘证据'
  if (text.includes('钥匙')) return '密库钥匙'
  if (text.includes('戏本秘密')) return '戏本秘密'
  if (text.includes('源代码')) return '源代码'
  if (text.includes('婚约')) return '婚约真相'
  return text.match(/盯上([一-龥A-Za-z]{2,12})/)?.[1] || text.match(/交出([一-龥A-Za-z]{2,12})/)?.[1] || ''
}

export function deriveEpisodeFallbackContext(input: {
  protagonist: string
  antagonist: string
  conflict: string
  protectTarget: string
  keyAsset: string
  generationBriefText?: string
}) {
  const protagonist = input.protagonist?.trim() || '主角'
  const antagonist = input.antagonist?.trim() || '对手'
  const protectTarget = input.protectTarget?.trim() || '最重要的人'
  const keyAsset = input.keyAsset?.trim() || '关键底牌'
  const conflict = input.conflict?.trim() || `${protagonist}被迫卷进越来越强的外部压力`
  const structured = input.generationBriefText ? parseStructuredGenerationBrief(input.generationBriefText) : null
  const brief =
    structured?.generationBrief && typeof structured.generationBrief === 'object'
      ? (structured.generationBrief as {
          keyCharacters?: string[]
          relationSummary?: string[]
          softUnderstanding?: string[]
          worldAndBackground?: string
          chainSynopsis?: string
        })
      : null
  const softUnderstanding = Array.isArray(brief?.softUnderstanding) ? brief.softUnderstanding : []
  const keyCharacters = Array.isArray(brief?.keyCharacters) ? brief.keyCharacters.filter(Boolean) : []
  const externalPressure =
    keyCharacters.find(
      (name) =>
        name !== protagonist &&
        name !== antagonist &&
        name !== protectTarget &&
        /妖|蛇|兽|鬼|邪|冤魂|系统|异常|失控/.test(name)
    ) || ''
  const mentor =
    keyCharacters.find((name) => name !== protagonist && name !== antagonist && name !== protectTarget && name !== externalPressure) ||
    ''
  const worldText = `${brief?.worldAndBackground || ''} ${brief?.chainSynopsis || ''}`
  const worldThreat =
    externalPressure ||
    (worldText.includes('蛇子')
      ? '蛇子异动'
      : worldText.includes('妖兽')
        ? '妖兽威胁'
        : worldText.includes('妖物')
          ? '山中妖物'
          : '外部危机')
  const location = worldText.includes('王母宫')
    ? '王母宫'
    : worldText.includes('安仁')
      ? '安仁'
      : worldText.includes('小镇')
        ? '小镇'
        : '关键地点'
  const wisdomAnchor =
    softUnderstanding.find((item) => item.includes('谦卦') || item.includes('不争'))
      ? '谦卦心法'
      : softUnderstanding.find((item) => item.includes('智慧'))
        ? '智慧周旋'
        : input.generationBriefText?.includes('守约')
          ? '守钥规矩'
          : '旧规矩和心法'
  const conflictDirection = conflict.includes('反转')
    ? '主线局面'
    : conflict.includes('成长')
      ? '这场对抗'
      : '当前局面'

  return {
    protagonist,
    antagonist,
    protectTarget,
    keyAsset,
    worldThreat,
    mentor,
    location,
    wisdomAnchor,
    conflictDirection
  }
}
