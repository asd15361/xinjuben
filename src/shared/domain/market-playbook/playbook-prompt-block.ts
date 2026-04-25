/**
 * src/shared/domain/market-playbook/playbook-prompt-block.ts
 *
 * MarketPlaybook Prompt Block Builder.
 *
 * 把项目锁定的 MarketPlaybook 作为 B 层注入生成 Prompt。
 * B 层是市场打法参考，不能覆盖 A 稳定内核、用户设定和已锁定七问。
 *
 * 接入阶段：seven_questions / script_skeleton / episode_script
 */

import type { MarketPlaybookDto, MarketPlaybookSelectionDto, AudienceLane } from '../../contracts/market-playbook.ts'
import { getMarketPlaybookById, selectDefaultMarketPlaybook } from './market-playbook-registry.ts'

// ============================================================
// 限制常量
// ============================================================

const MAX_PATTERNS = 6
const MAX_ANTI_PATTERNS = 5
const MAX_PROMPT_RULES = 5

// ============================================================
// resolveProjectMarketPlaybook
// ============================================================

/**
 * 从项目 selection + registry 解析完整 MarketPlaybookDto。
 *
 * 不读数据库，只用已有 selection 和内置 registry。
 * 返回 null 表示没有可用 playbook。
 */
export function resolveProjectMarketPlaybook(input: {
  marketPlaybookSelection?: MarketPlaybookSelectionDto | null
  audienceLane?: AudienceLane
  subgenre?: string
  customPlaybooks?: MarketPlaybookDto[]
}): MarketPlaybookDto | null {
  const { marketPlaybookSelection, audienceLane, subgenre, customPlaybooks } = input

  // 有已锁定/手动选择的 playbook
  if (marketPlaybookSelection?.selectedPlaybookId) {
    const existing = getMarketPlaybookById(marketPlaybookSelection.selectedPlaybookId, {
      customPlaybooks
    })
    if (existing) return existing
  }

  // 没有 selection，尝试用 audienceLane + subgenre 自动选
  if (audienceLane && subgenre) {
    return selectDefaultMarketPlaybook({ audienceLane, subgenre, customPlaybooks })
  }

  return null
}

// ============================================================
// buildMarketPlaybookPromptBlock
// ============================================================

export type MarketPlaybookStage = 'seven_questions' | 'script_skeleton' | 'episode_script'

export interface BuildMarketPlaybookPromptBlockInput {
  playbook: MarketPlaybookDto | null | undefined
  stage: MarketPlaybookStage
}

/**
 * 构建 MarketPlaybook Prompt Block。
 *
 * - playbook 为空返回空字符串
 * - patterns 最多 6 条，每条输出 name + type + promptInstruction
 * - antiPatterns 最多 5 条
 * - promptRules 最多 5 条
 * - 必须包含"不覆盖稳定内核"的提示
 * - 不输出 examples 全文
 */
