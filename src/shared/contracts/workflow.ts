import type {
  FormalFactAuthorityDto,
  FormalFactDeclaredBy,
  FormalFactDeclaredStage,
  FormalFactAuthorityType,
  FormalFactLevel,
  FormalFactStatus
} from './formal-fact'

export const WORKFLOW_STAGES = [
  'chat',
  'seven_questions',
  'outline',
  'character',
  'detailed_outline',
  'script'
] as const

export type WorkflowStage = (typeof WORKFLOW_STAGES)[number]

export interface ScreenplaySceneBlockDto {
  sceneNo?: number
  sceneCode?: string
  sceneHeading?: string
  characterRoster?: string[]
  body?: string
  location?: string
  timeOfDay?: string
  setup?: string
  tension?: string
  hookEnd?: string
}

export interface EpisodeControlCardDto {
  episodeMission: string
  openingBomb: string
  conflictUpgrade: string
  arcBeat: string
  emotionBeat: string
  hookLanding: string
  povConstraint: string
  forbiddenDrift: string[]
  // 新增字段
  episodeIndex?: number
  sceneCount?: number
  coreGoal?: string
  villainPressure?: string
  pressureType?: string
  catharsisMoment?: string
  twistPoint?: string
  cliffhanger?: string
  nextEpisodeTeaser?: string
  /** 主角行动类型（枚举，从数据结构上切断窝囊可能） */
  protagonistActionType?: '装弱反击' | '冷静对峙' | '主动设局' | '借力打力' | '底牌碾压'
  /** 爆款钩子类型 */
  viralHookType?: string
  /** 金句种子：基于当前集道具/身份/证据/规则生成 */
  signatureLineSeed?: string
  /** 爽点类型（16种之一） */
  payoffType?: string
  /** 爽点级别：normal=常规, major=每5集大爽点, final=末集终局 */
  payoffLevel?: 'normal' | 'major' | 'final'
  /** 爽点节拍位置：pressure=施压阶段, reversal=反转阶段, hook=钩子阶段 */
  payoffBeatSlot?: 'pressure' | 'reversal' | 'hook'
  /** 爽点归属角色名称（释放爽点的角色） */
  payoffOwnerName?: string
  /** 施压角色名称（施加压力的反派/对手） */
  pressureActorName?: string
  /** 爽点目标角色名称（爽点针对的角色） */
  payoffTargetName?: string
  /** 爽点发生场景 */
  payoffScene?: string
  /** 爽点执行方式描述 */
  payoffExecution?: string
  /** 反派压迫模式：规则压迫/权位压迫/利益分化/借刀杀人 */
  villainOppressionMode?: string
  /** 开局冲击事件类型：高损失/高羞辱/高危险/高反转 */
  openingShockEvent?: string
  /** 集尾留客钩子 */
  retentionCliffhanger?: string
  /** 本集强制道具：必须在冲突中被抢/被换/被出示/被销毁，不能只提就消失 */
  requiredProp?: string
  /** 道具来源：extracted=从剧情文本提取，scheduled=按集数轮转 fallback */
  requiredPropSource?: 'extracted' | 'scheduled'
}

export interface OutlineEpisodeDto {
  episodeNo: number
  summary: string
  sceneByScene?: ScreenplaySceneBlockDto[]
  /** 爽点类型（16种之一） */
  payoffType?: string
  /** 爽点级别：normal=常规, major=每5集大爽点, final=末集终局 */
  payoffLevel?: 'normal' | 'major' | 'final'
  /** 爽点节拍位置：pressure=施压阶段, reversal=反转阶段, hook=钩子阶段 */
  payoffBeatSlot?: 'pressure' | 'reversal' | 'hook'
  /** 爽点归属角色名称（释放爽点的角色） */
  payoffOwnerName?: string
  /** 施压角色名称（施加压力的反派/对手） */
  pressureActorName?: string
  /** 爽点目标角色名称（爽点针对的角色） */
  payoffTargetName?: string
  /** 爽点发生场景 */
  payoffScene?: string
  /** 爽点执行方式描述 */
  payoffExecution?: string
}

export interface SevenQuestionsDto {
  goal: string
  obstacle: string
  effort: string
  result: string
  twist: string
  turnaround: string
  ending: string
}

/** 篇章级七问结构（包含篇章划分信息） */
export interface SevenQuestionsSectionDto {
  sectionNo: number
  sectionTitle: string
  startEpisode: number
  endEpisode: number
  sevenQuestions: SevenQuestionsDto
}

