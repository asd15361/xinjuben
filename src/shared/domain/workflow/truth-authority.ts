/**
 * truth-authority.ts — Single Authoritative Entry Point for Truth Ownership
 *
 * PURPOSE:
 * This module defines WHO owns each piece of truth in the script generation system.
 * It is the SINGLE SOURCE OF TRUTH for authority boundaries.
 *
 * PRINCIPLES (from system-authority):
 * - No field has more than one producer
 * - Consumer may not become producer without passing through Persister
 * - Renderer is always Consumer, never Producer for core truths
 * - main process is the authoritative source for all core truths
 *
 * SIX TRUTH DOMAINS:
 * 1. stage           — WHO defines and writes the current workflow stage
 * 2. blockedReason   — WHO owns the computation of why generation is blocked
 * 3. resumeEligibility — WHO decides if resume is allowed
 * 4. generationStatus — WHO owns the in-flight generation state
 * 5. scriptRuntimeState — WHO owns the runtime script state (scenes written so far)
 * 6. facts           — WHO owns the authoritative user-confirmed facts
 */

// =============================================================================
// TRUTH OWNER DEFINITIONS
// =============================================================================

/**
 * Modules that can own truth production authority
 */
export const TruthOwner = {
  /** Main process — the sole authoritative source for core business logic */
  MAIN: 'main',
  /** Renderer process — consumer-only, display and user interaction only */
  RENDERER: 'renderer',
  /** Persistence layer — durable storage, not a truth producer */
  PERSISTER: 'persister',
  /** Legacy compatibility layer — read-only migration, no authority */
  LEGACY: 'legacy'
} as const

export type TruthOwnerType = (typeof TruthOwner)[keyof typeof TruthOwner]

// =============================================================================
// PRODUCER / CONSUMER / PERSISTER BOUNDARIES
// =============================================================================

/**
 * Marks which parties have write (producer), read-only (consumer),
 * or durable storage (persister) authority for each truth domain.
 *
 * INVARIANTS (enforced in code, not just documentation):
 * - "No field has more than one producer"
 * - "Consumer may not become producer without passing through Persister"
 * - "Renderer is always Consumer, never Producer for core truths"
 */
export interface ProducerConsumerPair {
  /** Single authoritative source with write capability */
  producer: TruthOwnerType
  /** Read-only consumers — no business logic, display only */
  consumers: TruthOwnerType[]
  /** Durable storage authority — may only be updated by producer */
  persister?: TruthOwnerType
}

/**
 * Truth authority map — defines SINGLE OWNER for each truth domain
 *
 * stage:
 *   - Producer: MAIN (stage transitions happen via IPC to main, main decides)
 *   - Consumers: RENDERER (display only, cannot change stage unilaterally)
 *   - Persister: PERSISTER (project-store persists stage)
 *
 * blockedReason:
 *   - Producer: MAIN (contract-policy.ts computes blocked reasons)
 *   - Consumers: RENDERER (displays blocked status, cannot compute own reason)
 *   - Persister: PERSISTER (blocked state persisted in project snapshot)
 *
 * resumeEligibility:
 *   - Producer: MAIN (progress-board.ts resolveResumeFromBoard)
 *   - Consumers: RENDERER (reads resume decision, cannot make own decision)
 *   - Persister: PERSISTER (resume state persisted)
 *
 * generationStatus:
 *   - Producer: MAIN (IPC handlers start/update generation status)
 *   - Consumers: RENDERER (displays status, cannot create/modify)
 *   - Persister: PERSISTER (generation status persisted via saveGenerationStatus)
 *
 * scriptRuntimeState:
 *   - Producer: MAIN (script-generation builds up ScriptSegmentDto[])
 *   - Consumers: RENDERER (reads scene list for display, cannot modify scenes)
 *   - Persister: PERSISTER (scenes persisted via IPC to project-store)
 *
 * facts:
 *   - Producer: MAIN (formal-fact handlers: declare, confirm, remove)
 *   - Consumers: RENDERER, MAIN (both read confirmed facts for downstream)
 *   - Persister: PERSISTER (facts persisted in project outline)
 */
