import type { ScriptSegmentDto } from '@shared/contracts/workflow'

function normalizeScene(scene: Pick<ScriptSegmentDto, 'action' | 'dialogue' | 'emotion'>): string {
  return [scene.action, scene.dialogue, scene.emotion].join('\n').replace(/\s+/g, '').trim()
}

export function detectDuplicateScenes(
  existingScript: ScriptSegmentDto[],
  generatedScenes: ScriptSegmentDto[]
): string | null {
  if (generatedScenes.length === 0) return null

  const previousScene = existingScript[existingScript.length - 1]
  const firstGeneratedScene = generatedScenes[0]
  // In rewrite mode, if the first generated scene has the same episodeNo as the
  // previous scene, this is the same episode being regenerated — skip the check.
  // The duplicate detector guards against cross-episode harmful repeats, not against
  // a rewritten episode legitimately matching its own previous version.
  if (previousScene && firstGeneratedScene.sceneNo === previousScene.sceneNo) {
    // same episode rewrite — allowed to match
  } else if (
    previousScene &&
    normalizeScene(previousScene) === normalizeScene(firstGeneratedScene)
  ) {
    return `新生成场景与上一场实质重复：scene_${previousScene.sceneNo}_to_${firstGeneratedScene.sceneNo}`
  }

  for (let index = 1; index < generatedScenes.length; index += 1) {
    const previousGeneratedScene = generatedScenes[index - 1]
    const currentGeneratedScene = generatedScenes[index]
    if (normalizeScene(previousGeneratedScene) === normalizeScene(currentGeneratedScene)) {
      return `同批新生成场景发生实质重复：scene_${previousGeneratedScene.sceneNo}_to_${currentGeneratedScene.sceneNo}`
    }
  }

  return null
}
