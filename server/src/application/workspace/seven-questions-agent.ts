/**
 * 七问 Agent Prompt 构建器（服务端迁移版）
 *
 * 基于真源(storyIntent)判断剧本是否需要分篇章，并为每个篇章填写七问答案
 * 支持多候选输出，每次至少生成 2 个不同方向的七问方案
 */

import type { MarketPlaybookDto } from '../../../../src/shared/contracts/market-playbook.ts'
import {
  buildMarketPlaybookPromptBlock
} from '../../../../src/shared/domain/market-playbook/playbook-prompt-block.ts'
import {
  buildNarrativeConstraintLocks,
  renderNarrativeConstraintPromptBlock,
  validateNarrativeConstraintLocks
} from './narrative-constraint-locks.ts'

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
  confirmedChatTranscript?: string
  /** 聊天摘要（创作信息总结） */
  creativeSummary?: string
  /** 结构化故事梗概 */
  storySynopsis?: {
    logline?: string
    openingPressureEvent?: string
    protagonistCurrentDilemma?: string
    firstFaceSlapEvent?: string
    antagonistForce?: string
    antagonistPressureMethod?: string
    corePayoff?: string
    stageGoal?: string
    keyFemaleCharacterFunction?: string
    episodePlanHint?: string
    finaleDirection?: string
  }
}

