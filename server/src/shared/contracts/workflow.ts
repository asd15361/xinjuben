import type {
  FormalFactAuthorityDto,
  FormalFactDeclaredBy,
  FormalFactDeclaredStage,
  FormalFactAuthorityType,
  FormalFactLevel,
  FormalFactStatus
} from './formal-fact.ts'

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
}

export interface OutlineEpisodeDto {
  episodeNo: number
  summary: string
  sceneByScene?: ScreenplaySceneBlockDto[]
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
  sections: SevenQuestionsSectionDto[]
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
