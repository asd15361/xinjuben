/**
 * truth-owner-matrix.ts — Single-Writer Truth Domain Owner Matrix
 *
 * PURPOSE:
 * Machine-readable inventory of all truth domains with their unique producer,
 * consumers, persister, and display-only consumers.
 *
 * This is the FOUNDATIONAL matrix used by runtime enforcement (T2) and
 * tests. It converts descriptive authority rules into importable code.
 *
 * PRINCIPLES:
 * - No field has more than one producer
 * - Consumer may not become producer without passing through Persister
 * - Renderer is always Consumer, never Producer for core truths
 * - displayOnly consumers may read but must not store/cached as authoritative
 *
 * TEN TRUTH DOMAINS:
 * 1. stage              — current workflow stage
 * 2. blockedReason      — why generation is blocked
 * 3. resumeEligibility  — whether resume is allowed
 * 4. generationStatus    — in-flight generation state
 * 5. scriptRuntimeState — scenes written so far (ScriptSegmentDto[])
 * 6. facts              — user-confirmed facts
 * 7. failureHistory      — accumulated past failures across generations
 * 8. ledger             — script state ledger (character/fact/momentum state)
 * 9. visibleResult       — displayable result regardless of formal gate status
 * 10. formalRelease      — official gate status (separate from visible result)
 *
 * WAVES:
 * - T1: This matrix (foundation)
 * - T2: IPC/main enforcement hooks
 * - T3: Renderer second-writer purge
 * - T4: failureHistory persistence baseline
 */

import type { TruthOwnerType } from './truth-authority'
import { TruthOwner } from './truth-authority'

// =============================================================================
// TRUTH DOMAIN IDENTIFIERS
// =============================================================================

/**
 * All truth domains covered by this matrix.
 * Each must have exactly one producer.
 */
export const TruthDomain = {
  STAGE: 'stage',
  BLOCKED_REASON: 'blockedReason',
  RESUME_ELIGIBILITY: 'resumeEligibility',
  GENERATION_STATUS: 'generationStatus',
  SCRIPT_RUNTIME_STATE: 'scriptRuntimeState',
  FACTS: 'facts',
  FAILURE_HISTORY: 'failureHistory',
  LEDGER: 'ledger',
  VISIBLE_RESULT: 'visibleResult',
  FORMAL_RELEASE: 'formalRelease'
} as const

export type TruthDomainType = (typeof TruthDomain)[keyof typeof TruthDomain]

// =============================================================================
// DOMAIN OWNERSHIP DEFINITIONS
// =============================================================================

/**
 * Ownership specification for a single truth domain.
 *
 * @property producer        — Single authoritative source with write capability
 * @property consumers       — Read-only consumers (no business logic, display only)
 * @property persister       — Durable storage authority (updated only by producer)
 * @property displayOnly     — Additional consumers that may read for display but
 *                             must NOT cache/store as authoritative truth
 */
export interface DomainOwnership {
  producer: TruthOwnerType
  consumers: TruthOwnerType[]
  persister: TruthOwnerType
  displayOnly?: TruthOwnerType[]
}

/**
 * Truth Owner Matrix — defines SINGLE WRITER for each truth domain
 *
 * Canonical source of truth for runtime enforcement and tests.
 * All truth domains must have exactly one producer.
 */
