import type { ScriptGenerationFailureResolutionDto } from './script-generation'
import type { ScriptSegmentDto } from './workflow'

export type VisibleResultStatus = 'none' | 'pending' | 'visible' | 'failed'
export type FormalReleaseStatus = 'blocked' | 'pending' | 'released'

export interface VisibleResultState {
  status: VisibleResultStatus
  description: string
  payload: ScriptSegmentDto[] | null
  failureResolution: ScriptGenerationFailureResolutionDto | null
  updatedAt: string
}

export interface FormalReleaseBlockReason {
  code:
    | 'CONTRACT_NOT_VALIDATED'
    | 'QUALITY_NOT_PASSED'
    | 'UPSTREAM_INCOMPLETE'
    | 'BOUNDARY_GUARDIAN_BLOCKED'
    | 'LEDGER_NOT_CONFIRMED'
    | 'FACTS_NOT_CONFIRMED'
    | 'PERSISTENCE_NOT_SYNCED'
    | 'GENERATION_IN_PROGRESS'
    | 'MANUAL_HOLD'
    | 'UNKNOWN_BLOCKED'
  message: string
  category: 'contract' | 'quality' | 'process' | 'persistence'
}

export interface FormalReleaseState {
  status: FormalReleaseStatus
  description: string
  blockedBy: FormalReleaseBlockReason[]
  evaluatedAt: string
}
