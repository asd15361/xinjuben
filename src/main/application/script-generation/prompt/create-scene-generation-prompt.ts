/**
 * src/main/application/script-generation/prompt/create-scene-generation-prompt.ts
 *
 * Prototype-only single-scene generation prompt for the scene-level lane (Plan B).
 * Each scene call gets its own prompt with:
 *   - Scene-specific scaffold (setup/tension/hookEnd)
 *   - Per-scene word count budget (300-400 chars)
 *   - Minimal continuity (prevSceneHook + one-sentence prevSceneOutcome)
 *   - Strict format contract (no 「第X集」, no Action:/Dialogue:/Emotion:)
 *
 * P0 scope: does NOT include auto-extraction of prevSceneOutcome from raw output.
 * That logic belongs to P1/P2 assembly, not P0 prototype.
 *
 * IMPORTANT: this file is NOT part of the current production episode-level chain.
 * Current production path remains:
 * run-script-generation-batch -> create-script-generation-prompt -> parse-generated-scene -> finalize-script-postflight
 */
// ── Contract types ───────────────────────────────────────────────────────────────

export interface SceneScaffoldInput {
  episodeNo: number
  sceneNo: number
  sceneCode: string // e.g. "1-1", "1-2"
  timeOfDay: string // e.g. "日", "夜"
  characters: string[] // e.g. ["林守钥", "沈黑虎"]
  setup: string
  tension: string
  hookEnd: string
  budgetChars: number // max chars for this scene (e.g. 300-400)
  /** One-sentence summary of what happened in the previous scene */
  prevSceneOutcome?: string
  /** The hook line (last action/dialogue) of the previous scene */
  prevSceneHook?: string
  /** Whether this scene is the last scene in the episode */
  isLastScene?: boolean
}

// ── Format contract constants ────────────────────────────────────────────────────

const SCENE_FORMAT_RULES = [
  '【格式合同】（必须，违反则本场输出无效）',
  '本场只输出剧本片段，不输出「第X集」标题。',
  '第一行必须是场景标题，格式：「{sceneCode} {timeOfDay}」，如「1-1 日」。',
  '第二行写「人物：角色1，角色2」（如已有本场人物）。',
  '动作行以 △ 开头，对白行格式为「角色：对白内容」。',
  '禁止使用 Action: / Dialogue: / Emotion: 等段落标记。',
  '禁止输出分析说明、括号注释、幕后工作词。'
] as const

const SCENE_WORDCOUNT_RULES = [
  '【字数合同】（硬约束）',
  '本场不超过 {budgetChars} 字。写完本场推进点就停。',
  '不补背景、不写回想、不加解释句、不重复上一场内容。',
  '冲突未完则留给下一场，不在本场硬塞。'
] as const

const SCENE_QUALITY_RULES = [
  '【质量要求】',
  '本场第一句话必须直接进入动作或对白，不先铺背景。',
  '对白必须能听出「这句话为什么非得这个人现在说」。',
  '结尾必须落在「事情已经开始失控」的可见后果上——对方已有身体/表情/动作反应，威胁已经实际落地，或关键物件状态已经改变。',
  '不接受：动作结束（拳头停下）、态度决定（转身离开）、自我观察（盯着自己发红的手）、注意力转移（转头看向门口）、内心独白、「感到」「决定」类结尾。',
  '【特别注意】solo动作场景（仅1个角色）对白不少于1句；若本场无对白，则必须以关键物件状态变化作结。'
] as const

const HOOK_LANDING_TYPES = [
  '【结尾落点合同】',
  '你必须把「本场 Hook 结尾」写成最后一句已经发生的镜头结果，不是人物准备做什么，而是观众已经看到了什么变化。',
  '最后一句只允许落在以下三类之一：',
  '1. 对方已有可见反应：后退、失手、变脸、出血、松手、扑过去、愣住。',
  '2. 威胁已经落地：刀已压到皮肤、门已被撞开、追兵已冲到眼前、拳头已经砸中。',
  '3. 关键物件状态已变：账册被抢走、钥匙掉出、血手印留在墙上、锁已经断开。',
  '',
  '【结尾正反例】以下对照，帮助你写对最后一句：',
  '',
  '✅ 好的结尾（观众已经看到变化）：',
  '「手榴弹在脚下炸开」→ 威胁已落地，伤害已发生',
  '「敌人的手已经松开，匕首当啷落地」→ 对方反应+物件状态同时成立',
  '「账册已经被撕成两半」→ 物件状态已变',
  '「一柄刀压在她脖子上，她脖子上立刻渗出血丝」→ 威胁落地+可见反应',
  '「追兵已经冲进院子，铁门在身后轰然合上」→ 威胁逼近+物件状态变化',
  '',
  '❌ 弱的结尾（变化尚未发生，只是逼近或观察）：',
  '「他盯着染血的拳头」→ 自我观察，不是对方反应',
  '「一脚踏上第一级台阶」→ 威胁在逼近，尚未造成后果',
  '「火把光骤然照亮了石缝口」→ 危险显形，但尚未造成实际损害',
  '「他的指尖在砖缝上叩了三下」→ 细微预备动作，不算后果落地',
  '「弟弟惊恐的眼睛盯着他」→ 目标有反应，但这是观察型句子，没有危险实际落地',
  '「账册消失在窗外」→ 物件消失，但没有说明消失的后果是什么',
  '「决定转身离开」「攥紧拳头」「准备动手」→ 态度/准备，不是结果',
  '「感觉到背后有人」「意识到危险」「像在看陌生人」→ 内心/认知，不是可见后果',
  '',
  '最后一句：如果写完后发现属于「弱的结尾」任一类型，宁可把动作往前推一步，写到上述三类之一为止。'
] as const