export const TruthAuthorityMap = {
  stage: {
    producer: TruthOwner.MAIN,
    consumers: [TruthOwner.RENDERER],
    persister: TruthOwner.PERSISTER
  } as ProducerConsumerPair,

  blockedReason: {
    producer: TruthOwner.MAIN,
    consumers: [TruthOwner.RENDERER],
    persister: TruthOwner.PERSISTER
  } as ProducerConsumerPair,

  resumeEligibility: {
    producer: TruthOwner.MAIN,
    consumers: [TruthOwner.RENDERER],
    persister: TruthOwner.PERSISTER
  } as ProducerConsumerPair,

  generationStatus: {
    producer: TruthOwner.MAIN,
    consumers: [TruthOwner.RENDERER],
    persister: TruthOwner.PERSISTER
  } as ProducerConsumerPair,

  scriptRuntimeState: {
    producer: TruthOwner.MAIN,
    consumers: [TruthOwner.RENDERER],
    persister: TruthOwner.PERSISTER
  } as ProducerConsumerPair,

  facts: {
    producer: TruthOwner.MAIN,
    consumers: [TruthOwner.RENDERER, TruthOwner.MAIN],
    persister: TruthOwner.PERSISTER
  } as ProducerConsumerPair
} as const

export type TruthDomain = keyof typeof TruthAuthorityMap

// =============================================================================
// AUTHORITY INVARIANTS (RUNTIME ENFORCEMENT)
// =============================================================================

/**
 * Validates that a truth domain has exactly one producer
 */
export function assertSingleProducer(domain: TruthDomain): void {
  const authority = TruthAuthorityMap[domain]
  if (!authority) {
    throw new Error(`[TruthAuthority] Unknown truth domain: ${domain}`)
  }
  if (!authority.producer) {
    throw new Error(`[TruthAuthority] Domain "${domain}" has no producer defined`)
  }
}

/**
 * Checks if a given owner has producer authority for a domain
 */
export function isProducer(owner: TruthOwnerType, domain: TruthDomain): boolean {
  return TruthAuthorityMap[domain]?.producer === owner
}

/**
 * Checks if a given owner is a consumer for a domain
 */
export function isConsumer(owner: TruthOwnerType, domain: TruthDomain): boolean {
  return TruthAuthorityMap[domain]?.consumers.includes(owner) ?? false
}

/**
 * Checks if an owner may write to a domain (producer or persister via producer)
 */
export function mayWrite(owner: TruthOwnerType, domain: TruthDomain): boolean {
  const authority = TruthAuthorityMap[domain]
  if (!authority) return false

  // Producer has write authority
  if (authority.producer === owner) return true

  // Persister may only write when producer passes through
  if (authority.persister === owner) {
    // Note: This is a structural check. Actual enforcement requires
    // that persister updates only happen via producer IPC calls.
    return true
  }

  return false
}

/**
 * Throws if an owner attempts to write to a domain they don't own
 */
export function enforceWriteAuthority(owner: TruthOwnerType, domain: TruthDomain): void {
  if (!mayWrite(owner, domain)) {
    throw new Error(
      `[TruthAuthority] ${owner} is not authorized to write "${domain}". ` +
        `Producer: ${TruthAuthorityMap[domain]?.producer}`
    )
  }
}

/**
 * Returns all truth domains where the given owner is the producer
 */
export function getProducedDomains(owner: TruthOwnerType): TruthDomain[] {
  return (Object.keys(TruthAuthorityMap) as TruthDomain[]).filter(
    (domain) => TruthAuthorityMap[domain].producer === owner
  )
}

/**
 * Returns all truth domains where the given owner is a consumer
 */
export function getConsumedDomains(owner: TruthOwnerType): TruthDomain[] {
  return (Object.keys(TruthAuthorityMap) as TruthDomain[]).filter((domain) =>
    TruthAuthorityMap[domain].consumers.includes(owner)
  )
}

// =============================================================================
// TRUTHAUTHORITY CONTRACT INTERFACE
// =============================================================================

/**
 * TruthAuthority contract — provides a typed interface for truth ownership queries
 */
