function extractSection(text: string, title: string): string {
  const match = text.match(new RegExp(`【${title}】([\\s\\S]*?)(?=【[^】]+】|$)`))
  return match?.[1]?.trim() || ''
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
    keyCharacters: splitNameList(extractSection(generationBriefText, '关键角色')).slice(0, 6),
    characterLayers: splitBulletLines(extractSection(generationBriefText, '人物分层')).slice(0, 6),
    relationAnchors: splitBulletLines(extractSection(generationBriefText, '人物关系总梳理')).slice(0, 8),
    roleCards: splitBulletLines(extractSection(generationBriefText, '角色卡')).slice(0, 6),
    movement: [
      extractSection(generationBriefText, '主线欲望线'),
      extractSection(generationBriefText, '总阻力线'),
      extractSection(generationBriefText, '代价升级线'),
      extractSection(generationBriefText, '关系杠杆线'),
      extractSection(generationBriefText, '钩子承接线')
    ].filter(Boolean),
    synopsis: extractSection(generationBriefText, '串联简介')
  }
}

export function renderAnchorBlock(generationBriefText: string): string {
  const anchors = buildPromptAnchors(generationBriefText)
  return [
    `设定成交句：${anchors.sellingPremise || '待补'}`,
    `核心错位：${anchors.coreDislocation || '待补'}`,
    `情绪兑现：${anchors.emotionalPayoff || '待补'}`,
    `关键角色：${anchors.keyCharacters.join('、') || '待补'}`,
    `人物分层：${anchors.characterLayers.join('；') || '待补'}`,
    `关系杠杆：${anchors.relationAnchors.join('；') || '待补'}`,
    `角色卡：${anchors.roleCards.join('；') || '待补'}`,
    `推进合同：${anchors.movement.join('；') || '待补'}`,
    `串联简介：${anchors.synopsis || '待补'}`
  ].join('\n')
}
