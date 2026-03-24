type PerfLabel =
  | 'list_refresh'
  | 'stage_payload'
  | 'renderer_hydrate_start'
  | 'renderer_hydrate_end'
  | 'script_service_ready'
  | 'script_plan_service_start'
  | 'script_plan_service_end'
  | 'first_interactive'
  | 'open_project_session_start'
  | 'open_project_session_end'
  | 'stage_session_switch_start'
  | 'stage_session_switch_end'
  | 'active_character_blocks_derive'
  | 'detailed_outline_view_model'
  | 'script_scene_summary_index'
  | 'script_scene_quality_audit'

interface ChainTimingState {
  projectId: string
  startedAt: number
  interactionLogged: boolean
}

let activeOpenChain: ChainTimingState | null = null

function formatDuration(durationMs: number): string {
  return Number.isFinite(durationMs) ? durationMs.toFixed(1) : '0.0'
}

function emit(label: PerfLabel, elapsedMs: number, detail: string): void {
  console.log(`[perf] ${label} +${formatDuration(elapsedMs)}ms [${detail}]`)
}

export const perfLog = {
  listRefresh: (durationMs: number, projectCount: number) => {
    emit('list_refresh', durationMs, `${projectCount}`)
  },
  stagePayload: (durationMs: number, stage: string) => {
    emit('stage_payload', durationMs, stage)
  },
  rendererHydrateStart: (projectId: string) => {
    emit('renderer_hydrate_start', 0, projectId)
  },
  rendererHydrateEnd: (durationMs: number, projectId: string) => {
    emit('renderer_hydrate_end', durationMs, projectId)
  },
  scriptServiceReady: (durationMs: number) => {
    emit('script_service_ready', durationMs, 'script')
  },
  scriptPlanServiceStart: () => {
    emit('script_plan_service_start', 0, 'script_plan')
  },
  scriptPlanServiceEnd: () => {
    emit('script_plan_service_end', 0, 'script_plan')
  },
  firstInteractive: (totalMs: number, projectId: string) => {
    emit('first_interactive', totalMs, projectId)
  },
  openProjectSessionStart: (projectId: string) => {
    emit('open_project_session_start', 0, projectId)
  },
  openProjectSessionEnd: (projectId: string) => {
    emit('open_project_session_end', 0, projectId)
  },
  stageSessionSwitchStart: (projectId: string, stage: string) => {
    emit('stage_session_switch_start', 0, `${projectId}:${stage}`)
  },
  stageSessionSwitchEnd: (projectId: string, stage: string) => {
    emit('stage_session_switch_end', 0, `${projectId}:${stage}`)
  },
  activeCharacterBlocksDerive: (durationMs: number, detail: string) => {
    emit('active_character_blocks_derive', durationMs, detail)
  },
  detailedOutlineViewModel: (durationMs: number, detail: string) => {
    emit('detailed_outline_view_model', durationMs, detail)
  },
  scriptSceneSummaryIndex: (durationMs: number, detail: string) => {
    emit('script_scene_summary_index', durationMs, detail)
  },
  scriptSceneQualityAudit: (durationMs: number, detail: string) => {
    emit('script_scene_quality_audit', durationMs, detail)
  }
}

export function startOpenChain(projectId: string): void {
  activeOpenChain = {
    projectId,
    startedAt: performance.now(),
    interactionLogged: false
  }
}

export function getActiveOpenChain(): ChainTimingState | null {
  return activeOpenChain
}

export function logFirstInteractive(projectId: string): void {
  if (
    !activeOpenChain ||
    activeOpenChain.projectId !== projectId ||
    activeOpenChain.interactionLogged
  ) {
    return
  }

  activeOpenChain.interactionLogged = true
  perfLog.firstInteractive(performance.now() - activeOpenChain.startedAt, projectId)
}