export const TruthOwnerMatrix: Record<TruthDomainType, DomainOwnership> = {
  /**
   * stage — current workflow stage
   * Producer: MAIN (stage transitions happen via IPC to main, main decides)
   * Consumers: RENDERER (display only, cannot change stage unilaterally)
   * Persister: PERSISTER (project-store persists stage)
   * displayOnly: none
   */
  [TruthDomain.STAGE]: {
    producer: TruthOwner.MAIN,
    consumers: [TruthOwner.RENDERER],
    persister: TruthOwner.PERSISTER
  },

  /**
   * blockedReason — why generation is blocked
   * Producer: MAIN (contract-policy.ts computes blocked reasons)
   * Consumers: RENDERER (displays blocked status, cannot compute own reason)
   * Persister: PERSISTER (blocked state persisted in project snapshot)
   * displayOnly: none
   */
  [TruthDomain.BLOCKED_REASON]: {
    producer: TruthOwner.MAIN,
    consumers: [TruthOwner.RENDERER],
    persister: TruthOwner.PERSISTER
  },

  /**
   * resumeEligibility — whether resume is allowed
   * Producer: MAIN (progress-board.ts resolveResumeFromBoard computes this)
   * Consumers: RENDERER (reads resume decision, cannot make own decision)
   * Persister: PERSISTER (resume state persisted)
   * displayOnly: none
   */
  [TruthDomain.RESUME_ELIGIBILITY]: {
    producer: TruthOwner.MAIN,
    consumers: [TruthOwner.RENDERER],
    persister: TruthOwner.PERSISTER
  },

  /**
   * generationStatus — in-flight generation state
   * Producer: MAIN (IPC handlers start/update generation status)
   * Consumers: RENDERER (displays status, cannot create/modify)
   * Persister: PERSISTER (generation status persisted via saveGenerationStatus)
   * displayOnly: none
   */
  [TruthDomain.GENERATION_STATUS]: {
    producer: TruthOwner.MAIN,
    consumers: [TruthOwner.RENDERER],
    persister: TruthOwner.PERSISTER
  },

  /**
   * scriptRuntimeState — scenes written so far (ScriptSegmentDto[])
   * Producer: MAIN (script-generation builds up ScriptSegmentDto[])
   * Consumers: RENDERER (reads scene list for display, cannot modify scenes)
   * Persister: PERSISTER (scenes persisted via IPC to project-store)
   * displayOnly: none
   */
  [TruthDomain.SCRIPT_RUNTIME_STATE]: {
    producer: TruthOwner.MAIN,
    consumers: [TruthOwner.RENDERER],
    persister: TruthOwner.PERSISTER
  },

  /**
   * facts — user-confirmed authoritative facts
   * Producer: MAIN (formal-fact handlers: declare, confirm, remove)
   * Consumers: RENDERER (displays facts), MAIN (downstream computation)
   * Persister: PERSISTER (facts persisted in project outline)
   * displayOnly: none
   */
  [TruthDomain.FACTS]: {
    producer: TruthOwner.MAIN,
    consumers: [TruthOwner.RENDERER, TruthOwner.MAIN],
    persister: TruthOwner.PERSISTER
  },

  /**
   * failureHistory — accumulated past failures across generations
   * Producer: MAIN (accumulated by main across generation runs)
   * Consumers: RENDERER (displays failure history), MAIN (risk assessment)
   * Persister: PERSISTER (failureHistory persisted via atomicSaveGenerationState)
   * displayOnly: none
   *
   * NOTE: failureHistory is a QUEUE (not just latest), persisting recent N failures.
   * On successful generation, history may be cleared atomically.
   * On failure, new failure is appended to history.
   */
  [TruthDomain.FAILURE_HISTORY]: {
    producer: TruthOwner.MAIN,
    consumers: [TruthOwner.RENDERER, TruthOwner.MAIN],
    persister: TruthOwner.PERSISTER
  },

  /**
   * ledger — script state ledger (character/fact/momentum state)
   * Producer: MAIN (ledger-building logic builds ScriptStateLedgerDto)
   * Consumers: RENDERER (display ledger state), MAIN (downstream computation)
   * Persister: PERSISTER (ledger persisted via IPC to project-store)
   * displayOnly: none
   *
   * NOTE: ledger captures character states, fact confirmations, momentum,
   * openHooks, knowledge boundaries — all computed by main's ledger builders.
   */
  [TruthDomain.LEDGER]: {
    producer: TruthOwner.MAIN,
    consumers: [TruthOwner.RENDERER, TruthOwner.MAIN],
    persister: TruthOwner.PERSISTER
  },

  /**
   * visibleResult — displayable result regardless of formal gate status
   * Producer: MAIN (produces visible result for display even when gate blocked)
   * Consumers: RENDERER (displays visible result to user)
   * Persister: PERSISTER (visible result persisted)
   * displayOnly: none
   *
   * PURPOSE: T12 dual-state mechanism — results can be visible/analysable
   * even when formalRelease gate is not passed.
   *
   * CONTEXT: "失败结果可见但正式联动受阻的双轨机制"
   * - visibleResult: user can see and analyze current result
   * - formalRelease: official gate still blocks progression
   */
  [TruthDomain.VISIBLE_RESULT]: {
    producer: TruthOwner.MAIN,
    consumers: [TruthOwner.RENDERER],
    persister: TruthOwner.PERSISTER
  },

  /**
   * formalRelease — official gate status (separate from visible result)
   * Producer: MAIN (computes and sets formal release gate status)
   * Consumers: RENDERER (reads gate status to enable/disable actions)
   * Persister: PERSISTER (formal release state persisted)
   * displayOnly: none
   *
   * PURPOSE: T12 dual-state mechanism — formalRelease requires separate
   * condition checks, NOT automatically granted when visibleResult exists.
   *
   * CONTEXT: "明确区分：运行草稿 / 可见草稿 / 待确认 / 正式放行"
   * - visibleResult may exist even when formalRelease is BLOCKED
   * - formalRelease is NEVER granted solely because visibleResult exists
   */
  [TruthDomain.FORMAL_RELEASE]: {
    producer: TruthOwner.MAIN,
    consumers: [TruthOwner.RENDERER],
    persister: TruthOwner.PERSISTER
  }
} as const

// =============================================================================
// SINGLE-WRITER VALIDATION
// =============================================================================

/**
 * Validates that a truth domain has exactly one producer.
 * Throws if validation fails.
 */
export function assertSingleProducer(domain: TruthDomainType): void {
  const ownership = TruthOwnerMatrix[domain]
  if (!ownership) {
    throw new Error(`[TruthOwnerMatrix] Unknown truth domain: ${domain}`)
  }
  if (!ownership.producer) {
    throw new Error(`[TruthOwnerMatrix] Domain "${domain}" has no producer defined`)
  }
}

