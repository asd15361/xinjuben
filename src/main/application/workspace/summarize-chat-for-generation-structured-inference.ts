import type { GenerationBriefCharacterLayer } from './generation-brief-template.ts'
import { extractNamesFromText, toText } from './summarize-chat-for-generation-shared.ts'
import {
  findCharacterCard,
  type StructuredBriefSections
} from './summarize-chat-for-generation-structured-parser.ts'
import {
  inferChainFromStructuredSections as inferStructuredChain,
  inferCharacterLayersFromSections as inferStructuredCharacterLayers
} from './summarize-chat-for-generation-structured-chain.ts'

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
  const text = [
    sections.sectionMap.get('串联简介') || '',
    ...sections.softUnderstanding,
    ...sections.characterCards.map((item) => item.summary)
  ].join(' ')
  const candidates = ['谦卦', '不争', '大道', '隐忍', '智慧', '守护', '反转成长']
  return candidates.find((item) => text.includes(item)) || ''
}

export function pickSellingPremise(sections: StructuredBriefSections): string {
  const explicit = toText(sections.sectionMap.get('设定成交句'))
  if (explicit && explicit !== '待补') return explicit

  const protagonist = sections.protagonist || '主角'
  const antagonist = sections.antagonist || '对手'
  const protectTarget = pickProtectTarget(sections) || '她'
  const keyAsset = pickKeyAsset(sections) || '底牌'
  const conflict = toText(sections.sectionMap.get('核心冲突'))
  const synopsis = toText(sections.sectionMap.get('串联简介'))

  if (protectTarget && keyAsset) {
    return `${protagonist}明明只想藏住${keyAsset}，偏偏${antagonist}拿${protectTarget}的命逼他当场亮底。`
  }

  if (conflict) {
    return `${protagonist}本想稳住自己那点秘密，结果一头撞上${antagonist}，被逼着${conflict.replace(/。$/, '')}。`
  }

  if (synopsis) {
    return `${protagonist}本想躲事，结果局势偏要把他推到最前面：${synopsis.replace(/。$/, '')}。`
  }

  return '待补'
}

export function pickCoreDislocation(sections: StructuredBriefSections): string {
  const explicit = toText(sections.sectionMap.get('核心错位'))
  if (explicit && explicit !== '待补') return explicit

  const synopsis = [
    sections.sectionMap.get('串联简介') || '',
    sections.sectionMap.get('核心冲突') || '',
    ...sections.relationSummary
  ].join(' ')
  const protagonist = sections.protagonist || '主角'
  const antagonist = sections.antagonist || '对手'
  const protectTarget = pickProtectTarget(sections) || '她'
  const keyAsset = pickKeyAsset(sections) || '底牌'

  if (/穿书|穿进|穿越/.test(synopsis)) {
    return `明明不是这个世界的人，却偏要在这里替自己抢回活路。`
  }
  if (/认成亲爹|认亲|亲爹|亲妈/.test(synopsis)) {
    return `最不该认亲的人被错认成至亲，关系一开口就全乱了。`
  }
  if (/豪门|妯娌|少奶奶|继承人|朝堂|世家/.test(synopsis)) {
    return `本来不该坐上桌的人，偏偏被推进最讲身份和规矩的位置上。`
  }
  if (/灵魂|太奶奶|高龄|少女身体|少年身体/.test(synopsis)) {
    return `身体是少年少女，做派和心气却像另一个世代的人，谁看都不对劲。`
  }
  if (/系统|原书|命运|国运|替身|真假/.test(synopsis)) {
    return `明明该按既定命走，偏偏有人非要把这条命改写掉。`
  }
  if (keyAsset) {
    return `最该藏住${keyAsset}的${protagonist}，偏偏被${antagonist}拿${protectTarget}逼到退无可退。`
  }
  return `${protagonist}明明该退，偏偏这一步只能往前顶。`
}

export function pickEmotionalPayoff(sections: StructuredBriefSections): string {
  const explicit = toText(sections.sectionMap.get('情绪兑现'))
  if (explicit && explicit !== '待补') return explicit

  const synopsis = [
    sections.sectionMap.get('串联简介') || '',
    ...sections.softUnderstanding,
    ...sections.characterCards.map((item) => item.summary)
  ].join(' ')
  const protectTarget = pickProtectTarget(sections) || '她'

  if (/闺蜜|并肩|联手/.test(synopsis)) return '先让观众吃到两个人并肩反打、不再各挨各打的那口爽。'
  if (/翻身|逆袭|夺回|荣耀/.test(synopsis))
    return '先让观众看到她把那口被压着的气当场吃回来，再把位置翻过去。'
  if (/守住|救人|护住/.test(synopsis))
    return `先让观众看到他宁可把自己暴露，也要把${protectTarget}护下来的那口气。`
  if (/觉醒|重启人生|站起来/.test(synopsis)) return '先让观众看到她不再忍了，真的站起来回敬这一刀。'
  return '先让观众吃到主角不再白挨打、开始反咬回去的那口爽。'
}

export function pickWorldPressure(sections: StructuredBriefSections): string {
  const text = [
    sections.sectionMap.get('世界观与故事背景') || '',
    sections.sectionMap.get('串联简介') || ''
  ].join(' ')
  const worldKeywords = ['妖兽', '蛇子', '宗门', '道观', '门阀', '皇权', '家族', '世家', '朝堂']
  const hit = worldKeywords.find((item) => text.includes(item))
  if (!hit) return ''
  if (hit === '蛇子') return '蛇子苏醒会把暗线危险一层层推到台前'
  if (hit === '妖兽') return '妖兽威胁会不断放大外部压力'
  return `${hit}层面的规则和压力会不断挤压主角的选择空间`
}

export function inferChainFromStructuredSections(sections: StructuredBriefSections): {
  seasonDesireLine: string
  seasonResistanceLine: string
  seasonCostLine: string
  relationshipLeverLine: string
  hookChainLine: string
} {
  return inferStructuredChain(sections)
}

export function inferCharacterLayersFromSections(
  sections: StructuredBriefSections
): GenerationBriefCharacterLayer[] {
  return inferStructuredCharacterLayers(sections)
}