export function buildMarketPlaybookPromptBlock(input: BuildMarketPlaybookPromptBlockInput): string {
  const { playbook, stage } = input

  if (!playbook) return ''

  const lines: string[] = []

  // 边界声明——B 层不能覆盖 A
  lines.push('【市场打法包 · B 层参考】')
  lines.push(`打法包：${playbook.name}`)
  lines.push(`赛道：${playbook.audienceLane === 'male' ? '男频' : '女频'}｜垂类：${playbook.subgenre}`)
  lines.push(
    '以下市场打法包是风格与商业打法参考，不能覆盖稳定创作内核、用户设定和已锁定七问。若与稳定内核、用户设定、锁定七问冲突，以稳定内核和用户设定为准。'
  )
  lines.push('')

  // 打法包摘要
  if (playbook.summary) {
    lines.push(`【打法包摘要】${playbook.summary}`)
    lines.push('')
  }

  // stage 专属输出
  switch (stage) {
    case 'seven_questions':
      buildSevenQuestionsStageLines(lines, playbook)
      break
    case 'script_skeleton':
      buildScriptSkeletonStageLines(lines, playbook)
      break
    case 'episode_script':
      buildEpisodeScriptStageLines(lines, playbook)
      break
  }

  // patterns（截断到 MAX_PATTERNS）
  const patterns = playbook.patterns.slice(0, MAX_PATTERNS)
  if (patterns.length > 0) {
    lines.push('【关键模式】')
    for (const pattern of patterns) {
      lines.push(`- [${pattern.type}] ${pattern.name}：${pattern.promptInstruction}`)
    }
    lines.push('')
  }

  // antiPatterns（截断到 MAX_ANTI_PATTERNS）
  const antiPatterns = playbook.antiPatterns.slice(0, MAX_ANTI_PATTERNS)
  if (antiPatterns.length > 0) {
    lines.push('【必须避免】')
    for (const ap of antiPatterns) {
      lines.push(`- ${ap}`)
    }
    lines.push('')
  }

  // promptRules（截断到 MAX_PROMPT_RULES）
  const promptRules = playbook.promptRules.slice(0, MAX_PROMPT_RULES)
  if (promptRules.length > 0) {
    lines.push('【打法包规则】')
    for (const rule of promptRules) {
      lines.push(`- ${rule}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

// ============================================================
// Stage 专属输出
// ============================================================

function buildSevenQuestionsStageLines(lines: string[], playbook: MarketPlaybookDto): void {
  lines.push('【七问阶段 · 打法包参考】')
  lines.push('- 篇章方向应参考打法包偏好的叙事弧线')

  // 从 patterns 提取关键信息
  const openingPatterns = playbook.patterns.filter((p) => p.type === 'opening_pressure')
  const payoffPatterns = playbook.patterns.filter((p) => p.type === 'payoff')
  const villainPatterns = playbook.patterns.filter((p) => p.type === 'villain_pressure')
  const hookPatterns = playbook.patterns.filter((p) => p.type === 'hook')

  if (openingPatterns.length > 0) {
    lines.push(`- 开局压迫类型：${openingPatterns.map((p) => p.name).join('、')}`)
  }
  if (payoffPatterns.length > 0) {
    lines.push(`- 大爽点分布：${payoffPatterns.map((p) => p.name).join('、')}`)
  }
  if (villainPatterns.length > 0) {
    lines.push(`- 反派递进方式：${villainPatterns.map((p) => p.name).join('、')}`)
  }
  if (hookPatterns.length > 0) {
    lines.push(`- 钩子方式：${hookPatterns.map((p) => p.name).join('、')}`)
  }

  lines.push('')
}

function buildScriptSkeletonStageLines(lines: string[], playbook: MarketPlaybookDto): void {
  lines.push('【剧本骨架阶段 · 打法包参考】')

  const payoffPatterns = playbook.patterns.filter((p) => p.type === 'payoff')
  const villainPatterns = playbook.patterns.filter((p) => p.type === 'villain_pressure')
  const protagonistPatterns = playbook.patterns.filter((p) => p.type === 'protagonist_action')

  if (payoffPatterns.length > 0) {
    lines.push(`- 每 5 集的大爽点打法：${payoffPatterns.map((p) => p.name).join('、')}`)
  }
  if (protagonistPatterns.length > 0) {
    lines.push(`- 底牌释放节奏：${protagonistPatterns.map((p) => p.promptInstruction).join('；')}`)
  }
  if (villainPatterns.length > 0) {
    lines.push(`- 反派层级递进：${villainPatterns.map((p) => p.name).join('、')}`)
  }

  lines.push('- 道具/关系/信息承载方式参考打法包中的 prop_usage 和 relationship_tension 模式')
  lines.push('')
}

function buildEpisodeScriptStageLines(lines: string[], playbook: MarketPlaybookDto): void {
  lines.push('【剧本阶段 · 打法包参考】')

  const openingPatterns = playbook.patterns.filter((p) => p.type === 'opening_pressure')
  const villainPatterns = playbook.patterns.filter((p) => p.type === 'villain_pressure')
  const protagonistPatterns = playbook.patterns.filter((p) => p.type === 'protagonist_action')
  const payoffPatterns = playbook.patterns.filter((p) => p.type === 'payoff')
  const hookPatterns = playbook.patterns.filter((p) => p.type === 'hook')

  if (openingPatterns.length > 0) {
    lines.push(`- 本集场面怎么写：参考${openingPatterns.map((p) => p.name).join('、')}的开局压迫方式`)
  }
  if (villainPatterns.length > 0) {
    lines.push(`- 反派怎么压：${villainPatterns.map((p) => p.promptInstruction).join('；')}`)
  }
  if (protagonistPatterns.length > 0) {
    lines.push(`- 主角怎么反击：${protagonistPatterns.map((p) => p.promptInstruction).join('；')}`)
  }
  if (payoffPatterns.length > 0) {
    lines.push(`- 爽点怎么兑现：${payoffPatterns.map((p) => p.promptInstruction).join('；')}`)
  }
  if (hookPatterns.length > 0) {
    lines.push(`- 钩子怎么留：${hookPatterns.map((p) => p.promptInstruction).join('；')}`)
  }

  // 台词风格（从 dialogue_style pattern 提取）
  const dialoguePatterns = playbook.patterns.filter((p) => p.type === 'dialogue_style')
  if (dialoguePatterns.length > 0) {
    lines.push(`- 台词风格：${dialoguePatterns.map((p) => p.promptInstruction).join('；')}`)
  }

  lines.push('')
}
