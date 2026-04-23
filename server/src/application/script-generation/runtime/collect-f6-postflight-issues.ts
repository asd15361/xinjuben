import type { ScriptLedgerIssueDto } from '@shared/contracts/script-ledger'
import type { ScriptSegmentDto } from '@shared/contracts/workflow'

function lacksContinuationHook(scene: ScriptSegmentDto): boolean {
  const text = `${scene.action}${scene.dialogue}${scene.emotion}`.replace(/\s+/g, '')
  if (!text) return false
  const continuationMarkers = [
    '转身',
    '扭头',
    '门外',
    '下一瞬',
    '话没说完',
    '忽然',
    '外头',
    '脚步',
    '抬眼',
    '压低声音'
  ]
  return !continuationMarkers.some((marker) => text.includes(marker))
}

function lacksPlayableBlocking(scene: ScriptSegmentDto): boolean {
  const action = scene.action.replace(/\s+/g, '')
  const emotion = scene.emotion.replace(/\s+/g, '')
  if (!action) return false
  const actionMarkers = [
    '推',
    '拉',
    '按',
    '退',
    '冲',
    '攥',
    '抬',
    '甩',
    '扑',
    '拦',
    '逼',
    '挡',
    '站',
    '跪',
    '抓',
    '扯',
    '压',
    '锁',
    '挣扎'
  ]
  const emotionMarkers = [
    '沉默',
    '停了停',
    '顿了顿',
    '咬',
    '盯',
    '笑',
    '哽',
    '抖',
    '喘',
    '绷',
    '滚',
    '闭',
    '睁',
    '盯住',
    '发紧'
  ]
  const hasAction = actionMarkers.some((marker) => action.includes(marker))
  const hasEmotion = emotionMarkers.some(
    (marker) => action.includes(marker) || emotion.includes(marker)
  )
  return !(hasAction && hasEmotion)
}

export function collectF6PostflightIssues(
  generatedScenes: ScriptSegmentDto[]
): ScriptLedgerIssueDto[] {
  const issues: ScriptLedgerIssueDto[] = []
  const latestScene = generatedScenes[generatedScenes.length - 1]
  if (!latestScene) return issues

  if (lacksPlayableBlocking(latestScene)) {
    issues.push({
      severity: 'low',
      code: 'f6_playability_postflight_weak',
      detail: `第 ${latestScene.sceneNo} 场收尾后仍偏结构块，动作、对白、情绪还没完全扣成可演场面。`
    })
  }

  if (lacksContinuationHook(latestScene)) {
    issues.push({
      severity: 'low',
      code: 'f6_continuation_postflight_weak',
      detail: `第 ${latestScene.sceneNo} 场收尾后留给下一场的承接点还不够顺，后续续写可能发硬。`
    })
  }

  return issues
}
