import type { ScriptSegmentDto } from '../../../contracts/workflow.ts'
import type { PolicyMetadata } from '../policy-metadata.ts'

export interface DramaProgressionSnapshot {
  conflictSignal: boolean
  emotionSignal: boolean
  actionSignal: boolean
  summary: string
}

export interface ProgressionPolicyExecutionSnapshot {
  weakSceneCount: number
  summary: string
}

export const progressionPolicyMetadata: PolicyMetadata = {
  name: 'drama_progression_policy_v1',
  version: 'v1.0',
  lineage: 'stage6-progression-signal -> stage7-repair-mapping -> stage8-audit-chain',
  source: '旧项目戏剧推进链经验 + 新仓库审计修补主链'
}

function hasText(value: string | undefined): boolean {
  return Boolean(value && value.trim())
}

export function buildDramaProgressionSnapshot(scene: ScriptSegmentDto): DramaProgressionSnapshot {
  const actionSignal = hasText(scene.action)
  const conflictSignal = actionSignal || hasText(scene.dialogue)
  const emotionSignal = hasText(scene.emotion)

  return {
    conflictSignal,
    emotionSignal,
    actionSignal,
    summary:
      conflictSignal && emotionSignal
        ? '当前场具备冲突推进和情绪闭环基础。'
        : '当前场的推进链信号还不完整，需要补足动作、对白或情绪变化。'
  }
}

export function buildProgressionExecutionSnapshot(
  scenes: ScriptSegmentDto[] | null | undefined
): ProgressionPolicyExecutionSnapshot {
  if (!scenes || scenes.length === 0) {
    return {
      weakSceneCount: 0,
      summary: '当前还没有剧本场景，推进链快照为空。'
    }
  }

  const weakSceneCount = scenes.filter((scene) => {
    const snapshot = buildDramaProgressionSnapshot(scene)
    return !snapshot.conflictSignal || !snapshot.emotionSignal
  }).length

  return {
    weakSceneCount,
    summary:
      weakSceneCount > 0
        ? `当前有 ${weakSceneCount} 场推进链偏弱，需要继续补动作、对白或情绪闭环。`
        : '当前剧本场景都具备基础推进链信号。'
  }
}
