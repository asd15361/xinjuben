import type { ScriptAuditReportDto } from '../../../../shared/contracts/script-audit'
import type { ScriptSegmentDto } from '../../../../shared/contracts/workflow'
import { detectDramaProgressionDimensions } from '../../../../shared/domain/drama-progression/progression-engine'
import { collectSceneCompletenessIssues } from '../../../../shared/domain/policy/audit/audit-policy'

function hasSectionPollution(scene: ScriptSegmentDto): boolean {
  return /Dialogue[:：]|Emotion[:：]/i.test(scene.action) || /Emotion[:：]/i.test(scene.dialogue)
}

function hasReportStyle(scene: ScriptSegmentDto): boolean {
  const text = `${scene.action}\n${scene.dialogue}\n${scene.emotion}`
  return /(情绪层次|推进节点|记忆回声植入|表层[:：]|中层[:：]|深层[:：]|初始[:：]|中期[:：]|最后[:：]|总结[:：]|解析[:：]|说明[:：])/i.test(text)
}

function normalizeScene(scene: ScriptSegmentDto): string {
  return `${scene.action}\n${scene.dialogue}\n${scene.emotion}`.replace(/\s+/g, '').trim()
}

function hasExpositoryDialogue(dialogue: string): boolean {
  const normalized = dialogue.replace(/\s+/g, '')
  if (!normalized) return false
  const explanationMarkers = ['因为', '所以', '总结', '说明', '代表', '意思是', '也就是说', '我们现在']
  return explanationMarkers.some((marker) => normalized.includes(marker))
}

function lacksCharacterVoice(dialogue: string): boolean {
  const lines = dialogue
    .split(/[。！？!?；;\n]/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return false
  return lines.every((line) => line.length >= 18)
}

function soundsStilted(dialogue: string): boolean {
  const normalized = dialogue.replace(/\s+/g, '')
  return normalized.length >= 48 || /首先|其次|但是我们|如果我们/i.test(normalized)
}

function lacksPlayableBlocking(scene: ScriptSegmentDto): boolean {
  const action = scene.action.replace(/\s+/g, '')
  if (!action) return false
  const actionMarkers = ['推', '拉', '按', '退', '冲', '攥', '抬', '甩', '扑', '拦', '逼', '挡', '站', '跪', '抓']
  const emotionMarkers = ['沉默', '停了停', '顿了顿', '咬', '盯', '笑', '哽', '抖', '喘']
  const hasAction = actionMarkers.some((marker) => action.includes(marker))
  const hasEmotion = emotionMarkers.some((marker) => action.includes(marker) || scene.emotion.includes(marker))
  return !(hasAction && hasEmotion)
}

function lacksContinuationHook(scene: ScriptSegmentDto): boolean {
  const text = `${scene.action}${scene.dialogue}${scene.emotion}`.replace(/\s+/g, '')
  if (!text) return false
  const continuationMarkers = ['转身', '扭头', '门外', '下一瞬', '话没说完', '忽然', '外头', '脚步', '抬眼', '压低声音']
  return !continuationMarkers.some((marker) => text.includes(marker))
}

export function collectSceneAuditIssues(script: ScriptSegmentDto[]): ScriptAuditReportDto['issues'] {
  const issues: ScriptAuditReportDto['issues'] = []

  if (script.length === 0) {
    issues.push({
      code: 'script_empty',
      severity: 'high',
      message: '当前还没有任何剧本场景，无法认为生成通过。'
    })
  }

  issues.push(...collectSceneCompletenessIssues(script))
  script.forEach((scene) => {
    if (hasSectionPollution(scene)) {
      issues.push({
        code: `scene_${scene.sceneNo}_section_polluted`,
        severity: 'high',
        message: `第 ${scene.sceneNo} 场三段内容发生串段，当前输出还像说明稿，不像成品场景。`
      })
    }

    if (hasReportStyle(scene)) {
      issues.push({
        code: `scene_${scene.sceneNo}_report_style_detected`,
        severity: 'high',
        message: `第 ${scene.sceneNo} 场仍带有分析报告或总结口吻，戏味不够纯。`
      })
    }

    if (hasExpositoryDialogue(scene.dialogue)) {
      issues.push({
        code: `scene_${scene.sceneNo}_f6_expository_dialogue`,
        severity: 'medium',
        message: `第 ${scene.sceneNo} 场对白还在直接说明事情，嘴里的人味不够。`
      })
    }

    if (lacksCharacterVoice(scene.dialogue)) {
      issues.push({
        code: `scene_${scene.sceneNo}_f6_character_voice_weak`,
        severity: 'medium',
        message: `第 ${scene.sceneNo} 场对白句子偏满，人物自己的说话味道还不够清楚。`
      })
    }

    if (soundsStilted(scene.dialogue)) {
      issues.push({
        code: `scene_${scene.sceneNo}_f6_stilted_dialogue`,
        severity: 'medium',
        message: `第 ${scene.sceneNo} 场对白说出口还不够顺，嘴感有发卡。`
      })
    }

    if (lacksPlayableBlocking(scene)) {
      issues.push({
        code: `scene_${scene.sceneNo}_f6_playability_weak`,
        severity: 'medium',
        message: `第 ${scene.sceneNo} 场动作、对白、情绪还没完全扣成能演的场。`
      })
    }

    if (lacksContinuationHook(scene)) {
      issues.push({
        code: `scene_${scene.sceneNo}_f6_continuation_weak`,
        severity: 'low',
        message: `第 ${scene.sceneNo} 场结尾留给后续承接的动作或压力还不够顺。`
      })
    }

    const dimensions = detectDramaProgressionDimensions(`${scene.action} ${scene.dialogue} ${scene.emotion}`)
    const missingDimensions = Object.entries(dimensions)
      .filter(([, covered]) => !covered)
      .map(([key]) => key)

    if (missingDimensions.length >= 3) {
      issues.push({
        code: `scene_${scene.sceneNo}_progression_chain_weak`,
        severity: 'medium',
        message: `第 ${scene.sceneNo} 场推进链维度不足：${missingDimensions.join('、')}。`
      })
    }
  })

  for (let index = 1; index < script.length; index += 1) {
    const previousScene = script[index - 1]
    const currentScene = script[index]
    if (normalizeScene(previousScene) === normalizeScene(currentScene)) {
      issues.push({
        code: `scene_${previousScene.sceneNo}_${currentScene.sceneNo}_duplicated`,
        severity: 'high',
        message: `第 ${currentScene.sceneNo} 场和第 ${previousScene.sceneNo} 场实质重复，当前生成把同一场戏重新写了一遍。`
      })
    }
  }

  return issues
}
