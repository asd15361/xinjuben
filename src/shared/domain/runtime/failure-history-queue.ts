import type { ScriptRuntimeFailureHistoryCode } from '../../contracts/script-generation'

const MAX_FAILURE_HISTORY = 5

export function appendRuntimeFailureHistory(
  current: ScriptRuntimeFailureHistoryCode[],
  next: ScriptRuntimeFailureHistoryCode
): ScriptRuntimeFailureHistoryCode[] {
  const normalized = [...current]
  if (normalized[normalized.length - 1] !== next) {
    normalized.push(next)
  }
  return normalized.slice(-MAX_FAILURE_HISTORY)
}

export function resetRuntimeFailureHistory(): ScriptRuntimeFailureHistoryCode[] {
  return []
}
