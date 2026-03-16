import type { ScriptRuntimeFailureHistoryCode } from '../../contracts/script-generation'

export function classifyRuntimeFailureHistory(input: {
  reason?: string
  errorMessage?: string
}): ScriptRuntimeFailureHistoryCode {
  const merged = `${input.reason || ''} ${input.errorMessage || ''}`

  if (/parse|解析|json|格式|结构/i.test(merged)) return 'parse_interrupted'
  if (/coverage|不足|缺失|为空|empty|formal_fact_not_landed|anchor_missing/i.test(merged)) {
    return 'draft_coverage_insufficient'
  }
  return 'runtime_interrupted'
}
