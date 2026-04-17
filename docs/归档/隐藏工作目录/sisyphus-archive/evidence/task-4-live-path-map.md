# T4: Generation Live Path Map

## Overview

This document traces the **actual** execution paths for script generation operations from renderer trigger to worker execution. Evidence is provided with file:line references.

---

## Path A: START / RESUME (startScriptGeneration)

### Current Real Path (BYPASS CONFIRMED)

```
Renderer (useScriptStageActions)
  │
  │ handleStartGeneration() / runScriptGenerationCycle()
  │   └── window.api.workflow.buildScriptGenerationPlan()        [line 147 / 380]
  │   └── window.api.workflow.startScriptGeneration()            [line 409 / 603]
  │
  ▼
IPC: 'workflow:start-script-generation'                          [script-generation-runtime-handlers.ts:38]
  │
  │ handler → runScriptGenerationInWorker()                       [line 71]
  │
  ▼
Worker Runner (script-generation-worker-runner.ts)
  │ Creates Worker thread
  │
  ▼
Worker (script-generation-worker.ts)
  │ runScriptGenerationWorker()                                   [line 50]
  │
  ▼
start-script-generation.ts (MAIN THREAD)
  │ startScriptGeneration()                                       [line 38]
  │
  ▼
runScriptGenerationBatch() → AI call → repair → postflight
```

### Key Evidence

| Step            | File                                    | Line   | Description                                          |
| --------------- | --------------------------------------- | ------ | ---------------------------------------------------- |
| IPC Handler     | `script-generation-runtime-handlers.ts` | 37-151 | `ipcMain.handle('workflow:start-script-generation')` |
| Worker Dispatch | `script-generation-runtime-handlers.ts` | 71     | `runScriptGenerationInWorker({...})`                 |
| Worker Entry    | `script-generation-worker.ts`           | 55     | `startScriptGeneration()`                            |
| Generation Core | `start-script-generation.ts`            | 38     | `startScriptGeneration()`                            |

### BYPASS ANALYSIS

**BYPASS CONFIRMED: Orchestrator is NEVER used**

- `script-generation-orchestrator.ts` is defined with 815 lines
- `new ScriptOrchestrator(...)` appears ONLY in documentation comment at line 57
- Zero actual instantiations in codebase
- The orchestrator class exists but is NOT wired into the live path

**Consequence:**

```
Current: handler → worker → startScriptGeneration() [DIRECT]
Should be: handler → orchestrator.execute() → worker → startScriptGeneration()
```

The orchestrator is bypassed entirely.

---

## Path B: STOP (stopScriptGeneration)

### Real Path

```
Renderer (useScriptStageActions)
  │ handleStopGeneration()
  └── window.api.workflow.stopScriptGeneration()                [line 272]
        │
        ▼
IPC: 'workflow:stop-script-generation'                          [script-generation-runtime-handlers.ts:153]
      │
      │ handler → stopScriptGenerationRun()                       [line 160]
      │
      ▼
Script Generation Run Registry (script-generation-run-registry.ts)
  │ stopScriptGenerationRun(projectId)
  │
  ▼
AbortController.signal → Worker termination
```

### Key Evidence

| Step          | File                                    | Line    | Description                                         |
| ------------- | --------------------------------------- | ------- | --------------------------------------------------- |
| Renderer Call | `useScriptStageActions.ts`              | 272     | `window.api.workflow.stopScriptGeneration()`        |
| IPC Handler   | `script-generation-runtime-handlers.ts` | 153-174 | `ipcMain.handle('workflow:stop-script-generation')` |
| Stop Action   | `script-generation-runtime-handlers.ts` | 160     | `stopScriptGenerationRun(input.projectId)`          |

### STATUS: ✅ ORCHESTRATOR BYPASS (STOP doesn't use orchestrator either)

The stop operation bypasses the orchestrator class entirely - it directly calls `stopScriptGenerationRun()` from the registry.

---

## Path C: REWRITE (handleRewriteGeneration)

### Real Path

```
Renderer (useScriptStageActions)
  │ handleRewriteGeneration()
  │
  ├── window.api.workspace.saveScriptDraft({ scriptDraft: [] })  [line 297]
  ├── window.api.workspace.saveScriptRuntimeState({ null, null, null }) [line 301]
  ├── window.api.workspace.saveScriptRuntimeFailureHistory({ [] }) [line 307]
  │
  ▼
IPC: 'workspace:save-script-draft'
IPC: 'workspace:save-script-runtime-state'
IPC: 'workspace:save-script-runtime-failure-history'
      │
      ▼
workspace.ts handlers → project-store
      │
      ▼
window.api.workflow.startScriptGeneration()                     [line 603]
      │
      ▼
(Follows Path A from here)
```

### Key Evidence

| Step         | File                       | Line    | Description                                    |
| ------------ | -------------------------- | ------- | ---------------------------------------------- |
| Rewrite Flow | `useScriptStageActions.ts` | 288-365 | `handleRewriteGeneration()`                    |
| Clear Draft  | `useScriptStageActions.ts` | 297     | `saveScriptDraft({ scriptDraft: [] })`         |
| Clear State  | `useScriptStageActions.ts` | 301     | `saveScriptRuntimeState({ null, null, null })` |
| Start Fresh  | `useScriptStageActions.ts` | 603     | `startScriptGeneration(...)`                   |

