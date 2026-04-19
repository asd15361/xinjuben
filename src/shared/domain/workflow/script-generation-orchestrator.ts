/**
 * Script Generation Orchestrator - Single Entry Point Contract
 *
 * PURPOSE: Establish the orchestrator as the single entry point for ALL script generation flows.
 * All generation triggers must route through this orchestrator. No direct calls to
 * startScriptGeneration, runScriptGenerationBatch, or similar functions from outside.
 *
 * ## Architecture
 *
 * The orchestrator manages the full generation pipeline:
 *   plan → outline → batch generation → repair → resume
 *
 * ## Command Interface
 *
 * The ScriptGenerationCommand is the input to the orchestrator:
 * ```typescript
 * interface ScriptGenerationCommand {
 *   projectId: string
 *   planId: string
 *   mode: 'continue' | 'restart' | 'rewrite'
 *   batchSize: number
 *   stopSignal: AbortSignal | null
 * }
 * ```
 *
 * ## Orchestrator Class
 *
 * The ScriptOrchestrator class provides the execution interface:
 * ```typescript
 * class ScriptOrchestrator {
 *   execute(command: ScriptGenerationCommand): Promise<OrchestratorResult>
 *   pause(): Promise<void>
 *   resume(): Promise<void>
 *   stop(): Promise<void>
 * }
 * ```
 *
 * ## Integration Points
 *
 * - Batch sizing: Uses resolveScriptRuntimeProfile() for recommendedBatchSize
 * - Resume: Uses ScriptGenerationResumeResolutionDto derived from board
 * - Failure: Uses ScriptGenerationFailureResolutionDto for failure state
 * - Progress: Emits progress events through onProgress callback
 *
 * ## Error Propagation
 *
 * FAILURE IS NEVER SILENTLY SWALLOWED.
 *
 * All failures are:
 * - Preserved in failure state (board + failureResolution)
 * - Returned in OrchestratorResult with success: false
 * - Never thrown away or logged only
 *
 * ## Usage
 *
 * ```typescript
 * const orchestrator = new ScriptOrchestrator({
 *   resolveRuntimeProfile: resolveScriptRuntimeProfile,
 *   persistState: async (state) => { ... },
 *   onProgress: (event) => { ... }
 * })
 *
 * const result = await orchestrator.execute({
 *   projectId: 'project-123',
 *   planId: 'plan-456',
 *   mode: 'continue',
 *   batchSize: 5,
 *   stopSignal: abortController.signal
 * })
 * ```
 */

