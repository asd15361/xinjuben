/**
 * NON-PRODUCTION REPAIR PROMPT BUILDER
 *
 * This file builds prompts for the legacy repair path (executeScriptRepair).
 * The current production repair path is:
 *   run-script-generation-batch -> repair-script-quality-with-agents -> finalize-script-postflight
 *
 * This file is kept for historical reference and is NOT called by the current production chain.
 *
 * REVISION LOG (2026-04-07):
 * - Removed A/D/E three-section format contract — screenplay format is the only valid contract
 * - Removed Action:/Dialogue:/Emotion: output block — screenplay field is the only body text
 * - Now outputs screenplay repair contract consistent with create-script-generation-prompt.ts
 */
import type { ExecuteScriptRepairInputDto } from '../../../../shared/contracts/script-audit'
import type { ScriptStateLedgerDto } from '../../../../shared/contracts/script-ledger'
import type { ScriptSegmentDto } from '../../../../shared/contracts/workflow'
import { buildFormalFactPromptBlock } from '../../../../shared/domain/formal-fact/stage-policy.ts'
import { buildRepairPromptSnapshot } from '../../../../shared/domain/policy/repair/repair-policy.ts'
import {
  buildStoryContract,
  buildUserAnchorLedger,
  renderStoryContractPromptBlock
} from '../../../../shared/domain/story-contract/story-contract-policy.ts'

const REPAIR_SCREENPLAY_FORMAT_RULES = [
  '格式：只输出剧本正文，不要输出 Action:/Dialogue:/Emotion: 等旧格式标签。',
  '每场必须包含场景标题（如「1-1 日」）、人物表、△动作和对白。',
  '每场最后一条△动作或最后一句对白，必须落在具体可见的结果上（做了┄/倒下┄/说出┄/抓住┄/被按住┄），禁止停在"有┄/感到┄/开始┄/有种┄/是┄"这类开放性句式。',
  '情绪只能藏在△动作、对白语气和人物当场反应里，不要另起一行写情绪总结。',
  '禁止写画外音、旁白、OS；对白里不准出现（画外音/旁白/OS）。',
  '每场只保留能改变局势的关键动作和关键对白；同类动作、同义威胁不重复。',
  '动作句一行只写一个关键动作，优先 8-20 字；单场默认 6-10 行正文。',
  '对白能短就短，优先 4-14 字，能一句顶回去就别写成长段解释。',
  '人物说话先带站位和当场压力，同一句话如果换给别的角色说也成立就继续改，直到能一耳朵听出是谁。'
]

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

  const currentScreenplay = input.targetScene.screenplay || [
    input.targetScene.action,
    input.targetScene.dialogue,
    input.targetScene.emotion
  ].filter(Boolean).join('\n')

  return [
    `你正在定向修补剧本第 ${input.targetScene.sceneNo} 集。`,
    `修补目标：${input.suggestion.instruction}`,
    `修补策略来源：${input.suggestion.source}`,
    `本轮关注焦点：${input.suggestion.focus.join('、')}`,
    `修补前先核对：${input.suggestion.evidenceHint}`,
    `项目主题：${input.outline.theme || '待补主题'}`,
    `核心冲突：${input.outline.mainConflict || '待补核心冲突'}`,
    buildFormalFactPromptBlock({
      outline: input.outline,
      mode: 'script_repair'
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
    '【修补格式合同】',
    ...REPAIR_SCREENPLAY_FORMAT_RULES,
    '只输出剧本正文，不写分析说明、幕后工作词或括号注释。',
    `【当前集原文】\n${currentScreenplay}`
  ].join('\n')
}
