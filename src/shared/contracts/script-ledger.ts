export interface ScriptLedgerIssueDto {
  severity: 'low' | 'medium' | 'high'
  code: string
  detail: string
}

export interface ScriptLedgerPostflightDto {
  issues: ScriptLedgerIssueDto[]
  pass?: boolean
  quality?: {
    pass: boolean
    episodeCount: number
    passedEpisodes: number
    averageCharCount: number
    weakEpisodes: Array<{
      sceneNo: number | null
      problems: string[]
      charCount: number
      sceneCount: number
      hookLine: string
    }>
    /** 商业传播力分数 */
    openingShockScore?: number
    punchlineDensityScore?: number
    catharsisPayoffScore?: number
    villainOppressionQualityScore?: number
    hookRetentionScore?: number
    /** 信息密度分 */
    informationDensityScore?: number
    /** 剧本格式分 */
    screenplayFormatScore?: number
    /** 故事连续性分 */
    storyContinuityScore?: number
    /** 垂类市场质量分（男频/女频平均分） */
    marketQualityScore?: number
    /** MarketPlaybook 对齐度观测分（平均），不进入主评分 */
    playbookAlignmentScore?: number
  }
  summary: string
  patch: {
    previousSemanticHash: string | null
    nextSemanticHash: string
    updates: Array<{
      path: string
      value: string | string[] | boolean | null
      evidence: string
    }>
  }
}

export interface ScriptLedgerCharacterStateDto {
  name: string
  lastKnownGoal: string
  latestEmotion: string
  latestAction: string
  appearanceCount: number
  continuityStatus: {
    location: string
    injuryStatus: string
    custodyStatus: 'free' | 'captured' | 'missing' | 'restricted'
    canActDirectly: boolean
    injuryEpisodeStreak: number
    custodyEpisodeStreak: number
    statusEvidence: string
    lastSeenSceneNo: number | null
  }
  relationshipPressure: Array<{
    targetName: string
    relationType: string
    currentTension: string
    leveragePoint: string
    leverageType: 'information' | 'resource' | 'emotion' | 'status'
    pressureMode: 'direct_conflict' | 'temptation' | 'restraint' | 'memory_trigger'
    evidence: string
  }>
  traitBindings: Array<{
    trait: string
    landingType: 'pressure-scene' | 'memory-echo' | 'conflict-action' | 'other'
    isBound: boolean
    evidence: string
  }>
}

export interface ScriptLedgerFactStateDto {
  theme: string
  mainConflict: string
  confirmedFormalFacts: string[]
  protectedFacts: string[]
  lastUpdatedAt: string
}

export interface ScriptLedgerAnchorStateDto {
  requiredAnchorNames: string[]
  missingAnchorNames: string[]
  heroineRequired: boolean
  heroineHint: string
  heroineCovered: boolean
}

export interface ScriptLedgerOpenHookDto {
  id: string
  sourceSceneNo: number
  hookText: string
  urgency: 'high' | 'medium' | 'low'
  expectedPayoffType: 'reveal' | 'conflict' | 'emotion' | 'twist'
  relatedCharacters: string[]
  anchorRefs: string[]
}

export interface ScriptLedgerMomentumDto {
  previousCliffhanger: string
  nextRequiredBridge: string
  activeConflictLine: string
  pendingCost: string
  memoryEchoes: string[]
  hardAnchors: string[]
}

export interface ScriptLedgerKnowledgeBoundaryDto {
  perspectiveCharacter: string | null
  publicFacts: string[]
  hiddenFacts: string[]
  forbiddenOmniscienceRules: string[]
}

export interface ScriptLedgerEventDto {
  type:
    | 'hook_opened'
    | 'anchor_missing'
    | 'formal_fact_confirmed'
    | 'semantic_shift'
    | 'pressure_shift'
    | 'trait_binding_weak'
    | 'memory_echo_missing'
    | 'hard_anchor_pending'
  detail: string
  sceneNo: number | null
}

export interface ScriptLedgerPreflightDto {
  issues: ScriptLedgerIssueDto[]
  assertionBlock: string
}

export interface ScriptStateLedgerDto {
  semanticHash: string
  sceneCount: number
  latestHook: string
  recentSceneNos: number[]
  unresolvedSignals: string[]
  /** 计谋黑名单：追踪全季已使用的计谋/施压手段，防止套路重复 */
  usedTactics?: string[]
  characters: ScriptLedgerCharacterStateDto[]
  factState: ScriptLedgerFactStateDto
  anchorState: ScriptLedgerAnchorStateDto
  openHooks: ScriptLedgerOpenHookDto[]
  storyMomentum: ScriptLedgerMomentumDto
  knowledgeBoundaries: ScriptLedgerKnowledgeBoundaryDto
  eventLog: ScriptLedgerEventDto[]
  preflight: ScriptLedgerPreflightDto
  postflight?: ScriptLedgerPostflightDto
}
