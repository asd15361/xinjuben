/**
 * src/main/application/workspace/generate-seven-questions-prompt.ts
 *
 * 七问 Agent Prompt 构建器。
 *
 * 职责：
 * 1. 基于真源(storyIntent)判断当前剧本是否需要分篇章
 * 2. 如果需要分篇章，划分篇章边界并为每个篇章填写七问
 * 3. 如果不需要分篇章，为整个剧填写一套七问
 *
 * 七问是篇章级叙事骨架，不是集级填充。
 * 同一篇章内的所有集共享同一套七问答案。
 * 不为每集单独生成七问。
 *
 * 【重构说明】
 * - 原来基于粗纲(outlineDraft)生成七问
 * - 现在改为基于真源(storyIntent)生成七问
 * - 七问和人物小传并行执行，互不依赖
 */

import type { StoryIntentPackageDto } from '../../../shared/contracts/intake.ts'
import type { SevenQuestionsResultDto } from '../../../shared/contracts/workflow.ts'

export interface SevenQuestionsAgentInput {
  /** 真源（StoryIntent） */
  storyIntent: StoryIntentPackageDto
  /** 集数（从真源或用户输入获取） */
  totalEpisodes?: number
}

/**
 * 构建七问 Agent Prompt。
 * 基于真源生成七问，而非基于粗纲。
 */
export function buildSevenQuestionsAgentPrompt(input: SevenQuestionsAgentInput): string {
  const { storyIntent, totalEpisodes } = input
  const episodes = totalEpisodes || storyIntent.dramaticMovement?.length || 10

  const lines: string[] = []

  lines.push(
    '你是七问专家（seven-questions-agent）。你的任务是根据创作真源，判断剧本是否需要分篇章，并为每个篇章填写七问答案。'
  )
  lines.push('')
  lines.push('【基本原则】')
  lines.push('- 七问是篇章级叙事骨架，不是集级填充')
  lines.push('- 同一篇章内的所有集共享同一套七问答案')
  lines.push('- 不为每集单独生成七问，每集只是篇章里的一步执行动作')
  lines.push('- 七问回答的是"这一篇章要往哪走"，不是"这一集要发生什么"')
  lines.push('- 篇章划分由你判断：如果剧本有明显的地理/时间/事件阶段划分，才分篇章；否则不分')
  lines.push('')
  lines.push('【分篇章强制条件】只要满足以下任意一条，必须分篇章：')
  lines.push('')
  lines.push('1. 地理环境发生根本性跨越（例如：从凡人城镇跨入修仙界）')
  lines.push('2. 发生超过1年以上的时间跳跃')
  lines.push('3. 主角的核心目标（Goal）发生阶段性逆转（例如：从"寻找秘宝"变为"毁灭秘宝"）')
  lines.push('')
  lines.push(
    '如果以上条件均不满足，必须填 needsSections = false，整个剧只共用一个篇章。严禁强行制造割裂。'
  )
  lines.push('')

  // 从真源提取关键信息
  lines.push('【真源信息】')
  lines.push(`- 剧名提示：${storyIntent.titleHint || '未填'}`)
  lines.push(`- 题材：${storyIntent.genre || '未填'}`)
  lines.push(`- 基调：${storyIntent.tone || '未填'}`)
  lines.push(`- 目标受众：${storyIntent.audience || '未填'}`)
  lines.push(`- 设定成交句：${storyIntent.sellingPremise || '未填'}`)
  lines.push(`- 核心错位：${storyIntent.coreDislocation || '未填'}`)
  lines.push(`- 情绪兑现：${storyIntent.emotionalPayoff || '未填'}`)
  lines.push(`- 主角：${storyIntent.protagonist || '未填'}`)
  lines.push(`- 对手：${storyIntent.antagonist || '未填'}`)
  lines.push(`- 核心冲突：${storyIntent.coreConflict || '未填'}`)
  lines.push(`- 结局方向：${storyIntent.endingDirection || '未填'}`)
  lines.push(`- 总集数：${episodes} 集`)
  lines.push('')

  // 从真源提取叙事动力
  const dramaticMovement = storyIntent.dramaticMovement || []
  if (dramaticMovement.length > 0) {
    lines.push('【叙事动力线】')
    dramaticMovement.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item}`)
    })
    lines.push('')
  }

  // 从真源提取主题锚点
  const themeAnchors = storyIntent.themeAnchors || []
  if (themeAnchors.length > 0) {
    lines.push('【主题锚点】')
    themeAnchors.forEach((item) => {
      lines.push(`- ${item}`)
    })
    lines.push('')
  }

  // 从真源提取关系锚点
  const relationAnchors = storyIntent.relationAnchors || []
  if (relationAnchors.length > 0) {
    lines.push('【关系锚点】')
    relationAnchors.forEach((item) => {
      lines.push(`- ${item}`)
    })
    lines.push('')
  }

  // 从真源提取世界锚点
  const worldAnchors = storyIntent.worldAnchors || []
  if (worldAnchors.length > 0) {
    lines.push('【世界锚点】')
    worldAnchors.forEach((item) => {
      lines.push(`- ${item}`)
    })
    lines.push('')
  }

  // 从真源提取关键角色
  const officialKeyCharacters = storyIntent.officialKeyCharacters || []
  if (officialKeyCharacters.length > 0) {
    lines.push('【关键角色】')
    officialKeyCharacters.forEach((name) => {
      lines.push(`- ${name}`)
    })
    lines.push('')
  }

  lines.push('【七问格式（每个篇章填写一组）】')
  lines.push('')
  lines.push('1. 目标：这篇章要达成什么')
  lines.push('   - 这一篇章的核心叙事目标是什么')
  lines.push('   - 主角在这一篇章里要完成什么转变或推进')
  lines.push('')
  lines.push('2. 阻碍：阻止目标的核心障碍是什么')
  lines.push('   - 主角面临的最大障碍是什么')
  lines.push('   - 对手或外部压力如何阻止目标实现')
  lines.push('')
  lines.push('3. 努力：角色做了什么来克服阻碍')
  lines.push('   - 主角采取了什么行动')
  lines.push('   - 是否借助了他人力量或资源')
  lines.push('')
  lines.push('4. 结果：努力带来了什么（往往是代价或新问题）')
  lines.push('   - 行动产生了什么直接后果')
  lines.push('   - 是否付出了代价或引出了新问题')
  lines.push('')
  lines.push('5. 意外：计划之外发生了什么')
  lines.push('   - 有没有出现预料之外的事件')
  lines.push('   - 是否有人物或力量的介入超出预期')
  lines.push('')
  lines.push('6. 转折：意外如何改变了局势')
  lines.push('   - 意外打破了什么平衡')
  lines.push('   - 局势如何因此发生了质变')
  lines.push('')
  lines.push('7. 结局：最终走向什么结果')
  lines.push('   - 这一篇章结束时，局面定型为什么')
  lines.push('   - 为下一篇章留下了什么悬念或钩子（如果没有下一篇章，则写全剧结尾方向）')
  lines.push('')
  lines.push('【输出要求】')
  lines.push('')
  lines.push('请按以下 JSON 格式输出：')
  lines.push('')
  lines.push('{')
  lines.push('  "needsSections": true/false,  // 是否需要分篇章')
  lines.push('  "sectionCount": 0/1/2/3,      // 篇章数量，0表示不分篇章')
  lines.push('  "sectionCountReason": "...",  // 为什么这样判断')
  lines.push('  "sections": [')
  lines.push('    {')
  lines.push('      "sectionNo": 1,')
  lines.push(
    '      "sectionTitle": "第一篇章：xxx",  // 如"第一篇章：美国篇"或"第一篇章：争夺秘宝"'
  )
  lines.push('      "startEpisode": 1,')
  lines.push('      "endEpisode": xx,')
  lines.push('      "sevenQuestions": {')
  lines.push('        "goal": "...",')
  lines.push('        "obstacle": "...",')
  lines.push('        "effort": "...",')
  lines.push('        "result": "...",')
  lines.push('        "twist": "...",')
  lines.push('        "turnaround": "...",')
  lines.push('        "ending": "..."')
  lines.push('      }')
  lines.push('    }')
  lines.push('  ]')
  lines.push('}')
  lines.push('')
  lines.push('如果 needsSections = false：')
  lines.push('- sectionCount = 1')
  lines.push('- sections 里只有一组七问，startEpisode = 1，endEpisode = 总集数')
  lines.push('- sectionTitle 填"全剧"')
  lines.push('')
  lines.push('【禁止事项】')
  lines.push('- 不要为每集单独生成七问')
  lines.push('- 不要把七问展开到具体场景或场次')
  lines.push('- 不要改变已确定的集数划分')
  lines.push('- 七问只回答篇章级叙事骨架，不要写成详细大纲')
  lines.push('- 不要强行分篇章：如果剧本没有明显阶段划分，就填 needsSections = false')

  return lines.join('\n')
}

/**
 * 解析七问 Agent 返回的 JSON。
 */
export function parseSevenQuestionsResponse(rawText: string): SevenQuestionsResultDto | null {
  try {
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/g, '')
      .replace(/```$/g, '')
      .trim()

    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed.sections)) return null

    return {
      needsSections: Boolean(parsed.needsSections),
      sectionCount: Number(parsed.sectionCount) || 0,
      sectionCountReason: String(parsed.sectionCountReason || ''),
      sections: parsed.sections
    }
  } catch {
    return null
  }
}

