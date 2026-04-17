import type { ProjectGenerationTaskDto } from './generation'
import type { ScriptGenerationProgressBoardDto } from './script-generation'

export type RuntimeTaskStatusDto = 'running' | 'completed' | 'failed' | 'stopped'
export type RuntimeTaskPhaseDto =
  | 'queued'
  | 'generate_batch'
  | 'repair_batch'
  | 'postflight'
  | 'persist_result'
  | 'completed'
  | 'failed'
  | 'stopped'

export interface RuntimeTaskSnapshotDto {
  taskId: string
  projectId: string
  task: ProjectGenerationTaskDto
  title: string
  detail: string
  status: RuntimeTaskStatusDto
  phase: RuntimeTaskPhaseDto
  startedAt: number
  updatedAt: number
  estimatedSeconds: number
  board: ScriptGenerationProgressBoardDto | null
}

export interface RuntimeTaskLogDto {
  id: string
  taskId: string
  projectId: string
  createdAt: number
  level: 'info' | 'error'
  message: string
}

export interface RuntimeConsoleStateDto {
  activeTask: RuntimeTaskSnapshotDto | null
  recentEvents: RuntimeTaskLogDto[]
}