import type {
  ScriptGenerationMode,
  ScriptGenerationProgressBoardDto,
  ScriptGenerationResumeResolutionDto,
  ScriptGenerationFailureResolutionDto,
  ScriptRuntimeFailureHistoryCode,
  StartScriptGenerationInputDto,
  StartScriptGenerationResultDto
} from '../../../shared/contracts/script-generation'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import type {
  CharacterDraftDto,
  DetailedOutlineBlockDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../shared/contracts/workflow'
import type { ScriptStateLedgerDto } from '../../../shared/contracts/script-ledger'
import type { ProjectSnapshotDto } from '../../../shared/contracts/project'
import type {
  FormalReleaseState,
  VisibleResultState
} from '../../../shared/contracts/visible-release-state'
import { appendRuntimeFailureHistory } from '../runtime/failure-history-queue'
import { classifyRuntimeFailureHistory } from '../runtime/failure-history'
import { deriveProjectCharacterBlocks } from './planning-blocks.ts'
import { resolvePersistedGenerationTruth } from './persisted-generation-truth.ts'

/**
 * Command mode for script generation
 * - continue: Resume from previous state
 * - restart: Fresh start with existing context
 * - rewrite: Clear and rewrite from scratch
 */
export type ScriptGenerationModeCommand = 'continue' | 'restart' | 'rewrite'

/**
 * Script Generation Command
 * Input to the orchestrator's execute method
 */
export interface ScriptGenerationCommand {
  projectId: string
  planId: string
  mode: ScriptGenerationModeCommand
  batchSize: number
  stopSignal: AbortSignal | null
}

/**
 * Orchestrator result
 * Output from the orchestrator's execute method
 */
export interface OrchestratorResult {
  success: boolean
  board: ScriptGenerationProgressBoardDto
  generatedScenes: ScriptSegmentDto[]
  failure: ScriptGenerationFailureResolutionDto | null
  ledger: ScriptStateLedgerDto | null
  resume: Pick<ScriptGenerationResumeResolutionDto, 'canResume' | 'resumeEpisode'>
  error?: {
    reason: string
    errorMessage?: string
    kind: 'stopped' | 'failed' | 'retry'
  }
  /**
   * Indicates whether state persistence failed.
   * When true, the caller should surface this as an AuthorityFailureError per
   * the authority-constitution rules (no silent fallback).
   */
  persistenceError?: string
}

/**
 * Orchestrator progress event
 */
export interface OrchestratorProgressEvent {
  phase: 'planning' | 'executing' | 'repairing' | 'persisting' | 'completed' | 'failed'
  detail: string
  board: ScriptGenerationProgressBoardDto
}

/**
 * Runtime profile resolution function type
 */
export interface ResolveRuntimeProfile {
  (input: {
    storyIntent?: StoryIntentPackageDto | null
    outline: OutlineDraftDto
    characters: CharacterDraftDto[]
    detailedOutlineBlocks?: DetailedOutlineBlockDto[]
    targetEpisodes: number
    mode?: ScriptGenerationMode
    existingSceneCount?: number
    runtimeFailureHistory?: ScriptRuntimeFailureHistoryCode[]
  }): {
    contextPressureScore: number
    shouldCompactContextFirst: boolean
    maxStoryIntentChars: number
    maxCharacterChars: number
    maxSegmentChars: number
    recommendedBatchSize: number
    profileLabel: string
    reason: string
  }
}

/**
 * State persistence function type
 */
export interface PersistState {
  (state: {
    board: ScriptGenerationProgressBoardDto
    failure: ScriptGenerationFailureResolutionDto | null
    ledger: ScriptStateLedgerDto | null
    failureHistory: ScriptRuntimeFailureHistoryCode[]
  }): Promise<void>
}

/**
 * Progress callback type
 */
export interface ProgressCallback {
  (event: OrchestratorProgressEvent): void
}

/**
 * Get project function type - used to load project data for orchestration
 */
export interface GetProject {
  (projectId: string): Promise<ProjectSnapshotDto | null>
}

/**
 * Build execution plan function type
 */
export interface BuildExecutionPlan {
  (
    context: {
      storyIntent?: StoryIntentPackageDto | null
      outline: OutlineDraftDto
      characters: CharacterDraftDto[]
      activeCharacterBlocks?: import('../../../shared/contracts/workflow').CharacterBlockDto[]
      detailedOutlineBlocks?: DetailedOutlineBlockDto[]
      script: ScriptSegmentDto[]
    },
    input?: {
      mode?: ScriptGenerationMode
      targetEpisodes?: number
      runtimeFailureHistory?: ScriptRuntimeFailureHistoryCode[]
    }
  ): import('../../../shared/contracts/script-generation').ScriptGenerationExecutionPlanDto
}

/**
 * Create initial progress board function type
 */
export interface CreateInitialBoard {
  (
    plan: import('../../../shared/contracts/script-generation').ScriptGenerationExecutionPlanDto,
    stageContractFingerprint: string | null
  ): ScriptGenerationProgressBoardDto
}

/**
 * Run script generation batch function type
 */
export interface RunScriptGenerationBatch {
  (input: {
    generationInput: StartScriptGenerationInputDto
    runtimeConfig: import('../../../main/infrastructure/runtime-env/provider-config').RuntimeProviderConfig
    board: ScriptGenerationProgressBoardDto
    outline: OutlineDraftDto
    characters: CharacterDraftDto[]
    existingScript: ScriptSegmentDto[]
    abortSignal?: AbortSignal | null
    onProgress?: (payload: {
      phase: 'generate_batch'
      detail: string
      board: ScriptGenerationProgressBoardDto
    }) => void
  }): Promise<{
    board: ScriptGenerationProgressBoardDto
    generatedScenes: StartScriptGenerationResultDto['generatedScenes']
    failure?: {
      episodeNo: number
      kind: 'parse_interrupted' | 'runtime_interrupted'
      message: string
    }
  }>
}

/**
 * Repair generated scenes function type
 */
export interface RepairGeneratedScenes {
  (input: {
    generationInput: StartScriptGenerationInputDto
    runtimeConfig: import('../../../main/infrastructure/runtime-env/provider-config').RuntimeProviderConfig
    outline: OutlineDraftDto
    generatedScenes: ScriptSegmentDto[]
  }): Promise<{
    generatedScenes: ScriptSegmentDto[]
    qualityReport: { pass: boolean; weakEpisodes: Array<{ sceneNo: number; problems: string[] }> }
  }>
}

/**
 * Resolve resume from board function type - computes resume info from board state
 */
export interface ResolveResumeFromBoard {
  (board: ScriptGenerationProgressBoardDto): ScriptGenerationResumeResolutionDto
}

/**
 * Atomic save generation state function type
 */
export interface AtomicSaveGenerationState {
  (input: {
    projectId: string
    scriptProgressBoard: ScriptGenerationProgressBoardDto | null
    scriptFailureResolution: ScriptGenerationFailureResolutionDto | null
    scriptStateLedger: ScriptStateLedgerDto | null
    scriptRuntimeFailureHistory: ScriptRuntimeFailureHistoryCode[]
    visibleResult: VisibleResultState
    formalRelease: FormalReleaseState
  }): Promise<ProjectSnapshotDto | null>
}

/**
 * Orchestrator options
 */
export interface ScriptOrchestratorOptions {
  resolveRuntimeProfile: ResolveRuntimeProfile
  resolveResumeFromBoard: ResolveResumeFromBoard
  persistState: PersistState
  getProject: GetProject
  buildExecutionPlan: BuildExecutionPlan
  createInitialBoard: CreateInitialBoard
  runScriptGenerationBatch: RunScriptGenerationBatch
  repairGeneratedScenes: RepairGeneratedScenes
  atomicSaveGenerationState: AtomicSaveGenerationState
  runtimeConfig: import('../../../main/infrastructure/runtime-env/provider-config').RuntimeProviderConfig
  onProgress?: ProgressCallback
}

/**
 * Script Generation Orchestrator
 *
 * Single entry point for all script generation flows.
 * Orchestrates the full pipeline: plan → outline → batch generation → repair → resume
 */
export class ScriptOrchestrator {
  private readonly _options: ScriptOrchestratorOptions
  private _currentBoard: ScriptGenerationProgressBoardDto | null = null
  private _currentProject: ProjectSnapshotDto | null = null
  private _isPaused: boolean = false
  private _isExecuting: boolean = false
  private _isStopped: boolean = false
  private _abortController: AbortController | null = null

  constructor(options: ScriptOrchestratorOptions) {
    this._options = options
  }

  /**
   * Execute a generation command
   * Full pipeline: plan → execute → repair → persist → return
   */
  async execute(command: ScriptGenerationCommand): Promise<OrchestratorResult> {
    if (this._isExecuting) {
      return {
        success: false,
        board: this._currentBoard!,
        generatedScenes: [],
        failure: null,
        ledger: null,
        resume: { canResume: false, resumeEpisode: null },
        error: {
          reason: 'Orchestrator is already executing a command',
          kind: 'failed'
        }
      }
    }

    this._isExecuting = true
    this._isPaused = false
    this._isStopped = false
    this._abortController = new AbortController()

    try {
      // Combine external stop signal with internal abort controller
      const externalSignal = command.stopSignal
      const internalSignal = this._abortController.signal
      const combinedSignal = this._mergeAbortSignals(internalSignal, externalSignal)

      // Phase 1: Load project and build execution plan
      this._emitProgress('planning', 'Loading project and building execution plan')

      const project = await this._options.getProject(command.projectId)
      if (!project) {
        throw new Error(`Project not found: ${command.projectId}`)
      }
      this._currentProject = project

      // Extract data from project for execution plan
      const storyIntent = project.storyIntent
      const outline = project.outlineDraft
      const characters = project.characterDrafts
      const detailedOutlineBlocks = project.detailedOutlineBlocks
      const existingScript = project.scriptDraft || []
      const failureHistory = (project.scriptRuntimeFailureHistory ||
        []) as ScriptRuntimeFailureHistoryCode[]
      const activeCharacterBlocks = deriveProjectCharacterBlocks({
        outline,
        characters
      })

      if (!outline) {
        throw new Error('Project outline is missing - cannot start script generation')
      }

      // Map command mode to generation mode
      const generationMode = this._mapCommandMode(command.mode, existingScript.length)

      // Build execution plan using injected function
      const executionPlan = this._options.buildExecutionPlan(
        {
          storyIntent,
          outline,
          characters,
          activeCharacterBlocks,
          detailedOutlineBlocks,
          script: existingScript
        },
        {
          mode: generationMode,
          targetEpisodes: command.batchSize,
          runtimeFailureHistory: failureHistory
        }
      )

      // Phase 2: Create initial progress board
      const initialBoard = this._options.createInitialBoard(executionPlan, null)
      this._currentBoard = initialBoard

      this._emitProgress(
        'planning',
        `Execution plan ready: ${executionPlan.runtimeProfile.profileLabel}`
      )

      // Build generation input for batch execution
      const generationInput: StartScriptGenerationInputDto = {
        projectId: command.projectId,
        plan: executionPlan,
        outlineTitle: outline.title,
        theme: outline.theme,
        mainConflict: outline.mainConflict,
        charactersSummary: characters.map((c) => c.name),
        storyIntent,
        scriptControlPackage: executionPlan.scriptControlPackage,
        outline,
        characters,
        entityStore: project.entityStore,
        activeCharacterBlocks,
        detailedOutlineBlocks,
        existingScript
      }

      // Phase 3: Run batch generation
      this._emitProgress('executing', `Starting batch generation for ${command.batchSize} episodes`)

      const batchResult = await this._options.runScriptGenerationBatch({
        generationInput,
        runtimeConfig: this._options.runtimeConfig,
        board: this._currentBoard,
        outline,
        characters,
        existingScript,
        abortSignal: combinedSignal,
        onProgress: (payload) => {
          this._currentBoard = payload.board
          this._emitProgress('executing', payload.detail)
        }
      })

      this._currentBoard = batchResult.board

      // Handle batch failure
      if (batchResult.failure) {
        const failureKind = batchResult.failure.kind === 'parse_interrupted' ? 'failed' : 'failed'
        const failureReason = `Episode ${batchResult.failure.episodeNo} failed: ${batchResult.failure.message}`

        const persistResult = await this._persistState(null, {
          kind: failureKind,
          reason: failureReason,
          errorMessage: batchResult.failure.message
        })

        this._emitProgress('failed', failureReason)

        return {
          success: false,
          board: this._currentBoard,
          generatedScenes: batchResult.generatedScenes,
          failure: {
            kind: failureKind,
            reason: failureReason,
            errorMessage: batchResult.failure.message,
            lockRecoveryAttempted: false
          },
          ledger: null,
          resume: this._deriveResume(),
          error: {
            reason: failureReason,
            errorMessage: batchResult.failure.message,
            kind: failureKind
          },
          ...(persistResult.persistenceFailed && {
            persistenceError: persistResult.persistenceError
          })
        }
      }

      // Phase 4: Repair generated scenes
      this._emitProgress('repairing', 'Running quality repair on generated scenes')

      const repairedResult = await this._options.repairGeneratedScenes({
        generationInput,
        runtimeConfig: this._options.runtimeConfig,
        outline,
        generatedScenes: batchResult.generatedScenes
      })

      const generatedScenes = repairedResult.generatedScenes

      // Check if repair passed quality check
      if (!repairedResult.qualityReport.pass) {
        const weakEpisodes = repairedResult.qualityReport.weakEpisodes
        const detail = weakEpisodes
          .map((e) => `Episode ${e.sceneNo}: ${e.problems.join(', ')}`)
          .join('; ')

        const persistResult = await this._persistState(null, {
          kind: 'failed',
          reason: `Quality check failed: ${detail}`
        })

        this._emitProgress('failed', `Quality check failed: ${detail}`)

        return {
          success: false,
          board: this._currentBoard,
          generatedScenes,
          failure: {
            kind: 'failed',
            reason: `Quality check failed: ${detail}`,
            lockRecoveryAttempted: false
          },
          ledger: null,
          resume: this._deriveResume(),
          error: {
            reason: `Quality check failed: ${detail}`,
            kind: 'failed'
          },
          ...(persistResult.persistenceFailed && {
            persistenceError: persistResult.persistenceError
          })
        }
      }

      this._emitProgress('repairing', 'Quality repair completed')

      // Phase 5: Persist final state
      this._emitProgress('persisting', 'Persisting generation state')

      const persistResult = await this._persistState(
        null, // Ledger would be built in postflight
        null
      )

      // If persistence failed, we cannot claim success - state was not saved
      if (persistResult.persistenceFailed) {
        this._emitProgress('failed', `Persistence failed: ${persistResult.persistenceError}`)

        return {
          success: false,
          board: this._currentBoard,
          generatedScenes,
          failure: {
            kind: 'failed',
            reason: `Persistence failed: ${persistResult.persistenceError}`,
            lockRecoveryAttempted: false
          },
          ledger: null,
          resume: this._deriveResume(),
          error: {
            reason: `Persistence failed: ${persistResult.persistenceError}`,
            kind: 'failed'
          },
          persistenceError: persistResult.persistenceError
        }
      }

      // Completion
      this._emitProgress('completed', 'Generation completed successfully')

      return {
        success: true,
        board: this._currentBoard,
        generatedScenes,
        failure: null,
        ledger: null,
        resume: this._deriveResume()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Check if this was a stoppage
      if (this._isStopped) {
        this._emitProgress('failed', 'Generation stopped by user')

        return {
          success: false,
          board: this._currentBoard!,
          generatedScenes: [],
          failure: {
            kind: 'stopped',
            reason: 'Generation stopped by user',
            lockRecoveryAttempted: false
          },
          ledger: null,
          resume: this._deriveResume(),
          error: {
            reason: 'Generation stopped by user',
            kind: 'stopped'
          }
        }
      }

      this._emitProgress('failed', `Generation failed: ${errorMessage}`)

      // Persist failure state - wrap in try/catch to ensure we always return a result
      let persistenceError: string | undefined
      try {
        const persistResult = await this._persistState(null, {
          kind: 'failed',
          reason: errorMessage,
          errorMessage
        })
        if (persistResult.persistenceFailed) {
          persistenceError = persistResult.persistenceError
        }
      } catch (persistEx) {
        // _persistState should not throw, but if it does, we still return the failure result
        // The persistence error will be included in the result
        persistenceError = persistEx instanceof Error ? persistEx.message : String(persistEx)
      }

      return {
        success: false,
        board: this._currentBoard!,
        generatedScenes: [],
        failure: {
          kind: 'failed',
          reason: errorMessage,
          lockRecoveryAttempted: false
        },
        ledger: null,
        resume: this._deriveResume(),
        error: {
          reason: 'Generation failed with uncaught exception',
          errorMessage,
          kind: 'failed'
        },
        ...(persistenceError && { persistenceError })
      }
    } finally {
      this._isExecuting = false
      this._abortController = null
    }
  }

  /**
   * Merge external and internal abort signals
   */
  private _mergeAbortSignals(internal: AbortSignal, external: AbortSignal | null): AbortSignal {
    if (!external) return internal

    // Create a combined signal that aborts if either signal aborts
    const controller = new AbortController()

    const onInternalAbort = () => controller.abort()
    const onExternalAbort = () => controller.abort()

    internal.addEventListener('abort', onInternalAbort)
    external.addEventListener('abort', onExternalAbort)

    // Clean up listeners when combined signal is consumed
    controller.signal.addEventListener(
      'abort',
      () => {
        internal.removeEventListener('abort', onInternalAbort)
        external.removeEventListener('abort', onExternalAbort)
      },
      { once: true }
    )

    return controller.signal
  }

  /**
   * Map command mode to generation mode
   */
  private _mapCommandMode(
    mode: ScriptGenerationModeCommand,
    existingSceneCount: number
  ): 'fresh_start' | 'resume' | 'rewrite' {
    switch (mode) {
      case 'continue':
        return existingSceneCount > 0 ? 'resume' : 'fresh_start'
      case 'restart':
        return 'fresh_start'
      case 'rewrite':
        return 'rewrite'
      default:
        return 'fresh_start'
    }
  }

  /**
   * Derive resume info from current board
   */
  private _deriveResume(): ScriptGenerationResumeResolutionDto {
    if (!this._currentBoard) {
      return {
        canResume: false,
        resumeEpisode: null,
        nextBatchStatus: 'idle',
        reason: 'No board state available'
      }
    }
    return this._options.resolveResumeFromBoard(this._currentBoard)
  }

  /**
   * Persist state using atomicSaveGenerationState (single-writer rule).
   *
   * ERROR HANDLING RULE: Persistence failures are NOT silently swallowed.
   * If persistence fails, we still return a valid result to the caller,
   * but the result indicates that persistence failed. This prevents split-brain
   * where the orchestrator reports success but nothing was actually saved.
   *
   * The caller (IPC handler) is responsible for surface the persistence error
   * as an AuthorityFailureError per the authority-constitution rules.
   */
  private async _persistState(
    ledger: ScriptStateLedgerDto | null | undefined,
    failure: { kind: 'stopped' | 'failed' | 'retry'; reason: string; errorMessage?: string } | null
  ): Promise<{ persistenceFailed: boolean; persistenceError?: string }> {
    if (!this._currentBoard || !this._currentProject) {
      return { persistenceFailed: false }
    }

    const failureResolution = failure
      ? {
          kind: failure.kind as ScriptGenerationFailureResolutionDto['kind'],
          reason: failure.reason,
          errorMessage: failure.errorMessage,
          board: this._currentBoard,
          lockRecoveryAttempted: false
        }
      : null

    // Compute updated failure history: append new failure if present
    const existingHistory = (this._currentProject.scriptRuntimeFailureHistory ||
      []) as ScriptRuntimeFailureHistoryCode[]
    const updatedHistory = failure
      ? appendRuntimeFailureHistory(
          existingHistory,
          classifyRuntimeFailureHistory({
            reason: failure.reason,
            errorMessage: failure.errorMessage
          })
        )
      : existingHistory

    const persistedGenerationTruth = resolvePersistedGenerationTruth({
      generationStatus: this._currentProject.generationStatus ?? null,
      scriptFailureResolution: failureResolution,
      scriptDraft: this._currentProject.scriptDraft ?? []
    })

    // Use atomic save for persistence - errors must NOT propagate silently
    try {
      await this._options.atomicSaveGenerationState({
        projectId: this._currentProject.id,
        scriptProgressBoard: this._currentBoard,
        scriptFailureResolution: failureResolution,
        scriptStateLedger: ledger || null,
        scriptRuntimeFailureHistory: updatedHistory,
        visibleResult: persistedGenerationTruth.visibleResult,
        formalRelease: persistedGenerationTruth.formalRelease
      })
    } catch (persistError) {
      const errorMessage =
        persistError instanceof Error ? persistError.message : String(persistError)
      // Log the persistence failure for debugging
      // eslint-disable-next-line no-console
      console.error(`[Orchestrator] Persistence failed: ${errorMessage}`)
      return { persistenceFailed: true, persistenceError: errorMessage }
    }

    // persistState callback REMOVED — single-writer rule enforced.
    // atomicSaveGenerationState is the sole persistence path.
    // Dual-save caused memory/disk desync; see P1 fix.

    return { persistenceFailed: false }
  }

  /**
   * Pause current generation
   * Valid only when executing
   */
  async pause(): Promise<void> {
    if (!this._isExecuting) {
      throw new Error('Cannot pause: orchestrator is not executing')
    }
    if (this._isPaused) {
      throw new Error('Orchestrator is already paused')
    }
    this._isPaused = true
    this._emitProgress('executing', 'Generation paused by user')
  }

  /**
   * Resume paused generation
   * Valid only when paused
   */
  async resume(): Promise<void> {
    if (!this._isPaused) {
      throw new Error('Cannot resume: orchestrator is not paused')
    }
    this._isPaused = false
    this._emitProgress('executing', 'Generation resumed by user')
  }

  /**
   * Stop current generation
   * Valid only when executing or paused
   */
  async stop(): Promise<void> {
    if (!this._isExecuting && !this._isPaused) {
      throw new Error('Cannot stop: orchestrator is not executing or paused')
    }

    this._isStopped = true
    this._isPaused = false

    // Signal abort to interrupt any ongoing operations
    if (this._abortController) {
      this._abortController.abort()
    }

    this._emitProgress('failed', 'Generation stopped by user')
  }

  /**
   * Get current board state
   */
  getBoard(): ScriptGenerationProgressBoardDto | null {
    return this._currentBoard
  }

  /**
   * Check if orchestrator is currently executing
   */
  isExecuting(): boolean {
    return this._isExecuting
  }

  /**
   * Check if orchestrator is paused
   */
  isPaused(): boolean {
    return this._isPaused
  }

  private _emitProgress(phase: OrchestratorProgressEvent['phase'], detail: string): void {
    if (this._options.onProgress && this._currentBoard) {
      this._options.onProgress({
        phase,
        detail,
        board: this._currentBoard
      })
    }
  }
}

/**
 * Validate a script generation command
 * Throws if command is invalid
 */
export function validateScriptGenerationCommand(command: ScriptGenerationCommand): void {
  if (!command.projectId?.trim()) {
    throw new Error('ScriptGenerationCommand.projectId is required')
  }
  if (!command.planId?.trim()) {
    throw new Error('ScriptGenerationCommand.planId is required')
  }
  if (!['continue', 'restart', 'rewrite'].includes(command.mode)) {
    throw new Error('ScriptGenerationCommand.mode must be continue, restart, or rewrite')
  }
  if (command.batchSize <= 0) {
    throw new Error('ScriptGenerationCommand.batchSize must be positive')
  }
}

/**
 * Check if persisted board is valid for resume
 * Board is valid if it matches the current plan context
 */
export function isBoardValidForResume(
  board: ScriptGenerationProgressBoardDto,
  expectedBatchSize: number,
  expectedTotalEpisodes: number,
  stageContractFingerprint: string | null
): boolean {
  return (
    board.batchContext.batchSize === expectedBatchSize &&
    board.episodeStatuses.length === expectedTotalEpisodes &&
    board.batchContext.stageContractFingerprint === stageContractFingerprint
  )
}
