/**
 * src/shared/contracts/faction-matrix.ts
 *
 * 势力拆解表 DTO 定义。
 *
 * 核心设计原则：
 * 1. 宏观与微观分层：一级势力 → 二级分支 → 1+2+X 人物编制
 * 2. 势力交叉渗透：crossRelations 明确卧底、表面盟友、暗敌关系
 * 3. 用于支撑 60-80 集的庞大世界观，让冲突从人升维到阵营
 */

// ─────────────────────────────────────────────────────────────────────────────
// 势力关系类型
// ─────────────────────────────────────────────────────────────────────────────

/** 势力之间的交叉关系类型 */
export type CrossRelationType =
  | 'sleeper_agent' // 卧底：A 安插在 B 中的人
  | 'secret_ally' // 暗盟：表面敌对，暗中合作
  | 'secret_enemy' // 暗敌：表面盟友，实则死敌
  | 'pawn' // 棋子：A 把 B 当棋子操控
  | 'defector' // 叛逃：从 A 投向 B
  | 'double_agent' // 双面间谍：同时给两方卖情报
  | 'hostage_bond' // 人质羁绊：因人质关系被迫从属
  | 'debtor' // 债务从属：因欠债或把柄被迫从属

/** 势力交叉关系条目 */
export interface CrossRelationDto {
  /** 唯一 ID */
  id: string
  /** 关系类型 */
  relationType: CrossRelationType
  /** 主动方：谁安插/谁操控/谁叛逃 */
  fromFactionId: string
  /** 被动方：被安插在哪个势力/被谁操控 */
  toFactionId: string
  /** 涉及的具体人物 ID（可选） */
  involvedCharacterIds?: string[]
  /** 关系简述（一句话） */
  description: string
  /** 预计爆发集数（何时关系被揭露/反转） */
  revealEpisodeRange?: {
    start: number
    end: number
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 人物占位符（1+2+X 编制）
// ─────────────────────────────────────────────────────────────────────────────

/** 人物在势力中的角色类型 */
export type CharacterRoleInFaction =
  | 'leader' // 领袖：定策略、拍板
  | 'enforcer' // 干将：执行冲突、打手
  | 'variable' // 变数/内鬼：立场摇摆、暗棋
  | 'functional' // 功能性龙套：一个场景一个作用

/** 势力中的人物占位符 */
export interface CharacterPlaceholderDto {
  /** 唯一 ID */
  id: string
  /** 人物名称（可暂用代号如"反派阵营_干将_01"） */
  name: string
  /** 在势力中的角色 */
  roleInFaction: CharacterRoleInFaction
  /** 所属二级分支 ID */
  branchId: string
  /** 角色层级：核心(3-5人超详尽)、中层(重点3维度)、龙套(一行字) */
  depthLevel: 'core' | 'mid' | 'extra'
  /** 身份一句话（如：客栈小二 / 玄玉宫二长老） */
  identity: string
  /** 核心动机一句话（如：求财 / 为父报仇 / 维护宗门秩序） */
  coreMotivation: string
  /** 剧情作用一句话 */
  plotFunction: string
  /** 是否为其他势力的卧底/暗线 */
  isSleeper?: boolean
  /** 如果是卧底，为哪个势力服务 */
  sleeperForFactionId?: string
  /** 是否被用户锁定（局部重绘：锁定则不重跑） */
  isLocked?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// 二级分支
// ─────────────────────────────────────────────────────────────────────────────

/** 一级势力下的二级分支 */
export interface FactionBranchDto {
  /** 唯一 ID */
  id: string
  /** 分支名称（如：激进派、保守派、少壮派） */
  name: string
  /** 所属一级势力 ID */
  parentFactionId: string
  /** 分支定位一句话（如：主张武力清洗的少壮军官团） */
  positioning: string
  /** 分支下的人物占位符 */
  characters: CharacterPlaceholderDto[]
  /** 分支核心诉求（与一级势力的关系） */
  coreDemand: string
  /** 是否被用户锁定（局部重绘：锁定则不重跑） */
  isLocked?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// 一级势力
// ─────────────────────────────────────────────────────────────────────────────

/** 一级势力 */
export interface FactionDto {
  /** 唯一 ID */
  id: string
  /** 势力名称（如：正派、反派联盟、第三方中立、地方宗门） */
  name: string
  /** 势力定位一句话（如：以维护现有秩序为目标的正统力量） */
  positioning: string
  /** 势力核心诉求 */
  coreDemand: string
  /** 势力的核心价值观（如：秩序至上 / 强者为尊 / 利益优先） */
  coreValues: string
  /** 势力的主要手段（如：规则压制 / 武力威慑 / 利益分化） */
  mainMethods: string[]
  /** 势力弱点和软肋（如：内部派系分裂 / 过度依赖单一资源） */
  vulnerabilities: string[]
  /** 下辖二级分支（至少 2 个） */
  branches: FactionBranchDto[]
  /** 是否被用户锁定（局部重绘：锁定则不重跑） */
  isLocked?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────────────
// 势力拆解表整张
// ─────────────────────────────────────────────────────────────────────────────

/** 势力拆解表整张 DTO */
export interface FactionMatrixDto {
  /** 项目标题 */
  title: string
  /** 总集数 */
  totalEpisodes: number
  /** 一级势力列表（至少 3 个） */
  factions: FactionDto[]
  /** 势力交叉渗透关系（势力交织表） */
  crossRelations: CrossRelationDto[]
  /** 势力格局总述（2-3 句描述全局博弈） */
  landscapeSummary: string
  /** 预估势力进场时间表 */
  factionTimetable: Array<{
    factionId: string
    entryEpisode: number
    entryDescription: string
  }>
}
