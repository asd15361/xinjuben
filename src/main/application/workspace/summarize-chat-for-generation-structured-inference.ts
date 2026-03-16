import type { GenerationBriefCharacterLayer } from './generation-brief-template'
import { extractNamesFromText, toText, uniqueList } from './summarize-chat-for-generation-shared'
import {
  findCharacterCard,
  type StructuredBriefSections
} from './summarize-chat-for-generation-structured-parser'

export function pickProtectTarget(sections: StructuredBriefSections): string {
  const protagonistCard = findCharacterCard(sections.characterCards, sections.protagonist)
  const candidateTexts = [
    protagonistCard?.summary || '',
    sections.sectionMap.get('串联简介') || '',
    ...sections.relationSummary
  ]

  for (const text of candidateTexts) {
    const hit =
      text.match(/喜欢([一-龥]{2,4})/)?.[1] ||
      text.match(/守护着?([一-龥]{2,8})/)?.[1] ||
      text.match(/为救([一-龥]{2,8})/)?.[1] ||
      text.match(/最想护住([一-龥]{2,8})/)?.[1]
    if (hit) return hit
  }

  for (const line of sections.relationSummary) {
    if (!sections.protagonist || !line.includes(sections.protagonist)) continue
    const names = extractNamesFromText(line).filter((name) => name !== sections.protagonist)
    if (names.length > 0) return names[0]
  }

  return ''
}

export function pickKeyAsset(sections: StructuredBriefSections): string {
  const candidateTexts = [
    sections.sectionMap.get('串联简介') || '',
    sections.sectionMap.get('核心冲突') || '',
    ...sections.characterCards.map((item) => item.summary)
  ]
  const assetKeywords = ['钥匙', '秘宝', '密库', '法器', '婚约', '证据', '秘卷']

  for (const text of candidateTexts) {
    for (const keyword of assetKeywords) {
      if (text.includes(keyword)) return keyword
    }
  }

  return ''
}

export function pickThemeAnchor(sections: StructuredBriefSections): string {
  const text = [sections.sectionMap.get('串联简介') || '', ...sections.softUnderstanding, ...sections.characterCards.map((item) => item.summary)].join(' ')
  const candidates = ['谦卦', '不争', '大道', '隐忍', '智慧', '守护', '反转成长']
  return candidates.find((item) => text.includes(item)) || ''
}

export function pickWorldPressure(sections: StructuredBriefSections): string {
  const text = [sections.sectionMap.get('世界观与故事背景') || '', sections.sectionMap.get('串联简介') || ''].join(' ')
  const worldKeywords = ['妖兽', '蛇子', '宗门', '道观', '门阀', '皇权', '家族', '世家', '朝堂']
  const hit = worldKeywords.find((item) => text.includes(item))
  if (!hit) return ''
  if (hit === '蛇子') return '蛇子苏醒会把暗线危险一层层推到台前'
  if (hit === '妖兽') return '妖兽威胁会不断放大外部压力'
  return `${hit}层面的规则和压力会不断挤压主角的选择空间`
}

function inferSeasonDesireLine(sections: StructuredBriefSections): string {
  const explicit = toText(sections.sectionMap.get('主线欲望线'))
  if (explicit && explicit !== '待补') return explicit

  const protectTarget = pickProtectTarget(sections)
  const keyAsset = pickKeyAsset(sections)
  const theme = pickThemeAnchor(sections)
  const pieces = [
    sections.protagonist ? `${sections.protagonist}表面先藏锋隐忍` : '主角表面先藏锋隐忍',
    protectTarget ? `内里最想守住${protectTarget}` : '',
    keyAsset ? `也要守住${keyAsset}背后的真相` : '',
    '并在不断升级的逼压里完成真正反转',
    theme ? `最后把主题落回“${theme}”` : ''
  ].filter(Boolean)

  return pieces.join('，') || `${sections.protagonist || '主角'}先守人守物，再完成反转成长。`
}

function inferSeasonResistanceLine(sections: StructuredBriefSections): string {
  const explicit = toText(sections.sectionMap.get('总阻力线'))
  if (explicit && explicit !== '待补') return explicit

  const protectTarget = pickProtectTarget(sections)
  const keyAsset = pickKeyAsset(sections)
  const worldPressure = pickWorldPressure(sections)
  const pieces = [
    sections.antagonist ? `${sections.antagonist}会围绕${protectTarget || '主角软肋'}和${keyAsset || '关键底牌'}持续施压` : '',
    worldPressure,
    '把主角一步步逼到不得不亮底'
  ].filter(Boolean)

  return pieces.join('，') || `${sections.antagonist || '对手'}会持续施压，把主角逼到不得不亮底。`
}

