import type { RuntimeProviderConfig } from '../../../infrastructure/runtime-env/provider-config'
import { generateTextWithRuntimeRouter } from '../../ai/generate-text'
import type { CharacterDraftDto, OutlineDraftDto, ScriptSegmentDto } from '../../../../shared/contracts/workflow'
import type {
  ScriptGenerationProgressBoardDto,
  StartScriptGenerationInputDto,
  StartScriptGenerationResultDto
} from '../../../../shared/contracts/script-generation'
import { advanceScriptGenerationState } from '../state-machine'
import { createScriptGenerationPrompt } from '../prompt/create-script-generation-prompt'
import { parseGeneratedScene } from './parse-generated-scene'

export async function runScriptGenerationBatch(input: {
  generationInput: StartScriptGenerationInputDto
  runtimeConfig: RuntimeProviderConfig
  board: ScriptGenerationProgressBoardDto
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  existingScript: ScriptSegmentDto[]
}): Promise<{
  board: ScriptGenerationProgressBoardDto
  generatedScenes: StartScriptGenerationResultDto['generatedScenes']
}> {
  const resolveTemperature = (episodeNo: number, runtimeHints: typeof input.generationInput.plan.episodePlans[number]['runtimeHints']) => {
    if (runtimeHints?.recoveryMode === 'retry_parse') return 0.45
    if (runtimeHints?.recoveryMode === 'retry_coverage') return 0.55
    if (runtimeHints?.recoveryMode === 'retry_runtime') return 0.6
    if (episodeNo === 1) return 0.45
    if (runtimeHints?.strictness === 'strict') return 0.65
    return 0.78
  }

  let board = input.board
  const readyEpisodes = input.generationInput.plan.episodePlans
    .filter((episode) => episode.status === 'ready')
    .slice(0, input.generationInput.plan.runtimeProfile.recommendedBatchSize)
  const generatedScenes: StartScriptGenerationResultDto['generatedScenes'] = []

  for (const episode of readyEpisodes) {
    board = advanceScriptGenerationState(board, {
      type: 'episode_started',
      episodeNo: episode.episodeNo,
      reason: '当前集进入生成中。'
    })

    const result = await generateTextWithRuntimeRouter(
      {
        task: 'episode_script',
        prompt: createScriptGenerationPrompt(
          input.generationInput,
          input.outline,
          input.characters,
          episode.episodeNo
        ),
        preferredLane: episode.lane,
        allowFallback: true,
        temperature: resolveTemperature(episode.episodeNo, episode.runtimeHints),
        runtimeHints: episode.runtimeHints
      },
      input.runtimeConfig
    )

    generatedScenes.push(parseGeneratedScene(result.text, episode.episodeNo))
    board = advanceScriptGenerationState(board, {
      type: 'episode_completed',
      episodeNo: episode.episodeNo,
      reason: `已生成，使用 ${result.lane} / ${result.model}${result.usedFallback ? '（回退）' : ''}`
    })
  }

  return {
    board,
    generatedScenes
  }
}