export interface SevenQuestionsResult {
  needsSections: boolean
  sectionCount: number
  sectionCountReason: string
  /** 候选方案的总集数，必须等于用户要求的集数 */
  totalEpisodes: number
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

export interface SevenQuestionCandidate {
  id: string
  title: string
  summary: string
  result: SevenQuestionsResult
  createdAt: string
  source: 'generated' | 'regenerated' | 'edited'
}

export interface ParseSevenQuestionsResult {
  candidates: ValidatedCandidate[]
  needsMoreCandidates: boolean
}

export interface CandidateValidationError {
  field: string
  message: string
}

export interface ValidatedCandidate extends SevenQuestionCandidate {
  validationErrors: CandidateValidationError[]
  isValid: boolean
}

function generateCandidateId(): string {
  return `cand_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 验证候选方案是否符合集数、篇章、节奏约束
 */
export function validateCandidate(
  candidate: SevenQuestionCandidate,
  expectedEpisodes: number,
  storyIntent?: StoryIntentInput
): CandidateValidationError[] {
  const errors: CandidateValidationError[] = []
  const result = candidate.result

  // P0: 集数硬对齐
  if (result.totalEpisodes !== expectedEpisodes) {
    errors.push({
      field: 'totalEpisodes',
      message: `集数不一致：用户要求 ${expectedEpisodes} 集，当前方案 ${result.totalEpisodes} 集`
    })
  }

  // P1: 篇章数量一致性。七问已降级为内部叙事约束，不再按每 5 集强拆篇章。
  const sectionCount = result.sections.length
  if (sectionCount < 1) {
    errors.push({
      field: 'sectionCount',
      message: `篇章数不足：${expectedEpisodes} 集至少需要 1 个全剧篇章`
    })
  }

  if (result.sectionCount !== sectionCount) {
    errors.push({
      field: 'sectionCount',
      message: `篇章数量声明不一致：sectionCount=${result.sectionCount}，实际 sections=${sectionCount}`
    })
  }

  // 检查篇章是否完整覆盖所有集数
  if (result.sections.length > 0) {
    const actualStart = Math.min(...result.sections.map((s) => s.startEpisode))
    const actualEnd = Math.max(...result.sections.map((s) => s.endEpisode))
    if (actualStart !== 1 || actualEnd !== expectedEpisodes) {
      errors.push({
        field: 'episodeCoverage',
        message: `集数覆盖不完整：篇章覆盖第 ${actualStart}—${actualEnd} 集，应为第 1—${expectedEpisodes} 集`
      })
    }
  }

  const narrativeLocks = buildNarrativeConstraintLocks(storyIntent)
  errors.push(...validateNarrativeConstraintLocks(candidate, narrativeLocks))

  // P3: 检查任何非最后一集篇章的 ending 是否提前大结局
  const earlyFinalePatterns = [
    '推翻仙界',
    '杀上仙界',
    '完成逆袭',
    '大结局',
    '最终胜利',
    '登顶收官',
    '摧毁组织',
    '清算旧势力'
  ]
  for (const section of result.sections) {
    if (section.endEpisode >= expectedEpisodes) continue
    const ending = section.sevenQuestions.ending
    for (const pattern of earlyFinalePatterns) {
      if (ending.includes(pattern)) {
        errors.push({
          field: 'ending',
          message: `提前大结局：第 ${section.endEpisode} 集就出现「${pattern}」，应在第 ${expectedEpisodes} 集才收官`
        })
        break
      }
    }
  }

  // P3: 检查前 50% 篇章是否把最大底牌打光
  const halfPoint = expectedEpisodes / 2
  const earlySections = result.sections.filter((s) => s.endEpisode <= halfPoint)
  for (const section of earlySections) {
    const twist = section.sevenQuestions.twist
    const earlyTwistPatterns = ['神尊转世', '万年前神尊', '神尊之力完全觉醒', '终极底牌']
    for (const pattern of earlyTwistPatterns) {
      if (twist.includes(pattern)) {
        errors.push({
          field: 'twist',
          message: `底牌过早暴露：第 ${section.endEpisode} 集就出现「${pattern}」，最大底牌应在后半段才释放`
        })
        break
      }
    }
  }

  return errors
}

/**
 * 构建七问 Agent Prompt
 */
export function buildSevenQuestionsPrompt(
  storyIntent: StoryIntentInput,
  totalEpisodes: number = 10,
  marketPlaybook?: MarketPlaybookDto | null
): string {
  const episodes = totalEpisodes || storyIntent.dramaticMovement?.length || 10
  const narrativeLocks = buildNarrativeConstraintLocks(storyIntent)
  const isXianxia = /修仙|玄幻|宗门|魔尊|仙盟|血脉|封印/.test(
    [
      storyIntent.genre,
      storyIntent.tone,
      storyIntent.coreConflict,
      storyIntent.creativeSummary,
      storyIntent.storySynopsis?.logline,
      storyIntent.storySynopsis?.antagonistForce,
      storyIntent.storySynopsis?.antagonistPressureMethod
    ].join('\n')
  )
  const candidateATitle = isXianxia ? '方案A：魔尊废柴打脸流' : '方案A：逆袭打脸流'
  const candidateASummary = isXianxia
    ? '侧重吊坠破碎、血脉初醒和宗门羞辱后的连续打脸'
    : '侧重主角从低谷到觉醒的连续打脸爽感'
  const candidateBTitle = isXianxia ? '方案B：仙盟伪善黑幕流' : '方案B：黑幕反转流'
  const candidateBSummary = isXianxia
    ? '侧重正道仙盟伪善、大小姐利用和身世真相反转'
    : '侧重反派黑幕揭露与身份反转，中后期爆发'

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
  lines.push('- 候选方案只能改变叙事侧重点，不能改变题材、世界观、反派势力和用户已确认的集数')
  lines.push('- 如果真源是修仙/魔尊/宗门，不得生成刺客、武林、现代黑帮、纯悬疑组织背叛等偏题方案')
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

  // 故事梗概（优先）
  const synopsis = storyIntent.storySynopsis
  if (synopsis && synopsis.logline) {
    lines.push('【故事梗概——这是生成七问的核心依据】')
    lines.push(`- 一句话梗概：${synopsis.logline}`)
    lines.push(`- 开局压迫事件：${synopsis.openingPressureEvent || '未填'}`)
    lines.push(`- 主角当前困境：${synopsis.protagonistCurrentDilemma || '未填'}`)
    lines.push(`- 第一场打脸：${synopsis.firstFaceSlapEvent || '未填'}`)
    lines.push(`- 核心反派/势力：${synopsis.antagonistForce || '未填'}`)
    lines.push(`- 反派压迫方式：${synopsis.antagonistPressureMethod || '未填'}`)
    lines.push(`- 核心爽点：${synopsis.corePayoff || '未填'}`)
    lines.push(`- 主角阶段目标：${synopsis.stageGoal || '未填'}`)
    lines.push(`- 结局方向：${synopsis.finaleDirection || '未填'}`)
    if (synopsis.keyFemaleCharacterFunction) {
      lines.push(`- 女主功能：${synopsis.keyFemaleCharacterFunction}`)
    }
    if (synopsis.episodePlanHint) {
      lines.push(`- 集数规划：${synopsis.episodePlanHint}`)
    }
    lines.push('')
  }

  // 创作信息总结
  if (storyIntent.creativeSummary) {
    lines.push('【创作信息总结（聊天摘要）】')
    lines.push(storyIntent.creativeSummary)
    lines.push('')
  }

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

  // MarketPlaybook B 层注入
  const playbookBlock = buildMarketPlaybookPromptBlock({
    playbook: marketPlaybook,
    stage: 'seven_questions'
  })
  if (playbookBlock) {
    lines.push(playbookBlock)
    lines.push('')
  }

  const narrativeConstraintBlock = renderNarrativeConstraintPromptBlock(narrativeLocks)
  if (narrativeConstraintBlock) {
    lines.push(narrativeConstraintBlock)
    lines.push('')
  }

  if (isXianxia) {
    lines.push('【男频修仙题材硬约束】')
    lines.push('- 必须使用修仙语汇：宗门、灵力/魔力、封印、血脉、仙盟/正道仙盟、秘境、法阵')
    lines.push('- “反派大小姐”必须是正道仙盟/名门仙宗势力，不得改成刺客组织成员')
    lines.push('- “武林盟主/武林盟”必须改写为“正道仙盟盟主/太玄仙盟”等修仙势力')
    lines.push('- “真爱之力”必须改写为宗门禁术、护心血、封魔阵眼、灵契代价等修仙机制')
    lines.push('- 每个候选都必须保留：吊坠被踩碎、魔尊血脉、女主暗中守护、反派大小姐利用、父母旧仇')
    lines.push('- 女主线必须是“默默守护但被男主忽视/误解善意”，不要写成“女主是敌人”或正面敌对')
    lines.push('- 女主可以被男主冷落、误会善意、觉得多管闲事，但不得写成“被主角误解/怀疑为敌人”')
    lines.push('- 终局女主可以重伤、昏迷、濒死后被救回；不得写“牺牲自己/死亡”再用一句话改成未死')
    lines.push('- 吊坠被踩碎后必须保留后续价值：碎片/残片藏有母亲记忆、父母遗言、血脉封印图谱或禁地线索')
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

  lines.push('【输出格式——必须输出 candidates 数组】')
  lines.push('')
  lines.push('请至少生成 2 个不同方向的七问方案，按以下 JSON 格式输出：')
  lines.push('')
  lines.push('{')
  lines.push('  "candidates": [')
  lines.push('    {')
  lines.push(`      "title": "${candidateATitle}",`)
  lines.push(`      "summary": "${candidateASummary}",`)
  lines.push('      "needsSections": true/false,')
  lines.push('      "sectionCount": 1/2/3,')
  lines.push('      "sectionCountReason": "...",')
  lines.push(`      "totalEpisodes": ${episodes},`)
  lines.push('      "sections": [')
  lines.push('        {')
  lines.push('          "sectionNo": 1,')
  lines.push('          "sectionTitle": "第一篇章：xxx",')
  lines.push('          "startEpisode": 1,')
  lines.push('          "endEpisode": xx,')
  lines.push('          "sevenQuestions": {')
  lines.push('            "goal": "...",')
  lines.push('            "obstacle": "...",')
  lines.push('            "effort": "...",')
  lines.push('            "result": "...",')
  lines.push('            "twist": "...",')
  lines.push('            "turnaround": "...",')
  lines.push('            "ending": "..."')
  lines.push('          }')
  lines.push('        }')
  lines.push('      ]')
  lines.push('    },')
  lines.push('    {')
  lines.push(`      "title": "${candidateBTitle}",`)
  lines.push(`      "summary": "${candidateBSummary}",`)
  lines.push('      "needsSections": true/false,')
  lines.push('      "sectionCount": 1/2/3,')
  lines.push('      "sectionCountReason": "...",')
  lines.push(`      "totalEpisodes": ${episodes},`)
  lines.push('      "sections": [...]')
  lines.push('    }')
  lines.push('  ]')
  lines.push('}')
  lines.push('')
  lines.push(`【集数硬约束——绝对不可违反】`)
  lines.push(`- 用户明确要求 ${episodes} 集，每个候选的 totalEpisodes 必须严格等于 ${episodes}`)
  lines.push(`- 所有篇章的 startEpisode 和 endEpisode 必须连续覆盖第 1 集到第 ${episodes} 集，不能少、不能多`)
  lines.push('')
  lines.push(`【篇章分配规则】`)
  lines.push('- 七问不是 5 集技术批次，不要按每 5 集强行拆篇章')
  lines.push('- 20 集默认只用 1 个全剧篇章，除非真源明确有跨地图、跨年份或主目标反转')
  lines.push('- 60 集可以分 3 个篇章：前期立局、中期翻盘、后期清算；没有明显阶段变化时也可以只用 1 个全剧篇章')
  lines.push('- 5 集一批只属于后续粗纲/详纲/剧本生成的技术批次，不是七问篇章划分依据')
  lines.push('')
  lines.push('【短剧节奏锚点——每个篇章必须包含】')
  lines.push('- 第1集：开局强压迫 + 第一次小打脸（30秒内必须出现冲突）')
  lines.push('- 每5集来一次大爽点（当众打脸 / 身份揭晓 / 碾压）')
  lines.push('- 前50%集数只能让底牌初显，不能把最大底牌打光')
  lines.push('- 最后1集必须停在爽点前0.1秒，留钩子逼观众看下一集（如果是最后一集则收官）')
  lines.push('')
  lines.push('【最大底牌释放节奏——严禁提前打光】')
  lines.push('- 前50%集数：主角只能隐忍、布局、收集信息，底牌最多亮一小角')
  lines.push('- 第51%-75%集数：身份/实力部分暴露，清算中层反派')
  lines.push('- 最后25%集数：最大底牌完全释放，终极对决，收官')
  lines.push('- 严禁在第10集（20集剧的前半段）就「神尊转世」「推翻仙界」「杀上仙界」「完成逆袭」')
  lines.push('')
  lines.push('【重要规则】')
  lines.push('- 必须输出 candidates 数组，至少 2 个候选')
  lines.push('- 每个候选的 title 必须明确体现方向差异（如"打脸流"vs"仙盟黑幕流"），但不得换题材')
  lines.push('- 每个候选的 summary 不超过 50 字，说清楚这个方案的核心爽感方向')
  lines.push('- 不要输出任何 candidates 数组之外的顶层字段')
  lines.push('- 不要输出解释性文字，只输出纯 JSON')

  return lines.join('\n')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseSingleCandidate(
  raw: Record<string, unknown>,
  expectedEpisodes: number,
  storyIntent?: StoryIntentInput
): ValidatedCandidate | null {
  const sections = Array.isArray(raw.sections) ? raw.sections : []
  if (sections.length === 0) return null

  const parsedSections = sections.map((s: Record<string, unknown>) => {
    const sevenQuestions = isRecord(s.sevenQuestions) ? s.sevenQuestions : {}
    return {
      sectionNo: Number(s.sectionNo) || 1,
      sectionTitle: String(s.sectionTitle || ''),
      startEpisode: Number(s.startEpisode) || 1,
      endEpisode: Number(s.endEpisode) || expectedEpisodes,
      sevenQuestions: {
        goal: String(sevenQuestions.goal || ''),
        obstacle: String(sevenQuestions.obstacle || ''),
        effort: String(sevenQuestions.effort || ''),
        result: String(sevenQuestions.result || ''),
        twist: String(sevenQuestions.twist || ''),
        turnaround: String(sevenQuestions.turnaround || ''),
        ending: String(sevenQuestions.ending || '')
      }
    }
  })

  const candidate: SevenQuestionCandidate = {
    id: generateCandidateId(),
    title: String(raw.title || '未命名方案'),
    summary: String(raw.summary || ''),
    result: {
      needsSections: Boolean(raw.needsSections),
      sectionCount: Number(raw.sectionCount) || parsedSections.length,
      sectionCountReason: String(raw.sectionCountReason || ''),
      totalEpisodes: Number(raw.totalEpisodes) || expectedEpisodes,
      sections: parsedSections
    },
    createdAt: new Date().toISOString(),
    source: 'generated'
  }

  const validationErrors = validateCandidate(candidate, expectedEpisodes, storyIntent)

  return {
    ...candidate,
    validationErrors,
    isValid: validationErrors.length === 0
  }
}

/**
 * 解析七问 Agent 返回的 JSON
 *
 * 支持新格式（candidates 数组）和旧格式（直接 SevenQuestionsResult）
 */
export function parseSevenQuestionsResponse(
  rawText: string,
  expectedEpisodes: number = 10,
  storyIntent?: StoryIntentInput
): ParseSevenQuestionsResult {
  try {
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/g, '')
      .replace(/```$/g, '')
      .trim()

    const parsed = JSON.parse(cleaned)

    // 新格式：candidates 数组
    if (Array.isArray(parsed.candidates)) {
      const candidates = parsed.candidates
        .map((c: Record<string, unknown>) => parseSingleCandidate(c, expectedEpisodes, storyIntent))
        .filter((c: ValidatedCandidate | null): c is ValidatedCandidate => c !== null)

      return {
        candidates,
        needsMoreCandidates: candidates.length < 2
      }
    }

    // 旧格式：直接 SevenQuestionsResult（兼容）
    if (Array.isArray(parsed.sections)) {
      const candidate = parseSingleCandidate(parsed, expectedEpisodes, storyIntent)
      if (candidate) {
        return {
          candidates: [candidate],
          needsMoreCandidates: true
        }
      }
    }

    return {
      candidates: [],
      needsMoreCandidates: true
    }
  } catch {
    return {
      candidates: [],
      needsMoreCandidates: true
    }
  }
}
