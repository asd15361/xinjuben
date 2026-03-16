import type { ScriptSegmentDto } from '../../../../shared/contracts/workflow'
import { extractSceneSections } from '../scene/extract-scene-sections'

export function parseAiRepairedScene(text: string, fallbackScene: ScriptSegmentDto): ScriptSegmentDto {
  const sections = extractSceneSections(text)

  return {
    sceneNo: fallbackScene.sceneNo,
    action: sections?.action || fallbackScene.action,
    dialogue: sections?.dialogue || fallbackScene.dialogue,
    emotion: sections?.emotion || fallbackScene.emotion
  }
}
