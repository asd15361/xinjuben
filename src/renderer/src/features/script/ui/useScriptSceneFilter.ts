import { useMemo, useState } from 'react'
import type { ScriptSegmentDto } from '../../../../../shared/contracts/workflow'
import type { SceneFilterMode } from './ScriptSceneNavigator'

export function useScriptSceneFilter(script: ScriptSegmentDto[]) {
  const [sceneSearch, setSceneSearch] = useState('')
  const [sceneFilter, setSceneFilter] = useState<SceneFilterMode>('all')

  const visibleScenes = useMemo(() => {
    return script.filter((scene) => {
      const keyword = sceneSearch.trim()
      const matchesSearch =
        keyword.length === 0 ||
        `${scene.sceneNo}`.includes(keyword) ||
        scene.action.includes(keyword) ||
        scene.dialogue.includes(keyword) ||
        scene.emotion.includes(keyword)

      if (!matchesSearch) return false
      if (sceneFilter === 'missing_action') return !scene.action.trim()
      if (sceneFilter === 'missing_dialogue') return !scene.dialogue.trim()
      if (sceneFilter === 'missing_emotion') return !scene.emotion.trim()
      return true
    })
  }, [sceneFilter, sceneSearch, script])

  return {
    sceneSearch,
    sceneFilter,
    visibleScenes,
    setSceneSearch,
    setSceneFilter
  }
}
