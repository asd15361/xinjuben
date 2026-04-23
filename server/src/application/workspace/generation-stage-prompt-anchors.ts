function extractSection(text: string, title: string): string {
  const match = text.match(new RegExp(`【${title}】([\\s\\S]*?)(?=【[^】]+】|$)`))
  return match?.[1]?.trim() || ''
}

function collapseText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

const NOISY_THEME_PATTERNS = [
  /领悟[^，。；、]*?(大道|真谛|奥义)/g,
  /悟透[^，。；、]*?(大道|真谛|奥义)?/g,
  /帮助[^，。；、]*?悟道/g,
  /帮助[^，。；、]*?领悟[^，。；、]*/g,
  /象征[^，。；、]*?(大道|获得|心态|真义)/g,
  /所蕴含[^，。；、]*/g,
  /不争得失/g,
  /至高奥义/g,
  /真正的获得/g,
  /真正的道/g,
  /谦卦真谛/g
]

export function stripNoisyThemeClauses(text: string): string {
  let next = collapseText(text)
  for (const pattern of NOISY_THEME_PATTERNS) {
    next = next.replace(pattern, '')
  }

  return next
    .replace(/[，。；、]{2,}/g, '，')
    .replace(/^[，。；、]+|[，。；、]+$/g, '')
    .replace(/(，\s*)+/g, '，')
    .trim()
}

function clipText(text: string, maxLength: number): string {
  const normalized = collapseText(text)
  if (!normalized) return ''
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, Math.max(18, maxLength - 1)).trim()}…`
}

function splitBulletLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^- /, '').trim())
    .filter(Boolean)
}

function splitNameList(text: string): string[] {
  return text
    .split(/[、,，/｜|]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export type PromptAnchors = {
  sellingPremise: string
  coreDislocation: string
  emotionalPayoff: string
  worldBackground: string
  keyCharacters: string[]
  characterLayers: string[]
  relationAnchors: string[]
  roleCards: string[]
  movement: string[]
  synopsis: string
}

export function buildPromptAnchors(generationBriefText: string): PromptAnchors {
  return {
    sellingPremise: extractSection(generationBriefText, '设定成交句'),
    coreDislocation: extractSection(generationBriefText, '核心错位'),
    emotionalPayoff: extractSection(generationBriefText, '情绪兑现'),
    worldBackground: stripNoisyThemeClauses(
      extractSection(generationBriefText, '世界观与故事背景')
    ),
    keyCharacters: splitNameList(extractSection(generationBriefText, '关键角色')).slice(0, 6),
    characterLayers: splitBulletLines(extractSection(generationBriefText, '人物分层')).slice(0, 6),
    relationAnchors: splitBulletLines(extractSection(generationBriefText, '人物关系总梳理')).slice(
      0,
      8
    ),
    roleCards: splitBulletLines(extractSection(generationBriefText, '角色卡'))
      .map((item) => stripNoisyThemeClauses(item))
      .filter(Boolean)
      .slice(0, 6),
    movement: [
      extractSection(generationBriefText, '主线欲望线'),
      extractSection(generationBriefText, '总阻力线'),
      extractSection(generationBriefText, '代价升级线'),
      extractSection(generationBriefText, '关系杠杆线'),
      extractSection(generationBriefText, '钩子承接线')
    ]
      .map((item) => stripNoisyThemeClauses(item))
      .filter(Boolean),
    synopsis: stripNoisyThemeClauses(extractSection(generationBriefText, '串联简介'))
  }
}

export function renderAnchorBlock(generationBriefText: string): string {
  const anchors = buildPromptAnchors(generationBriefText)
  const characterLayers = anchors.characterLayers
    .slice(0, 4)
    .map((item) => clipText(item, 34))
    .filter(Boolean)
  const relationAnchors = anchors.relationAnchors
    .slice(0, 5)
    .map((item) => clipText(item, 34))
    .filter(Boolean)
  const roleCards = anchors.roleCards
    .slice(0, 4)
    .map((item) => clipText(item, 36))
    .filter(Boolean)
  const movement = anchors.movement
    .slice(0, 4)
    .map((item) => clipText(item, 42))
    .filter(Boolean)

  return [
    `设定成交句：${clipText(anchors.sellingPremise, 64) || '待补'}`,
    `核心错位：${clipText(anchors.coreDislocation, 64) || '待补'}`,
    `情绪兑现：${clipText(anchors.emotionalPayoff, 56) || '待补'}`,
    `世界底板：${clipText(anchors.worldBackground, 88) || '待补'}`,
    `关键角色：${anchors.keyCharacters.join('、') || '待补'}`,
    `人物分层：${characterLayers.join('；') || '待补'}`,
    `关系杠杆：${relationAnchors.join('；') || '待补'}`,
    `角色抓手：${roleCards.join('；') || '待补'}`,
    `推进合同：${movement.join('；') || '待补'}`,
    `串联简介：${clipText(anchors.synopsis, 96) || '待补'}`
  ].join('\n')
}