/**
 * 七问结果数据结构（用于并行调度器返回值）
 * 使用共享类型 SevenQuestionsResultDto
 */
export type SevenQuestionsResult = SevenQuestionsResultDto

/**
 * 将七问结果格式化为主题锚点文本（用于注入到粗纲 Prompt）
 */
export function formatSevenQuestionsAsNarrativeConstraint(result: SevenQuestionsResult): string {
  const lines: string[] = []

  lines.push('【篇章叙事约束（七问）】')
  lines.push(
    `篇章划分：${result.needsSections ? `${result.sectionCount}个篇章` : '不分篇章，全剧一个篇章'}`
  )
  if (result.sectionCountReason) {
    lines.push(`划分理由：${result.sectionCountReason}`)
  }
  lines.push('')

  for (const section of result.sections) {
    lines.push(`【${section.sectionTitle}】（第${section.startEpisode}-${section.endEpisode}集）`)
    const q = section.sevenQuestions
    lines.push(`  目标：${q.goal}`)
    lines.push(`  阻碍：${q.obstacle}`)
    lines.push(`  努力：${q.effort}`)
    lines.push(`  结果：${q.result}`)
    lines.push(`  意外：${q.twist}`)
    lines.push(`  转折：${q.turnaround}`)
    lines.push(`  结局：${q.ending}`)
    lines.push('')
  }

  return lines.join('\n')
}
