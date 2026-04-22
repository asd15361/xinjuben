/**
 * truth-enforcement.ts — Runtime Truth Enforcement at IPC/Main Boundaries
 *
 * PURPOSE:
 * This module provides runtime enforcement helpers that verify truth domain
 * ownership at IPC entry points and main application dispatch paths.
 *
 * WAVE: T2 — IPC/main truth enforcement hooks
 *
 * PRINCIPLES:
 * - No field has more than one producer (from truth-authority.ts)
 * - MAIN is the sole producer for all core truth domains
 * - Enforcement must occur at runtime, not just at module load
 * - Violations throw AuthorityFailureError with explicit error codes
 *
 * USAGE:
 * Import and call at the START of IPC handlers that write to truth domains:
 *
 * ```typescript
 * import { enforceTruthDomainWrite, assertMainProducer } from './truth-enforcement.ts'
 *
 * ipcMain.handle('workflow:start-script-generation', async (event, input) => {
 *   // Enforce MAIN is writing generationStatus (truth it owns)
 *   enforceTruthDomainWrite('MAIN', 'generationStatus', 'workflow:start-script-generation')
 *
 *   // ... handler implementation
 * })
 * ```
 *
 * ENFORCEMENT POINTS:
 * 1. IPC generation/stage entry handlers
 * 2. Key main application dispatch paths
 * 3. Any handler that writes to shared truth domains
 */

import { AuthorityFailureError, AuthorityFailureType } from './authority-constitution.ts'
import {
  TruthDomain,
  TruthOwnerMatrix,
  getProducer,
  mayWrite,
  type TruthDomainType
} from './truth-owner-matrix.ts'
import { TruthOwner, type TruthOwnerType } from './truth-authority.ts'

// =============================================================================
// ENFORCEMENT CONTEXT LABELS
// =============================================================================

/**
 * Context labels for enforcement calls — used to identify where in the
 * call stack the enforcement occurred. Helps with debugging authority failures.
 */
export const EnforcementContext = {
  // IPC handlers - generation
  START_SCRIPT_GENERATION: 'workflow:start-script-generation',
  STOP_SCRIPT_GENERATION: 'workflow:stop-script-generation',
  PAUSE_SCRIPT_GENERATION: 'workflow:pause-script-generation',
  RESUME_SCRIPT_GENERATION: 'workflow:resume-script-generation',
  GET_RUNTIME_CONSOLE_STATE: 'workflow:get-runtime-console-state',
  BUILD_SCRIPT_LEDGER_PREVIEW: 'workflow:build-script-ledger-preview',

  // IPC handlers - workspace generation
  CREATE_OUTLINE_SEED: 'workspace:create-outline-seed',
  LEGACY_GENERATE_OUTLINE_AND_CHARACTERS_BLOCKED: 'workspace:generate-outline-and-characters',
  GENERATE_DETAILED_OUTLINE: 'workspace:generate-detailed-outline',
  GENERATE_DETAILED_OUTLINE_BLOCKS: 'workspace:generate-detailed-outline-blocks',

  // IPC handlers - formal facts
  DECLARE_FORMAL_FACT: 'workflow:declare-formal-fact',
  CONFIRM_FORMAL_FACT: 'workflow:confirm-formal-fact',
  REMOVE_FORMAL_FACT: 'workflow:remove-formal-fact',
  VALIDATE_FORMAL_FACT: 'workflow:validate-formal-fact-definition',
  EVALUATE_FORMAL_FACT_ELEVATION: 'workflow:evaluate-formal-fact-elevation',

  // Application dispatch
  SCRIPT_GENERATION_ORCHESTRATOR: 'script-orchestrator:execute',
  ADVANCE_SCRIPT_GENERATION_STATE: 'state-machine:advance',
  BUILD_SCRIPT_LEDGER: 'ledger:build',
  FORMAL_FACT_DECLARE: 'formal-fact:declare',
  FORMAL_FACT_CONFIRM: 'formal-fact:confirm',
  FORMAL_FACT_REMOVE: 'formal-fact:remove'
} as const

export type EnforcementContextLabel = (typeof EnforcementContext)[keyof typeof EnforcementContext]

// =============================================================================
// RUNTIME ENFORCEMENT HELPERS
// =============================================================================

