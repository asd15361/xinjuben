/**
 * src/shared/contracts/character-profile-v2.ts
 *
 * 五维人物小传模型 DTO。
 *
 * 核心原则：
 * 1. 五维模型锁死：外在形象/性格特点/身份/价值观/剧情作用 必填
 * 2. 禁止流水账剧情：小传只定义"什么样的人"+"为什么活"+"提供什么功能"
 * 3. 差异化层级：核心人物详尽、中层精简、龙套一行字
 */

// ─────────────────────────────────────────────────────────────────────────────
// 五维人物模型
// ─────────────────────────────────────────────────────────────────────────────

/** 人物层级深度 */
export type CharacterDepthLevel = 'core' | 'mid' | 'extra'

/** 五维人物小传 V2 DTO */
export interface CharacterProfileV2Dto {
  /** 唯一 ID */
  id: string
  /** 角色名称 */
  name: string
  /** 角色层级：核心(3-5人超详尽)、中层(重点3维)、龙套(1行字) */
  depthLevel: CharacterDepthLevel
  /** 所属势力 ID（来自势力拆解表，可选） */
  factionId?: string
  /** 所属二级分支 ID（可选） */
  branchId?: string
  /** 在势力中的角色（来自势力拆解表，可选） */
  roleInFaction?: 'leader' | 'enforcer' | 'variable' | 'functional'

  // ── 五维必填 ──────────────────────────────────────────────

  /** 【维度1】外在形象：年龄、性别、身高体型、穿衣风格、标志性外貌特征 */
  appearance: string
  /** 【维度2】性格特点：核心性格驱动力（如：敏感自卑、嫉恶如仇、乐观豁达） */
  personality: string
  /** 【维度3】身份：职业或剧中身份（如：县令之子、客栈小二、玄玉宫二长老、江湖游侠） */
  identity: string
  /** 【维度4】价值观：人物行动的根源信条（如：秩序至上、弱肉强食、家族荣耀高于一切） */
  values: string
  /** 【维度5】剧情作用：人物在全剧中提供的核心功能（如：用工业技术在古代建功、替主角挡刀的忠诚者、制造信息差的卧底） */
  plotFunction: string
  /** 绑定的短剧爽点类型：核心人物 2-3 个，中层/功能人物可选 */
  payoffTags?: string[]
  /** 可复用演员/功能位标识：同一人物可跨多个场景反复承担同类任务 */
  reusableRoleKey?: string
  /** 建议复用出现的场景键，如：宗门大殿/执法堂/山门/柴房 */
  reuseSceneKeys?: string[]

  // ── 核心人物扩展字段（depthLevel=core 时必须填写） ─────────

  /** 隐藏压力：不愿被人知道的软肋或弱点（核心必填，中层选填，龙套空） */
  hiddenPressure?: string
  /** 最怕失去什么（核心必填） */
  fear?: string
  /** 最想守住什么（核心必填） */
  protectTarget?: string
  /** 被逼到什么点会动（核心必填） */
  conflictTrigger?: string
  /** 能打的点——戏里直接生效的抓手（核心必填） */
  advantage?: string
  /** 最容易出事的弱点（核心必填） */
  weakness?: string
  /** 这一季人物目标（核心必填） */
  goal?: string
  /** 成长弧光：从什么到什么（核心必填） */
  arc?: string
  /** 表面演法：在压力场里怎么演、怎么藏（核心必填） */
  publicMask?: string

  /** 是否被用户锁定（局部重绘：锁定则不重跑） */
  isLocked?: boolean

  // ── 兼容旧字段（从势力拆解表映射，或在无势力场景下直接填写） ─────────

  /** 人物底色（兼容旧 biography 字段，内容来自五维综合摘要） */
  biography?: string
}

function cleanSentence(value: string | undefined): string {
  return (value || '')
    .replace(/\s+/g, ' ')
    .replace(/。，/gu, '，')
    .replace(/，。/gu, '。')
    .replace(/。。+/gu, '。')
    .replace(/，，+/gu, '，')
    .replace(/[，,。；;、\s]+$/u, '')
    .trim()
}

function stripTrailingTemporalParticle(value: string): string {
  return value.replace(/(?:的时候|之时|时)$/u, '').trim()
}

function stripLeadingAdversative(value: string): string {
  return cleanSentence(value).replace(/^(?:但|但是|然而|可|可是|却)/u, '').trim()
}

function normalizePlotFunctionText(value: string): string {
  const text = cleanSentence(value)
    .replace(/^作为/u, '以')
    .replace(/是.+在主线里的作用$/u, '')
    .trim()
  return text || '推动主线冲突向前'
}

function joinSentences(...values: Array<string | undefined>): string {
  return values
    .map(cleanSentence)
    .filter(Boolean)
    .map((value) => `${value}。`)
    .join('')
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => cleanSentence(String(item ?? '')))
    .filter(Boolean)
}

