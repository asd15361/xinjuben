/**
 * src/main/application/script-generation/runtime/assemble-episode-scenes.ts
 *
 * Prototype-only assembly: concatenates per-scene raw outputs into a full episode screenplay.
 *
 * Design principles (Plan B / P1 prototype):
 * - Each scene is generated independently with its own word-count budget
 * - Scene raw outputs do NOT contain 「第X集」— assembly adds it once at the top
 * - Assembly does NOT modify scene body content
 * - No second format contract introduced
 *
 * @param episodeNo  — episode number (e.g. 1)
 * @param sceneOutputs — array of raw scene outputs (each already validated per scene format contract)
 *
 * IMPORTANT: this helper is not wired into the current production episode-level chain.
 * Current production path still generates one episode prompt via
 * run-script-generation-batch -> create-script-generation-prompt.
 *
 * @returns complete episode screenplay string
 */
export function assembleEpisodeScenes(episodeNo: number, sceneOutputs: string[]): string {
  if (!Number.isFinite(episodeNo) || episodeNo < 1) {
    throw new Error(`assembleEpisodeScenes: episodeNo must be a positive integer, got ${episodeNo}`)
  }
  if (!Array.isArray(sceneOutputs)) {
    throw new Error('assembleEpisodeScenes: sceneOutputs must be an array')
  }

  const parts: string[] = [`第${episodeNo}集`, '']

  for (const sceneOutput of sceneOutputs) {
    if (typeof sceneOutput !== 'string') {
      throw new Error('assembleEpisodeScenes: all sceneOutputs must be strings')
    }
    parts.push(sceneOutput.trim())
    parts.push('')
  }

  return parts.join('\n').trim()
}
