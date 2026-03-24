import type { ScriptSegmentDto } from '../../../../../shared/contracts/workflow'
import { inspectScreenplayQualityEpisode } from '../../../../../shared/domain/script/screenplay-quality'

// 质量审计结果 - 按需使用
export interface ScriptSceneQuality {
  qualityPass: boolean
  qualityProblem: string | null
}

// 质量检查 - 按需调用，不在列表主链
export function inspectSceneQuality(scene: ScriptSegmentDto): ScriptSceneQuality {
  const quality = inspectScreenplayQualityEpisode(scene)
  return {
    qualityPass: quality.pass,
    qualityProblem: quality.problems[0] || null
  }
}
