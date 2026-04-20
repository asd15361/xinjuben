/**
 * src/main/application/workspace/generate-character-profile-prompt.ts
 *
 * 人物小传 Agent Prompt 构建器。
 *
 * 职责：
 * 1. 基于真源(storyIntent)生成人物小传/图谱/背景资料
 * 2. 人物小传作为 RAG 底料、关系图谱、背景资料库
 * 3. 帮助 AI 在写剧本时理解人物是谁、怕什么、要什么
 *
 * 【重构说明】
 * - 原来基于粗纲(outlineSummary)生成人物小传
 * - 现在改为基于真源(storyIntent)生成人物小传
 * - 七问和人物小传并行执行，互不依赖
 * - 人物小传定位为 RAG/图谱/背景，不是硬性输入合同
 */

import type { StoryIntentPackageDto } from '@shared/contracts/intake'
import type { CharacterDraftDto } from '@shared/contracts/workflow'
import { renderAnchorBlock } from './generation-stage-prompt-anchors'

export interface CharacterProfileAgentInput {
  /** 真源（StoryIntent） */
  storyIntent: StoryIntentPackageDto
  /** 七问结果（可选，用于增强人物理解） */
  sevenQuestions?: {
    needsSections: boolean
    sectionCount: number
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
}

/**
 * 构建人物小传 Agent Prompt。
 * 基于真源生成人物小传，而非基于粗纲。
 */
export function buildCharacterProfileAgentPrompt(input: CharacterProfileAgentInput): string {
  const { storyIntent, sevenQuestions } = input

  const requiredCharacterAnchors = Array.from(
    new Set(
      [storyIntent.protagonist, storyIntent.antagonist, ...(storyIntent.officialKeyCharacters || [])]
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  )

  const lines: string[] = []

  lines.push('你是短剧编剧助手。')
  lines.push('这一工序只负责"人物小传"，它不是人物百科，而是"人物图谱/关系背景/RAG底料"。')
  lines.push('目标：让后续剧本创作一眼就知道，每个人想要什么、守什么、怕什么、怎么施压、被逼到什么点会动。')
  lines.push('人物要写得出戏，但不要替剧本提前决定最终解法、终局大战或结局答案。')
  lines.push('优化方向：人物分层，关系清晰，背景可检索。不要冗余背景描述。')
  lines.push('')
  lines.push('【人物小传的价值定位】')
  lines.push('- 这是 RAG 底料：后续 AI 在写剧本时，可以通过检索这段人物信息来理解人物')
  lines.push('- 这是关系图谱：展示人物之间的关系、立场、情感纠葛')
  lines.push('- 这是背景资料：提供人物的历史、动机、压力的来源')
  lines.push('- 不是硬性合同：后续剧本创作可以参考，但不强制满足每一条')
  lines.push('')
  lines.push('请优先使用真源里已经明确的人物，不要随意发明新的核心角色、改名或重写关系。')
  lines.push('如果真源已经给了某个人的前史、关系、代价、来源，你要做的是压缩成交付下游可执行的抓手，不是重新发明一版人物。')
  lines.push(`这次必须覆盖真源里锁住的人物锚点，尤其是：${requiredCharacterAnchors.join('、') || '待补'}`)
  lines.push('如果真源给的是角色标签而不是真实名字，就直接把这个标签原样写进 name，禁止自作主张改成新名字。')
  lines.push('')

  // 从真源提取信息
  lines.push('【真源信息】')
  lines.push(`- 设定成交句：${storyIntent.sellingPremise || '待补'}`)
  lines.push(`- 核心错位：${storyIntent.coreDislocation || '待补'}`)
  lines.push(`- 情绪兑现：${storyIntent.emotionalPayoff || '待补'}`)
  lines.push(`- 主角：${storyIntent.protagonist || '待补'}`)
  lines.push(`- 对手：${storyIntent.antagonist || '待补'}`)
  lines.push(`- 核心冲突：${storyIntent.coreConflict || '待补'}`)
  lines.push(`- 结局方向：${storyIntent.endingDirection || '待补'}`)
  lines.push('')

  // 从真源提取叙事动力
  const dramaticMovement = storyIntent.dramaticMovement || []
  if (dramaticMovement.length > 0) {
    lines.push('【叙事动力线】')
    dramaticMovement.forEach((item: string, idx: number) => {
      lines.push(`${idx + 1}. ${item}`)
    })
    lines.push('')
  }

  // 从真源提取关系锚点
  const relationAnchors = storyIntent.relationAnchors || []
  if (relationAnchors.length > 0) {
    lines.push('【关系锚点】')
    relationAnchors.forEach((item: string) => {
      lines.push(`- ${item}`)
    })
    lines.push('')
  }

  // 从真源提取主题锚点
  const themeAnchors = storyIntent.themeAnchors || []
  if (themeAnchors.length > 0) {
    lines.push('【主题锚点】')
    themeAnchors.forEach((item: string) => {
      lines.push(`- ${item}`)
    })
    lines.push('')
  }

  // 从真源提取世界锚点
  const worldAnchors = storyIntent.worldAnchors || []
  if (worldAnchors.length > 0) {
    lines.push('【世界锚点】')
    worldAnchors.forEach((item: string) => {
      lines.push(`- ${item}`)
    })
    lines.push('')
  }

  // 七问约束（如果有）
  if (sevenQuestions && sevenQuestions.sections.length > 0) {
    lines.push('【篇章叙事约束（七问）】')
    lines.push(`篇章划分：${sevenQuestions.needsSections ? `${sevenQuestions.sectionCount}个篇章` : '不分篇章，全剧一个篇章'}`)
    lines.push('')
    for (const section of sevenQuestions.sections) {
      lines.push(`【${section.sectionTitle}】`)
      const q = section.sevenQuestions
      lines.push(`  目标：${q.goal}`)
      lines.push(`  阻碍：${q.obstacle}`)
      lines.push('')
    }
    lines.push('')
  }

  lines.push('【人物字段说明】')
  lines.push('每个人必须写清以下字段：')
  lines.push('- name：角色名称（必须和真源锚点逐字一致）')
  lines.push('- biography：人物底色 - 当前人物为什么会这样行动（不是堆背景）')
  lines.push('- publicMask：表面演法 - 在压力场里表面怎么演、怎么藏、怎么拖')
  lines.push('- hiddenPressure：隐藏压力 - 不愿被人知道的软肋或弱点')
  lines.push('- fear：最怕失去什么（要具体：人、物、位置、名誉、关系）')
  lines.push('- protectTarget：最想守住什么（同上，要具体）')
  lines.push('- conflictTrigger：被逼到什么点会动（写具体的动作触发条件）')
  lines.push('- advantage：能打的点（戏里直接生效的抓手）')
  lines.push('- weakness：最会出事的点（弱点和破绽）')
  lines.push('- goal：这一季人物目标（具体可执行的欲望）')
  lines.push('- arc：这一季人物弧线（位置和施压方式怎么变）')
  lines.push('')
  lines.push('【写法要求】')
  lines.push('- biography 只写"当前人物为什么会这样行动"，不是堆背景；可写 1-2 句，其余字段都只写 1 句')
  lines.push('- goal、fear、protectTarget 优先写具体人、物、伤口、位置、账册、封印或名分；不要只写抽象大词')
  lines.push('- publicMask 和 hiddenPressure 要形成反差')
  lines.push('- conflictTrigger 要直接写成"被逼到什么点会做什么动作"，不要只写抽象态度')
  lines.push('- advantage 和 weakness 只写会在戏里直接生效的抓手，不要写空优势')
  lines.push('- arc 只写这一季人物位置和施压方式怎么变，不要提前写成终局大战')
  lines.push('- 情感杠杆角色的 advantage、goal、arc 必须写成她主动能做的事：传信、藏证据、换条件、试探、自救、反咬')
  lines.push('- 情感杠杆角色的 biography、publicMask 不能只停在人质模板；至少同时写出她表面怎么演、暗里怎么动')
  lines.push('- 所有角色的 publicMask 都必须先写成"表面怎么演、怎么藏、怎么拖"的可拍动作，不准只写态度结论')
  lines.push('- 如果 publicMask 里没有装弱、赔笑、低头、装不懂、装听话、递水、藏证、拖时间、套话这类动作词，默认还没写成')
  lines.push('')
  lines.push('【禁止事项】')
  lines.push('- 不要把"象征什么""说明什么""哪套大道被领悟"写进人物字段')
  lines.push('- 不要写成"聪明""勇敢""善良"这种空优势')
  lines.push('- 不要写成"领悟历程""见证成长""逼他自己醒悟"这种教化语')
  lines.push('- 如果某个字段只有抽象词、没有能丢、能抢、能毁、能守的东西，说明人物抓手还是虚的')
  lines.push('- 主角的 publicMask 只能写当前压力场里的表面演法，不要写成裁判句')
  lines.push('')
  lines.push('【人物数量】')
  lines.push('优先控制在 4-6 个，优先覆盖：')
  lines.push('- 主驱动层（主角）')
  lines.push('- 主阻力层（对手）')
  lines.push('- 情感杠杆层（关键情感关系）')
  lines.push('- 规则杠杆层（师父、长老等）')
  lines.push('- 外压层（只保留确实会直接改写局面的角色）')
  lines.push('')
  lines.push('输出严格 JSON：')
  lines.push('{')
  lines.push('  "characters": [')
  lines.push('    {')
  lines.push('      "name": string,')
  lines.push('      "roleLayer": "core"|"active"|"functional",  // core=主角层, active=主动推进层, functional=功能层')
  lines.push('      "biography": string,')
  lines.push('      "publicMask": string,')
  lines.push('      "hiddenPressure": string,')
  lines.push('      "fear": string,')
  lines.push('      "protectTarget": string,')
  lines.push('      "conflictTrigger": string,')
  lines.push('      "advantage": string,')
  lines.push('      "weakness": string,')
  lines.push('      "goal": string,')
  lines.push('      "arc": string')
  lines.push('    }')
  lines.push('  ]')
  lines.push('}')
  lines.push('')
  lines.push('这份底稿里你必须优先执行的锚点：')
  lines.push(renderAnchorBlock(storyIntent.generationBriefText || ''))

  return lines.join('\n')
}

/**
 * 解析人物小传 Agent 返回的 JSON。
 */
export function parseCharacterProfileResponse(
  rawText: string
): { characters: CharacterDraftDto[] } | null {
  try {
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/g, '')
      .replace(/```$/g, '')
      .trim()

    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed.characters)) return null

    // 规范化角色数据
    const characters: CharacterDraftDto[] = parsed.characters.map((char: Record<string, unknown>) => ({
      name: String(char.name || '未命名'),
      biography: String(char.biography || ''),
      publicMask: String(char.publicMask || ''),
      hiddenPressure: String(char.hiddenPressure || ''),
      fear: String(char.fear || ''),
      protectTarget: String(char.protectTarget || ''),
      conflictTrigger: String(char.conflictTrigger || ''),
      advantage: String(char.advantage || ''),
      weakness: String(char.weakness || ''),
      goal: String(char.goal || ''),
      arc: String(char.arc || ''),
      roleLayer: (char.roleLayer as 'core' | 'active' | 'functional') || 'active'
    }))

    return { characters }
  } catch {
    return null
  }
}

/**
 * 格式化人物小传为 RAG 底料（用于注入到粗纲和剧本 Prompt）
 */
export function formatCharacterProfileForRAG(characters: CharacterDraftDto[]): string {
  if (!characters || characters.length === 0) return ''

  const lines: string[] = []
  lines.push('【人物图谱/关系背景（RAG底料）】')

  // 按角色层级分组
  const coreChars = characters.filter((c) => c.roleLayer === 'core')
  const activeChars = characters.filter((c) => c.roleLayer === 'active')
  const functionalChars = characters.filter((c) => c.roleLayer === 'functional')

  const groupLabels: Record<string, string> = {
    core: '核心层（主角）',
    active: '主动推进层（对手/情感杠杆）',
    functional: '功能层（规则杠杆/外压）'
  }

  const groupChars: Record<string, CharacterDraftDto[]> = {
    core: coreChars,
    active: activeChars,
    functional: functionalChars
  }

  for (const [layer, label] of Object.entries(groupLabels)) {
    const chars = groupChars[layer]
    if (!chars || chars.length === 0) continue

    lines.push('')
    lines.push(`【${label}】`)
    for (const char of chars) {
      lines.push(`【${char.name}】`)
      if (char.biography) lines.push(`  人物底：${char.biography}`)
      if (char.publicMask) lines.push(`  表面演法：${char.publicMask}`)
      if (char.hiddenPressure) lines.push(`  隐藏压力：${char.hiddenPressure}`)
      if (char.fear) lines.push(`  最怕失去：${char.fear}`)
      if (char.protectTarget) lines.push(`  最想守住：${char.protectTarget}`)
      if (char.conflictTrigger) lines.push(`  触发动作：${char.conflictTrigger}`)
      if (char.advantage) lines.push(`  能打的点：${char.advantage}`)
      if (char.weakness) lines.push(`  会出事的点：${char.weakness}`)
      if (char.goal) lines.push(`  目标：${char.goal}`)
      if (char.arc) lines.push(`  弧线：${char.arc}`)
    }
  }

  return lines.join('\n')
}

/**
 * 格式化人物小传为简洁摘要（用于快速参考）
 */
export function formatCharacterProfileSummary(characters: CharacterDraftDto[]): string {
  if (!characters || characters.length === 0) return ''

  return characters
    .slice(0, 6)
    .map((item) =>
      [
        `${item.name}：${item.goal || item.biography || item.arc || '待补人物驱动力'}`,
        item.biography ? `人物底：${item.biography}` : '',
        item.fear ? `最怕失去：${item.fear}` : '',
        item.protectTarget ? `最想守住：${item.protectTarget}` : '',
        item.conflictTrigger ? `一被逼就会这样动：${item.conflictTrigger}` : '',
        item.advantage ? `能打的点：${item.advantage}` : '',
        item.weakness ? `最会出事的点：${item.weakness}` : '',
        item.arc ? `这一季会怎么变：${item.arc}` : ''
      ]
        .filter(Boolean)
        .join(' ')
    )
    .join('\n')
}

/**
 * 人物小传结果数据结构（用于并行调度器返回值）
 */
export interface CharacterProfileResult {
  characters: CharacterDraftDto[]
}