/** 七问结果（包含篇章划分元数据） */
export interface SevenQuestionsResultDto {
  needsSections: boolean
  sectionCount: number
  sectionCountReason: string
  /** 候选方案的总集数，必须等于用户要求的集数 */
  totalEpisodes: number
  sections: SevenQuestionsSectionDto[]
}

export interface CandidateValidationErrorDto {
  field: string
  message: string
}

/** 单个七问候选方案 */
export interface SevenQuestionCandidateDto {
  id: string
  title: string
  summary: string
  /** 完整七问方案（含篇章划分与每篇章七问） */
  result: SevenQuestionsResultDto
  createdAt: string
  source: 'generated' | 'regenerated' | 'edited'
  /** 验证错误列表 */
  validationErrors?: CandidateValidationErrorDto[]
  /** 是否通过验证 */
  isValid?: boolean
}

export interface OutlineBlockDto {
  blockNo: number
  label: string
  startEpisode: number
  endEpisode: number
  summary: string
  episodes: OutlineEpisodeDto[]
  sectionTitle?: string
  sevenQuestions?: SevenQuestionsDto
}

export interface FormalFact {
  id: string
  label: string
  description: string
  linkedToPlot: boolean
  linkedToTheme: boolean
  authorityType: FormalFactAuthorityType
  originAuthorityType?: FormalFactAuthorityType
  originDeclaredBy?: FormalFactDeclaredBy
  status: FormalFactStatus
  level: FormalFactLevel
  declaredBy: FormalFactDeclaredBy
  declaredStage: FormalFactDeclaredStage
  createdAt: string
  updatedAt: string
  provenanceTier?: string
}

export interface FormalFactDeclarationDto extends FormalFactAuthorityDto {
  id: string
  label: string
  description: string
  linkedToPlot: boolean
  linkedToTheme: boolean
}

/** 七问候选会话状态（持久化到 outlineDraft，用于跨页面/刷新恢复候选列表） */
export interface SevenQuestionsSessionDto {
  candidates: SevenQuestionCandidateDto[]
  selectedCandidateId: string | null
  lockedCandidateId: string | null
}

export interface OutlineDraftDto {
  title: string
  genre: string
  theme: string
  mainConflict: string
  protagonist: string
  summary: string
  planningUnitEpisodes?: number
  summaryEpisodes: OutlineEpisodeDto[]
  outlineBlocks?: OutlineBlockDto[]
  facts: FormalFact[]
  /** 七问候选会话（仅在七问阶段存在，确认后清除） */
  sevenQuestionsSession?: SevenQuestionsSessionDto
}

export interface CharacterDraftDto {
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
  appearance?: string
  personality?: string
  identity?: string
  values?: string
  plotFunction?: string
  /** 绑定的短剧爽点类型，用于后续大纲/剧本调度 */
  payoffTags?: string[]
  /** 可复用演员/功能位标识，优先让同一人物跨场景重复出现 */
  reusableRoleKey?: string
  /** 建议复用出现的场景键 */
  reuseSceneKeys?: string[]
  depthLevel?: 'core' | 'mid' | 'extra'
  masterEntityId?: string
  /** 角色层级：core=主角层, active=主动推进层, functional=功能层 */
  roleLayer?: 'core' | 'active' | 'functional'
  activeBlockNos?: number[]
}

export interface CharacterBlockDto {
  blockNo: number
  startEpisode: number
  endEpisode: number
  summary: string
  characterNames: string[]
  characters: CharacterDraftDto[]
}

export interface ActiveCharacterPackageMemberDto {
  name: string
  masterEntityId?: string
  roleLayer: 'core' | 'active' | 'functional'
  source: 'full_profile' | 'light_card'
  summary: string
  factionNames: string[]
  isNewThisBatch: boolean
  needsUpgrade: boolean
}

export interface ActiveCharacterPackageDto {
  batchNo: number
  startEpisode: number
  endEpisode: number
  memberNames: string[]
  debutCharacterNames: string[]
  carryOverCharacterNames: string[]
  upgradeCandidateNames: string[]
  members: ActiveCharacterPackageMemberDto[]
  characters: CharacterDraftDto[]
}

export interface DetailedOutlineEpisodeBeatDto {
  episodeNo: number
  summary: string
  sceneByScene?: ScreenplaySceneBlockDto[]
  episodeControlCard?: EpisodeControlCardDto
}

