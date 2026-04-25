import type { StoryIntentPackageDto } from '@shared/contracts/intake'
import type { CharacterDraftDto } from '@shared/contracts/workflow'
import { parseStructuredGenerationBrief } from './summarize-chat-for-generation-support'

type BriefCharacterCard = { name?: string; summary?: string }
type BriefCharacterLayer = { name?: string; layer?: string; duty?: string }

const GENERIC_FIELD_PATTERNS = [
  /表面带着自己最容易被看到的角色样子/,
  /背后压着一条会影响主线的私人压力/,
  /最怕自己所在的位置被直接夺走/,
  /有自己一定要守的关系或立场/,
  /一旦自己的软肋被碰到，就会改变站位/,
  /对主线有独特作用/,
  /一旦站位被看穿就容易反噬/,
  /把自己手里的那条主线杠杆真正用起来/,
  /从局内人变成真正改变局面的关键杠杆/,
  /现在最大的压力，是一旦跟.+这条冲突线绑死/,
  /最怕自己被彻底卷进主线以后/,
  /想守住自己还能掌控的那点位置/,
  /只要有人逼他在.+之间明确站队/,
  /不再只当别人推动剧情的背景板/,
  /会从被局势裹着走，变成能把局面往前拱一把/,
  /^对主线有独特作用$/,
  /^一旦站位被看穿就容易反噬$/,
  /表面像一股越来越近的外压/,
  /不是站队角色/,
  /不会替任何人守体面/,
  /把外压推上台面/,
  /实质灾难/,
  /不需要讲情分也不需要讲规矩/,
  /把这条线里的漏洞和代价全部逼出来/,
  /最怕的不是输赢/,
  /被提前压回去/,
  /真正受什么吸引/,
  /凶性就能被提前引爆或反关/
]

function cleanText(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[，。；、]+|[，。；、]+$/g, '')
    .trim()
}

function isGenericField(value: string): boolean {
  const text = cleanText(value)
  return !text || GENERIC_FIELD_PATTERNS.some((pattern) => pattern.test(text))
}

function pickKeyAsset(text: string): string {
  if (text.includes('钥匙')) return '钥匙'
  if (text.includes('秘宝')) return '秘宝'
  if (text.includes('证据')) return '证据'
  return '关键底牌'
}

function pickWorldThreat(text: string): string {
  if (text.includes('蛇子')) return '蛇子'
  if (text.includes('妖兽')) return '妖兽危机'
  if (text.includes('宗门')) return '宗门压力'
  return '外部压力'
}

function pickPressureSource(text: string, fallback: string): string {
  if (text.includes('李科')) return '李科'
  if (text.includes('对手')) return '对手'
  return normalizePressureSource(fallback)
}

function normalizePressureSource(value: string): string {
  const text = cleanText(value)
  if (!text) return '对手阵营'
  if (/^(反派|对手|敌人|名门正派大小姐|反派大小姐|真女主|女主)$/u.test(text)) {
    return '对手阵营'
  }
  return text
}

function firstClause(text: string): string {
  return cleanText(text.split(/[。！？]/)[0] || text)
}

function buildV2FallbackFields(input: {
  name: string
  summary: string
  layer: string
  protagonist: string
  antagonist: string
}): Pick<CharacterDraftDto, 'appearance' | 'personality' | 'identity' | 'values' | 'plotFunction'> {
  const summary = cleanText(input.summary)
  const shortSummary = firstClause(summary) || `${input.name}是局中关键人物`
  const roleHint = input.layer.includes('情感')
    ? '情感杠杆角色'
    : input.layer.includes('规则')
      ? '规则杠杆角色'
      : '局中行动角色'

  return {
    appearance: `${input.name}给人的第一印象是带着压场气息的关键人物，外形与穿着都服务于其在局中的功能位置。`,
    personality: `${input.name}在高压局面里偏向谨慎观察、临场应对，也会在触及自身立场时迅速做出反击。`,
    identity: shortSummary,
    values: input.antagonist
      ? `更看重在${input.protagonist || '主角'}与${input.antagonist}的对撞里保住自己认定的立场与筹码。`
      : `更看重在主线冲突里守住自己认定的立场与筹码。`,
    plotFunction: `${input.name}承担${roleHint}，负责把当前局面继续往前推，而不是只做背景板。`
  }
}

