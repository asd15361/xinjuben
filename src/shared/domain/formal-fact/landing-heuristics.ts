import type { FormalFact } from '../../contracts/workflow'

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text))
}

export function matchFormalFactLandingHeuristic(fact: FormalFact, normalizedText: string): boolean {
  const label = fact.label.trim()
  const description = fact.description.trim()

  if (label === '对手压力') {
    const opponentName = description.match(/([一-龥]{2,4})/)?.[1] || ''
    const opponentMatched = opponentName ? normalizedText.includes(opponentName) : /对手|恶霸|反派/.test(normalizedText)
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
    const masterName = description.match(/([一-龥]{2,4})/)?.[1] || ''
    const roleMatched = masterName ? normalizedText.includes(masterName) : /师父/.test(normalizedText)
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

  return false
}