// ── Prompt builder ─────────────────────────────────────────────────────────────

/**
 * Build a single-scene generation prompt.
 *
 * P0 design principles:
 * - Each scene is generated independently with its own word count budget
 * - Continuity is passed as minimal explicit context (not auto-extracted)
 * - Format contract is strict and isolated from the full episode craft rules
 */
export function createSceneGenerationPrompt(input: SceneScaffoldInput): string {
  const lines: string[] = []

  // ── Header ──────────────────────────────────────────────────────────────────
  lines.push(`你正在为短剧写第 ${input.episodeNo} 集第 ${input.sceneNo} 场剧本片段。`)

  // ── Scene scaffold ────────────────────────────────────────────────────────
  lines.push('【本场信息】')
  lines.push(`集号：${input.episodeNo}`)
  lines.push(`场号：${input.sceneNo}`)
  lines.push(`人物：${input.characters.join('，') || '待定'}`)
  lines.push(`本场 Setup：${input.setup || '待补'}`)
  lines.push(`本场 Tension：${input.tension || '待补'}`)
  lines.push(`本场 Hook 结尾：${input.hookEnd || '待补'}`)
  lines.push(
    '把上面这条 Hook 结尾翻译成最后一句已经发生的可见后果，不要写成将要发生、准备发生或人物心里怎么想。'
  )

  // ── Word count budget ──────────────────────────────────────────────────────
  for (const rule of SCENE_WORDCOUNT_RULES) {
    lines.push(rule.replace('{budgetChars}', String(input.budgetChars)))
  }

  // ── Format contract ────────────────────────────────────────────────────────
  for (const rule of SCENE_FORMAT_RULES) {
    lines.push(rule.replace('{sceneCode}', input.sceneCode).replace('{timeOfDay}', input.timeOfDay))
  }

  // ── Quality rules ───────────────────────────────────────────────────────────
  for (const rule of SCENE_QUALITY_RULES) {
    lines.push(rule)
  }
  for (const rule of HOOK_LANDING_TYPES) {
    lines.push(rule)
  }

  // ── Last-scene hook reinforcement ──────────────────────────────────────────
  if (input.isLastScene) {
    lines.push(
      '【当集最后一场强化】本场为当集最后一场，最后一句必须让观众看到局面已经变化：对方已经反应、威胁已经落地，或关键物件状态已经改变。不要停在“他盯着”“他转身”“他决定”。'
    )
  }

  // ── Continuity (P0: minimal, not auto-extracted) ───────────────────────────
  if (input.prevSceneHook || input.prevSceneOutcome) {
    lines.push('【承接要求】')
    if (input.prevSceneOutcome) {
      lines.push(`上一场结局：${input.prevSceneOutcome}`)
    }
    if (input.prevSceneHook) {
      lines.push(`上一场结尾：${input.prevSceneHook}`)
    }
    lines.push('本场开头必须直接承接上一场结尾，不得跳回背景解释或重新铺人物关系。')
  } else {
    lines.push('【承接要求】')
    lines.push('本场为第 1 场，开头直接进入动作或对白。')
  }

  // ── Output instruction ──────────────────────────────────────────────────────
  lines.push('')
  lines.push('直接输出本场剧本片段，不要写任何说明或前缀。')

  return lines.join('\n')
}

// ── Assembly helper (P0: minimal, for testing) ───────────────────────────────────

/**
 * Assemble a list of raw scene outputs into a full episode screenplay string.
 * Used for prototype validation only — not part of the production pipeline.
 *
 * Each sceneOutput should NOT contain the 「第X集」 header.
 * Assembly adds it.
 */
export function assembleScenesForEpisode(episodeNo: number, sceneOutputs: string[]): string {
  const parts: string[] = [`第${episodeNo}集`, '']
  for (const scene of sceneOutputs) {
    parts.push(scene.trim())
    parts.push('')
  }
  return parts.join('\n').trim()
}