function buildEmotionLeverDraft(input: {
  name: string
  summary: string
  protagonist: string
  antagonist: string
}): Partial<CharacterDraftDto> {
  const pressureSource = pickPressureSource(input.summary, input.antagonist)
  return {
    publicMask: `表面是${firstClause(input.summary)}。`,
    hiddenPressure: `${input.name}一边被${pressureSource}盯上，一边会因为和${input.protagonist || '主角'}的关系变化把局面越推越险。`,
    fear: `最怕自己被人强行夺走，也最怕把${input.protagonist || '主角'}一起拖进更深的险局。`,
    protectTarget: '想守住自己的选择、体面和还能信人的那口气。',
    conflictTrigger: `只要${pressureSource}再拿她当筹码，或${input.protagonist || '主角'}因为她受伤，她就会被逼得重新站位。`,
    advantage: `${input.name}最能撬动的不是硬实力，而是关系温度、信任变化和别人不敢轻放的情感代价。`,
    weakness: `${input.name}一旦真把心和命门交出去，就最容易被${pressureSource}顺着这条线拿来逼${input.protagonist || '主角'}。`,
    goal: '先活下来，再看清谁才是真正值得靠近的人。',
    arc: `${input.name}会从看不懂${input.protagonist || '主角'}，走到被其隐忍和智慧真正打动，最后变成逼出主线选择的情感杠杆。`
  }
}

function buildRuleLeverDraft(input: {
  name: string
  summary: string
  protagonist: string
  generationBriefText: string
}): Partial<CharacterDraftDto> {
  const asset = pickKeyAsset(input.generationBriefText)
  const worldThreat = pickWorldThreat(input.generationBriefText)
  return {
    publicMask: `表面是${firstClause(input.summary)}。`,
    hiddenPressure: `${input.name}既要压住${worldThreat}，也要盯着${input.protagonist || '主角'}把${asset}这条传承线走明白。`,
    fear: `最怕${worldThreat}提前失控，也最怕${input.protagonist || '主角'}在没悟透前就被逼着亮底。`,
    protectTarget: `想守住${worldThreat}的边界、${input.protagonist || '主角'}这条传承线，以及${asset}背后的规矩。`,
    conflictTrigger: `只要${worldThreat}越线，或有人逼近${asset}和${input.protagonist || '主角'}，她就会出手改局。`,
    advantage: `${input.name}真正的优势，是比任何人都更早看清${asset}和${worldThreat}背后的规矩与次序。`,
    weakness: `${input.name}最大的短板，是一旦必须提前亮明规矩和底线，自己多年压住的布局就会被迫提早翻面。`,
    goal: `压住${worldThreat}，同时把${input.protagonist || '主角'}真正送到该领悟的位置上。`,
    arc: `${input.name}会从幕后镇守和布规矩，走到在关键时刻直接改写局面，把传承的真意推到台前。`
  }
}

function buildGeneralLeverDraft(input: {
  name: string
  summary: string
  protagonist: string
  antagonist: string
}): Partial<CharacterDraftDto> {
  const pressureSource = pickPressureSource(input.summary, input.antagonist)
  const protagonist = input.protagonist || '主角'
  return {
    publicMask: `表面是${firstClause(input.summary)}。`,
    hiddenPressure: `${input.name}夹在职责、规矩和${pressureSource}的外压之间，任何一次误判都会把自己推到台前。`,
    fear: `最怕${pressureSource}把责任推到自己身上，也怕${protagonist}的秘密在自己手里失控。`,
    protectTarget: `想守住自己的职责边界、规矩解释权和还能保持判断的余地。`,
    conflictTrigger: `当${pressureSource}越过他负责的规矩，或把${protagonist}的风险强压到他头上时，他会被迫表态。`,
    advantage: `${input.name}掌握具体流程、门路或现场信息，能决定一件事是被压下去还是被推上台面。`,
    weakness: `${input.name}过度依赖位置和规矩，一旦外压绕过程序，他的判断就容易慢半拍。`,
    goal: `先保住自己负责的秩序，再在关键节点判断该压住谁、放过谁。`,
    arc: `${input.name}会从只按规矩办事，走到必须承担一次真实站位的代价。`
  }
}

function buildSynthesizedDraft(input: {
  name: string
  summary: string
  layer: string
  protagonist: string
  antagonist: string
  generationBriefText: string
}): Partial<CharacterDraftDto> {
  if (input.layer.includes('情感')) {
    return buildEmotionLeverDraft(input)
  }
  if (input.layer.includes('规则')) {
    return buildRuleLeverDraft(input)
  }
  return buildGeneralLeverDraft(input)
}