### STATUS: ✅ CLEARLY BYPASSES ORCHESTRATOR

Rewrite does NOT call `orchestrator.rewrite()` - it manually clears state via multiple IPC calls, then calls `startScriptGeneration()` directly.

---

## Path D: PAUSE / CONTINUE

### Evidence: PAUSE and CONTINUE are NOT IMPLEMENTED

- `useScriptStageActions.ts` has `handleStartGeneration`, `handleStopGeneration`, `handleRewriteGeneration`
- NO `handlePauseGeneration` or `handleContinueGeneration` functions
- Orchestrator class has `pause()` and `resume()` methods (lines 706-727)
- These methods are NEVER called from renderer

### STATUS: ⚠️ NOT YET IMPLEMENTED

Pause/Continue exists in orchestrator but not in renderer layer.

---

## Orchestrator Integration Status

| Operation | Orchestrator Method              | Actually Used? | Bypass?                       |
| --------- | -------------------------------- | -------------- | ----------------------------- |
| START     | `execute()`                      | ❌ NO          | ✅ YES - Direct IPC           |
| RESUME    | `execute()` with mode='continue' | ❌ NO          | ✅ YES - Direct IPC           |
| STOP      | `stop()`                         | ❌ NO          | ✅ YES - Direct registry call |
| PAUSE     | `pause()`                        | ❌ NO          | ⚠️ NOT IMPLEMENTED            |
| CONTINUE  | `resume()`                       | ❌ NO          | ⚠️ NOT IMPLEMENTED            |
| REWRITE   | `execute()` with mode='rewrite'  | ❌ NO          | ✅ YES - Manual clear + start |

---

## IPC Channels Summary

| Channel                                 | Handler File                                | Purpose              | Orchestrator? |
| --------------------------------------- | ------------------------------------------- | -------------------- | ------------- |
| `workflow:build-script-generation-plan` | `script-generation-plan-handlers.ts:25`     | Build execution plan | ❌            |
| `workflow:start-script-generation`      | `script-generation-runtime-handlers.ts:38`  | Start generation     | ❌ BYPASS     |
| `workflow:stop-script-generation`       | `script-generation-runtime-handlers.ts:153` | Stop generation      | ❌ BYPASS     |
| `workflow:get-runtime-console-state`    | `script-generation-runtime-handlers.ts:176` | Get runtime info     | ❌            |
| `workflow:build-script-ledger-preview`  | `script-generation-runtime-handlers.ts:181` | Build ledger         | ❌            |

---

## T11-T13 Recommended Wiring Priority

### T11: Wire START/RESUME through Orchestrator (CRITICAL)

**Priority**: P0  
**Action**: Modify `script-generation-runtime-handlers.ts:38-151` to instantiate and call `orchestrator.execute()` instead of `runScriptGenerationInWorker()` directly.

**Target**:

```typescript
// CURRENT (bypass):
const { worker, result } = runScriptGenerationInWorker({ generationInput: input, ... })

// SHOULD BE:
const orchestrator = new ScriptOrchestrator({ ... options ... })
const result = await orchestrator.execute({ projectId, planId, mode, batchSize, stopSignal })
```

### T12: Wire STOP through Orchestrator (HIGH)

**Priority**: P1  
**Action**: Modify `script-generation-runtime-handlers.ts:153-174` to call `orchestrator.stop()` instead of `stopScriptGenerationRun()`.

**Note**: This requires making orchestrator instance accessible to the handler.

### T13: Implement PAUSE/CONTINUE in Renderer (MEDIUM)

**Priority**: P2  
**Action**: Add `handlePauseGeneration` and `handleContinueGeneration` to `useScriptStageActions.ts` that call orchestrator's `pause()`/`resume()` methods.

**Note**: Requires T11 to be complete first (orchestrator must be wired).

---

## Summary: Bypass Points

| #   | Bypass Point                                             | Evidence                                                                     | Severity |
| --- | -------------------------------------------------------- | ---------------------------------------------------------------------------- | -------- |
| 1   | `start-script-generation.ts` called directly from worker | `script-generation-runtime-handlers.ts:71` → `start-script-generation.ts:38` | CRITICAL |
| 2   | Orchestrator.execute() never called                      | Only in documentation comment                                                | CRITICAL |
| 3   | Orchestrator.stop() never called                         | `stopScriptGenerationRun()` called directly                                  | HIGH     |
| 4   | Pause/Continue not implemented in renderer               | No handlers exist                                                            | MEDIUM   |

---

## Files Referenced

| File                                                                                | Purpose                     |
| ----------------------------------------------------------------------------------- | --------------------------- |
| `src/main/ipc/workflow/script-generation-runtime-handlers.ts`                       | IPC handlers for generation |
| `src/main/application/script-generation/start-script-generation.ts`                 | Core generation logic       |
| `src/main/application/script-generation/runtime/script-generation-worker-runner.ts` | Worker thread dispatcher    |
| `src/main/application/script-generation/runtime/script-generation-worker.ts`        | Worker thread entry         |
| `src/shared/domain/workflow/script-generation-orchestrator.ts`                      | Orchestrator (NOT USED)     |
| `src/renderer/src/features/script/ui/useScriptStageActions.ts`                      | Renderer UI actions         |
| `src/preload/api/workflow/script-generation.ts`                                     | Preload API bindings        |
