import type { ProjectSnapshotDto, ProjectSummaryDto } from './project'
import type { ChatMessageDto } from './chat'
import type { ProjectGenerationStatusDto } from './generation'
import type { ScriptLedgerPostflightDto, ScriptStateLedgerDto } from './script-ledger'
import type {
  ConfirmFormalFactInputDto,
  DeclareFormalFactInputDto,
  FormalFactElevationEvaluationDto,
  RemoveFormalFactInputDto,
  FormalFactValidationDto
} from './formal-fact'
import type {
  ScriptRuntimeFailureHistoryCode,
  ScriptGenerationFailureResolutionDto,
  ScriptGenerationProgressBoardDto
} from './script-generation'
import type { StoryIntentPackageDto } from './intake'
import type { ProjectEntityStoreDto } from './entities'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto,
  SevenQuestionsResultDto
} from './workflow'

export interface CreateProjectResultDto {
  project: ProjectSnapshotDto
}

export interface WorkspaceListDto {
  projects: ProjectSummaryDto[]
}

export interface DeleteProjectInputDto {
  projectId: string
}

export interface DeleteProjectResultDto {
  ok: boolean
}

export interface SaveStoryIntentInputDto {
  projectId: string
  storyIntent: ProjectSnapshotDto['storyIntent']
  entityStore?: ProjectEntityStoreDto | null
}

export interface ConfirmStoryIntentFromChatInputDto {
  projectId: string
  chatTranscript: string
}

export interface ConfirmStoryIntentFromChatResultDto {
  project: ProjectSnapshotDto | null
  storyIntent: StoryIntentPackageDto | null
  generationBriefText: string
}

export interface SaveChatMessagesInputDto {
  projectId: string
  chatMessages: ChatMessageDto[]
}

export interface SaveGenerationStatusInputDto {
  projectId: string
  generationStatus: ProjectGenerationStatusDto | null
}

export interface SaveOutlineDraftInputDto {
  projectId: string
  outlineDraft: OutlineDraftDto
}

export interface SaveCharacterDraftsInputDto {
  projectId: string
  characterDrafts: CharacterDraftDto[]
}

export interface SaveDetailedOutlineSegmentsInputDto {
  projectId: string
  detailedOutlineSegments: DetailedOutlineSegmentDto[]
}

export interface SaveScriptDraftInputDto {
  projectId: string
  scriptDraft: ScriptSegmentDto[]
}

export type ExportableProjectStage = 'outline' | 'character' | 'detailed_outline' | 'script'

export interface ExportProjectStageMarkdownInputDto {
  projectId: string
  stage: ExportableProjectStage
}

export interface ExportProjectStageMarkdownResultDto {
  saved: boolean
  filePath: string | null
}

export interface SaveScriptRuntimeStateInputDto {
  projectId: string
  scriptProgressBoard: ScriptGenerationProgressBoardDto | null
  scriptFailureResolution: ScriptGenerationFailureResolutionDto | null
  scriptRuntimeFailureHistory?: ScriptRuntimeFailureHistoryCode[]
  scriptStateLedger?: ScriptStateLedgerDto | null
  scriptPostflight?: ScriptLedgerPostflightDto | null
}

export interface AtomicSaveGenerationStateInputDto {
  projectId: string
  scriptProgressBoard: ScriptGenerationProgressBoardDto | null
  scriptFailureResolution: ScriptGenerationFailureResolutionDto | null
  scriptStateLedger: ScriptStateLedgerDto | null
  scriptRuntimeFailureHistory: ScriptRuntimeFailureHistoryCode[]
  scriptPostflight?: ScriptLedgerPostflightDto | null
}

export interface CreateOutlineSeedInputDto {
  projectId: string
}

export interface OutlineSeedDto {
  title: string
  genre: string
  protagonist: string
  mainConflict: string
  theme: string
  source: 'story_intent_seed'
}

/**
 * 历史阻断壳：旧聊天直生粗纲入口。
 *
 * 现在正式主线已改成：
 * 确认信息 -> 七问确认 -> 再生成粗纲和人物。
 *
 * 该入口仅保留给旧调用方拿到明确阻断错误，不再承担正式生成职责。
 */
export interface LegacyGenerateOutlineAndCharactersBlockedInputDto {
  projectId: string
  chatTranscript: string
}

export interface LegacyGenerateOutlineAndCharactersBlockedResultDto {
  project: ProjectSnapshotDto | null
  storyIntent: StoryIntentPackageDto | null
  outlineDraft: OutlineDraftDto | null
  characterDrafts: CharacterDraftDto[]
}

export interface GenerateDetailedOutlineInputDto {
  projectId: string
}

export interface GenerateDetailedOutlineResultDto {
  project: ProjectSnapshotDto | null
  detailedOutlineSegments: DetailedOutlineSegmentDto[]
  source: 'model'
}

export interface DeclareFormalFactForProjectInputDto {
  projectId: string
  declaration: DeclareFormalFactInputDto
}

export interface DeclareFormalFactForProjectResultDto {
  project: ProjectSnapshotDto | null
}

export interface ConfirmFormalFactForProjectInputDto {
  projectId: string
  confirmation: ConfirmFormalFactInputDto
}

export interface ConfirmFormalFactForProjectResultDto {
  project: ProjectSnapshotDto | null
}

export interface RemoveFormalFactForProjectInputDto {
  projectId: string
  removal: RemoveFormalFactInputDto
}

export interface RemoveFormalFactForProjectResultDto {
  project: ProjectSnapshotDto | null
}

export interface ValidateFormalFactInputDto {
  description: string
  mainPlotContext: string
  theme: string
}

export interface EvaluateFormalFactElevationInputDto {
  formalFactLabel: string
  conflictText: string
  emotionText: string
  themeText: string
}

export interface ValidateFormalFactResultDto extends FormalFactValidationDto {}
export interface EvaluateFormalFactElevationResultDto extends FormalFactElevationEvaluationDto {}

/**
 * 【七问工作流接口】
 *
 * 七问是粗纲阶段的确认子步骤，不是独立 stage。
 *
 * 工作流：
 * storyIntent 已确认
 *   -> generateSevenQuestionsDraft（生成初稿）
 *   -> 前端展示七问（用户修改/确认）
 *   -> saveConfirmedSevenQuestions（写入 outlineBlocks）
 *   -> generateOutlineAndCharactersFromConfirmedSevenQuestions（生成粗纲）
 */

/**
 * 生成七问初稿
 */
export interface GenerateSevenQuestionsDraftInputDto {
  projectId: string
}

export interface GenerateSevenQuestionsDraftResultDto {
  project: ProjectSnapshotDto | null
  sevenQuestions: SevenQuestionsResultDto | null
}

/**
 * 保存确认版七问
 */
export interface SaveConfirmedSevenQuestionsInputDto {
  projectId: string
  sevenQuestions: SevenQuestionsResultDto
}

export interface SaveConfirmedSevenQuestionsResultDto {
  project: ProjectSnapshotDto | null
  outlineDraft: OutlineDraftDto | null
}

/**
 * 基于确认版七问生成粗纲和人物
 */
export interface GenerateOutlineAndCharactersFromConfirmedSevenQuestionsInputDto {
  projectId: string
}

export interface GenerateOutlineAndCharactersFromConfirmedSevenQuestionsResultDto {
  project: ProjectSnapshotDto | null
  storyIntent: StoryIntentPackageDto | null
  outlineDraft: OutlineDraftDto | null
  characterDrafts: CharacterDraftDto[]
}
