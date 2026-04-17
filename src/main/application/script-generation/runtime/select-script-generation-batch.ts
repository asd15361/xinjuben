import type {
  ScriptGenerationExecutionPlanDto,
  ScriptGenerationProgressBoardDto
} from '../../../../shared/contracts/script-generation'

export function selectBatchEpisodesForRun(
  plan: ScriptGenerationExecutionPlanDto,
  board: ScriptGenerationProgressBoardDto
): ScriptGenerationExecutionPlanDto['episodePlans'] {
  const pendingStatuses = board.episodeStatuses
    .filter((episode) => episode.status === 'pending')
    .sort((left, right) => left.episodeNo - right.episodeNo)

  if (pendingStatuses.length === 0) return []

  const nextBatchIndex = pendingStatuses[0]!.batchIndex
  const nextBatchEpisodeNos = new Set(
    pendingStatuses
      .filter((episode) => episode.batchIndex === nextBatchIndex)
      .map((episode) => episode.episodeNo)
  )

  return plan.episodePlans
    .filter((episode) => nextBatchEpisodeNos.has(episode.episodeNo))
    .sort((left, right) => left.episodeNo - right.episodeNo)
}
