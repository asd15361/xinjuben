import type { FormalFact } from '../../contracts/workflow'

function hasText(value: string | undefined): boolean {
  return Boolean(value && value.trim())
}

export function matchFormalFactLandingHeuristic(
  fact: FormalFact,
  normalizedSegments: string
): boolean {
  if (!hasText(fact.label) && !hasText(fact.description)) return false
  const merged = `${fact.label} ${fact.description}`.trim()
  if (!merged) return false
  const keywordMatch = merged.match(/[\u4e00-\u9fff]{2,8}|[a-z0-9]{3,}/g) || []
  const strongKeywords = keywordMatch.filter((token) => token.length >= 2)
  if (strongKeywords.length === 0) return false
  let hits = 0
  for (const keyword of strongKeywords) {
    if (normalizedSegments.includes(keyword.toLowerCase())) {
      hits += 1
      if (hits >= 2) return true
    }
  }
  return false
}
