import { BrowserWindow } from 'electron'
import type {
  RuntimeConsoleStateDto,
  RuntimeTaskLogDto,
  RuntimeTaskPhaseDto,
  RuntimeTaskSnapshotDto,
  RuntimeTaskStatusDto
} from '../../../shared/contracts/runtime-task'
import type { ProjectGenerationTaskDto } from '../../../shared/contracts/generation'
import type { ScriptGenerationProgressBoardDto } from '../../../shared/contracts/script-generation'

const runtimeTasks = new Map<string, RuntimeTaskSnapshotDto>()
const runtimeEvents = new Map<string, RuntimeTaskLogDto[]>()
const pendingBroadcasts = new Map<string, NodeJS.Timeout>()

function broadcast(channel: string, payload: unknown): void {
  const broadcastKey =
    payload && typeof payload === 'object' && 'projectId' in (payload as Record<string, unknown>)
      ? `${channel}:${String((payload as { projectId?: string }).projectId || '')}`
      : channel
  if (pendingBroadcasts.has(broadcastKey)) {
    clearTimeout(pendingBroadcasts.get(broadcastKey)!)
  }
  const timer = setTimeout(() => {
    pendingBroadcasts.delete(broadcastKey)
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, payload)
      }
    }
  }, 100)
  pendingBroadcasts.set(broadcastKey, timer)
}

function appendRuntimeEvent(input: {
  taskId: string
  projectId: string
  level: RuntimeTaskLogDto['level']
  message: string
}): void {
  const nextEvent: RuntimeTaskLogDto = {
    id: `runtime_event_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    taskId: input.taskId,
    projectId: input.projectId,
    createdAt: Date.now(),
    level: input.level,
    message: input.message
  }
  const current = runtimeEvents.get(input.projectId) || []
  const next = [nextEvent, ...current].slice(0, 40)
  runtimeEvents.set(input.projectId, next)
  broadcast('runtime:console-updated', {
    projectId: input.projectId,
    state: getRuntimeConsoleState(input.projectId)
  })
}

export function createRuntimeTask(input: {
  projectId: string
  task: ProjectGenerationTaskDto
  title: string
  detail: string
  estimatedSeconds: number
}): RuntimeTaskSnapshotDto {
  const task: RuntimeTaskSnapshotDto = {
    taskId: `runtime_task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    projectId: input.projectId,
    task: input.task,
    title: input.title,
    detail: input.detail,
    status: 'running',
    phase: 'queued',
    startedAt: Date.now(),
    updatedAt: Date.now(),
    estimatedSeconds: input.estimatedSeconds,
    board: null
  }
  runtimeTasks.set(input.projectId, task)
  appendRuntimeEvent({
    taskId: task.taskId,
    projectId: task.projectId,
    level: 'info',
    message: `${task.title} 已启动`
  })
  return task
}

export function updateRuntimeTask(input: {
  projectId: string
  title?: string
  detail?: string
  status?: RuntimeTaskStatusDto
  phase?: RuntimeTaskPhaseDto
  board?: ScriptGenerationProgressBoardDto | null
  logMessage?: string
  logLevel?: RuntimeTaskLogDto['level']
}): RuntimeTaskSnapshotDto | null {
  const current = runtimeTasks.get(input.projectId)
  if (!current) return null

  const next: RuntimeTaskSnapshotDto = {
    ...current,
    title: input.title ?? current.title,
    detail: input.detail ?? current.detail,
    status: input.status ?? current.status,
    phase: input.phase ?? current.phase,
    board: input.board === undefined ? current.board : input.board,
    updatedAt: Date.now()
  }
  runtimeTasks.set(input.projectId, next)
  broadcast('runtime:console-updated', {
    projectId: input.projectId,
    state: getRuntimeConsoleState(input.projectId)
  })

  if (input.logMessage) {
    appendRuntimeEvent({
      taskId: next.taskId,
      projectId: next.projectId,
      level: input.logLevel || 'info',
      message: input.logMessage
    })
  }

  return next
}

export function finalizeRuntimeTask(input: {
  projectId: string
  status: RuntimeTaskStatusDto
  phase: RuntimeTaskPhaseDto
  detail: string
  board?: ScriptGenerationProgressBoardDto | null
  logMessage: string
  logLevel?: RuntimeTaskLogDto['level']
}): void {
  const next = updateRuntimeTask({
    projectId: input.projectId,
    status: input.status,
    phase: input.phase,
    detail: input.detail,
    board: input.board,
    logMessage: input.logMessage,
    logLevel: input.logLevel
  })
  if (!next) return
}

export function clearRuntimeTask(projectId: string): void {
  runtimeTasks.delete(projectId)
  broadcast('runtime:console-updated', {
    projectId,
    state: getRuntimeConsoleState(projectId)
  })
}

export function getRuntimeConsoleState(projectId: string): RuntimeConsoleStateDto {
  return {
    activeTask: runtimeTasks.get(projectId) || null,
    recentEvents: runtimeEvents.get(projectId) || []
  }
}