/**
 * Validates the entire matrix on module load.
 * Ensures all domains have single producer and no duplicates.
 */
export function validateTruthOwnerMatrix(): void {
  const domains = Object.keys(TruthOwnerMatrix) as TruthDomainType[]

  for (const domain of domains) {
    assertSingleProducer(domain)
  }

  // Verify all expected domains are present
  const expectedDomains: TruthDomainType[] = [
    TruthDomain.STAGE,
    TruthDomain.BLOCKED_REASON,
    TruthDomain.RESUME_ELIGIBILITY,
    TruthDomain.GENERATION_STATUS,
    TruthDomain.SCRIPT_RUNTIME_STATE,
    TruthDomain.FACTS,
    TruthDomain.FAILURE_HISTORY,
    TruthDomain.LEDGER,
    TruthDomain.VISIBLE_RESULT,
    TruthDomain.FORMAL_RELEASE
  ]

  for (const expected of expectedDomains) {
    if (!TruthOwnerMatrix[expected]) {
      throw new Error(`[TruthOwnerMatrix] Missing required domain: ${expected}`)
    }
  }

  // Verify MAIN is producer for all core truths
  const coreTruths: TruthDomainType[] = [
    TruthDomain.STAGE,
    TruthDomain.BLOCKED_REASON,
    TruthDomain.RESUME_ELIGIBILITY,
    TruthDomain.GENERATION_STATUS,
    TruthDomain.SCRIPT_RUNTIME_STATE
  ]

  for (const domain of coreTruths) {
    if (TruthOwnerMatrix[domain].producer !== TruthOwner.MAIN) {
      throw new Error(
        `[TruthOwnerMatrix] Core truth "${domain}" must have MAIN as producer, got: ${TruthOwnerMatrix[domain].producer}`
      )
    }
  }

  // Verify RENDERER is never a producer for any domain
  for (const domain of domains) {
    if (TruthOwnerMatrix[domain].producer === TruthOwner.RENDERER) {
      throw new Error(`[TruthOwnerMatrix] RENDERER cannot be producer for any domain: ${domain}`)
    }
  }
}

// Validate on module load
try {
  validateTruthOwnerMatrix()
} catch (err) {
  console.error('[TruthOwnerMatrix] FAILED VALIDATION:', err)
  throw err
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

/**
 * Get the producer for a truth domain
 */
export function getProducer(domain: TruthDomainType): TruthOwnerType {
  return TruthOwnerMatrix[domain].producer
}

/**
 * Get all consumers for a truth domain
 */
export function getConsumers(domain: TruthDomainType): TruthOwnerType[] {
  return TruthOwnerMatrix[domain].consumers
}

/**
 * Get the persister for a truth domain
 */
export function getPersister(domain: TruthDomainType): TruthOwnerType {
  return TruthOwnerMatrix[domain].persister
}

/**
 * Get display-only consumers for a truth domain
 */
export function getDisplayOnly(domain: TruthDomainType): TruthOwnerType[] {
  return TruthOwnerMatrix[domain].displayOnly ?? []
}

/**
 * Check if an owner has producer authority for a domain
 */
export function isProducer(owner: TruthOwnerType, domain: TruthDomainType): boolean {
  return TruthOwnerMatrix[domain]?.producer === owner
}

/**
 * Check if an owner is a consumer for a domain
 */
export function isConsumer(owner: TruthOwnerType, domain: TruthDomainType): boolean {
  return TruthOwnerMatrix[domain]?.consumers.includes(owner) ?? false
}

/**
 * Check if an owner is a display-only consumer for a domain
 */
export function isDisplayOnly(owner: TruthOwnerType, domain: TruthDomainType): boolean {
  return (TruthOwnerMatrix[domain]?.displayOnly ?? []).includes(owner)
}

/**
 * Check if an owner may write to a domain (producer or persister via producer)
 */
export function mayWrite(owner: TruthOwnerType, domain: TruthDomainType): boolean {
  const ownership = TruthOwnerMatrix[domain]
  if (!ownership) return false

  // Producer has write authority
  if (ownership.producer === owner) return true

  // Persister may only write when producer passes through
  if (ownership.persister === owner) return true

  return false
}

/**
 * Returns all truth domains where the given owner is the producer
 */
export function getProducedDomains(owner: TruthOwnerType): TruthDomainType[] {
  return (Object.keys(TruthOwnerMatrix) as TruthDomainType[]).filter(
    (domain) => TruthOwnerMatrix[domain].producer === owner
  )
}

/**
 * Returns all truth domains where the given owner is a consumer
 */
export function getConsumedDomains(owner: TruthOwnerType): TruthDomainType[] {
  return (Object.keys(TruthOwnerMatrix) as TruthDomainType[]).filter((domain) =>
    TruthOwnerMatrix[domain].consumers.includes(owner)
  )
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type { TruthOwnerType } from './truth-authority'
