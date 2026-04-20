import type { ChatMessageDto } from '@shared/contracts/chat'
import type { ProjectEntityStoreDto } from '@shared/contracts/entities'
import type { ProjectGenerationStatusDto } from '@shared/contracts/generation'
import type { ProjectSnapshotDto, ProjectSummaryDto } from '@shared/contracts/project'
import type { ScriptStateLedgerDto } from '@shared/contracts/script-ledger'
import type {
  PersistedScriptRuntimeStateDto,
  ScriptRuntimeFailureHistoryCode,
  ScriptGenerationFailureResolutionDto,
  ScriptGenerationProgressBoardDto
} from '@shared/contracts/script-generation'
import type { FormalReleaseState, VisibleResultState } from '@shared/contracts/visible-release-state'
import type {
  CharacterBlockDto,
  CharacterDraftDto,
  DetailedOutlineBlockDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '@shared/contracts/workflow'
import type { StoryIntentPackageDto } from '@shared/contracts/intake'

export interface ProjectRecordShape {
  id: string
  name: string
  workflowType: 'ai_write' | 'novel_adapt'
  stage: ProjectSnapshotDto['stage']
  genre?: string
  updated: string
  generationStatusJson?: string | ProjectGenerationStatusDto | null
  storyIntentJson?: string | StoryIntentPackageDto | null
  entityStoreJson?: string | ProjectEntityStoreDto | null
  visibleResultJson?: string | VisibleResultState | null
  formalReleaseJson?: string | FormalReleaseState | null
}

export interface ProjectStageRecordsShape {
  chat?: { messagesJson?: string | ChatMessageDto[] | null }
  outline?: { outlineDraftJson?: string | OutlineDraftDto | null }
  characters?: {
    characterDraftsJson?: string | CharacterDraftDto[] | null
    activeCharacterBlocksJson?: string | CharacterBlockDto[] | null
  }
  detailedOutline?: {
    detailedOutlineBlocksJson?: string | DetailedOutlineBlockDto[] | null
    detailedOutlineSegmentsJson?: string | DetailedOutlineSegmentDto[] | null
  }
  script?: {
    scriptDraftJson?: string | ScriptSegmentDto[] | null
    scriptProgressBoardJson?: string | ScriptGenerationProgressBoardDto | null
    scriptFailureResolutionJson?: string | ScriptGenerationFailureResolutionDto | null
    scriptRuntimeFailureHistoryJson?: string | ScriptRuntimeFailureHistoryCode[] | null
    scriptStateLedgerJson?: string | ScriptStateLedgerDto | null
  }
}

function parseJsonOrDefault<T>(value: string | T | null | undefined, fallback: T): T {
  if (value == null) return fallback
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function createEmptyEntityStore(): ProjectEntityStoreDto {
  return { characters: [], factions: [], locations: [], items: [], relations: [] }
}

function createInitialVisibleResult(): VisibleResultState {
  return {
    status: 'none',
    description: '当前还没有可见结果。',
    payload: null,
    failureResolution: null,
    updatedAt: new Date().toISOString()
  }
}

function createInitialFormalRelease(): FormalReleaseState {
  return {
    status: 'blocked',
    description: '当前还没有正式放行结果。',
    blockedBy: [
      { code: 'UNKNOWN_BLOCKED', message: '当前还没有正式放行结果。', category: 'process' }
    ],
    evaluatedAt: new Date().toISOString()
  }
}

export function mapProjectSummary(record: ProjectRecordShape): ProjectSummaryDto {
  return {
    id: record.id,
    name: record.name,
    workflowType: record.workflowType,
    stage: record.stage,
    genre: record.genre || '',
    updatedAt: record.updated
  }
}

export function mapProjectSnapshot(
  project: ProjectRecordShape,
  stages: ProjectStageRecordsShape
): ProjectSnapshotDto {
  const scriptRuntime = {
    scriptProgressBoard: parseJsonOrDefault<ScriptGenerationProgressBoardDto | null>(
      stages.script?.scriptProgressBoardJson,
      null
    ),
    scriptFailureResolution: parseJsonOrDefault<ScriptGenerationFailureResolutionDto | null>(
      stages.script?.scriptFailureResolutionJson,
      null
    ),
    scriptRuntimeFailureHistory: parseJsonOrDefault<ScriptRuntimeFailureHistoryCode[]>(
      stages.script?.scriptRuntimeFailureHistoryJson,
      []
    ),
    scriptStateLedger: parseJsonOrDefault<ScriptStateLedgerDto | null>(
      stages.script?.scriptStateLedgerJson,
      null
    )
  } satisfies PersistedScriptRuntimeStateDto

  return {
    id: project.id,
    name: project.name,
    workflowType: project.workflowType,
    stage: project.stage,
    genre: project.genre || '',
    updatedAt: project.updated,
    chatMessages: parseJsonOrDefault<ChatMessageDto[]>(stages.chat?.messagesJson, []),
    generationStatus: parseJsonOrDefault<ProjectGenerationStatusDto | null>(
      project.generationStatusJson,
      null
    ),
    storyIntent: parseJsonOrDefault<StoryIntentPackageDto | null>(project.storyIntentJson, null),
    entityStore: parseJsonOrDefault<ProjectEntityStoreDto>(
      project.entityStoreJson,
      createEmptyEntityStore()
    ),
    outlineDraft: parseJsonOrDefault<OutlineDraftDto | null>(stages.outline?.outlineDraftJson, null),
    characterDrafts: parseJsonOrDefault<CharacterDraftDto[]>(
      stages.characters?.characterDraftsJson,
      []
    ),
    activeCharacterBlocks: parseJsonOrDefault<CharacterBlockDto[]>(
      stages.characters?.activeCharacterBlocksJson,
      []
    ),
    detailedOutlineBlocks: parseJsonOrDefault<DetailedOutlineBlockDto[]>(
      stages.detailedOutline?.detailedOutlineBlocksJson,
      []
    ),
    detailedOutlineSegments: parseJsonOrDefault<DetailedOutlineSegmentDto[]>(
      stages.detailedOutline?.detailedOutlineSegmentsJson,
      []
    ),
    scriptDraft: parseJsonOrDefault<ScriptSegmentDto[]>(stages.script?.scriptDraftJson, []),
    scriptProgressBoard: scriptRuntime.scriptProgressBoard,
    scriptFailureResolution: scriptRuntime.scriptFailureResolution,
    scriptRuntimeFailureHistory: scriptRuntime.scriptRuntimeFailureHistory,
    scriptStateLedger: scriptRuntime.scriptStateLedger,
    visibleResult: parseJsonOrDefault<VisibleResultState>(
      project.visibleResultJson,
      createInitialVisibleResult()
    ),
    formalRelease: parseJsonOrDefault<FormalReleaseState>(
      project.formalReleaseJson,
      createInitialFormalRelease()
    )
  }
}
