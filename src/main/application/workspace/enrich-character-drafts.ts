import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import type { CharacterDraftDto } from '../../../shared/contracts/workflow'
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
  /^一旦站位被看穿就容易反噬$/
]

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/^[，。；、]+|[，。；、]+$/g, '').trim()
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
  return fallback || '对手'
}

function firstClause(text: string): string {
  return cleanText(text.split(/[。！？]/)[0] || text)
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
  return {
    publicMask: `表面是${firstClause(input.summary)}。`,
    hiddenPressure: `${input.name}现在最大的压力，是一旦跟${input.protagonist || '主角'}和${pressureSource}这条冲突线绑死，就很难再退回场外。`,
    fear: `最怕自己被彻底卷进主线以后，再也没有回头余地。`,
    protectTarget: `想守住自己还能掌控的那点位置，不愿被人随手当成工具。`,
    conflictTrigger: `只要有人逼他在${input.protagonist || '主角'}和${pressureSource}之间明确站队，他就必须出动作。`,
    advantage: `${input.name}手里通常握着别人一时看不到的门路、位置或局中信息。`,
    weakness: `${input.name}最怕自己的真实立场被提前揭开，一旦被看穿就会马上失去回旋余地。`,
    goal: `把自己手里的那一截局面真正攥稳，不再只当别人推动剧情的背景板。`,
    arc: `${input.name}会从被局势裹着走，变成能把局面往前拱一把的关键杠杆。`
  }
}

function buildExternalPressureDraft(input: {
  name: string
  summary: string
  protagonist: string
  antagonist: string
  generationBriefText: string
  layer?: string
}): Partial<CharacterDraftDto> {
  const asset = pickKeyAsset(input.generationBriefText)
  return {
    publicMask: `${input.name}表面像一股越来越近的外压，不跟任何人讲道理。`,
    hiddenPressure: `${input.name}不是站队角色，而是会顺着${asset}和局势裂口不断放大代价，谁失手它就咬谁。`,
    fear: `${input.name}最怕的不是输赢，而是自己真正被看穿和被提前压回去。`,
    protectTarget: `${input.name}只会守自己的扩张节奏和外压边界，不会替任何人守体面。`,
    conflictTrigger: `只要${input.antagonist || '对手'}继续逼近${asset}，或${input.protagonist || '主角'}亮底过猛，${input.name}就会立刻把外压推上台面。`,
    advantage: `${input.name}的优势，是不需要讲情分也不需要讲规矩，只要局面露缝就能顺势把代价越撕越大。`,
    weakness: `${input.name}的短板，是一旦被人摸清它真正受什么吸引、又被什么压制，它的凶性就能被提前引爆或反关。`,
    goal: `${input.name}要把这条线里的漏洞和代价全部逼出来，让所有人都没法只靠嘴硬撑过去。`,
    arc: `${input.name}会从远处逼近的危险，变成主线后段必须正面处理的实质灾难。`
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
  if (input.layer.includes('外压')) {
    return buildExternalPressureDraft(input)
  }
  return buildGeneralLeverDraft(input)
}

function shouldForceEmotionRewrite(character: CharacterDraftDto, summary: string): boolean {
  const text = `${character.name} ${character.biography} ${summary}`
  return /少女|小柔|苏婉/.test(text) || /筹码/.test(text)
}

function shouldForceExternalRewrite(character: CharacterDraftDto, summary: string, layer: string): boolean {
  const text = `${character.name} ${character.biography} ${summary} ${layer}`
  return /妖|蛇|兽|鬼|外压/.test(text) || /不是背景板/.test(text)
}

export function enrichCharacterDrafts(input: {
  characters: CharacterDraftDto[]
  storyIntent: StoryIntentPackageDto
  generationBriefText: string
}): CharacterDraftDto[] {
  const structured = parseStructuredGenerationBrief(input.generationBriefText)
  const brief =
    structured?.generationBrief && typeof structured.generationBrief === "object"
      ? (structured.generationBrief as {
          characterCards?: BriefCharacterCard[]
          characterLayers?: BriefCharacterLayer[]
        })
      : null
  const cards = Array.isArray(brief?.characterCards) ? brief.characterCards : []
  const layers = Array.isArray(brief?.characterLayers) ? brief.characterLayers : []

  return input.characters.map((character) => {
    const card = cards.find((item) => cleanText(item.name || '') === character.name)
    const layer = cleanText(layers.find((item) => cleanText(item.name || '') === character.name)?.layer || '')
    const summary = cleanText(card?.summary || character.biography)
    if (!summary) return character

    const isProtagonist = cleanText(character.name) === cleanText(input.storyIntent.protagonist || '')
    const isAntagonist = cleanText(character.name) === cleanText(input.storyIntent.antagonist || '')
    const rewriteAsEmotion = !isProtagonist && !isAntagonist && shouldForceEmotionRewrite(character, summary)
    const rewriteAsExternal = !isProtagonist && !isAntagonist && shouldForceExternalRewrite(character, summary, layer)

    const synthesized = rewriteAsExternal
      ? buildExternalPressureDraft({
          name: character.name,
          summary,
          layer,
          protagonist: input.storyIntent.protagonist || '',
          antagonist: input.storyIntent.antagonist || '',
          generationBriefText: input.generationBriefText
        })
      : rewriteAsEmotion
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

    return {
      ...character,
      biography: cleanText(character.biography) || summary,
      publicMask:
        rewriteAsEmotion || rewriteAsExternal || isGenericField(character.publicMask)
          ? cleanText(synthesized.publicMask || '')
          : character.publicMask,
      hiddenPressure: isGenericField(character.hiddenPressure)
        || rewriteAsEmotion
        || rewriteAsExternal
        ? cleanText(synthesized.hiddenPressure || '')
        : character.hiddenPressure,
      fear: isGenericField(character.fear) || rewriteAsEmotion || rewriteAsExternal ? cleanText(synthesized.fear || '') : character.fear,
      protectTarget: isGenericField(character.protectTarget)
        || rewriteAsEmotion
        || rewriteAsExternal
        ? cleanText(synthesized.protectTarget || '')
        : character.protectTarget,
      conflictTrigger: isGenericField(character.conflictTrigger)
        || rewriteAsEmotion
        || rewriteAsExternal
        ? cleanText(synthesized.conflictTrigger || '')
        : character.conflictTrigger,
      advantage: isGenericField(character.advantage) || rewriteAsEmotion || rewriteAsExternal ? cleanText(synthesized.advantage || '') : character.advantage,
      weakness: isGenericField(character.weakness) || rewriteAsEmotion || rewriteAsExternal ? cleanText(synthesized.weakness || '') : character.weakness,
      goal: isGenericField(character.goal) || rewriteAsEmotion || rewriteAsExternal ? cleanText(synthesized.goal || '') : character.goal,
      arc: isGenericField(character.arc) || rewriteAsEmotion || rewriteAsExternal ? cleanText(synthesized.arc || '') : character.arc
    }
  })
}
