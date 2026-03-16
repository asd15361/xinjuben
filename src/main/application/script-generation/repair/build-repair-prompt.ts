import type { ExecuteScriptRepairInputDto } from '../../../../shared/contracts/script-audit'
import type { ScriptStateLedgerDto } from '../../../../shared/contracts/script-ledger'
import type { ScriptSegmentDto } from '../../../../shared/contracts/workflow'
import { buildFormalFactPromptBlock } from '../../../../shared/domain/formal-fact/stage-policy'
import { buildRepairPromptRules, buildRepairPromptSnapshot } from '../../../../shared/domain/policy/repair/repair-policy'
import { buildEpisodePromptGuidance } from '../../../../shared/domain/script-prompt/stage-guidance'
import {
  buildStoryContract,
  buildUserAnchorLedger,
  renderStoryContractPromptBlock
} from '../../../../shared/domain/story-contract/story-contract-policy'

export function buildRepairPrompt(input: {
  suggestion: ExecuteScriptRepairInputDto['suggestions'][number]
  targetScene: ScriptSegmentDto
  ledger: ScriptStateLedgerDto
  storyIntent?: ExecuteScriptRepairInputDto['storyIntent']
  outline: NonNullable<ExecuteScriptRepairInputDto['outline']>
  segments: NonNullable<ExecuteScriptRepairInputDto['segments']>
}): string {
  const repairSnapshot = buildRepairPromptSnapshot({
    ledger: input.ledger,
    suggestion: input.suggestion
  })
  const forbiddenRules = input.ledger.knowledgeBoundaries.forbiddenOmniscienceRules.join('；')
  const characters = input.ledger.characters.map((character) => ({
    name: character.name,
    biography: '',
    publicMask: '',
    hiddenPressure: '',
    fear: '',
    protectTarget: '',
    conflictTrigger: '',
    advantage: '',
    weakness: '',
    goal: character.lastKnownGoal,
    arc: ''
  }))
  const storyContract = buildStoryContract({
    storyIntent: input.storyIntent,
    outline: input.outline,
    characters
  })
  const anchorLedger = buildUserAnchorLedger({
    storyIntent: input.storyIntent,
    outline: input.outline,
    characters
  })

  return [
    `你正在定向修补剧本第 ${input.targetScene.sceneNo} 场。`,
    `修补目标：${input.suggestion.instruction}`,
    `修补策略来源：${input.suggestion.source}`,
    `本轮关注焦点：${input.suggestion.focus.join('、')}`,
    `修补前先核对：${input.suggestion.evidenceHint}`,
    '如果修补目标点名了某条正式事实，必须把那条事实明确写进动作、对白或情绪推进，不能只做泛化改写。',
    `项目主题：${input.outline.theme || '待补主题'}`,
    `核心冲突：${input.outline.mainConflict || '待补核心冲突'}`,
    buildFormalFactPromptBlock({
      outline: input.outline,
      mode: 'script_repair'
    }),
    buildEpisodePromptGuidance({
      outline: input.outline,
      characters,
      segments: input.segments,
      episodeNo: input.targetScene.sceneNo,
      totalEpisodes: Math.max(input.targetScene.sceneNo, input.ledger.sceneCount || 1)
    }),
    renderStoryContractPromptBlock(storyContract, anchorLedger),
    repairSnapshot.summary,
    `当前关键钩子：${repairSnapshot.openHook}`,
    `下一步必须承接：${repairSnapshot.nextBridge}`,
    `当前记忆回声：${input.ledger.storyMomentum.memoryEchoes.join('；') || '当前待补'}`,
    `当前待承接硬锚点：${input.ledger.storyMomentum.hardAnchors.join('；') || '当前无额外硬锚点'}`,
    `当前关系张力：${repairSnapshot.relationTension}`,
    `当前主视角：${repairSnapshot.perspective}`,
    `信息边界铁律：${forbiddenRules}`,
    ...buildRepairPromptRules(),
    `当前场原文：\nAction: ${input.targetScene.action}\nDialogue: ${input.targetScene.dialogue}\nEmotion: ${input.targetScene.emotion}`
  ].join('\n')
}
