import type { ProjectGenerationStatusDto } from '../../contracts/generation.ts'
import type { ScriptGenerationFailureResolutionDto } from '../../contracts/script-generation.ts'
import type { ScriptStateLedgerDto } from '../../contracts/script-ledger.ts'
import type { ScriptSegmentDto } from '../../contracts/workflow.ts'
import type {
  FormalReleaseState,
  VisibleResultState
} from '../../contracts/visible-release-state.ts'
import {
  createFormalBlockedState,
  createFormalReleasedState,
  createInitialVisibleResult,
  createVisibleFailureState,
  createVisibleSuccessState
} from '../../contracts/visible-release-state.ts'

export interface PersistedGenerationTruthInput {
  generationStatus: ProjectGenerationStatusDto | null
  scriptFailureResolution: ScriptGenerationFailureResolutionDto | null
  scriptDraft: ScriptSegmentDto[]
  scriptStateLedger?: ScriptStateLedgerDto | null
}

export function resolvePersistedGenerationTruth(input: PersistedGenerationTruthInput): {
  visibleResult: VisibleResultState
  formalRelease: FormalReleaseState
} {
  if (input.scriptDraft.length > 0) {
    return {
      visibleResult: createVisibleSuccessState(
        input.scriptDraft,
        input.scriptFailureResolution
          ? 'Generation interrupted after visible draft'
          : 'Generation result available'
      ),
      formalRelease: input.generationStatus
        ? createFormalBlockedState([
            {
              code: 'GENERATION_IN_PROGRESS',
              message: 'Generation still in progress',
              category: 'process'
            }
          ])
        : input.scriptFailureResolution
          ? createFormalBlockedState([
              {
                code: 'UNKNOWN_BLOCKED',
                message: input.scriptFailureResolution.reason,
                category: 'process'
              }
            ])
          : createFormalReleasedState(
              input.scriptStateLedger?.postflight?.quality?.pass === false
                ? 'Draft released; quality signals remain for follow-up repair'
                : 'Formal release approved from persisted script draft'
            )
    }
  }

  if (input.scriptFailureResolution) {
    return {
      visibleResult: createVisibleFailureState(input.scriptFailureResolution, 'Generation failed'),
      formalRelease: createFormalBlockedState([
        {
          code: 'UNKNOWN_BLOCKED',
          message: input.scriptFailureResolution.reason,
          category: 'process'
        }
      ])
    }
  }

  if (input.generationStatus) {
    return {
      visibleResult: {
        ...createInitialVisibleResult(),
        status: 'pending',
        description: 'Generation in progress'
      },
      formalRelease: createFormalBlockedState([
        {
          code: 'GENERATION_IN_PROGRESS',
          message: 'Generation still in progress',
          category: 'process'
        }
      ])
    }
  }

  return {
    visibleResult: createInitialVisibleResult(),
    formalRelease: createFormalBlockedState([
      {
        code: 'UNKNOWN_BLOCKED',
        message: 'Formal release has not been independently approved',
        category: 'process'
      }
    ])
  }
}
