# Task 7: Orchestrator Contract Findings

**Date:** 2026-03-23
**Task:** Establish script generation orchestrator as single entry point

## Audit: Current Entry Points

### Entry Points to Script Generation

1. **`useScriptStageActions.ts` line 399** - `window.api.workflow.startScriptGeneration`
   - Called in `runScriptGenerationCycle` function
   - Part of normal generation flow

2. **`useScriptStageActions.ts` line 577** - `window.api.workflow.startScriptGeneration`
   - Called in `useScriptStageActionsStartFresh` function
   - Used for rewrite/fresh start mode

3. **`script-generation-runtime-handlers.ts`** - IPC handler `workflow:start-script-generation`
   - Receives IPC call, creates worker, runs generation
   - This is an internal main-process handler (OK)

4. **`script-generation-worker.ts`** - calls `startScriptGeneration`
   - Internal worker implementation (OK)

### Internal Implementation (Should NOT be called directly)

- `start-script-generation.ts` - Core generation logic
- `run-script-generation-batch.ts` - Batch execution
- These are implementation details of the orchestrator's executing state

## Orchestrator Contract (Final)

**Location:** `src/shared/domain/workflow/script-generation-orchestrator.ts`

### Key Interfaces

```typescript
// Command interface (as per task spec)
export interface ScriptGenerationCommand {
  projectId: string
  planId: string
  mode: 'continue' | 'restart' | 'rewrite'
  batchSize: number
  stopSignal: AbortSignal | null
}

// Orchestrator class (as per task spec)
export class ScriptOrchestrator {
  execute(command: ScriptGenerationCommand): Promise<OrchestratorResult>
  pause(): Promise<void>
  resume(): Promise<void>
  stop(): Promise<void>
}
```

### Required Methods (Verified)

- ✅ `execute()` - Full pipeline: plan → execute → repair → persist
- ✅ `pause()` - Pause current generation
- ✅ `resume()` - Resume paused generation
- ✅ `stop()` - Stop current generation

### Integration Points

- ✅ `resolveRuntimeProfile` - Interface defined for batch sizing
- ✅ `ScriptGenerationResumeResolutionDto` - Used for resume derivation
- ✅ `ScriptGenerationFailureResolutionDto` - Used for failure state
- ✅ Error propagation - FAILURE NEVER SILENTLY SWALLOWED

## Verification

- ✅ `npm run typecheck` passes
- ✅ `ScriptGenerationCommand` interface present
- ✅ `ScriptOrchestrator` class present
- ✅ `execute()`, `pause()`, `resume()`, `stop()` methods present
- ✅ Integration points defined

## Status

- [x] Orchestrator contract created at `src/shared/domain/workflow/script-generation-orchestrator.ts`
- [x] Typecheck passes
- [x] Required interfaces verified
- [x] Required methods verified
- [ ] Full implementation pending (blocked by downstream tasks)