export interface DetailedOutlineSectionDto {
  sectionNo: number
  title?: string
  act?: string
  startEpisode?: number
  endEpisode?: number
  summary?: string
  hookType?: string
  episodeBeats?: DetailedOutlineEpisodeBeatDto[]
}

export interface DetailedOutlineBlockDto {
  blockNo: number
  startEpisode: number
  endEpisode: number
  summary?: string
  episodeBeats?: DetailedOutlineEpisodeBeatDto[]
  sections?: DetailedOutlineSectionDto[]
}

export interface DetailedOutlineSegmentDto {
  act: 'opening' | 'midpoint' | 'climax' | 'ending'
  blockNo?: number
  segmentNo?: number
  startEpisode?: number
  endEpisode?: number
  title?: string
  content: string
  hookType: string
  episodeBeats?: DetailedOutlineEpisodeBeatDto[]
}

export interface ScriptBatchGovernanceDto {
  grouped: {
    roleGroups: Array<{ groupKey: string; label: string; roleNames: string[]; reasons: string[] }>
    entityGroups: Array<{
      groupKey: string
      label: string
      entityIds: string[]
      entityNames: string[]
      reasons: string[]
    }>
    threadGroups: Array<{
      groupKey: string
      label: string
      threads: Array<{ thread: string; reason: string }>
    }>
  }
  layered: {
    roleLayers: Array<{ layerKey: string; label: string; roleNames: string[]; reasons: string[] }>
    entityLayers: Array<{
      layerKey: string
      label: string
      entityIds: string[]
      entityNames: string[]
      reasons: string[]
    }>
    threadLayers: Array<{
      layerKey: string
      label: string
      threads: Array<{ thread: string; reason: string }>
    }>
  }
  batched: {
    batchNo: number
    startEpisode: number
    endEpisode: number
    batchUnitEpisodes: number
    planningBlockNo: number | null
    planningBlockStartEpisode: number | null
    planningBlockEndEpisode: number | null
  }
}

export interface ScriptBatchContextDto {
  batchNo: number
  startEpisode: number
  endEpisode: number
  title: string
  summary: string
  previousSummary: string
  episodeBeats: DetailedOutlineEpisodeBeatDto[]
  activeCharacterNames: string[]
  activeCharacterPackage?: ActiveCharacterPackageDto
  loadBearingRoles?: Array<{
    name: string
    reason: string
    category:
      | 'narrative_carrier'
      | 'conflict_driver'
      | 'relationship_lever'
      | 'theme_fulfiller'
      | 'plot_anchor'
      | 'pressure_point'
    episodeNos?: number[]
  }>
  loadBearingEntities?: Array<{
    entityId: string
    name: string
    reason: string
    category:
      | 'narrative_carrier'
      | 'conflict_driver'
      | 'relationship_lever'
      | 'theme_fulfiller'
      | 'plot_anchor'
      | 'pressure_point'
    episodeNos?: number[]
  }>
  narrativeThreads?: Array<{ thread: string; reason: string }>
  governance?: ScriptBatchGovernanceDto
}

export interface ScriptSegmentDto {
  sceneNo: number
  screenplay?: string
  screenplayScenes?: ScreenplaySceneBlockDto[]
  legacyFormat?: boolean
  action: string
  dialogue: string
  emotion: string
  /** 爽点类型（16种之一） */
  payoffType?: string
  /** 爽点级别：normal=常规, major=每5集大爽点, final=末集终局 */
  payoffLevel?: 'normal' | 'major' | 'final'
  /** 爽点节拍位置：pressure=施压阶段, reversal=反转阶段, hook=钩子阶段 */
  payoffBeatSlot?: 'pressure' | 'reversal' | 'hook'
  /** 爽点归属角色名称（释放爽点的角色） */
  payoffOwnerName?: string
  /** 施压角色名称（施加压力的反派/对手） */
  pressureActorName?: string
  /** 爽点目标角色名称（爽点针对的角色） */
  payoffTargetName?: string
  /** 爽点发生场景 */
  payoffScene?: string
  /** 爽点执行方式描述 */
  payoffExecution?: string
}

export function ensureScreenplaySceneBlockDefaults(
  scene: ScreenplaySceneBlockDto
): Required<
  Pick<ScreenplaySceneBlockDto, 'sceneCode' | 'sceneHeading' | 'characterRoster' | 'body'>
> &
  ScreenplaySceneBlockDto {
  return {
    sceneCode: scene.sceneCode || '',
    sceneHeading: scene.sceneHeading || '',
    characterRoster: scene.characterRoster || [],
    body: scene.body || '',
    ...scene
  }
}
