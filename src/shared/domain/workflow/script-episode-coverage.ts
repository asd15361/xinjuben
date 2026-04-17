import type { ScriptSegmentDto } from '../../contracts/workflow.ts'

function normalizeSceneNo(value: number | undefined): number | null {
  const sceneNo = Number(value)
  if (!Number.isFinite(sceneNo) || sceneNo <= 0) return null
  return Math.floor(sceneNo)
}

export function collectScriptEpisodeNos(script: ScriptSegmentDto[]): number[] {
  const seen = new Set<number>()

  for (const scene of script) {
    const sceneNo = normalizeSceneNo(scene.sceneNo)
    if (!sceneNo) continue
    seen.add(sceneNo)
  }

  return Array.from(seen).sort((left, right) => left - right)
}

export function countCoveredScriptEpisodes(
  script: ScriptSegmentDto[],
  targetEpisodes?: number
): number {
  const episodeNos = collectScriptEpisodeNos(script)
  if (!targetEpisodes || !Number.isFinite(targetEpisodes) || targetEpisodes <= 0) {
    return episodeNos.length
  }

  const limit = Math.floor(targetEpisodes)
  return episodeNos.filter((episodeNo) => episodeNo <= limit).length
}

export function collectOverflowScriptEpisodeNos(
  script: ScriptSegmentDto[],
  targetEpisodes: number
): number[] {
  const limit = Math.max(1, Math.floor(targetEpisodes))
  return collectScriptEpisodeNos(script).filter((episodeNo) => episodeNo > limit)
}

export function restrictScriptToTargetEpisodes(
  script: ScriptSegmentDto[],
  targetEpisodes: number
): ScriptSegmentDto[] {
  const limit = Math.max(1, Math.floor(targetEpisodes))

  return [...script]
    .filter((scene) => {
      const sceneNo = normalizeSceneNo(scene.sceneNo)
      return sceneNo !== null && sceneNo <= limit
    })
    .sort((left, right) => left.sceneNo - right.sceneNo)
}

export function mergeScriptByEpisodeNo(
  baseScript: ScriptSegmentDto[],
  incomingScript: ScriptSegmentDto[],
  targetEpisodes?: number
): ScriptSegmentDto[] {
  const normalizedBase =
    typeof targetEpisodes === 'number'
      ? restrictScriptToTargetEpisodes(baseScript, targetEpisodes)
      : [...baseScript]
  const normalizedIncoming =
    typeof targetEpisodes === 'number'
      ? restrictScriptToTargetEpisodes(incomingScript, targetEpisodes)
      : [...incomingScript]
  const merged = new Map<number, ScriptSegmentDto>()

  for (const scene of normalizedBase) {
    const sceneNo = normalizeSceneNo(scene.sceneNo)
    if (sceneNo === null) continue
    merged.set(sceneNo, scene)
  }

  for (const scene of normalizedIncoming) {
    const sceneNo = normalizeSceneNo(scene.sceneNo)
    if (sceneNo === null) continue
    merged.set(sceneNo, scene)
  }

  return Array.from(merged.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([, scene]) => scene)
}
