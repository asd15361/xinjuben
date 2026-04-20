import type { ScriptGenerationMode } from '@shared/contracts/script-generation'

export function clampTargetEpisodes(targetEpisodes: number | undefined): number {
  if (!targetEpisodes || !Number.isFinite(targetEpisodes)) return 10
  return Math.max(1, Math.min(80, Math.floor(targetEpisodes)))
}

export function resolveMode(mode: ScriptGenerationMode | undefined, existingSceneCount: number): ScriptGenerationMode {
  if (mode) return mode
  return existingSceneCount > 0 ? 'resume' : 'fresh_start'
}