import type {
  ScriptGenerationExecutionPlanDto,
  ScriptGenerationFailureResolutionDto,
  ScriptGenerationProgressBoardDto,
  ScriptEpisodeRuntimeStatus,
  ScriptGenerationResumeResolutionDto
} from '../../shared/contracts/script-generation'

function nowIso(): string {
  return new Date().toISOString()
}

function resolveBatchRange(
  episodeStatuses: ScriptGenerationProgressBoardDto['episodeStatuses'],
  batchIndex: number
): { startEpisode: number; endEpisode: number } {
  const batchEpisodes = episodeStatuses.filter((item) => item.batchIndex === batchIndex)
  const actionableEpisodes = batchEpisodes.filter(
    (item) => item.status === 'pending' || item.status === 'running' || item.status === 'failed'
  )
  const visibleEpisodes = actionableEpisodes.length > 0 ? actionableEpisodes : batchEpisodes

  return {
    startEpisode: visibleEpisodes[0]?.episodeNo ?? 1,
    endEpisode: visibleEpisodes.at(-1)?.episodeNo ?? visibleEpisodes[0]?.episodeNo ?? 1
  }
}

function syncBatchWindow(
  board: ScriptGenerationProgressBoardDto,
  episodeNo: number
): ScriptGenerationProgressBoardDto['batchContext'] {
  const episode = board.episodeStatuses.find((item) => item.episodeNo === episodeNo)
  if (!episode) return board.batchContext

  const { startEpisode, endEpisode } = resolveBatchRange(board.episodeStatuses, episode.batchIndex)

  return {
    ...board.batchContext,
    currentBatchIndex: episode.batchIndex,
    startEpisode,
    endEpisode,
    resumeFromEpisode:
      board.episodeStatuses.find((item) => item.status === 'pending')?.episodeNo ??
      board.batchContext.resumeFromEpisode
  }
}

export function createInitialProgressBoard(
  plan: ScriptGenerationExecutionPlanDto,
  stageContractFingerprint: string | null
): ScriptGenerationProgressBoardDto {
  const batchSize = Math.min(plan.runtimeProfile.recommendedBatchSize, plan.targetEpisodes)
  const episodeStatuses = plan.episodePlans.map((episode) => {
    const initialStatus: ScriptEpisodeRuntimeStatus =
      episode.status === 'ready' ? 'pending' : episode.status === 'blocked' ? 'failed' : 'skipped'

    const baseReason = episode.runtimeHints?.recoveryMode
      ? `${episode.reason}（恢复档位：${episode.runtimeHints.recoveryMode}）`
      : episode.reason

    return {
      episodeNo: episode.episodeNo,
      status: initialStatus,
      batchIndex: Math.floor((episode.episodeNo - 1) / Math.max(1, batchSize)) + 1,
      reason:
        initialStatus === 'skipped' ? `${baseReason}（已有内容直接沿用，不重复生成。）` : baseReason
    }
  })
  const firstPendingEpisode = episodeStatuses.find((episode) => episode.status === 'pending')
  const currentBatchIndex = firstPendingEpisode?.batchIndex ?? episodeStatuses[0]?.batchIndex ?? 1
  const { startEpisode, endEpisode } = resolveBatchRange(episodeStatuses, currentBatchIndex)

  return {
    episodeStatuses,
    batchContext: {
      batchSize,
      currentBatchIndex,
      startEpisode,
      endEpisode,
      status: 'idle',
      resumeFromEpisode: firstPendingEpisode?.episodeNo ?? null,
      reason: `执行计划已建立，当前按 ${batchSize} 集一批自动推进；运行时档位 ${plan.runtimeProfile.profileLabel}。`,
      stageContractFingerprint,
      updatedAt: nowIso()
    }
  }
}

export function resolveResumeFromBoard(
  board: ScriptGenerationProgressBoardDto
): ScriptGenerationResumeResolutionDto {
  const failedEpisode = board.episodeStatuses.find((item) => item.status === 'failed')
  if (failedEpisode) {
    return {
      canResume: true,
      resumeEpisode: failedEpisode.episodeNo,
      nextBatchStatus: 'failed',
      reason: `第 ${failedEpisode.episodeNo} 集曾失败，建议从该集恢复；当前批次档位：${board.batchContext.reason}`
    }
  }

  const pendingEpisode = board.episodeStatuses.find((item) => item.status === 'pending')
  if (pendingEpisode) {
    return {
      canResume: true,
      resumeEpisode: pendingEpisode.episodeNo,
      nextBatchStatus: board.batchContext.status === 'paused' ? 'paused' : 'idle',
      reason: `从第 ${pendingEpisode.episodeNo} 集继续后续批次；当前批次档位：${board.batchContext.reason}`
    }
  }

  return {
    canResume: false,
    resumeEpisode: null,
    nextBatchStatus: 'completed',
    reason: '当前批次没有待恢复集数。'
  }
}

export function createFailureResolution(input: {
  board: ScriptGenerationProgressBoardDto
  kind: ScriptGenerationFailureResolutionDto['kind']
  reason: string
  errorMessage?: string
  lockRecoveryAttempted?: boolean
}): ScriptGenerationFailureResolutionDto {
  return {
    kind: input.kind,
    reason: input.reason,
    errorMessage: input.errorMessage,
    eventId: input.kind === 'failed' ? `failure_${Date.now().toString(36)}` : undefined,
    lockRecoveryAttempted: Boolean(input.lockRecoveryAttempted)
  }
}

export function updateEpisodeStatus(input: {
  board: ScriptGenerationProgressBoardDto
  episodeNo: number
  status: ScriptEpisodeRuntimeStatus
  reason: string
}): ScriptGenerationProgressBoardDto {
  const nextBoard = {
    ...input.board,
    episodeStatuses: input.board.episodeStatuses.map((episode) =>
      episode.episodeNo === input.episodeNo
        ? { ...episode, status: input.status, reason: input.reason }
        : episode
    )
  }

  return {
    ...nextBoard,
    batchContext: {
      ...syncBatchWindow(nextBoard, input.episodeNo),
      updatedAt: nowIso()
    }
  }
}

export function markBatchStatus(
  board: ScriptGenerationProgressBoardDto,
  status: ScriptGenerationProgressBoardDto['batchContext']['status'],
  reason: string
): ScriptGenerationProgressBoardDto {
  return {
    ...board,
    batchContext: {
      ...board.batchContext,
      status,
      reason,
      updatedAt: nowIso()
    }
  }
}