function shouldForceEmotionRewrite(character: CharacterDraftDto, summary: string): boolean {
  const text = `${character.name} ${character.biography} ${summary}`
  return /少女|小柔|苏婉/.test(text) || /筹码/.test(text)
}

export function enrichCharacterDrafts(input: {
  characters: CharacterDraftDto[]
  storyIntent: StoryIntentPackageDto
  generationBriefText: string
}): CharacterDraftDto[] {
  const structured = parseStructuredGenerationBrief(input.generationBriefText)
  const brief =
    structured?.generationBrief && typeof structured.generationBrief === 'object'
      ? (structured.generationBrief as {
          characterCards?: BriefCharacterCard[]
          characterLayers?: BriefCharacterLayer[]
        })
      : null
  const cards = Array.isArray(brief?.characterCards) ? brief.characterCards : []
  const layers = Array.isArray(brief?.characterLayers) ? brief.characterLayers : []

  return input.characters.map((character) => {
    const card = cards.find((item) => cleanText(item.name || '') === character.name)
    const layer = cleanText(
      layers.find((item) => cleanText(item.name || '') === character.name)?.layer || ''
    )
    const summary = cleanText(card?.summary || character.biography)
    if (!summary) return character

    const isProtagonist =
      cleanText(character.name) === cleanText(input.storyIntent.protagonist || '')
    const isAntagonist = cleanText(character.name) === cleanText(input.storyIntent.antagonist || '')
    const rewriteAsEmotion =
      !isProtagonist && !isAntagonist && shouldForceEmotionRewrite(character, summary)

    const synthesized = rewriteAsEmotion
      ? buildEmotionLeverDraft({
          name: character.name,
          summary,
          protagonist: input.storyIntent.protagonist || '',
          antagonist: input.storyIntent.antagonist || ''
        })
      : buildSynthesizedDraft({
          name: character.name,
          summary,
          layer,
          protagonist: input.storyIntent.protagonist || '',
          antagonist: input.storyIntent.antagonist || '',
          generationBriefText: input.generationBriefText
        })

    const v2Fallback = buildV2FallbackFields({
      name: character.name,
      summary,
      layer,
      protagonist: input.storyIntent.protagonist || '',
      antagonist: input.storyIntent.antagonist || ''
    })

    return {
      ...character,
      biography: cleanText(character.biography) || summary,
      appearance: cleanText(character.appearance || '') || cleanText(v2Fallback.appearance || ''),
      personality:
        cleanText(character.personality || '') || cleanText(v2Fallback.personality || ''),
      identity: cleanText(character.identity || '') || cleanText(v2Fallback.identity || ''),
      values: cleanText(character.values || '') || cleanText(v2Fallback.values || ''),
      plotFunction:
        cleanText(character.plotFunction || '') || cleanText(v2Fallback.plotFunction || ''),
      publicMask:
        rewriteAsEmotion || isGenericField(character.publicMask)
          ? cleanText(synthesized.publicMask || '')
          : character.publicMask,
      hiddenPressure:
        isGenericField(character.hiddenPressure) || rewriteAsEmotion
          ? cleanText(synthesized.hiddenPressure || '')
          : character.hiddenPressure,
      fear:
        isGenericField(character.fear) || rewriteAsEmotion
          ? cleanText(synthesized.fear || '')
          : character.fear,
      protectTarget:
        isGenericField(character.protectTarget) || rewriteAsEmotion
          ? cleanText(synthesized.protectTarget || '')
          : character.protectTarget,
      conflictTrigger:
        isGenericField(character.conflictTrigger) || rewriteAsEmotion
          ? cleanText(synthesized.conflictTrigger || '')
          : character.conflictTrigger,
      advantage:
        isGenericField(character.advantage) || rewriteAsEmotion
          ? cleanText(synthesized.advantage || '')
          : character.advantage,
      weakness:
        isGenericField(character.weakness) || rewriteAsEmotion
          ? cleanText(synthesized.weakness || '')
          : character.weakness,
      goal:
        isGenericField(character.goal) || rewriteAsEmotion
          ? cleanText(synthesized.goal || '')
          : character.goal,
      arc:
        isGenericField(character.arc) || rewriteAsEmotion
          ? cleanText(synthesized.arc || '')
          : character.arc
    }
  })
}