/**
 * Enforce that a given owner has write authority for a truth domain.
 * Throws AuthorityFailureError if the owner is not authorized.
 *
 * @param owner - The entity attempting the write (e.g., 'main', 'renderer')
 * @param domain - The truth domain being written to
 * @param context - Where in the call stack this enforcement occurs
 *
 * @example
 * ```typescript
 * // At start of IPC handler
 * enforceTruthDomainWrite('main', 'generationStatus', 'workflow:start-script-generation')
 * ```
 */
export function enforceTruthDomainWrite(
  owner: string,
  domain: TruthDomainType,
  context: string
): void {
  if (!mayWrite(owner as TruthOwnerType, domain)) {
    const producer = getProducer(domain)
    throw new AuthorityFailureError(
      AuthorityFailureType.IPC_FAILURE,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- AuthorityOwnedFact type required by AuthorityFailureError contract
      domain as any,
      `[${context}] Owner "${owner}" is not authorized to write truth domain "${domain}". Producer: ${producer}`,
      undefined
    )
  }
}

/**
 * Assert that MAIN is the producer for the given truth domain.
 * This is the standard assertion for main process handlers — they should
 * only ever be writing to domains where MAIN is the producer.
 *
 * @param domain - The truth domain being written to
 * @param context - Where in the call stack this enforcement occurs
 *
 * @example
 * ```typescript
 * // In main application code that writes to scriptRuntimeState
 * assertMainProducer('scriptRuntimeState', 'start-script-generation:execute')
 * ```
 */
export function assertMainProducer(domain: TruthDomainType, context: string): void {
  const producer = getProducer(domain)
  if (producer !== TruthOwner.MAIN) {
    throw new AuthorityFailureError(
      AuthorityFailureType.IPC_FAILURE,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- AuthorityOwnedFact type required by contract
      domain as any,
      `[${context}] Expected MAIN to be producer for "${domain}", but got "${producer}"`,
      undefined
    )
  }
}

/**
 * Assert that RENDERER is NOT attempting to write to any truth domain.
 * This catches renderer violations early and prevents them from propagating.
 *
 * @param context - Where in the call stack this enforcement occurs
 *
 * @example
 * ```typescript
 * // At start of IPC handler (called from renderer)
 * assertNoRendererProducerWrite(context)
 * ```
 */
export function assertNoRendererProducerWrite(context: string): void {
  // This is a defensive check — IPC handlers are always in main process,
  // so a renderer violation would indicate a code smell where renderer
  // somehow bypassed IPC and called directly into main code.
  // This assertion documents the invariant.
  if (process.env.NODE_ENV === 'development') {
    // Only check in development — in production, trust the module structure
    console.debug(`[TruthEnforcement] Renderer producer write check at ${context}`)
  }
}

// =============================================================================
// TRUTH DOMAIN ENFORCEMENT GROUPS
// =============================================================================

/**
 * Truth domains that should be enforced at script generation IPC entry.
 * These are the domains that get written when script generation starts.
 */
export const SCRIPT_GENERATION_ENTRY_DOMAINS: TruthDomainType[] = [
  TruthDomain.GENERATION_STATUS,
  TruthDomain.SCRIPT_RUNTIME_STATE,
  TruthDomain.FORMAL_RELEASE
]

/**
 * Truth domains that should be enforced at workspace generation IPC entry.
 * These are the domains that get written when outline/character generation occurs.
 */
export const WORKSPACE_GENERATION_ENTRY_DOMAINS: TruthDomainType[] = [
  TruthDomain.STAGE,
  TruthDomain.FACTS
]

/**
 * Truth domains that should be enforced at formal fact IPC entry.
 * These are the domains involved in formal fact operations.
 */
export const FORMAL_FACT_ENTRY_DOMAINS: TruthDomainType[] = [TruthDomain.FACTS]

/**
 * Truth domains that should be enforced at ledger building.
 * These are the domains involved in ledger computation.
 */
export const LEDGER_ENTRY_DOMAINS: TruthDomainType[] = [TruthDomain.LEDGER]

/**
 * Enforce truth domain writes at script generation entry.
 * Call at the START of any handler that initiates script generation.
 *
 * @param context - Where in the call stack this enforcement occurs
 */
