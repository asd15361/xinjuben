export const OUTLINE_BUNDLE_ESTIMATED_SECONDS = 104
export const DETAILED_OUTLINE_ESTIMATED_SECONDS_PER_EPISODE = 30
export const SCRIPT_ESTIMATED_SECONDS_DEFAULT = 110
export const SCRIPT_ESTIMATED_SECONDS_PER_EPISODE = 11

export function resolveOutlineBundleEstimatedSeconds(): number {
  return OUTLINE_BUNDLE_ESTIMATED_SECONDS
}

export function resolveDetailedOutlineEstimatedSeconds(targetEpisodes: number): number {
  const normalizedTargetEpisodes = Math.max(1, Math.floor(targetEpisodes || 0))
  return normalizedTargetEpisodes * DETAILED_OUTLINE_ESTIMATED_SECONDS_PER_EPISODE
}

export function resolveScriptEstimatedSeconds(targetEpisodes: number): number {
  const normalizedTargetEpisodes = Math.max(1, Math.floor(targetEpisodes || 0))
  return Math.max(
    SCRIPT_ESTIMATED_SECONDS_DEFAULT,
    normalizedTargetEpisodes * SCRIPT_ESTIMATED_SECONDS_PER_EPISODE
  )
}
