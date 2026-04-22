import type { ProjectSnapshotDto } from '../../../../shared/contracts/project.ts'
import type {
  AuthorityFailureDto,
  AuthorityFailureContextDto,
  AuthorityFailureNoticeKeyDto
} from '../../../../shared/contracts/authority-failure.ts'
import type { ScriptRuntimeFailureHistoryCode } from '../../../../shared/contracts/script-generation.ts'
import { useWorkflowStore } from '../store/useWorkflowStore.ts'
import { useStageStore } from '../../store/useStageStore.ts'
import { perfLog, startOpenChain } from '../timing/performance-logger.ts'
import { getHydratableGenerationStatus } from '../../../../shared/domain/workflow/generation-state.ts'
import { createAuthorityFailureNotice } from '../utils/authority-failure-notice.ts'
import { apiGetProject } from '../../services/api-client.ts'

function logSessionDiagnostic(message: string): void {
  void window.api.system.appendDiagnosticLog({ source: 'session', message })
}

export interface StageSessionResult {
  project: ProjectSnapshotDto | null
  payload: ProjectSnapshotDto | null
  nextStage: ProjectSnapshotDto['stage'] | null
}

export async function openProjectSession(projectId: string): Promise<StageSessionResult | null> {
  startOpenChain(projectId)
  perfLog.openProjectSessionStart(projectId)
  logSessionDiagnostic(`openProjectSession start projectId=${projectId}`)

  const { project } = await apiGetProject(projectId)
  const result: StageSessionResult | null = project
    ? {
        project,
        payload: project,
        nextStage: project.stage
      }
    : null

  if (!result) {
    logSessionDiagnostic(`openProjectSession missing project projectId=${projectId}`)
    console.warn('[stage-session-service] openProjectSession returned null')
    return null
  }

  // Hydrate the stage payload into stores
  if (result.payload) {
    hydrateStagePayload(result.payload, result.project)
  }

  perfLog.openProjectSessionEnd(projectId)
  logSessionDiagnostic(`openProjectSession end projectId=${projectId} stage=${result.nextStage}`)
  return result as StageSessionResult
}

export async function switchStageSession(
  projectId: string,
  targetStage: ProjectSnapshotDto['stage']
): Promise<StageSessionResult | null> {
  perfLog.stageSessionSwitchStart(projectId, targetStage)
  logSessionDiagnostic(`switchStageSession start projectId=${projectId} targetStage=${targetStage}`)

  const { project } = await apiGetProject(projectId)
  // Authority: stage comes from main-derived project snapshot, never from renderer-local targetStage
  const result: StageSessionResult | null = project
    ? {
        project,
        payload: project,
        nextStage: project.stage
      }
    : null

  if (!result) {
    logSessionDiagnostic(
      `switchStageSession missing project projectId=${projectId} targetStage=${targetStage}`
    )
    console.warn('[stage-session-service] switchStageSession returned null')
    return null
  }

  // Hydrate the latest project snapshot, but keep the renderer on the stage the user clicked.
  if (result.payload) {
    hydrateStagePayload(result.payload, result.project, targetStage)
  }

  perfLog.stageSessionSwitchEnd(projectId, targetStage)
  logSessionDiagnostic(`switchStageSession end projectId=${projectId} targetStage=${targetStage}`)
  return result as StageSessionResult
}

function hydrateStagePayload(
  payload: ProjectSnapshotDto,
  projectSnapshot: ProjectSnapshotDto | null,
  visibleStageOverride?: ProjectSnapshotDto['stage']
): void {
  const source = projectSnapshot ?? payload
  const setProjectId = useWorkflowStore.getState().setProjectId
  const setProjectName = useWorkflowStore.getState().setProjectName
  const setChatMessages = useWorkflowStore.getState().setChatMessages
  const setGenerationStatus = useWorkflowStore.getState().setGenerationStatus
  const clearGenerationNotice = useWorkflowStore.getState().clearGenerationNotice
  const setStoryIntent = useWorkflowStore.getState().setStoryIntent
  const setProjectEntityStore = useWorkflowStore.getState().setProjectEntityStore
  const setScriptRuntimeFailureHistory = useWorkflowStore.getState().setScriptRuntimeFailureHistory
  const setScriptProgressBoard = useWorkflowStore.getState().setScriptProgressBoard
  const setScriptFailureResolution = useWorkflowStore.getState().setScriptFailureResolution
  const setVisibleResult = useWorkflowStore.getState().setVisibleResult
  const setFormalRelease = useWorkflowStore.getState().setFormalRelease
  const setStage = useWorkflowStore.getState().setStage
  const hydrateProjectDrafts = useStageStore.getState().hydrateProjectDrafts

  setProjectId(source.id)
  setProjectName(source.name)
  setChatMessages(source.chatMessages ?? [])
  setGenerationStatus(getHydratableGenerationStatus(payload))
  clearGenerationNotice()
  setStoryIntent(source.storyIntent ?? null)
  setProjectEntityStore(source.entityStore ?? null)
  setScriptRuntimeFailureHistory(
    (source.scriptRuntimeFailureHistory ?? []) as ScriptRuntimeFailureHistoryCode[]
  )
  setScriptProgressBoard(source.scriptProgressBoard ?? null)
  setScriptFailureResolution(source.scriptFailureResolution ?? null)
  setVisibleResult(source.visibleResult ?? null)
  setFormalRelease(source.formalRelease ?? null)
  hydrateProjectDrafts({
    outline: source.outlineDraft,
    characters: source.characterDrafts,
    segments: source.detailedOutlineSegments,
    script: source.scriptDraft
  })
  setStage(visibleStageOverride ?? payload.stage)
}

/**
 * Create authority failure notice for stage session errors.
 */
export function createStageSessionFailureNotice(params: {
  type: 'authority_failure'
  failureType: 'project_missing' | 'ipc_failure' | 'payload_missing'
  code: string
  message: string
  context: AuthorityFailureContextDto
  recoverability: 'manual_retry' | 'refresh_project'
  recoverable: boolean
  noticeKey: AuthorityFailureNoticeKeyDto
}): void {
  useWorkflowStore.getState().setGenerationNotice(
    createAuthorityFailureNotice({
      ...params,
      occurredAt: new Date().toISOString()
    } as AuthorityFailureDto)
  )
}
