/**
 * src/main/application/script-generation/runtime/build-agent-repair-prompt.ts
 *
 * Unified prompt builder for all single-responsibility repair agents.
 *
 * Each agent prompt must include:
 * 1. Current manuscript full text
 * 2. Current specific problem
 * 3. Clear goal
 * 4. Forbidden items
 *
 * All agents repair based on the manuscript, never from scratch.
 */

import type { ScriptSegmentDto } from '../../../../shared/contracts/workflow'

export type AgentRepairType =
  | 'char_count_fat'
  | 'char_count_thin'
  | 'format_pollution'
  | 'scene_structure'
  | 'voice_over'

function buildRoleStatement(agentType: AgentRepairType): string {
  switch (agentType) {
    case 'char_count_fat':
      return '你现在是字数压缩代理（char-count-agent）。你的任务是把上一版过胖的剧本压回正式字数合同。'
    case 'char_count_thin':
      return '你现在是字数补厚代理（char-count-agent）。你的任务是把上一版过瘦的剧本补回正式字数合同。'
    case 'format_pollution':
      return '你现在是格式清理代理。你的任务是把上一版剧本里的模板污染、旧标签残留和 Voice-Over 清理干净。'
    case 'scene_structure':
      return '你现在是场次结构代理。你的任务是修正上一版剧本的场次数、场标题和场切分问题，不改变剧情内容。'
    case 'voice_over':
      return '你现在是画外音清理代理。你的任务是把上一版剧本里的旁白/Voice-Over/画外音全部改成可拍的动作和对白。'
  }
}

function buildMissionStatement(agentType: AgentRepairType): string {
  switch (agentType) {
    case 'char_count_fat':
      return '你的目标只有一个：基于原稿直接删改，把它修回正式字数合同，同时保持剧情事实和场次结构不变。'
    case 'char_count_thin':
      return '你的目标只有一个：基于原稿直接补厚，把它修回正式字数合同，同时保持剧情事实和场次结构不变。'
    case 'format_pollution':
      return '你的目标只有一个：把原稿里的污染标签、旧格式残留、旁白全部清理干净，改成真实可拍的剧本格式。'
    case 'scene_structure':
      return '你的目标只有一个：在不改变剧情事实、人物关系和承接关系的前提下，修正场次数和场切分。'
    case 'voice_over':
      return '你的目标只有一个：把所有旁白/Voice-Over/画外音改成带△动作描写的对白格式，保持剧情内容不变。'
  }
}

function buildForbiddenItems(agentType: AgentRepairType, sceneCount: number): string[] {
  const base = [
    `场数（第${sceneCount}场）和场号必须保持不变。`,
    '剧情事实、人物关系、承接关系必须保持不变。',
    '只输出修改后的完整剧本正文，不要解释，不要分析，不要列改动说明。',
    '必须保留「第X集」标题、原有场号、人物表、△动作和对白格式。',
    '禁止输出 Action:/Dialogue:/Emotion: 这类旧三段标签。'
  ]

  switch (agentType) {
    case 'char_count_fat':
      return [
        ...base,
        '不准删掉关键冲突、关键结果和集尾承接点。',
        '不准从零重写，不准换剧情，不准换场次。'
      ]
    case 'char_count_thin':
      return [
        ...base,
        '不准靠空情绪、感叹句和解释句灌水凑字数。',
        '不准从零重写，不准换剧情，不准换场次。'
      ]
    case 'format_pollution':
      return [...base, '不准改变剧情事实和人物关系。', '不准从零重写，不准换场次。']
    case 'scene_structure':
      return [...base, '不准新增场或拆场。', '不准发明新剧情或重新生成人物对白。', '不准从零重写。']
    case 'voice_over':
      return [
        ...base,
        '不准改变对白内容本身，只改变表达形式。',
        '不准从零重写，不准换剧情，不准换场次。'
      ]
  }
}

/**
 * Build a unified repair agent prompt.
 *
 * All repair agents follow this protocol:
 * 1. Eat the original manuscript in full
 * 2. Know the current specific problem
 * 3. Have a clear goal
 * 4. Have explicit forbidden items
 * 5. Repair on top of the manuscript, never from scratch
 */
export function buildAgentRepairPrompt(input: {
  agentType: AgentRepairType
  previousScene: ScriptSegmentDto
  problemDescription: string
  goalDescription: string
  extraInstructions?: string[]
}): string {
  const { agentType, previousScene, problemDescription, goalDescription, extraInstructions } = input
  const sceneCount = previousScene.screenplayScenes?.length || 2
  const forbiddenItems = buildForbiddenItems(agentType, sceneCount)

  const roleStatement = buildRoleStatement(agentType)
  const missionStatement = buildMissionStatement(agentType)

  const body: string[] = [
    '【上一版成稿改稿任务】',
    `- 当前是第 ${previousScene.sceneNo} 集的返修，不是从零重写。`,
    `- 上一版暴露的问题：${problemDescription}`,
    `- 本次修复目标：${goalDescription}`,
    '- 本次禁止事项：'
  ]
  for (const item of forbiddenItems) {
    body.push(`  - ${item}`)
  }

  if (extraInstructions && extraInstructions.length > 0) {
    body.push('- 本次额外要求：')
    for (const instruction of extraInstructions) {
      body.push(`  - ${instruction}`)
    }
  }

  body.push('【必须改的上一版原稿】')
  body.push(previousScene.screenplay || '')

  return [roleStatement, missionStatement, ...body].join('\n')
}