function hasNaturalBiography(value: string | undefined): boolean {
  const text = cleanSentence(value)
  if (!text) return false
  if (/[。，]{2,}|。，|。。/u.test(text)) return false
  if (/^(?:身份|价值观|剧情作用)[:：]/u.test(text)) return false
  if (/(?:身份|价值观|剧情作用)[:：]/u.test(text.slice(0, 40))) return false
  if (/身份是|性格底色|在戏里|每次选择都牵动|牵动[他她]的软肋/u.test(text)) return false
  if (/让.+信奉|在主线里的作用|行动抓手/u.test(text)) return false
  if (/^.+[，,].+。.+。.+$/u.test(text) && /价值观|剧情作用|身份/u.test(text)) return false
  return text.length >= 18
}

function buildNaturalBiography(profile: CharacterProfileV2Dto): string {
  const appearance = cleanSentence(profile.appearance)
  const personality = cleanSentence(profile.personality)
  const identity = cleanSentence(profile.identity)
  const values = cleanSentence(profile.values)
  const plotFunction = normalizePlotFunctionText(profile.plotFunction)
  const pressure =
    cleanSentence(profile.hiddenPressure) ||
    cleanSentence(profile.fear) ||
    cleanSentence(profile.protectTarget)
  const trigger = cleanSentence(profile.conflictTrigger)
  const playableHandle = cleanSentence(profile.advantage)

  const triggerText = trigger ? stripTrailingTemporalParticle(trigger) : ''
  const pressureText = pressure ? stripLeadingAdversative(pressure) : ''
  const actionText = playableHandle
    ? `${profile.name}会动用${playableHandle}`
    : `${profile.name}会被逼出手`
  const lines = [
    `${profile.name}是${identity || '局中关键人物'}${appearance ? `，${appearance}` : ''}`,
    `${profile.name}${personality ? `性子${personality}` : '在压力里会主动动作'}，看重${
      values || '自己认定的立场'
    }${pressureText ? `，同时被${pressureText}逼着往前走` : ''}`,
    `在主线里，${profile.name}${plotFunction}${
      triggerText || playableHandle ? `；只要${triggerText || '核心矛盾压到眼前'}，${actionText}` : ''
    }`,
  ].filter(Boolean)

  return joinSentences(...lines)
}

function hasStructuredArc(value: string | undefined): boolean {
  const text = cleanSentence(value)
  if (!text) return false
  const hasAllLabels =
    /起点[:：]/u.test(text) &&
    /触发[:：]/u.test(text) &&
    /(?:摇摆|中段摇摆)[:：]/u.test(text) &&
    /代价选择[:：]/u.test(text) &&
    /终局(?:变化)?[:：]/u.test(text)
  if (hasAllLabels) return true

  return /起点/u.test(text) && /触发/u.test(text) && /摇摆/u.test(text) && /代价/u.test(text) && /终局/u.test(text)
}

function needsStructuredArc(value: string | undefined): boolean {
  const text = cleanSentence(value)
  if (!text) return true
  return !hasStructuredArc(text)
}

function stripArcStageLabel(value: string): string {
  const text = cleanSentence(value)
    .replace(/^(?:起点|触发(?:事件)?|中段摇摆|摇摆|代价选择|终局(?:变化)?)[：:]\s*/u, '')
    .replace(/^(?:起点|触发(?:事件)?|中段摇摆|摇摆|代价选择|终局(?:变化)?)(?:是|为|于)\s*/u, '')
    .replace(/^起点的/u, '')
    .trim()
  return text || cleanSentence(value)
}

function normalizeArcStageValue(value: string): string {
  return stripArcStageLabel(value)
    .replace(/\s*(?:→|->|=>|—>|-->)\s*(?:起点|触发(?:事件)?|中段摇摆|摇摆|代价选择|终局(?:变化)?)[：:].*$/u, '')
    .replace(/\s*(?:→|->|=>|—>|-->)\s*(?:起点|触发(?:事件)?|中段摇摆|摇摆|代价选择|终局(?:变化)?)(?:是|为|于).*$/u, '')
    .trim()
}

function extractArcStage(rawArc: string, labelPattern: string): string {
  const match = rawArc.match(
    new RegExp(`${labelPattern}[：:]\\s*([\\s\\S]*?)(?=；\\s*(?:起点|触发(?:事件)?|中段摇摆|摇摆|代价选择|终局(?:变化)?)[：:]|$)`, 'u')
  )
  return normalizeArcStageValue(match?.[1] || '')
}

function simplifyRepeatedEnding(value: string): string {
  const text = stripArcStageLabel(value)
  const finalMatch = text.match(/(最终[^；。]*?(?:反噬|反杀|败亡|陨落|悔悟|堕落|身败名裂|道消身殒|被击败|被清算|承担后果|走向毁灭))/u)
  if (finalMatch) return cleanSentence(finalMatch[1])
  const segments = text
    .split(/[；;]/u)
    .map(stripArcStageLabel)
    .filter(Boolean)
  return segments[segments.length - 1] || text
}

