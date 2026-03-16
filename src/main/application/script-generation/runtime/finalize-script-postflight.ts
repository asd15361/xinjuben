import type { CharacterDraftDto, OutlineDraftDto, ScriptSegmentDto } from '../../../../shared/contracts/workflow'
import type { StartScriptGenerationInputDto, StartScriptGenerationResultDto } from '../../../../shared/contracts/script-generation'
import { buildScriptStateLedger } from '../ledger/build-script-ledger'
import { buildLedgerPostflightAssertion } from '../ledger/ledger-postflight'
import { collectF6PostflightIssues } from './collect-f6-postflight-issues'

export function finalizeScriptPostflight(input: {
  generationInput: StartScriptGenerationInputDto
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  existingScript: ScriptSegmentDto[]
  generatedScenes: StartScriptGenerationResultDto['generatedScenes']
}) {
  const previousLedger =
    input.existingScript.length > 0
      ? buildScriptStateLedger({
          storyIntent: input.generationInput.storyIntent,
          outline: input.outline,
          characters: input.characters,
          script: input.existingScript
        })
      : null
  const ledger = buildScriptStateLedger({
    storyIntent: input.generationInput.storyIntent,
    outline: input.outline,
    characters: input.characters,
    script: [...input.existingScript, ...input.generatedScenes]
  })
  const postflight = buildLedgerPostflightAssertion({
    previousLedger,
    nextLedger: ledger
  })
  postflight.issues.push(...collectF6PostflightIssues(input.generatedScenes))
  if (postflight.issues.length > 0) {
    postflight.summary = `生成后账本断言发现问题：${postflight.issues.map((issue) => issue.detail).join('；')}`
  }

  ledger.postflight = postflight

  return {
    ledger,
    postflight
  }
}
