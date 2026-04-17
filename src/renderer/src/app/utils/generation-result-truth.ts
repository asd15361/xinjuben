import type {
  FormalReleaseState,
  GenerationResultState,
  VisibleResultState
} from '../../../../shared/contracts/visible-release-state'
import { createGenerationResultState } from '../../../../shared/contracts/visible-release-state.ts'

export function buildPersistedGenerationResult(input: {
  visibleResult: VisibleResultState | null | undefined
  formalRelease: FormalReleaseState | null | undefined
}): GenerationResultState | null {
  if (!input.visibleResult || !input.formalRelease) {
    return null
  }

  return createGenerationResultState(input.visibleResult, input.formalRelease)
}