function hasRepeatedStructuredEnding(value: string | undefined): boolean {
  const text = cleanSentence(value)
  const end = extractArcStage(text, '终局(?:变化)?')
  return Boolean(end && /起点|中期|后期|触发|摇摆|代价选择/u.test(end))
}

function hasArcTemplateLeak(value: string | undefined): boolean {
  const text = cleanSentence(value)
  return /起点(?:是|为)|触发(?:事件)?(?:是|为)|中段摇摆于|代价选择是|(?:→|->|=>|—>|-->)\s*终局/u.test(text)
}

function buildStructuredArc(profile: CharacterProfileV2Dto): string {
  const rawArc = cleanSentence(profile.arc)
  const labeledStart = extractArcStage(rawArc, '起点')
  const labeledTrigger = extractArcStage(rawArc, '触发(?:事件)?')
  const labeledWobble = extractArcStage(rawArc, '(?:中段摇摆|摇摆)')
  const labeledCost = extractArcStage(rawArc, '代价选择')
  const labeledEnd = extractArcStage(rawArc, '终局(?:变化)?')
  const chainSteps = rawArc
    .split(/\s*(?:→|->|=>|—>|-->)\s*/u)
    .map(stripArcStageLabel)
    .filter(Boolean)
  const hasChain = chainSteps.length > 1
  const start = labeledStart || (hasChain
    ? chainSteps[0]
    : rawArc
      ? stripArcStageLabel(rawArc.replace(/，?最终.+$/u, '').replace(/从/u, '从'))
      : `${profile.name}被旧处境和原有身份困住`)
  const trigger =
    labeledTrigger ||
    stripTrailingTemporalParticle(cleanSentence(profile.conflictTrigger)) ||
    `${profile.name}被核心冲突逼到必须动作`
  const wobble =
    labeledWobble ||
    cleanSentence(profile.fear) ||
    cleanSentence(profile.hiddenPressure) ||
    cleanSentence(profile.weakness) ||
    `${profile.name}发现原来的活法已经压不住眼前局面`
  const cost =
    normalizeArcStageValue(labeledCost) ||
    cleanSentence(profile.protectTarget) ||
    cleanSentence(profile.goal) ||
    cleanSentence(profile.values) ||
    '必须在利益、情感和生存之间做选择'
  const end =
    simplifyRepeatedEnding(labeledEnd) ||
    stripArcStageLabel(hasChain ? chainSteps[chainSteps.length - 1] : rawArc) ||
    `${profile.name}在关键选择后承担后果，位置和关系都被重新改写`

  return `起点：${start}；触发：${trigger}；摇摆：${wobble}；代价选择：${cost}；终局变化：${end}。`
}

function cleanPublicMask(value: string | undefined): string {
  return cleanSentence(value)
    .replace(/^表面[是：:]\s*/u, '')
    .replace(/^这个人物表面[是：:]\s*/u, '')
    .trim()
}

/**
 * 从 CharacterProfileV2Dto 生成兼容旧版 CharacterDraftDto 的字段映射。
 * 用于向下兼容旧的生成管线。
 */
export function mapV2ToLegacyCharacterDraft(profile: CharacterProfileV2Dto): {
  name: string
  biography: string
  publicMask: string
  hiddenPressure: string
  fear: string
  protectTarget: string
  conflictTrigger: string
  advantage: string
  weakness: string
  goal: string
  arc: string
  appearance: string
  personality: string
  identity: string
  values: string
  plotFunction: string
  payoffTags: string[]
  reusableRoleKey?: string
  reuseSceneKeys?: string[]
  depthLevel: CharacterDepthLevel
  roleLayer: 'core' | 'active' | 'functional'
} {
  return {
    name: profile.name,
    biography: hasNaturalBiography(profile.biography) && cleanSentence(profile.biography).includes(profile.name)
      ? joinSentences(profile.biography)
      : buildNaturalBiography(profile),
    publicMask: cleanPublicMask(profile.publicMask) || (profile.depthLevel === 'core' ? '待补' : ''),
    hiddenPressure: profile.hiddenPressure || '',
    fear: profile.fear || '',
    protectTarget: profile.protectTarget || '',
    conflictTrigger: profile.conflictTrigger || '',
    advantage: profile.advantage || '',
    weakness: profile.weakness || '',
    goal: profile.goal || profile.values,
    arc:
      needsStructuredArc(profile.arc) || hasRepeatedStructuredEnding(profile.arc) || hasArcTemplateLeak(profile.arc)
        ? buildStructuredArc(profile)
        : profile.arc || '',
    appearance: profile.appearance,
    personality: profile.personality,
    identity: profile.identity,
    values: profile.values,
    plotFunction: profile.plotFunction,
    payoffTags: normalizeStringList(profile.payoffTags),
    reusableRoleKey: cleanSentence(profile.reusableRoleKey) || undefined,
    reuseSceneKeys: normalizeStringList(profile.reuseSceneKeys),
    depthLevel: profile.depthLevel,
    roleLayer:
      profile.depthLevel === 'core'
        ? 'core'
        : profile.depthLevel === 'mid'
          ? 'active'
          : 'functional'
  }
}