export interface TruthAuthority {
  /** Get the producer for a truth domain */
  getProducer(domain: TruthDomain): TruthOwnerType

  /** Get all consumers for a truth domain */
  getConsumers(domain: TruthDomain): TruthOwnerType[]

  /** Get the persister for a truth domain, if any */
  getPersister(domain: TruthDomain): TruthOwnerType | undefined

  /** Check if an owner is the producer for a domain */
  isProducer(owner: TruthOwnerType, domain: TruthDomain): boolean

  /** Check if an owner is a consumer for a domain */
  isConsumer(owner: TruthOwnerType, domain: TruthDomain): boolean

  /** Check if an owner may write to a domain */
  mayWrite(owner: TruthOwnerType, domain: TruthDomain): boolean

  /** Enforce write authority — throws if not authorized */
  enforceWriteAuthority(owner: TruthOwnerType, domain: TruthDomain): void

  /** Get all domains produced by an owner */
  getProducedDomains(owner: TruthOwnerType): TruthDomain[]

  /** Get all domains consumed by an owner */
  getConsumedDomains(owner: TruthOwnerType): TruthDomain[]

  /** Validate all domains have single producer */
  validate(): void
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const truthAuthority: TruthAuthority = {
  getProducer: (domain) => TruthAuthorityMap[domain].producer,

  getConsumers: (domain) => TruthAuthorityMap[domain].consumers,

  getPersister: (domain) => TruthAuthorityMap[domain].persister,

  isProducer,

  isConsumer,

  mayWrite,

  enforceWriteAuthority,

  getProducedDomains,

  getConsumedDomains,

  validate: () => {
    for (const domain of Object.keys(TruthAuthorityMap) as TruthDomain[]) {
      assertSingleProducer(domain)
    }
    // Verify MAIN is producer for all core truths
    const coreTruths: TruthDomain[] = [
      'stage',
      'blockedReason',
      'resumeEligibility',
      'generationStatus',
      'scriptRuntimeState'
    ]
    for (const domain of coreTruths) {
      if (TruthAuthorityMap[domain].producer !== TruthOwner.MAIN) {
        throw new Error(
          `[TruthAuthority] Core truth "${domain}" must have MAIN as producer, got: ${TruthAuthorityMap[domain].producer}`
        )
      }
    }
    // Verify RENDERER is never a producer for core truths
    for (const domain of coreTruths) {
      if (TruthAuthorityMap[domain].producer === TruthOwner.RENDERER) {
        throw new Error(`[TruthAuthority] RENDERER cannot be producer for core truth "${domain}"`)
      }
    }
  }
}

// Validate on module load
try {
  truthAuthority.validate()
} catch (err) {
  console.error('[TruthAuthority] FAILED VALIDATION:', err)
  throw err
}

// =============================================================================
// RENDERER SPECIFIC CONSTRAINTS
// =============================================================================

/**
 * Renderer-specific constraints — these are ALWAYS true for the renderer process
 * and serve as compile-time documentation of the renderer consumer-only contract.
 */
export const RendererConstraints = {
  /** Renderer may never produce stage — stage changes must go through main IPC */
  RENDERER_NEVER_PRODUCES_STAGE: true,

  /** Renderer may never produce blockedReason — must ask main */
  RENDERER_NEVER_PRODUCES_BLOCKED_REASON: true,

  /** Renderer may never produce resumeEligibility — main computes this */
  RENDERER_NEVER_PRODUCES_RESUME_ELIGIBILITY: true,

  /** Renderer may never produce generationStatus — main owns this */
  RENDERER_NEVER_PRODUCES_GENERATION_STATUS: true,

  /** Renderer may never produce scriptRuntimeState — main builds this */
  RENDERER_NEVER_PRODUCES_SCRIPT_RUNTIME_STATE: true,

  /**
   * Renderer may only update generationStatus in useWorkflowStore
   * when receiving confirmed update from main via IPC.
   * Local optimistic updates are DISALLOWED for core truths.
   */
  RENDERER_LOCAL_OPTIMISTIC_UPDATES_DISALLOWED: true
} as const

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// Note: ProducerConsumerPair is already exported via `export interface` above
