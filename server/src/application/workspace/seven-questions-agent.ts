/**
 * 七问 Agent Prompt 构建器（服务端迁移版）
 *
 * 基于真源(storyIntent)判断剧本是否需要分篇章，并为每个篇章填写七问答案
 */

export interface StoryIntentInput {
  titleHint?: string
  genre?: string
  tone?: string
  audience?: string
  sellingPremise?: string
  coreDislocation?: string
  emotionalPayoff?: string
  protagonist?: string
  antagonist?: string
  coreConflict?: string
  endingDirection?: string
  dramaticMovement?: string[]
  themeAnchors?: string[]
  relationAnchors?: string[]
  worldAnchors?: string[]
  officialKeyCharacters?: string[]
  generationBriefText?: string
}

export interface SevenQuestionsResult {
  needsSections: boolean
  sectionCount: number
  sectionCountReason: string
  sections: Array<{
    sectionNo: number
    sectionTitle: string
    startEpisode: number
    endEpisode: number
    sevenQuestions: {
      goal: string
      obstacle: string
      effort: string
      result: string
      twist: string
      turnaround: string
      ending: string
    }
  }>
}

/**
 * 构建七问 Agent Prompt
 */
export function buildSevenQuestionsPrompt(
  storyIntent: StoryIntentInput,
  totalEpisodes: number = 10
): string {
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

  // 真源信息
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

  // 叙事动力线
  const dramaticMovement = storyIntent.dramaticMovement || []
  if (dramaticMovement.length > 0) {
    lines.push('【叙事动力线】')
    dramaticMovement.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item}`)
    })
    lines.push('')
  }

  // 主题锚点
  const themeAnchors = storyIntent.themeAnchors || []
  if (themeAnchors.length > 0) {
    lines.push('【主题锚点】')
    themeAnchors.forEach((item) => {
      lines.push(`- ${item}`)
    })
    lines.push('')
  }

  // 关键角色
  const officialKeyCharacters = storyIntent.officialKeyCharacters || []
  if (officialKeyCharacters.length > 0) {
    lines.push('【关键角色】')
    officialKeyCharacters.forEach((name) => {
      lines.push(`- ${name}`)
    })
    lines.push('')
  }

  // 七问格式说明
  lines.push('【七问格式（每个篇章填写一组）】')
  lines.push('')
  lines.push('1. 目标：这篇章要达成什么')
  lines.push('2. 阻碍：阻止目标的核心障碍是什么')
  lines.push('3. 努力：角色做了什么来克服阻碍')
  lines.push('4. 结果：努力带来了什么（往往是代价或新问题）')
  lines.push('5. 意外：计划之外发生了什么')
  lines.push('6. 转折：意外如何改变了局势')
  lines.push('7. 结局：最终走向什么结果')
  lines.push('')

  lines.push('【输出格式】')
  lines.push('')
  lines.push('请按以下 JSON 格式输出：')
  lines.push('')
  lines.push('{')
  lines.push('  "needsSections": true/false,')
  lines.push('  "sectionCount": 0/1/2/3,')
  lines.push('  "sectionCountReason": "...",')
  lines.push('  "sections": [')
  lines.push('    {')
  lines.push('      "sectionNo": 1,')
  lines.push('      "sectionTitle": "第一篇章：xxx",')
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

  return lines.join('\n')
}

/**
 * 解析七问 Agent 返回的 JSON
 */
export function parseSevenQuestionsResponse(rawText: string): SevenQuestionsResult | null {
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
      sections: parsed.sections.map((s: Record<string, unknown>) => ({
        sectionNo: Number(s.sectionNo) || 1,
        sectionTitle: String(s.sectionTitle || ''),
        startEpisode: Number(s.startEpisode) || 1,
        endEpisode: Number(s.endEpisode) || 10,
        sevenQuestions: {
          goal: String(s.sevenQuestions?.goal || ''),
          obstacle: String(s.sevenQuestions?.obstacle || ''),
          effort: String(s.sevenQuestions?.effort || ''),
          result: String(s.sevenQuestions?.result || ''),
          twist: String(s.sevenQuestions?.twist || ''),
          turnaround: String(s.sevenQuestions?.turnaround || ''),
          ending: String(s.sevenQuestions?.ending || '')
        }
      }))
    }
  } catch {
    return null
  }
}
