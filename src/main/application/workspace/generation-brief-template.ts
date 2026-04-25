export interface GenerationBriefCharacterCard {
  name: string
  summary: string
}

export interface GenerationBriefCharacterLayer {
  name: string
  layer: string
  duty: string
}

export interface GenerationBriefPackage {
  projectTitle: string
  episodeCount: number
  genreAndStyle: string
  sellingPremise: string
  coreDislocation: string
  emotionalPayoff: string
  worldAndBackground: string
  protagonist: string
  antagonist: string
  coreConflict: string
  endingDirection: string
  keyCharacters: string[]
  chainSynopsis: string
  characterCards: GenerationBriefCharacterCard[]
  characterLayers: GenerationBriefCharacterLayer[]
  seasonDesireLine: string
  seasonResistanceLine: string
  seasonCostLine: string
  relationshipLeverLine: string
  hookChainLine: string
  relationSummary: string[]
  softUnderstanding: string[]
  pendingConfirmations: string[]
}

function isChatNoiseLine(text: string): boolean {
  const normalized = text.trim()
  if (!normalized) return false
  return [
    /^(assistant|ai|用户|剧情执笔人|系统|xinjuben)\s*[:：]?/i,
    /^创作工作台$/,
    /^当前工序$/,
    /^灵感对话$/,
    /^剧本骨架$/,
    /^人物小传$/,
    /^详细大纲$/,
    /^剧本定稿$/,
    /^当前原则$/,
    /^清空重聊$/,
    /^发送$/,
    /^提示[:：]/,
    /^回到项目首页$/,
    /^项目[:：]/,
    /^v\d+/i
  ].some((pattern) => pattern.test(normalized))
}

function cleanLine(text: string): string {
  const cleaned = text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line && !isChatNoiseLine(line))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned
}

function cleanList(values: string[]): string[] {
  return values.map((value) => cleanLine(value)).filter(Boolean)
}

export function normalizeGenerationBriefPackage(
  input: Partial<GenerationBriefPackage>
): GenerationBriefPackage {
  return {
    projectTitle: cleanLine(input.projectTitle || '') || '未命名项目',
    episodeCount:
      Number.isFinite(input.episodeCount) && (input.episodeCount || 0) > 0
        ? Number(input.episodeCount)
        : 10,
    genreAndStyle: cleanLine(input.genreAndStyle || '') || '待补',
    sellingPremise: cleanLine(input.sellingPremise || '') || '待补',
    coreDislocation: cleanLine(input.coreDislocation || '') || '待补',
    emotionalPayoff: cleanLine(input.emotionalPayoff || '') || '待补',
    worldAndBackground: cleanLine(input.worldAndBackground || '') || '待补',
    protagonist: cleanLine(input.protagonist || '') || '待补',
    antagonist: cleanLine(input.antagonist || '') || '待补',
    coreConflict: cleanLine(input.coreConflict || '') || '待补',
    endingDirection: cleanLine(input.endingDirection || '') || '待补',
    keyCharacters: cleanList(input.keyCharacters || []),
    chainSynopsis: cleanLine(input.chainSynopsis || '') || '待补',
    characterCards: (input.characterCards || [])
      .map((item) => ({
        name: cleanLine(item.name || ''),
        summary: cleanLine(item.summary || '')
      }))
      .filter((item) => item.name && item.summary),
    characterLayers: (input.characterLayers || [])
      .map((item) => ({
        name: cleanLine(item.name || ''),
        layer: cleanLine(item.layer || ''),
        duty: cleanLine(item.duty || '')
      }))
      .filter((item) => item.name && item.layer && item.duty),
    seasonDesireLine: cleanLine(input.seasonDesireLine || '') || '待补',
    seasonResistanceLine: cleanLine(input.seasonResistanceLine || '') || '待补',
    seasonCostLine: cleanLine(input.seasonCostLine || '') || '待补',
    relationshipLeverLine: cleanLine(input.relationshipLeverLine || '') || '待补',
    hookChainLine: cleanLine(input.hookChainLine || '') || '待补',
    relationSummary: cleanList(input.relationSummary || []),
    softUnderstanding: cleanList(input.softUnderstanding || []),
    pendingConfirmations: cleanList(input.pendingConfirmations || [])
  }
}

export function renderGenerationBriefTemplate(input: Partial<GenerationBriefPackage>): string {
  const brief = normalizeGenerationBriefPackage(input)
  const lines = [
    `【项目】${brief.projectTitle}｜${brief.episodeCount}集`,
    `【题材与风格】${brief.genreAndStyle}`,
    `【设定成交句】${brief.sellingPremise}`,
    `【核心错位】${brief.coreDislocation}`,
    `【情绪兑现】${brief.emotionalPayoff}`,
    `【世界观与故事背景】${brief.worldAndBackground}`,
    `【主角】${brief.protagonist}`,
    `【对手】${brief.antagonist}`,
    `【核心冲突】${brief.coreConflict}`,
    `【结局方向】${brief.endingDirection}`,
    `【关键角色】${brief.keyCharacters.length ? brief.keyCharacters.join('、') : '待补'}`,
    `【主线欲望线】${brief.seasonDesireLine}`,
    `【总阻力线】${brief.seasonResistanceLine}`,
    `【代价升级线】${brief.seasonCostLine}`,
    `【关系杠杆线】${brief.relationshipLeverLine}`,
    `【钩子承接线】${brief.hookChainLine}`,
    `【串联简介】${brief.chainSynopsis}`,
    '【角色卡】'
  ]

  if (brief.characterCards.length > 0) {
    lines.push(...brief.characterCards.map((item) => `- ${item.name}：${item.summary}`))
  } else {
    lines.push('- 待补：待补')
  }

  lines.push('【人物分层】')
  if (brief.characterLayers.length > 0) {
    lines.push(
      ...brief.characterLayers.map((item) => `- ${item.name}｜${item.layer}｜${item.duty}`)
    )
  } else {
    lines.push('- 待补')
  }

  lines.push('【人物关系总梳理】')
  if (brief.relationSummary.length > 0) {
    lines.push(...brief.relationSummary.map((item) => `- ${item}`))
  } else {
    lines.push('- 待补')
  }

  lines.push('【软理解】')
  if (brief.softUnderstanding.length > 0) {
    lines.push(...brief.softUnderstanding.map((item) => `- ${item}`))
  } else {
    lines.push('- 待补')
  }

  lines.push('【待确认】')
  if (brief.pendingConfirmations.length > 0) {
    lines.push(...brief.pendingConfirmations.map((item) => `- ${item}`))
  } else {
    lines.push('- 当前没有强制待确认项')
  }

  return lines.join('\n')
}