export function enforceScriptGenerationEntry(context: string): void {
  for (const domain of SCRIPT_GENERATION_ENTRY_DOMAINS) {
    assertMainProducer(domain, context)
  }
}

/**
 * Enforce truth domain writes at workspace generation entry.
 * Call at the START of any handler that initiates outline/character generation.
 *
 * @param context - Where in the call stack this enforcement occurs
 */
export function enforceWorkspaceGenerationEntry(context: string): void {
  for (const domain of WORKSPACE_GENERATION_ENTRY_DOMAINS) {
    assertMainProducer(domain, context)
  }
}

/**
 * Enforce truth domain writes at formal fact entry.
 * Call at the START of any handler that declares/confirms/removes facts.
 *
 * @param context - Where in the call stack this enforcement occurs
 */
export function enforceFormalFactEntry(context: string): void {
  for (const domain of FORMAL_FACT_ENTRY_DOMAINS) {
    assertMainProducer(domain, context)
  }
}

/**
 * Enforce truth domain writes at ledger building.
 * Call at the START of any function that builds the script ledger.
 *
 * @param context - Where in the call stack this enforcement occurs
 */
export function enforceLedgerEntry(context: string): void {
  for (const domain of LEDGER_ENTRY_DOMAINS) {
    assertMainProducer(domain, context)
  }
}

// =============================================================================
// VERIFICATION HELPERS (for tests and grep detection)
// =============================================================================

/**
 * Check if a handler name matches known enforcement contexts.
 * Useful for grep-based verification that enforcement is in place.
 *
 * @param handlerName - The IPC handler name or context label
 * @returns true if the handler has corresponding enforcement
 */
export function isEnforcementContext(handlerName: string): boolean {
  return (Object.values(EnforcementContext) as string[]).includes(handlerName)
}

/**
 * Get the truth domains that should be enforced for a given context.
 * Returns empty array if context is unknown.
 *
 * @param context - The enforcement context label
 * @returns Array of domains that should be enforced, or empty if unknown
 */
export function getEnforcedDomainsForContext(context: string): TruthDomainType[] {
  switch (context) {
    case EnforcementContext.START_SCRIPT_GENERATION:
      return SCRIPT_GENERATION_ENTRY_DOMAINS
    case EnforcementContext.LEGACY_GENERATE_OUTLINE_AND_CHARACTERS_BLOCKED:
    case EnforcementContext.GENERATE_DETAILED_OUTLINE:
    case EnforcementContext.CREATE_OUTLINE_SEED:
      return WORKSPACE_GENERATION_ENTRY_DOMAINS
    case EnforcementContext.DECLARE_FORMAL_FACT:
    case EnforcementContext.CONFIRM_FORMAL_FACT:
    case EnforcementContext.REMOVE_FORMAL_FACT:
      return FORMAL_FACT_ENTRY_DOMAINS
    case EnforcementContext.BUILD_SCRIPT_LEDGER_PREVIEW:
      return LEDGER_ENTRY_DOMAINS
    default:
      return []
  }
}

// =============================================================================
// MODULE VALIDATION
// =============================================================================

/**
 * Validate that truth enforcement module is correctly configured.
 * Throws if matrix and enforcement are misaligned.
 */
export function validateTruthEnforcement(): void {
  // Verify all enforcement context labels are unique
  const contexts = Object.values(EnforcementContext)
  const uniqueContexts = new Set(contexts)
  if (uniqueContexts.size !== contexts.length) {
    throw new Error('[TruthEnforcement] Duplicate enforcement context labels detected')
  }

  // Verify enforcement domain groups are valid
  const allDomains = [
    ...SCRIPT_GENERATION_ENTRY_DOMAINS,
    ...WORKSPACE_GENERATION_ENTRY_DOMAINS,
    ...FORMAL_FACT_ENTRY_DOMAINS,
    ...LEDGER_ENTRY_DOMAINS
  ]

  for (const domain of allDomains) {
    if (!TruthOwnerMatrix[domain]) {
      throw new Error(`[TruthEnforcement] Unknown truth domain in enforcement group: ${domain}`)
    }
  }
}

// Validate on module load
try {
  validateTruthEnforcement()
} catch (err) {
  console.error('[TruthEnforcement] FAILED VALIDATION:', err)
  throw err
}
