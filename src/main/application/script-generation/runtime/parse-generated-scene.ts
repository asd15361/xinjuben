import { extractSceneSections } from '../scene/extract-scene-sections'

export function parseGeneratedScene(text: string, sceneNo: number): {
  sceneNo: number
  action: string
  dialogue: string
  emotion: string
} {
  const sections = extractSceneSections(text)
  if (!sections) {
    const preview = text.replace(/\s+/g, ' ').trim().slice(0, 240)
    throw new Error(`parse_interrupted:scene_${sceneNo}_markers_insufficient:${preview}`)
  }

  return {
    sceneNo,
    action: sections.action,
    dialogue: sections.dialogue,
    emotion: sections.emotion
  }
}
