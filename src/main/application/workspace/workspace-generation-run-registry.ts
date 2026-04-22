import type { WebContents } from 'electron'

export const WORKSPACE_GENERATION_ABORT_PREFIX = 'workspace_generation_aborted:'

export type WorkspaceGenerationTaskKind =
  | 'confirm_story_intent'
  | 'outline_and_characters'
  | 'detailed_outline'
  | 'seven_questions'

type ActiveWorkspaceGenerationRun = {
  key: string
  ownerId: number
  projectId: string
  task: WorkspaceGenerationTaskKind
  controller: AbortController
  timeoutHandle: NodeJS.Timeout | null
}

const activeRuns = new Map<string, ActiveWorkspaceGenerationRun>()
const watchedOwners = new Set<number>()

function buildRunKey(
  ownerId: number,
  projectId: string,
  task: WorkspaceGenerationTaskKind
): string {
  return `${ownerId}:${projectId}:${task}`
}

function buildAbortReason(reason: string): string {
  return `${WORKSPACE_GENERATION_ABORT_PREFIX}${reason}`
}

function abortRun(run: ActiveWorkspaceGenerationRun, reason: string): void {
  activeRuns.delete(run.key)
  if (run.timeoutHandle) {
    clearTimeout(run.timeoutHandle)
    run.timeoutHandle = null
  }
  if (!run.controller.signal.aborted) {
    run.controller.abort(buildAbortReason(reason))
  }
}

function resolveWorkspaceTaskTimeoutMs(task: WorkspaceGenerationTaskKind): number {
  switch (task) {
    case 'confirm_story_intent':
      return 180_000
    case 'seven_questions':
      return 240_000
    case 'outline_and_characters':
      return 600_000
    case 'detailed_outline':
      // 四幕 × ~70秒/幕 + 间隔 + 验证 + 保存 = 约 8-9 分钟
      // 需要足够空间让四个幕都完成
      return 600_000 // 10分钟，给足够缓冲
    default:
      return 180_000
  }
}

function abortRunsForOwner(ownerId: number, reason: string): void {
  for (const run of activeRuns.values()) {
    if (run.ownerId === ownerId) {
      abortRun(run, reason)
    }
  }
}

function ensureOwnerWatched(sender: WebContents): void {
  if (watchedOwners.has(sender.id)) return

  watchedOwners.add(sender.id)

  sender.on('did-start-navigation', (_event, _url, isInPlace, isMainFrame) => {
    if (isMainFrame && !isInPlace) {
      abortRunsForOwner(sender.id, 'owner_navigated')
    }
  })

  sender.once('destroyed', () => {
    abortRunsForOwner(sender.id, 'owner_destroyed')
    watchedOwners.delete(sender.id)
  })
}

export function clearWorkspaceGenerationRunRegistry(): void {
  for (const run of activeRuns.values()) {
    abortRun(run, 'registry_cleared')
  }
  activeRuns.clear()
  watchedOwners.clear()
}

export function throwIfWorkspaceGenerationAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return

  if (signal.reason instanceof Error) {
    throw signal.reason
  }

  throw new Error(
    typeof signal.reason === 'string' ? signal.reason : buildAbortReason('request_stopped')
  )
}

export async function runWorkspaceGenerationTask<T>(input: {
  sender: WebContents
  projectId: string
  task: WorkspaceGenerationTaskKind
  run: (signal: AbortSignal) => Promise<T>
}): Promise<T> {
  ensureOwnerWatched(input.sender)

  const key = buildRunKey(input.sender.id, input.projectId, input.task)
  const existing = activeRuns.get(key)
  if (existing) {
    abortRun(existing, 'replaced')
  }

  const run: ActiveWorkspaceGenerationRun = {
    key,
    ownerId: input.sender.id,
    projectId: input.projectId,
    task: input.task,
    controller: new AbortController(),
    timeoutHandle: null
  }
  const timeoutMs = resolveWorkspaceTaskTimeoutMs(input.task)
  run.timeoutHandle = setTimeout(() => {
    abortRun(run, `task_timeout:${timeoutMs}ms`)
  }, timeoutMs)
  run.timeoutHandle.unref?.()
  activeRuns.set(key, run)

  try {
    return await input.run(run.controller.signal)
  } finally {
    if (activeRuns.get(key) === run) {
      activeRuns.delete(key)
    }
  }
}
