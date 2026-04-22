import type { FormalFact } from '../../contracts/workflow'
import { getFormalFactSemanticLabel } from './semantic-label.ts'

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text))
}

function extractNamedSubject(fact: FormalFact, suffix: string): string {
  const normalizedLabel = fact.label.trim().replace(/^draft_/, '')
  if (normalizedLabel.endsWith(suffix)) {
    const fromLabel = normalizedLabel.slice(0, -suffix.length).trim()
    if (fromLabel) return fromLabel
  }

  return (
    fact.description.match(
      /^([一-龥]{2,4})(?=是|把|会|曾|正|在|被|最|当前|开始|继续|误以为|趁乱)/
    )?.[1] || ''
  )
}

export function matchFormalFactLandingHeuristic(fact: FormalFact, normalizedText: string): boolean {
  const label = getFormalFactSemanticLabel(fact)
  const combined = `${fact.label} ${fact.description}`

  if (label === '对手压力') {
    const opponentName = extractNamedSubject(fact, '施压线')
    const opponentMatched = opponentName
      ? normalizedText.includes(opponentName)
      : /对手|恶霸|反派/.test(normalizedText)
    const pressureMatched = hasAny(normalizedText, [
      /逼/,
      /压/,
      /抢/,
      /夺/,
      /搜身/,
      /带走/,
      /威胁/,
      /交出来/,
      /拿来/,
      /别怪/,
      /限你/
    ])
    return opponentMatched && pressureMatched
  }

  if (label === '师父角色') {
    const masterName = extractNamedSubject(fact, '人物锚点')
    const roleMatched = masterName
      ? normalizedText.includes(masterName)
      : /师父/.test(normalizedText)
    const influenceMatched = hasAny(normalizedText, [
      /师父/,
      /旧话/,
      /旧规矩/,
      /交代/,
      /告诫/,
      /留下/,
      /钥匙/,
      /不能动武/,
      /不可/,
      /托付/
    ])
    return roleMatched || influenceMatched
  }

  if (
    label === '身份位阶' ||
    /(排行|第十九|第十九个徒弟|第十九徒|最小徒弟|最末位徒弟|小徒弟)/.test(combined)
  ) {
    const subject =
      fact.label.match(/^([一-龥]{2,4})(?=排行|第十九|最小徒弟|第十九徒)/)?.[1] ||
      fact.description.match(/^([一-龥]{2,4})(?=是|为)/)?.[1] ||
      ''
    const subjectMatched = subject ? normalizedText.includes(subject) : true
    const identityMatched = hasAny(normalizedText, [
      /第十九个徒弟/,
      /第十九徒/,
      /排行第十九/,
      /排行十九/,
      /最小徒弟/,
      /最末位徒弟/,
      /小徒弟/,
      /李诚阳的第十九个徒弟/,
      /黎明是李诚阳的第十九个徒弟/
    ])
    const pressureMatched = hasAny(normalizedText, [
      /轻视/,
      /看轻/,
      /羞辱/,
      /嘲/,
      /点名/,
      /按排行/,
      /没资格/,
      /先退/,
      /先跪/,
      /挡住/,
      /压他/,
      /压资格/,
      /拿.*徒弟/,
      /叫他.*第十九/,
      /最小的徒弟也敢/
    ])
    return subjectMatched && (identityMatched || pressureMatched)
  }

  if (/隐忍|藏锋|装弱|不亮底|先让后反咬|先忍住不出手/.test(combined)) {
    const subject =
      fact.label.match(/^([一-龥]{2,4})(?=隐忍|藏锋|装弱|不亮底|先让|先忍)/)?.[1] ||
      fact.description.match(/^([一-龥]{2,4})(?=早年|表面|先|一直|总是|会|在)/)?.[1] ||
      ''
    const subjectMatched = subject ? normalizedText.includes(subject) : true
    const landingMatched = hasAny(normalizedText, [
      /隐忍/,
      /藏锋/,
      /装弱/,
      /不亮底/,
      /先忍/,
      /忍住不出手/,
      /低头赔笑/,
      /装作不会/,
      /把真本事压回去/,
      /先让一步/,
      /没有亮底/
    ])
    return subjectMatched && landingMatched
  }

  return false
}
