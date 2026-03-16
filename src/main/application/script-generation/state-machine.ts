import type { ScriptGenerationProgressBoardDto } from '../../../shared/contracts/script-generation'
import { markBatchStatus, updateEpisodeStatus } from './progress-board'

export type ScriptGenerationEvent =
  | { type: 'batch_started'; reason: string }
  | { type: 'episode_started'; episodeNo: number; reason: string }
  | { type: 'episode_completed'; episodeNo: number; reason: string }
  | { type: 'episode_failed'; episodeNo: number; reason: string }
  | { type: 'batch_paused'; reason: string }
  | { type: 'batch_completed'; reason: string }
  | { type: 'batch_failed'; reason: string }

export function advanceScriptGenerationState(
  board: ScriptGenerationProgressBoardDto,
  event: ScriptGenerationEvent
): ScriptGenerationProgressBoardDto {
  if (event.type === 'batch_started') {
    return markBatchStatus(board, 'running', event.reason)
  }

  if (event.type === 'episode_started') {
    return updateEpisodeStatus({
      board,
      episodeNo: event.episodeNo,
      status: 'running',
      reason: event.reason
    })
  }

  if (event.type === 'episode_completed') {
    return updateEpisodeStatus({
      board,
      episodeNo: event.episodeNo,
      status: 'completed',
      reason: event.reason
    })
  }

  if (event.type === 'episode_failed') {
    const next = updateEpisodeStatus({
      board,
      episodeNo: event.episodeNo,
      status: 'failed',
      reason: event.reason
    })
    return markBatchStatus(next, 'failed', event.reason)
  }

  if (event.type === 'batch_paused') {
    return markBatchStatus(board, 'paused', event.reason)
  }

  if (event.type === 'batch_completed') {
    return markBatchStatus(board, 'completed', event.reason)
  }

  return markBatchStatus(board, 'failed', event.reason)
}
