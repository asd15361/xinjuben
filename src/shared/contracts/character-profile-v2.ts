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
  depthLevel: CharacterDepthLevel
  roleLayer: 'core' | 'active' | 'functional'
} {
  return {
    name: profile.name,
    biography:
      profile.biography || `${profile.identity}，${profile.values}。${profile.plotFunction}`,
    publicMask: profile.publicMask || (profile.depthLevel === 'core' ? '待补' : ''),
    hiddenPressure: profile.hiddenPressure || '',
    fear: profile.fear || '',
    protectTarget: profile.protectTarget || '',
    conflictTrigger: profile.conflictTrigger || '',
    advantage: profile.advantage || '',
    weakness: profile.weakness || '',
    goal: profile.goal || profile.values,
    arc: profile.arc || '',
    appearance: profile.appearance,
    personality: profile.personality,
    identity: profile.identity,
    values: profile.values,
    plotFunction: profile.plotFunction,
    depthLevel: profile.depthLevel,
    roleLayer:
      profile.depthLevel === 'core'
        ? 'core'
        : profile.depthLevel === 'mid'
          ? 'active'
          : 'functional'
  }
}