function inferSeasonCostLine(sections: StructuredBriefSections): string {
  const explicit = toText(sections.sectionMap.get('代价升级线'))
  if (explicit && explicit !== '待补') return explicit

  const protectTarget = pickProtectTarget(sections)
  const theme = pickThemeAnchor(sections)
  const pieces = [
    sections.protagonist ? `${sections.protagonist}每往前推进一步` : '主角每往前推进一步',
    '都要承担身份暴露、关系受伤、藏锋失效的代价',
    protectTarget ? `尤其会把${protectTarget}也卷进更深的危险` : '',
    theme ? `并被迫重新理解“${theme}”到底怎么落地` : ''
  ].filter(Boolean)

  return pieces.join('，')
}

function inferRelationshipLeverLine(sections: StructuredBriefSections): string {
  const explicit = toText(sections.sectionMap.get('关系杠杆线'))
  if (explicit && explicit !== '待补') return explicit

  const protectTarget = pickProtectTarget(sections)
  const mentor = sections.keyCharacters.find(
    (name) =>
      name !== sections.protagonist &&
      name !== sections.antagonist &&
      !!findCharacterCard(sections.characterCards, name)?.summary.match(/师父|传承|救下|交给/)
  )
  const pieces = [
    sections.antagonist && protectTarget
      ? `${sections.antagonist}会拿${protectTarget}去逼${sections.protagonist || '主角'}交出底牌`
      : '',
    mentor ? `${mentor}既是传承来源，也是会改写局势的规则杠杆` : '',
    sections.relationSummary[0] || ''
  ].filter(Boolean)

  return pieces.join('；') || `${sections.protagonist || '主角'}与${sections.antagonist || '对手'}形成主压强关系，关键人物会反复被拿来施压与反制。`
}

function inferHookChainLine(sections: StructuredBriefSections): string {
  const explicit = toText(sections.sectionMap.get('钩子承接线'))
  if (explicit && explicit !== '待补') return explicit

  const unresolved = uniqueList(
    [
      pickKeyAsset(sections) ? `${pickKeyAsset(sections)}真相` : '',
      pickProtectTarget(sections) ? `${pickProtectTarget(sections)}安危` : '',
      pickWorldPressure(sections) ? pickWorldPressure(sections).replace(/会.+$/, '') : '',
      pickThemeAnchor(sections) ? `${pickThemeAnchor(sections)}的真正代价` : ''
    ].filter(Boolean),
    4
  )

  if (unresolved.length > 0) {
    return `每一集结尾都从${unresolved.join('、')}这些还没解决的麻烦里继续挂钩，把下一步动作逼出来。`
  }

  return '每一集的结尾都要从上一轮没解决的冲突里继续挂钩，把下一个动作逼出来。'
}

function inferCharacterDuty(name: string, sections: StructuredBriefSections): { layer: string; duty: string } {
  if (name === sections.protagonist) {
    return {
      layer: '主驱动层',
      duty: '负责扛住主线欲望、做关键选择，并把主题真正走出来'
    }
  }

  if (name === sections.antagonist) {
    return {
      layer: '主阻力层',
      duty: '负责持续施压，让主角每次推进都要付出更大代价'
    }
  }

  const summary = findCharacterCard(sections.characterCards, name)?.summary || ''
  if (/师父|传承|交给|救下|镇守/.test(summary)) {
    return {
      layer: '规则杠杆层',
      duty: '负责提供传承、旧规矩或关键外力，一出手就能改写局面'
    }
  }

  if (/喜欢|不喜欢|善良|所爱|守护/.test(summary)) {
    return {
      layer: '情感杠杆层',
      duty: '负责拉动主角情感选择，让关系变化直接变成推进压力'
    }
  }

  return {
    layer: '关键杠杆层',
    duty: '负责把主线里的某条关系、秘密或局势再往前推一步'
  }
}

function inferCharacterLayers(sections: StructuredBriefSections): GenerationBriefCharacterLayer[] {
  return sections.keyCharacters.map((name) => ({
    name,
    ...inferCharacterDuty(name, sections)
  }))
}

export function inferChainFromStructuredSections(sections: StructuredBriefSections): {
  seasonDesireLine: string
  seasonResistanceLine: string
  seasonCostLine: string
  relationshipLeverLine: string
  hookChainLine: string
} {
  return {
    seasonDesireLine: inferSeasonDesireLine(sections),
    seasonResistanceLine: inferSeasonResistanceLine(sections),
    seasonCostLine: inferSeasonCostLine(sections),
    relationshipLeverLine: inferRelationshipLeverLine(sections),
    hookChainLine: inferHookChainLine(sections)
  }
}

export function inferCharacterLayersFromSections(sections: StructuredBriefSections): GenerationBriefCharacterLayer[] {
  return inferCharacterLayers(sections)
}
