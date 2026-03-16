import type {
  ScriptGenerationExecutionPlanDto,
  ScriptGenerationFailureResolutionDto,
  ScriptGenerationProgressBoardDto,
  ScriptEpisodeRuntimeStatus,
  ScriptGenerationResumeResolutionDto
} from '../../../shared/contracts/script-generation'

function nowIso(): string {
  return new Date().toISOString()
}

function syncBatchWindow(
  board: ScriptGenerationProgressBoardDto,
  episodeNo: number
): ScriptGenerationProgressBoardDto['batchContext'] {
  const episode = board.episodeStatuses.find((item) => item.episodeNo === episodeNo)
  if (!episode) return board.batchContext

  const currentBatchEpisodes = board.episodeStatuses.filter((item) => item.batchIndex === episode.batchIndex)
  const startEpisode = currentBatchEpisodes[0]?.episodeNo ?? board.batchContext.startEpisode
  const endEpisode = currentBatchEpisodes.at(-1)?.episodeNo ?? board.batchContext.endEpisode

  return {
    ...board.batchContext,
    currentBatchIndex: episode.batchIndex,
    startEpisode,
    endEpisode,
    resumeFromEpisode:
      board.episodeStatuses.find((item) => item.status === 'pending')?.episodeNo ?? board.batchContext.resumeFromEpisode
  }
}

export function createInitialProgressBoard(
  plan: ScriptGenerationExecutionPlanDto,
  stageContractFingerprint: string | null
): ScriptGenerationProgressBoardDto {
  const batchSize = Math.min(plan.runtimeProfile.recommendedBatchSize, plan.targetEpisodes)
  const endEpisode = Math.min(batchSize, plan.targetEpisodes)
  return {
    episodeStatuses: plan.episodePlans.map((episode) => ({
      episodeNo: episode.episodeNo,
      status: episode.status === 'blocked' ? 'failed' : 'pending',
      batchIndex: Math.floor((episode.episodeNo - 1) / Math.max(1, batchSize)) + 1,
      reason: episode.runtimeHints?.recoveryMode
        ? `${episode.reason}（恢复档位：${episode.runtimeHints.recoveryMode}）`
        : episode.reason
    })),
    batchContext: {
      batchSize,
      currentBatchIndex: 1,
      startEpisode: 1,
      endEpisode,
      status: plan.ready ? 'idle' : 'failed',
      resumeFromEpisode: plan.ready ? 1 : null,
      reason: plan.ready
        ? `执行计划已建立，首批按 ${batchSize} 集推进，运行时档位 ${plan.runtimeProfile.profileLabel}。`
        : '输入合同未通过，进度板仅用于展示阻塞状态。',
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
    board: {
      ...input.board,
      batchContext: {
        ...input.board.batchContext,
        status: input.kind === 'stopped' ? 'paused' : 'failed',
        reason: input.reason,
        updatedAt: nowIso()
      }
    },
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
