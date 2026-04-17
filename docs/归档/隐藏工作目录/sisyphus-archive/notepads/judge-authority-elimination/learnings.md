## 2026-03-23 Initialization

- 继承自 truth-authority-unification：renderer 不能在 authority 失败时本地 setStage 兜底。
- 关键反模式：`catch { setStage(...) }`、`if (!result.project) { setStage(...) }`、乐观核心状态更新。
- live path 必须从 IPC handler 收口到 orchestrator，不能停留在 handler -> worker 旁路。

## 2026-03-23 T1: Authority Constitution Implementation

### What Was Created

`src/shared/domain/workflow/authority-constitution.ts` — hard rules for "no authority = explicit error"

### Three Core Sections

1. **AuthorityOwnedFacts** (constants):
   - 13 authority-owned facts: STAGE, BLOCKED_REASON, RESUME_ELIGIBILITY, GENERATION_STATUS, SCRIPT_RUNTIME_STATE, PROGRESS_BOARD, FAILURE_RESOLUTION, FAILURE_HISTORY, FORMAL_FACTS, DETAILED_OUTLINE_BLOCKS, CHARACTER_DRAFTS, OUTLINE_DRAFT
   - RendererReadOnlyFacts: subset that renderer may read but never produce
   - Core principle: MAIN is sole producer, renderer is consumer only

2. **ForbiddenFallbackPatterns** (constants):
   - 8 forbidden patterns: CATCH_SET_STAGE, MISSING_RESULT_OPTIMISTIC_STAGE, STALE_CACHED_STATE_FALLBACK, SILENT_IPC_FAILURE, INCOMPLETE_RESULT_AS_COMPLETE, UNKNOWN_AUTHORITY_DEFAULT_CHAT, RENDERER_COMPUTING_DERIVED_FACTS, SILENT_IPC_RETRY
   - Each pattern maps to an error code for identification

3. **AuthorityFailureContract**:
   - AuthorityFailureType enum: IPC_FAILURE, PROJECT_MISSING, AUTHORITY_RESULT_NULL, INCOMPLETE_RESULT, STALE_RESULT, MAIN_EXCEPTION, ORCHESTRATOR_BYPASS
   - AuthorityFailureError class: explicit error with failureType, fact, context, originalError
   - AuthorityCheckResult<T>: discriminated union { ok: true, value: T } | { ok: false, failure: AuthorityFailureError }
   - Helper functions: authorityOk(), authorityFail(), assertAuthorityCheck(), requireAuthorityValue(), requireAuthorityFields(), enforceNoForbiddenFallback()

### Key Design Decisions

- Built on existing truth-authority.ts foundations (TruthOwner, TruthAuthorityMap)
- Adds behavioral constitution on top of structural ownership
- Renderer constraint assertions: isRendererProcess(), assertRendererProcess(), assertRendererReadOnly()
- Error codes match forbidden patterns for traceability

### Integration Points

- Depends on: truth-authority.ts (TruthOwner, TruthDomain)
- Consumed by: IPC boundaries, orchestrator layer, renderer hooks
- Does NOT modify: any existing files, renderer/main wiring logic

### Verification

- `npm run typecheck` passes with no errors
- No new dependencies added
- File follows existing naming conventions in src/shared/domain/workflow/

## 2026-03-23 T4: Live Path Map — BYPASS CONFIRMED

### What Was Found

The orchestrator (`script-generation-orchestrator.ts`) is **never actually used** in the live path. It exists as a well-documented 815-line class but is bypassed entirely.

### Path Tracing Results

| Operation    | Real Path                                  | Orchestrator Used? | Bypass? |
| ------------ | ------------------------------------------ | ------------------ | ------- |
| START/RESUME | handler → worker → startScriptGeneration() | ❌ NO              | ✅ YES  |
| STOP         | handler → stopScriptGenerationRun()        | ❌ NO              | ✅ YES  |
| REWRITE      | Manual clear + startScriptGeneration()     | ❌ NO              | ✅ YES  |
| PAUSE        | NOT IMPLEMENTED                            | N/A                | N/A     |
| CONTINUE     | NOT IMPLEMENTED                            | N/A                | N/A     |

### Critical Bypass Evidence

**START path bypass:**

- `script-generation-runtime-handlers.ts:71` calls `runScriptGenerationInWorker()` directly
- Worker calls `startScriptGeneration()` at `script-generation-worker.ts:55`
- Orchestrator.execute() appears ONLY in documentation at `script-generation-orchestrator.ts:57`

**STOP path bypass:**

- `script-generation-runtime-handlers.ts:160` calls `stopScriptGenerationRun()` directly
- Does NOT go through `orchestrator.stop()`

### T11-T13 Priority Recommendations

1. **T11 (P0)**: Wire START/RESUME through orchestrator — modify handler to call `orchestrator.execute()` instead of `runScriptGenerationInWorker()`
2. **T12 (P1)**: Wire STOP through orchestrator — modify handler to call `orchestrator.stop()` instead of `stopScriptGenerationRun()`
3. **T13 (P2)**: Implement PAUSE/CONTINUE in renderer — add handlers that call `orchestrator.pause()`/`orchestrator.resume()`

### Evidence File Created

`.sisyphus/evidence/task-4-live-path-map.md` — detailed path traces with line numbers

## 2026-03-23 T3: Renderer Stage Fallback Hotspot Inventory

### What Was Found

Exhaustive search across `src/renderer` for stage fallback patterns. Found **5 confirmed business-authority hotspots** and **3 IPC-catch-without-setstage patterns** that are acceptable (UI-only concern).

### Hotspot Table

| #   | File                                                       | Lines   | Pattern                                                                                                       | Classification                                 | Downstream Task      |
| --- | ---------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------- |
| 1   | `src/renderer/src/features/chat/ui/useChatStageActions.ts` | 108-111 | `catch { setStage('chat') }` — IPC failure fallback to hardcoded stage                                        | **BUSINESS** (LOCAL_FALLBACK_HARDCODED)        | T6                   |
| 2   | `src/renderer/src/features/chat/ui/useChatStageActions.ts` | 105-107 | `if (stageResult.project) { setStage(stageResult.project.stage) }` — missing else with authoritative fallback | **BUSINESS** (MISSING_AUTHORITY_NULL_GUARD)    | T6                   |
| 3   | `src/renderer/src/features/home/ui/useHomePageActions.ts`  | 195-196 | `if (!stageResult.project) { setStage(nextStage) }` — IPC result null → local fallback to passed stage        | **BUSINESS** (MISSING_RESULT_OPTIMISTIC_STAGE) | T6                   |
| 4   | `src/renderer/src/features/home/ui/useHomePageActions.ts`  | 198-201 | `catch { setStage(nextStage) }` — IPC failure fallback to passed stage                                        | **BUSINESS** (CATCH_SET_STAGE)                 | T6                   |
| 5   | `src/renderer/src/features/home/ui/useHomePageActions.ts`  | 192-193 | `setStage(stageResult.project.stage)` — sync with authoritative stage from main                               | **UI_ONLY** (AUTHORITATIVE_SYNC)               | T7 (confirm pattern) |

### IPC Catch Without setStage — Acceptable Patterns

These do NOT directly call setStage in catch — they return null and let caller decide:

| File                                                       | Lines | Pattern                                            | Why Acceptable                                        |
| ---------------------------------------------------------- | ----- | -------------------------------------------------- | ----------------------------------------------------- |
| `src/renderer/src/app/hooks/useScriptGenerationRuntime.ts` | 69    | `getProject(...).catch(() => null)`                | Null return is handled downstream; no direct setStage |
| `src/renderer/src/app/hooks/useScriptGenerationRuntime.ts` | 132   | `syncRuntime().catch(() => { setBoard(null)... })` | Only nulls out board state, not stage                 |
| `src/renderer/src/app/hooks/useScriptLedgerPreview.ts`     | 26    | `getProject(...).catch(() => null)`                | Null return is handled downstream; no direct setStage |

### Pure UI Navigation — Not Business Authority

These files/patterns involve stage navigation evaluation but do NOT set stage locally as fallback:

| File                                                                              | Lines  | Pattern                                                | Why UI Only                                     |
| --------------------------------------------------------------------------------- | ------ | ------------------------------------------------------ | ----------------------------------------------- |
| `src/renderer/src/app/utils/stage-navigation-truth.ts`                            | 59-109 | `evaluateStageAccess()` — delegates to IPC             | No setStage, pure IPC bridge                    |
| `src/renderer/src/app/store/useWorkflowStore.ts`                                  | 52     | `setStage: (stage) => set({ currentStage: stage })`    | Store definition only; call sites are the issue |
| `src/renderer/src/features/detailed-outline/ui/useDetailedOutlineStageActions.ts` | 46-104 | `handleGenerateDetailedOutline` — no setStage in catch | Catch only throws; no fallback setStage         |

### Ambiguous Cases

1. **`useChatStageActions.ts` lines 100-116**: The outer catch at line 118 does NOT call setStage (just rethrows). The inner try-catch (100-116) is the issue — it catches IPC failure and either keeps stage (115, correct) OR falls back to 'chat' (110, incorrect). **Pattern: CATCH_SET_STAGE hybrid.**

2. **`useHomePageActions.ts` `enterProject()` lines 166-204**: Two separate fallback paths — lines 195-196 (project missing → passed stage) and 198-201 (IPC failure → passed stage). Both are problematic because `nextStage` is a locally-derived value, not from main's authority.

3. **`useScriptStageActions.ts` line 124 comment**: Mentions "stale optimistic state" but the code correctly passes `_input.generationStatus` (authoritative) rather than reading from store. **Not a hotspot — actually good practice.**

### Proposed Grouping for T6/T7/T8/T9/T10

| Group                                             | Hotspots                                                               | Recommended Task                                                                 |
| ------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Group A: Hardcoded stage fallback in catch        | #1 (useChatStageActions.ts:110)                                        | T6 — Replace catch { setStage(HARDCODED) } with rethrow or authority-gated error |
| Group B: Passed-stage fallback (IPC null/failure) | #3 (useHomePageActions.ts:195-196), #4 (useHomePageActions.ts:198-201) | T7 — Replace passed-stage fallback with authority error propagation              |
| Group C: Missing authoritative null guard         | #2 (useChatStageActions.ts:105-107)                                    | T6 — Add `else { throw AuthorityError }` branch                                  |
| Group D: Authoritative sync (correct pattern)     | #5 (useHomePageActions.ts:192-193)                                     | T7 — Confirm as whitelisted pattern; no change needed                            |

### Verification Method

All findings verified by:

1. Grep for `setStage|changeProjectStage|targetStage` across `src/renderer/**/*.ts`
2. Grep for `catch\s*\{[^}]*setStage` (no matches — fallback is via separate if/else, not inline catch)
3. Grep for `optimistic|rollback|fallback|stale` across renderer
4. Manual inspection of all 3 stage action files (chat, detailed-outline, script)
5. Manual inspection of workflow store and stage-navigation-truth utility

## 2026-03-23 T4: Live Path Map — EXTENDED WITH FULL EVIDENCE

### Extended Control Path Table (Precise Line Numbers)

| Operation    | Renderer Entry                                                         | IPC Handler                                                                      | Runtime Call                                                                                                        | Orchestrator Used? | Bypass Details                                                   |
| ------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------- |
| **START**    | `useScriptStageActions.ts:409`                                         | `workflow:start-script-generation` at `script-generation-runtime-handlers.ts:38` | `runScriptGenerationInWorker()` at line 71 → Worker → `startScriptGeneration()` at `script-generation-worker.ts:55` | ❌ **NEVER**       | Handler directly calls worker runner                             |
| **RESUME**   | Same START path - mode='resume' in plan                                | Same handler                                                                     | Same path                                                                                                           | ❌ **NEVER**       | No separate resume handler; mode by `input.plan.mode` at line 42 |
| **REWRITE**  | `handleRewriteGeneration` → `useScriptStageActionsStartFresh` line 337 | Same handler with `existingScript: []` line 617                                  | Same path                                                                                                           | ❌ **NEVER**       | Manual clear + fresh start                                       |
| **STOP**     | `useScriptStageActions.ts:292`                                         | `workflow:stop-script-generation` at `script-generation-runtime-handlers.ts:154` | `stopScriptGenerationRun()` at line 160 → `Worker.terminate()`                                                      | ❌ **NEVER**       | Handler bypasses orchestrator                                    |
| **PAUSE**    | **NOT IMPLEMENTED**                                                    | **NOT IMPLEMENTED**                                                              | **NOT IMPLEMENTED**                                                                                                 | N/A                | Orchestrator.pause() exists but never wired                      |
| **CONTINUE** | **NOT IMPLEMENTED**                                                    | **NOT IMPLEMENTED**                                                              | **NOT IMPLEMENTED**                                                                                                 | N/A                | Orchestrator.resume() exists but never wired                     |

### Orchestrator Dead Code Evidence

`grep "new ScriptOrchestrator"` returns **ZERO matches** across entire codebase.

- `src/shared/domain/workflow/script-generation-orchestrator.ts:57` — only reference is in documentation comment showing how to use it
- The orchestrator class exists as a 815-line spec/contract but is **never instantiated**

### Key Discovery: 'paused' Status Exists But Is Unreachable

The `batch_paused` state machine event exists (`state-machine.ts:9`) and is fired in `run-script-generation-batch.ts:97,182` when `abortSignal?.aborted` is true. However:

1. **No IPC handler** for pause operation
2. **No preload API** for pause
3. **No renderer button/control** for pause
4. The `ScriptOrchestrator.pause()` method (line 706) is implemented but dead code

### Missing/Not-Implemented Controls

| Control  | Exists in Orchestrator? | IPC Handler? | Preload API? | Renderer? |
| -------- | ----------------------- | ------------ | ------------ | --------- |
| PAUSE    | ✅ Yes (line 706)       | ❌ NO        | ❌ NO        | ❌ NO     |
| CONTINUE | ✅ Yes (line 721)       | ❌ NO        | ❌ NO        | ❌ NO     |

### Highest-Risk Bypasses (T11-T13 Priority)

1. **T11 (P0) — START/RESUME bypass**: Handler → worker bypass means no single authority producer
   - File: `script-generation-runtime-handlers.ts:71`
   - Fix: Create orchestrator instance, call `orchestrator.execute()` instead of `runScriptGenerationInWorker()`

2. **T12 (P1) — STOP bypass**: Handler → Worker.terminate() bypasses orchestrator.stop()
   - File: `script-generation-runtime-handlers.ts:160`
   - Fix: Wire `orchestrator.stop()` through the same orchestrator instance from T11

3. **T13 (P2) — PAUSE/CONTINUE not implemented**: Even if T11/T12 fixed, pause/continue require new IPC handlers and renderer controls
   - Need: `workflow:pause-script-generation` IPC handler
   - Need: `workflow:resume-script-generation` IPC handler
   - Need: Pause/Resume buttons in renderer
   - Need: Orchestrator instance to be shared (not recreated per call)

## 2026-03-23 T2: Fallback Anti-Pattern Detection — Search Recipes

### Context

Research for detecting TypeScript/React fallback anti-patterns relevant to judge-authority-elimination:

- `catch { setStage(...) }`
- `if (!result.project) { setStage(...) }`
- Optimistic core state updates
- Compat fallback progression

---

### 1. Recommended Grep Patterns

#### Primary Detection Patterns

| Pattern                                  | Purpose                               | False Positive Risk                       |
| ---------------------------------------- | ------------------------------------- | ----------------------------------------- |
| `catch\s*\{[^}]*setStage`                | Catch blocks calling setStage         | Low — direct match                        |
| `catch\s*\{[^}]*dispatch`                | Catch blocks calling dispatch         | Medium — may include valid error recovery |
| `if\s*(\s*!.*\.\s*project\s*)`           | Null-check on project before fallback | Medium — context-dependent                |
| `if\s*(\s*!.*result`                     | Null-check on result before fallback  | High — too generic                        |
| `setStage\s*\(\s*['"][^'"]*fallback`     | Explicit fallback naming              | Low — but naming varies                   |
| `optimistic.*update\|update.*optimistic` | Optimistic update patterns            | Medium — comments may trigger             |

#### Grep Command Examples

```bash
# Catch blocks with setStage (high precision)
grep -rn "catch\s*{" --include="*.ts" --include="*.tsx" | grep -i "setStage"

# Catch blocks with dispatch (requires filtering)
grep -rn "catch\s*{" --include="*.ts" --include="*.tsx" | grep -i "dispatch"

# Null-check before setStage
grep -rn "if\s*(\s*!" --include="*.ts" --include="*.tsx" | grep -i "setStage"

# Optimistic state updates
grep -rni "optimistic" --include="*.ts" --include="*.tsx" | grep -i "update\|setStage"

# IPC error silencing
grep -rn "catch\s*{[^}]*//.*noop\|//.*silen" --include="*.ts"
```

#### Limitations of Grep

1. **Cannot understand AST structure** — `catch {` matches text, not syntactic catch clause
2. **Brace matching is naive** — fails with nested braces, template literals
3. **No semantic context** — cannot distinguish renderer-setStage (forbidden) from main-setStage (allowed)
4. **Regex edge cases** — multiline patterns require `grep -z` or PCRE

---

### 2. Recommended ast-grep Patterns

#### YAML Rule Configuration

```yaml
# Catch clause calling setStage — HIGH PRIORITY
id: catch-setstage-fallback
language: TypeScript
rule:
  all:
    - pattern: catch $CATCH { $$$BODY }
    - has:
        pattern: setStage($$$ARGS)
        stopBy: end

# Catch clause calling dispatch (Redux-style)
id: catch-dispatch-fallback
language: TypeScript
rule:
  all:
    - pattern: catch $CATCH { $$$BODY }
    - has:
        pattern: dispatch($$$ARGS)
        stopBy: end

# Conditional null-check before setStage
id: conditional-setstage-fallback
language: TypeScript
rule:
  all:
    - pattern: if ($COND) { $$$TRUE }
    - has:
        pattern: setStage($$$ARGS)
        stopBy: end
    - has:
        pattern: "!$VAL"  # negation in condition
        stopBy: end

# Renderer process calling setStage directly
id: renderer-setstage-call
language: TypeScript
rule:
  all:
    - pattern: setStage($$$ARGS)
    - inside:
        kind: call_expression
```

#### Key ast-grep Metavariables

| Metavariable | Meaning                    |
| ------------ | -------------------------- |
| `$NAME`      | Single identifier          |
| `$ARG`       | Single argument            |
| `$$$ARGS`    | Zero or more arguments     |
| `$_`         | Wildcard (any single node) |
| `$$$_`       | Wildcard (any sequence)    |

#### Relational Rules for Context

```yaml
# Must be INSIDE a catch clause
rule:
  pattern: setStage($$$)
  inside:
    kind: catch_clause
    stopBy: end

# Must have negation in condition
rule:
  pattern: if ($COND) { setStage($$$) }
  has:
    kind: unary_expression
    stopBy: end

# Must be INSIDE a function marked as renderer
rule:
  pattern: dispatch($ACTION)
  inside:
    kind: function_declaration
    stopBy: end
    field: body
```

---

### 3. Pattern Strengths and Limitations

#### Grep Strengths

- **Zero setup** — works immediately on any codebase
- **Fast** — O(n) text scan, no parsing
- **Simple** — no AST knowledge required
- **CI-friendly** — standard tool in every pipeline

#### Grep Limitations

| Pattern                  | Misses                             | Overmatches                                                          |
| ------------------------ | ---------------------------------- | -------------------------------------------------------------------- |
| `catch\s*{[^}]*setStage` | Deeply nested braces               | Comments containing "catch { setStage"                               |
| `if\s*(!result)`         | Ternary `x ? setStage() : default` | `if (!result) { log(); setStage(y) }` where setStage is NOT fallback |
| `optimistic.*update`     | `optimistic` in strings            | `// TODO: remove optimistic update`                                  |

#### ast-grep Strengths

- **AST-aware** — understands syntactic structure
- **Precise metavariables** — captures actual arguments
- **Contextual rules** — `inside`, `has`, `precedes`
- **Refactoring-safe** — matches structure, not text

#### ast-grep Limitations

| Pattern                   | Misses                               | Overmatches                                                          |
| ------------------------- | ------------------------------------ | -------------------------------------------------------------------- |
| `catch { setStage($$$) }` | Generated catch clauses              | Error boundaries that call setStage legitimately                     |
| `if (!x) { setStage(y) }` | `if (x ?? setStage(y))` (coalescing) | `if (!x) { logError(); setStage(y) }` where setStage is NOT fallback |
| `inside: call_expression` | Indirect calls via callbacks         | Local helper functions that wrap setStage                            |

#### Combined Assessment

| Anti-Pattern                  | Grep Precision | ast-grep Precision | Recommended Approach             |
| ----------------------------- | -------------- | ------------------ | -------------------------------- |
| `catch { setStage() }`        | Medium         | High               | ast-grep primary, grep backup    |
| `if (!result) { setStage() }` | Low            | Medium             | ast-grep with context rules      |
| Optimistic updates            | Low            | Medium             | Grep + manual review             |
| IPC error silencing           | Medium         | High               | ast-grep with IPC-specific rules |

---

### 4. Suggested Before/After Gate Workflow

#### Phase 1: Baseline Scan (Pre-Task)

```bash
# Run grep-based quick scan
echo "=== Grep: catch+setStage ==="
grep -rn "catch\s*{" --include="*.ts" --include="*.tsx" src/ | grep -i "setStage" || echo "NONE"

echo "=== Grep: conditional setStage ==="
grep -rn "if\s*(\s*!" --include="*.ts" --include="*.tsx" src/ | grep -i "setStage" || echo "NONE"

echo "=== Grep: optimistic ==="
grep -rni "optimistic" --include="*.ts" --include="*.tsx" src/ | grep -i "update\|setStage\|dispatch" || echo "NONE"
```

#### Phase 2: Deep Analysis (ast-grep)

```bash
# Run ast-grep with custom rules
ast-grep scan --config sg-fallback-rules.yaml --lang TypeScript src/

# Interactive exploration
ast-grep find --pattern 'catch $C { $$$ }' --lang TypeScript src/
ast-grep find --pattern 'setStage($$$)' --lang TypeScript src/
```

#### Phase 3: Manual Triage

For each hit, classify:

1. **True Positive** — Renderer attempting authority fallback → Flag for removal
2. **False Positive** — Legitimate error recovery in main/worker → Document exception
3. **Needs Context** — Ambiguous pattern → Add to review queue

#### Phase 4: Post-Task Verification

```bash
# Re-run to confirm removals
ast-grep scan --config sg-fallback-rules.yaml --lang TypeScript src/

# Count reduction
echo "Remaining fallback patterns:"
ast-grep find --pattern 'catch $C { setStage($$$) }' --lang TypeScript src/ | wc -l
```

---

### 5. Implementation Notes for Task 15

- Create `sg-fallback-rules.yaml` in project root
- Rules should match `authority-constitution.ts` error codes: `CATCH_SET_STAGE`, `MISSING_RESULT_OPTIMISTIC_STAGE`, etc.
- Consider adding process context: renderer vs main distinction
- Combine with existing typecheck gate — new violations should fail CI

## 2026-03-23 T5: Renderer Notice/Error Display Entry Points for Authority Failures

### What Was Found

The renderer has a bifurcated notice system:

1. **Canonical notice infrastructure** — `GenerationNotice` store + `ProjectGenerationBanner` UI (exists but NOT wired to authority failures)
2. **Ad-hoc notice creation** — each stage action hook creates its own hardcoded notices on error

The `AuthorityFailureDto.noticeKey` contract exists but is **NOT wired** to renderer notice consumption.

---

### Integration Surface Map

#### 1. Canonical Notice Infrastructure (REUSABLE)

| File                                                      | Line(s)        | Symbol                                                                                           | Purpose                                  | Authority-Safe?          |
| --------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------- | ------------------------ |
| `src/renderer/src/app/store/useWorkflowStore.ts`          | 28, 36-37      | `generationNotice: GenerationNotice \| null`, `setGenerationNotice()`, `clearGenerationNotice()` | Central store for notices                | ✅ Yes — pure UI state   |
| `src/renderer/src/app/utils/generation-notice.ts`         | 4-19, 21-35    | `createGenerationResultNotice()`, `createStageGateNotice()`                                      | Factory functions for `GenerationNotice` | ✅ Yes — pure UI helpers |
| `src/renderer/src/components/ProjectGenerationBanner.tsx` | 15, 107-199    | Banner UI rendering `generationNotice` from store                                                | Primary notice display component         | ✅ Yes — consumes store  |
| `src/renderer/src/app/shell/AppHeader.tsx`                | 15-16, 103-116 | Inline notice pill in header                                                                     | Secondary notice display (dismiss only)  | ✅ Yes — consumes store  |

**Canonical notice path:** `AuthorityFailureDto` → `AUTHORITY_FAILURE_NOTICE_MAP[code]` → `noticeKey` → `createStageGateNotice()` or `createGenerationResultNotice()` → `setGenerationNotice()` → `ProjectGenerationBanner` renders it.

---

#### 2. Notice Creation Sites (Ad-hoc, Not Authority-Mapped)

| File                                                                              | Line(s)        | Function                                                           | Notice Type                                                                            | Issue                                                              |
| --------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `src/renderer/src/features/chat/ui/useChatStageActions.ts`                        | 88-96, 125-131 | `handleGenerate()` catch block                                     | `createGenerationResultNotice({ kind: 'error' })` with hardcoded title/detail          | ❌ Ad-hoc error strings; no `noticeKey` mapping                    |
| `src/renderer/src/features/chat/ui/useChatStageActions.ts`                        | 108-111        | `if (!stageResult.project) { setStage('chat') }`                   | No notice created on authority failure                                                 | ⚠️ Silent fallback — hotstop T3 #2                                 |
| `src/renderer/src/features/detailed-outline/ui/useDetailedOutlineStageActions.ts` | 73-83, 89-95   | `handleGenerateDetailedOutline()` catch block                      | `createGenerationResultNotice({ kind: 'error' })` with error message string            | ❌ Ad-hoc; error message string from catch                         |
| `src/renderer/src/features/script/ui/useScriptStageActions.ts`                    | 71-111         | `resolveScriptFailureNotice()` local function                      | Maps `reason`/`errorMessage`/`kind` to title/detail strings                            | ❌ Local ad-hoc mapping; not using `AuthorityFailureDto.noticeKey` |
| `src/renderer/src/features/script/ui/useScriptStageActions.ts`                    | 452-464        | Failure handling after `createScriptGenerationFailureResolution()` | `createGenerationResultNotice({ kind: 'error' })` using `resolveScriptFailureNotice()` | ❌ Uses local `resolveScriptFailureNotice()`                       |

---

#### 3. Stage Transition Fallback Sites (Authority-Safe Catch, No Notice)

| File                                                       | Line(s) | Pattern                                                     | Notice?                  | Authority-Safe?                                                       |
| ---------------------------------------------------------- | ------- | ----------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------- |
| `src/renderer/src/features/chat/ui/useChatStageActions.ts` | 112-116 | `catch { /* IPC failed - keep notice, no stage change */ }` | None (just console.warn) | ✅ Yes — no setStage in catch                                         |
| `src/renderer/src/features/home/ui/useHomePageActions.ts`  | 198-201 | `catch { setStage(nextStage) }`                             | None                     | ❌ **BUSINESS HOTSPOT** — local fallback in catch (T3 #4)             |
| `src/renderer/src/features/home/ui/useHomePageActions.ts`  | 195-196 | `if (!stageResult.project) { setStage(nextStage) }`         | None                     | ❌ **BUSINESS HOTSPOT** — local fallback when project missing (T3 #3) |

---

#### 4. Contract Layer (Defined But Not Wired)

| File                                        | Line(s)   | Symbol                                                                                           | Purpose                            | Wired to Renderer?   |
| ------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------ | ---------------------------------- | -------------------- |
| `src/shared/contracts/authority-failure.ts` | 60-71, 91 | `AUTHORITY_FAILURE_NOTICE_KEYS`, `AuthorityFailureNoticeKeyDto`, `AuthorityFailureDto.noticeKey` | Stable notice key enum + DTO field | ❌ **NOT YET WIRED** |
| `src/shared/contracts/authority-failure.ts` | 113-132   | `AUTHORITY_FAILURE_NOTICE_MAP`                                                                   | `code → noticeKey` mapping         | ❌ **NOT YET WIRED** |
| `src/shared/contracts/workflow.ts`          | 208-210   | `WorkflowAuthorityErrorEnvelopeDto { error: AuthorityFailureDto }`                               | Envelope for IPC error transport   | ❌ **NOT YET WIRED** |
| `src/shared/contracts/workflow.ts`          | 216-218   | `WorkflowAuthorityErrorCompatibilityEnvelopeDto`                                                 | Legacy compatibility wrapper       | ❌ **NOT YET WIRED** |

---

### Recommended Integration Points for Task 5

#### Option A: New Canonical Hook (RECOMMENDED)

Create `src/renderer/src/app/hooks/useAuthorityFailureNotice.ts`:

```typescript
// Inputs: AuthorityFailureDto (or AuthorityFailureLikeDto)
// Outputs: calls setGenerationNotice with properly mapped GenerationNotice
// Uses: AUTHORITY_FAILURE_NOTICE_MAP, createStageGateNotice
```

**Integration sites to modify:**

- `useChatStageActions.ts:125` — replace ad-hoc catch notice with `useAuthorityFailureNotice`
- `useDetailedOutlineStageActions.ts:89` — replace ad-hoc catch notice
- `useScriptStageActions.ts:452` — replace `resolveScriptFailureNotice` with hook

#### Option B: Inline Utility Function

Add `createAuthorityFailureNotice()` to `generation-notice.ts` alongside existing factories:

```typescript
export function createAuthorityFailureNotice(dto: AuthorityFailureDto): GenerationNotice {
  // Maps noticeKey → appropriate factory call
}
```

**Pros:** Minimal file changes
**Cons:** Doesn't centralize the mapping logic

---

### Key Finding: noticeKey Is the Integration Contract

The `AuthorityFailureDto.noticeKey` field (`authority.ipc_unavailable`, `authority.project_missing`, etc.) is the **stable integration contract** between main/worker and renderer.

Today, the renderer never reads `noticeKey` — it only creates hardcoded notices in catch blocks.

**Task 5 implementation should:**

1. Create a renderer utility/hook that consumes `AuthorityFailureDto` and maps `noticeKey` to `GenerationNotice`
2. Wire this at the IPC boundary in stage action hooks (replace ad-hoc catch notices)
3. Keep `ProjectGenerationBanner` unchanged — it already renders `GenerationNotice` correctly
4. Keep `useWorkflowStore` unchanged — `setGenerationNotice` is the correct setter

---

### Gap: No IPC Error → AuthorityFailureDto Mapping Yet

The preload APIs (`workspace.ts`, `workflow/script-generation.ts`) return plain Promises — errors throw as JS exceptions. There's no current IPC layer that:

- Catches an `AuthorityFailureError` from main
- Wraps it in `WorkflowAuthorityErrorEnvelopeDto`
- Sends it to renderer as a structured error

This means the **IPC handler layer** needs to be updated to propagate `AuthorityFailureDto` before the renderer can consume `noticeKey`.

**Sequence for Task 5:**

1. IPC handler returns `WorkflowAuthorityErrorEnvelopeDto` on authority failure
2. Renderer catches and extracts `error.noticeKey`
3. Renderer calls `useAuthorityFailureNotice(error)` → `setGenerationNotice(notice)`
4. `ProjectGenerationBanner` renders the notice

(End of file - total 567 lines)

---

## 2026-03-23 T5: Authority Error DTO / Notice Contract — Repair Summary

### Issues Found in Prior Implementation

1. **Test file had duplicated/conflicting test blocks** - lines 140-249 duplicated earlier tests but with wrong expectations (`source: 'authority_failure'` instead of `'system'`, and `manual_retry` expecting `primaryAction` which implementation intentionally doesn't provide)
2. **Mapper not wired into production code** - `createAuthorityFailureNotice()` was only referenced in test/implementation files

### Repair Actions

1. **Fixed test file** - Removed duplicate test block (lines 140-249) leaving only correct 11 tests
2. **Wired mapper into production** - Added to `useChatStageActions.ts`:
   - Import `createAuthorityFailureNotice`
   - Updated IPC failure catch block (line 112-116) to use canonical mapper and create explicit notice instead of silent console.warn
   - This ensures authority failures from `changeProjectStage` IPC calls produce explicit UI notices via `setGenerationNotice`

### Verification

- `node --test src/renderer/src/app/utils/authority-failure-notice.test.ts` → 11 pass, 0 fail ✓
- `npm run typecheck` → passes ✓
- `createAuthorityFailureNotice` now referenced in production code (`useChatStageActions.ts`) ✓

### Files Modified

- `src/renderer/src/app/utils/authority-failure-notice.test.ts` (removed duplicate tests)
- `src/renderer/src/features/chat/ui/useChatStageActions.ts` (wired mapper into IPC failure handling)

---

## 2026-03-23 T5: Authority Error DTO / Notice Contract — Implementation Complete

### What Was Created

1. **`src/renderer/src/app/utils/authority-failure-notice.ts`** — canonical renderer mapper
   - `createAuthorityFailureNotice()`: Maps `AuthorityFailureDto` or `WorkflowAuthorityErrorEnvelopeDto` to `GenerationNotice`
   - `AUTHORITY_NOTICE_DISPLAY_MAP`: Maps all 8 `AuthorityFailureNoticeKeyDto` values to display title/detail in Chinese
   - `extractAuthorityFailure()`: Unwraps envelope if needed
   - `hasNoticeKey()`: Type guard for discriminated union handling
   - `getRecoveryAction()`: Returns optional `primaryAction` based on `recoverability`

2. **`src/renderer/src/app/utils/authority-failure-notice.test.ts`** — targeted tests
   - 11 tests covering all notice keys, envelope support, and distinguishability

### Canonical Path Established

```
AuthorityFailureDto.noticeKey
  -> AUTHORITY_NOTICE_DISPLAY_MAP[noticeKey]
  -> createAuthorityFailureNotice()
  -> GenerationNotice
  -> setGenerationNotice()
```

### Notice Key Mappings

| noticeKey                       | title          | detail                                                                   |
| ------------------------------- | -------------- | ------------------------------------------------------------------------ |
| `authority.ipc_unavailable`     | 服务暂时不可用 | 无法连接到后台服务，请检查网络连接后重试。                               |
| `authority.project_missing`     | 项目未找到     | 该项目可能已被删除或移动，请回到项目列表重新选择。                       |
| `authority.result_missing`      | 生成结果缺失   | 后台没有返回有效结果，请重新尝试生成。                                   |
| `authority.result_incomplete`   | 生成结果不完整 | 后台返回了不完整的结果，请重新尝试生成。                                 |
| `authority.result_stale`        | 生成结果已过期 | 当前看到的结果不是最新状态，请刷新后重试。                               |
| `authority.main_exception`      | 后台处理异常   | 后台遇到了意外错误，请稍后重试。如果问题持续，请联系技术支持。           |
| `authority.orchestrator_bypass` | 操作被拒绝     | 当前操作不被允许，请检查是否在正确的阶段执行了正确的操作。               |
| `authority.fallback_forbidden`  | 本地回退被禁止 | 不允许在本地进行回退操作。请通过正常流程重新尝试，或回到上一个有效阶段。 |

### Key Design Decisions

- Used `source: 'system'` for authority failure notices (existing GenerationNotice source options: `generation_result`, `stage_gate`, `manual_save`, `system`)
- Supports both `AuthorityFailureDto` and `WorkflowAuthorityErrorEnvelopeDto` inputs
- Legacy failure shapes (without `noticeKey`) fallback gracefully with `errorMessage` or `reason`
- `recoverability` drives optional `primaryAction`: `refresh_project` and `reload_workspace` get actions; `manual_retry`, `fix_contract_input`, `not_recoverable` do not

### Verification

- `npm run typecheck` passes ✓
- Tests run (11 passing) ✓
- No new LSP errors ✓

### Next Steps (per task description)

The canonical mapper is now available for Tasks 6-14 to consume:

```typescript
import { createAuthorityFailureNotice } from '../../../app/utils/authority-failure-notice'
// Usage:
setGenerationNotice(createAuthorityFailureNotice(authorityError))
```

---

## 2026-03-23 T5: Authority Error DTO / Notice Contract — Contract Map (ADDENDUM)

### Task Scope

Unify `project missing / authority unavailable / IPC failed / incomplete result / migration blocked` error semantics for IPC/main/renderer boundaries.

### Canonical Contract Surfaces Identified

#### 1. `src/shared/contracts/authority-failure.ts` (PRIMARY — T5 Target)

**Status:** Defined but NOT yet wired into IPC handlers  
**Lines:** 1-132

| Type/Constant                       | Line    | Purpose                                          |
| ----------------------------------- | ------- | ------------------------------------------------ |
| `AUTHORITY_FAILURE_TYPES`           | 11-19   | 7 failure type literals                          |
| `AuthorityFailureTypeDto`           | 21      | Union of above                                   |
| `AUTHORITY_FAILURE_CODES`           | 27-43   | 15 error codes (7 failure + 8 constitution)      |
| `AuthorityFailureCodeDto`           | 45      | Union of above                                   |
| `AUTHORITY_FAILURE_RECOVERABILITY`  | 47-53   | 5 recoverability options                         |
| `AuthorityFailureRecoverabilityDto` | 55      | Union of above                                   |
| `AUTHORITY_FAILURE_NOTICE_KEYS`     | 60-69   | 8 notice key literals for renderer i18n          |
| `AuthorityFailureNoticeKeyDto`      | 71      | Union of above                                   |
| `AuthorityFailureContextDto`        | 73-81   | Context with fact/stage/projectId/source/traceId |
| `AuthorityFailureDto`               | 83-93   | **Primary DTO** — full error shape for IPC       |
| `LegacyFailureShapeDto`             | 99-104  | Compatibility bridge for ad hoc error shapes     |
| `AuthorityFailureLikeDto`           | 106     | Union of DTO + legacy                            |
| `AUTHORITY_FAILURE_NOTICE_MAP`      | 113-132 | Code → noticeKey mapping                         |

**Key DTO Shape (line 83-93):**

```typescript
interface AuthorityFailureDto {
  type: 'authority_failure'
  failureType: AuthorityFailureTypeDto
  code: AuthorityFailureCodeDto
  message: string
  context: AuthorityFailureContextDto
  recoverability: AuthorityFailureRecoverabilityDto
  recoverable: boolean
  noticeKey: AuthorityFailureNoticeKeyDto
  occurredAt: string
}
```

#### 2. `src/shared/domain/workflow/authority-constitution.ts` (DOMAIN — Taxonomic Foundation)

**Status:** DEFINED, never thrown (dead code)  
**Lines:** 1-484

| Item                          | Line    | Notes                                                                                          |
| ----------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| `AuthorityFailureError` class | 294-306 | Extends Error, has failureType/fact/context/originalError                                      |
| `AuthorityCheckResult<T>`     | 312-314 | Discriminated union: `{ ok: true, value: T } \| { ok: false, failure: AuthorityFailureError }` |
| `authorityOk()` helper        | 319-321 | Creates success result                                                                         |
| `authorityFail()` helper      | 326-336 | Creates failure result                                                                         |
| `assertAuthorityCheck()`      | 342-350 | Throws if failed                                                                               |

**⚠️ CRITICAL FINDING:** `AuthorityFailureError` is defined in `authority-constitution.ts:294` but **NEVER THROWN anywhere** in the codebase.

#### 3. `src/shared/contracts/workflow.ts` (IPC Response Envelope)

**Lines:** 201-218

| Envelope                                         | Line    | Purpose                                                         |
| ------------------------------------------------ | ------- | --------------------------------------------------------------- |
| `WorkflowAuthorityErrorEnvelopeDto`              | 208-210 | Wraps `{ error: AuthorityFailureDto }` for workflow errors      |
| `WorkflowAuthorityErrorCompatibilityEnvelopeDto` | 216-218 | Wraps `{ error: AuthorityFailureLikeDto }` for legacy migration |

#### 4. `src/shared/contracts/app-error.ts` (Generic App Error)

**Lines:** 1-13 — SEPARATE generic error contract. T5 should NOT repurpose.

### IPC Serialization Risk

Error classes (like `AuthorityFailureError`) cannot cross IPC as class instances. They serialize to plain objects. Solution: `AuthorityFailureDto` is the IPC serialization target, NOT the Error class.

### Missing Integration Points for T5

| Integration Point                      | Status          |
| -------------------------------------- | --------------- |
| IPC handler → AuthorityFailureDto      | NOT IMPLEMENTED |
| WorkflowAuthorityErrorEnvelopeDto used | NOT IMPLEMENTED |
| Renderer noticeKey consumption         | NOT IMPLEMENTED |

### Recommended Minimal Contract Extension Surface for T5

1. **Builder function** in `authority-failure.ts`: `buildAuthorityFailureDto(error: AuthorityFailureError): AuthorityFailureDto`
2. **Return envelope** from IPC handlers: `WorkflowAuthorityErrorEnvelopeDto` instead of ad hoc shapes
3. **Proof-of-concept handler**: `workspace:change-project-stage` (workspace-project-handlers.ts:106)
4. **Renderer hook**: `useAuthorityFailureNotice(error: AuthorityFailureDto)` mapping noticeKey → GenerationNotice

(End of file - total 684 lines)

---

## 2026-03-23 T6: Banner Navigation Fallback Elimination

### What Was Found

Exhaustive inspection of the three navigation/shared-surface files from the plan:

| File                          | Verdict                  | Notes                                                                                 |
| ----------------------------- | ------------------------ | ------------------------------------------------------------------------------------- |
| `AppSidebar.tsx`              | Already correct          | `handleStageChange` calls IPC with no local `setStage` fallback                       |
| `AppHeader.tsx`               | No authority fallback    | Only hardcoded UI navigation (`setStage('runtime_console')`) and home reset           |
| `ProjectGenerationBanner.tsx` | Had 2 forbidden patterns | `navigateWithTruth` function had local stage fallback on IPC failure / missing result |

### Hotspot Details: `ProjectGenerationBanner.navigateWithTruth`

**Pattern 1 (line 145): `!result.project` → `setStage(stage)`**

- Classification: `MISSING_RESULT_OPTIMISTIC_STAGE` — IPC succeeded but returned falsy project
- Fix: Build `AuthorityFailureDto` with `failureType: 'project_missing'`, `code: 'AUTHORITY_FAILURE_PROJECT_MISSING'`, `noticeKey: 'authority.project_missing'` → call `setGenerationNotice(createAuthorityFailureNotice(...))`

**Pattern 2 (line 149): `catch { setStage(stage) }`**

- Classification: `CATCH_SET_STAGE` — IPC call itself failed
- Fix: Build `AuthorityFailureDto` with `failureType: 'ipc_failure'`, `code: 'AUTHORITY_FAILURE_IPC_FAILURE'`, `noticeKey: 'authority.ipc_unavailable'` → call `setGenerationNotice(createAuthorityFailureNotice(...))`

**Pattern 3 (line 136): `!projectId` → `setStage(stage)` — LEFT UNCHANGED**

- Classification: Pre-project UI state (no projectId to authority against)
- Rationale: Without a `projectId`, there is no authority source to call. This is a legitimate pre-project navigation state, not an authority fallback.

### Implementation

**Files modified:**

- `src/renderer/src/components/ProjectGenerationBanner.tsx`
  - Added import: `createAuthorityFailureNotice` from `../app/utils/authority-failure-notice`
  - Added `setGenerationNotice` destructured from `useWorkflowStore`
  - Replaced `setStage(stage)` fallback in `!result.project` block with `setGenerationNotice(createAuthorityFailureNotice(...))`
  - Replaced `setStage(stage)` fallback in `catch` block with `setGenerationNotice(createAuthorityFailureNotice(...))`

### Canonical Notice Path Used

```
AuthorityFailureDto (with noticeKey)
  -> createAuthorityFailureNotice()
  -> setGenerationNotice()
  -> ProjectGenerationBanner (notice rendering, already correct)
```

This reuses the canonical `createAuthorityFailureNotice()` mapper from Task 5.

### Verification

- `npm run typecheck` → passes
- LSP diagnostics on `ProjectGenerationBanner.tsx` → 0 errors

### Caveats

1. The `!projectId` case (line 136) is treated as acceptable pre-project navigation.
2. The `source: 'renderer'` in context is technically imprecise but is the only valid option among the allowed values for this notice-creation site.
3. `AppSidebar` and `AppHeader` verified as clean — no changes needed.

---

## 2026-03-23 T7: Chat / Outline / Character Page Fallback Elimination

### What Was Found

Three stage pages had local `setStage(target)` fallback when IPC failed or `result.project` was missing:

| File                 | Lines      | Pattern                                                                                            | Target Stage       |
| -------------------- | ---------- | -------------------------------------------------------------------------------------------------- | ------------------ |
| `ChatStage.tsx`      | 52-53, 57  | `if (!result.project) { setStage('outline') }` + `catch { setStage('outline') }`                   | `outline`          |
| `OutlineStage.tsx`   | 38-39, 43  | `if (!result.project) { setStage('character') }` + `catch { setStage('character') }`               | `character`        |
| `CharacterStage.tsx` | 95-96, 100 | `if (!result.project) { setStage('detailed_outline') }` + `catch { setStage('detailed_outline') }` | `detailed_outline` |

### Implementation

**Files modified:**

1. **`src/renderer/src/features/chat/ui/ChatStage.tsx`**
   - Added import: `createAuthorityFailureNotice` from `../../../app/utils/authority-failure-notice`
   - Replaced `setStage('outline')` in `!result.project` block with `setGenerationNotice(createAuthorityFailureNotice(...))` using `authority.project_missing`
   - Replaced `setStage('outline')` in `catch` block with `setGenerationNotice(createAuthorityFailureNotice(...))` using `authority.ipc_unavailable`

2. **`src/renderer/src/features/outline/ui/OutlineStage.tsx`**
   - Added import: `createAuthorityFailureNotice` from `../../../app/utils/authority-failure-notice`
   - Replaced `setStage('character')` in `!result.project` block with `setGenerationNotice(createAuthorityFailureNotice(...))` using `authority.project_missing`
   - Replaced `setStage('character')` in `catch` block with `setGenerationNotice(createAuthorityFailureNotice(...))` using `authority.ipc_unavailable`

3. **`src/renderer/src/features/character/ui/CharacterStage.tsx`**
   - Added import: `createAuthorityFailureNotice` from `../../../app/utils/authority-failure-notice`
   - Replaced `setStage('detailed_outline')` in `!result.project` block with `setGenerationNotice(createAuthorityFailureNotice(...))` using `authority.project_missing`
   - Replaced `setStage('detailed_outline')` in `catch` block with `setGenerationNotice(createAuthorityFailureNotice(...))` using `authority.ipc_unavailable`

### Authority Failure Notice Details

For `result.project` missing (`project_missing`):

- `failureType: 'project_missing'`
- `code: 'AUTHORITY_FAILURE_PROJECT_MISSING'`
- `noticeKey: 'authority.project_missing'`
- `recoverability: 'refresh_project'`

For IPC failure (`ipc_failure`):

- `failureType: 'ipc_failure'`
- `code: 'AUTHORITY_FAILURE_IPC_FAILURE'`
- `noticeKey: 'authority.ipc_unavailable'`
- `recoverability: 'manual_retry'`

### Successful Authority Sync Preserved

The successful path `if (result.project) { setStage(result.project.stage) }` remains unchanged — authoritative stage from main is properly synced.

### Verification

- `npm run typecheck` → passes
- LSP diagnostics on all 3 files → 0 errors

### Canonical Notice Path Reused

```
AuthorityFailureDto (with noticeKey)
  -> createAuthorityFailureNotice() [T5 canonical mapper]
  -> setGenerationNotice()
  -> ProjectGenerationBanner (renders notice)
```

This reuses the canonical `createAuthorityFailureNotice()` mapper from Task 5, with appropriate `AuthorityFailureDto` construction for each failure type.

---

## 2026-03-23 T8: DetailedOutline / Script Page Fallback Elimination

### What Was Found

**DetailedOutlineStage.tsx** — had 2 fallback patterns in `handleGoToScriptStage()`:

- Lines 136-138: `else { setStage('script') }` — MISSING_RESULT_OPTIMISTIC_STAGE when `result.project` is falsy
- Lines 139-142: `catch { setStage('script') }` — CATCH_SET_STAGE when IPC throws

**ScriptStage.tsx** — verified CLEAN. No `setStage` fallback patterns found. Navigation delegates to IPC properly.

### Implementation

**File modified:** `src/renderer/src/features/detailed-outline/ui/DetailedOutlineStage.tsx`

1. Added import: `createAuthorityFailureNotice` from `../../../app/utils/authority-failure-notice`
2. Replaced `else { setStage('script') }` block with explicit `authority.project_missing` notice
3. Replaced `catch { setStage('script') }` block with explicit `authority.ipc_unavailable` notice

### Authority Failure Notice Details

For `result.project` missing:

- `failureType: 'project_missing'`
- `code: 'AUTHORITY_FAILURE_PROJECT_MISSING'`
- `noticeKey: 'authority.project_missing'`
- `recoverability: 'refresh_project'`

For IPC failure:

- `failureType: 'ipc_failure'`
- `code: 'AUTHORITY_FAILURE_IPC_FAILURE'`
- `noticeKey: 'authority.ipc_unavailable'`
- `recoverability: 'manual_retry'`

### Successful Authority Sync Preserved

The `if (result.project) { setStage(result.project.stage) }` path at line 134 remains unchanged — authoritative stage from main is properly synced.

### Acceptable Pre-Project Navigation

The `if (!projectId) { setStage('script'); return }` case at lines 125-128 is left unchanged — no projectId means no authority source to call against. This is legitimate pre-project navigation state, consistent with T7 approach.

### Verification

- `npm run typecheck` → passes
- LSP diagnostics on DetailedOutlineStage.tsx → 0 errors
- ScriptStage.tsx verified clean — no changes needed

---

## 2026-03-23 T8 Repair: Residual Outline-Fallback in "回粗纲继续改" Button

### Issue Found

Initial T8 fix addressed `handleGoToScriptStage()` but left the "回粗纲继续改" button path with three residual fallback branches (lines ~230-249):

1. `if (!projectId) { setStage('outline') }` — pre-project local stage set
2. `else { setStage('outline') }` — project_missing MISSING_RESULT_OPTIMISTIC_STAGE
3. `catch { ... setStage('outline') }` — ipc_failure CATCH_SET_STAGE

### Fix Applied

All three branches in the "回粗纲继续改" button now use explicit authority failure notices:

- `!projectId` → `authority.project_missing` notice + early return
- `!result.project` → `authority.project_missing` notice
- IPC failure → `authority.ipc_unavailable` notice

The authoritative sync path `if (result.project) { setStage(result.project.stage) }` remains intact.

### Verification

- `npm run typecheck` → passes
- LSP diagnostics on DetailedOutlineStage.tsx → 0 errors

---

## 2026-03-23 T9: Hook/Helper Hidden Authority Fallback Inventory

### Scope Distinction from T6-T8

- T6-T8: Page-level fallbacks (ChatStage.tsx, OutlineStage.tsx, CharacterStage.tsx, DetailedOutlineStage.tsx, ProjectGenerationBanner.tsx)
- T9: Hook/helper hidden fallbacks (useHomePageActions.ts, useChatStageActions.ts, useScriptStageActions.ts)

### Hotspot Map

| #   | File                                                         | Lines   | Pattern                                                                                                             | Classification                  | Task                 |
| --- | ------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------- |
| 1   | src/renderer/src/features/home/ui/useHomePageActions.ts      | 195-196 | if (!stageResult.project) { setStage(nextStage) } — MISSING_RESULT_OPTIMISTIC_STAGE, local fallback to passed stage | MISSING_RESULT_OPTIMISTIC_STAGE | Task 9               |
| 2   | src/renderer/src/features/home/ui/useHomePageActions.ts      | 198-201 | catch { setStage(nextStage) } — CATCH_SET_STAGE, local fallback to passed stage on IPC failure                      | CATCH_SET_STAGE                 | Task 9               |
| 3   | src/renderer/src/features/chat/ui/useChatStageActions.ts     | 109-111 | if (!stageResult.project) { setStage('chat') } — MISSING_RESULT_OPTIMISTIC_STAGE with hardcoded chat                | MISSING_RESULT_OPTIMISTIC_STAGE | Task 9               |
| 4   | src/renderer/src/features/home/ui/useHomePageActions.ts      | 193     | setStage(stageResult.project.stage) — authoritative sync, correct pattern                                           | AUTHORITATIVE_SYNC              | T7 (already correct) |
| 5   | src/renderer/src/features/chat/ui/useChatStageActions.ts     | 108     | setStage(stageResult.project.stage) — authoritative sync, correct pattern                                           | AUTHORITATIVE_SYNC              | T7 (already correct) |
| 6   | src/renderer/src/features/chat/ui/useChatStageActions.ts     | 113-116 | catch { /_ keep stage + authority notice _/ } — IPC failure with notice, no setStage                                | CORRECT (notice not fallback)   | None                 |
| 7   | src/renderer/src/features/script/ui/useScriptStageActions.ts | N/A     | No setStage() calls found                                                                                           | CLEAN                           | Not Task 9           |

### Task 9 Minimal Fix Surface

2 functions, 3 sites:

1. useHomePageActions.ts — enterProject() lines 166-204
   The try block at lines 186-202 contains the stage transition IPC call. Two fallback sites:
   - Line 195-196 (if (!stageResult.project) branch): Replace setStage(nextStage) with setGenerationNotice(createAuthorityFailureNotice({ type: 'authority_failure', failureType: 'project_missing', code: 'AUTHORITY_FAILURE_PROJECT_MISSING', message: 'Project not found after stage transition', context: { fact: 'stage_authority', source: 'ipc' }, recoverability: 'refresh_project', recoverable: true, noticeKey: 'authority.project_missing', occurredAt: new Date().toISOString() }))
   - Line 198-201 (catch branch): Replace setStage(nextStage) with setGenerationNotice(createAuthorityFailureNotice({ type: 'authority_failure', failureType: 'ipc_failure', code: 'AUTHORITY_FAILURE_IPC_FAILURE', message: error message, context: { fact: 'stage_authority', source: 'ipc' }, recoverability: 'manual_retry', recoverable: true, noticeKey: 'authority.ipc_unavailable', occurredAt: new Date().toISOString() }))
     Note: createAuthorityFailureNotice is already imported in this file (line 6 uses other notice utilities). Check if imported from ../../../app/utils/authority-failure-notice.

2. useChatStageActions.ts — handleGenerate() lines 98-131
   The try block at lines 101-131 contains the stage transition IPC call. One fallback site:
   - Lines 109-111 (if (!stageResult.project) branch): Replace setStage('chat') with setGenerationNotice(createAuthorityFailureNotice({ type: 'authority_failure', failureType: 'project_missing', code: 'AUTHORITY_FAILURE_PROJECT_MISSING', message: 'Project not found after outline generation', context: { fact: 'stage_authority', source: 'ipc' }, recoverability: 'refresh_project', recoverable: true, noticeKey: 'authority.project_missing', occurredAt: new Date().toISOString() }))
     Note: createAuthorityFailureNotice is already imported at line 6.

### Verification Method

After fixes, grep for these patterns should return ZERO matches in renderer hooks:

- grep -rn "catch.\*{" src/renderer/src/features/home/ui/useHomePageActions.ts | grep setStage
- grep -rn "catch.\*{" src/renderer/src/features/chat/ui/useChatStageActions.ts | grep setStage
- grep -rn "if.\*{" src/renderer/src/features/home/ui/useHomePageActions.ts | grep stageResult | grep setStage
- grep -rn "if.\*{" src/renderer/src/features/chat/ui/useChatStageActions.ts | grep stageResult | grep setStage

### Files NOT in Task 9 Scope

useScriptStageActions.ts — verified clean. No setStage() calls exist anywhere in the file. Script generation hooks do not perform stage transitions.

### T10+ Items Identified in useScriptStageActions.ts (for planning)

| Pattern                                                                         | Line(s)  | Classification                                                    | Downstream Task |
| ------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------- | --------------- | ------------------------------------------ | --- |
| `handleAutoRepair` empty stub                                                   | 367      | T11 repair logic not yet implemented                              | T11             |
| `                                                                               |          | 10` episode count plan default                                    | 150, 383, 561   | Plan-building default, not stage authority | T10 |
| Direct `window.api.workflow.startScriptGeneration` calls bypassing orchestrator | 409, 603 | Orchestrator bypass — START/RESUME not wired through orchestrator | T11             |
| `handleRewriteGeneration` full manual flow                                      | 288–350  | Orchestrator bypass — rewrite not wired through orchestrator      | T11             |

Note: `_input.generationStatus` usage at line 124 is correct — passes authoritative status from parent rather than reading stale store. Good pattern, preserve.

### Additional Adjacent Utility Findings

All clean — no local stage decision logic:

- `generation-status.ts`: `startGenerationRun` and `finishGenerationRun` route through IPC; no local fallback
- `authority-failure-notice.ts`: Pure canonical mapper; no local decision-making
- `project-generation-status.ts`: Pure staleness check; no stage decision
- `stage-estimates.ts`: Pure estimation; no authority involvement

---

## 2026-03-23 T9: Hook/Helper Hidden Fallback Elimination — Implementation

### What Was Changed

**2 files modified, 3 fallback branches removed:**

#### 1. `src/renderer/src/features/home/ui/useHomePageActions.ts` — enterProject()

**Changes:**

- Added import: `createAuthorityFailureNotice` from `../../../app/utils/authority-failure-notice`
- Added `setGenerationNotice` destructured from `useWorkflowStore`
- Replaced `else { setStage(nextStage) }` (line 195-196) with explicit `authority.project_missing` notice
- Replaced `catch { ... setStage(nextStage) }` (lines 198-201) with explicit `authority.ipc_unavailable` notice

**Removed fallback code:**

```typescript
// REMOVED: else { setStage(nextStage) }  // MISSING_RESULT_OPTIMISTIC_STAGE
// REMOVED: catch { ... setStage(nextStage) }  // CATCH_SET_STAGE
```

**Authority failure notices added:**

- `project_missing`: When `stageResult.project` is falsy — `noticeKey: 'authority.project_missing'`
- `ipc_failure`: When IPC throws — `noticeKey: 'authority.ipc_unavailable'`

**Preserved:**

- `if (stageResult.project) { setStage(stageResult.project.stage) }` — authoritative sync path intact

#### 2. `src/renderer/src/features/chat/ui/useChatStageActions.ts` — handleGenerate()

**Changes:**

- Replaced `else { setStage('chat') }` (lines 109-111) with explicit `authority.project_missing` notice

**Removed fallback code:**

```typescript
// REMOVED: else { setStage('chat') }  // MISSING_RESULT_OPTIMISTIC_STAGE with hardcoded 'chat'
```

**Authority failure notice added:**

- `project_missing`: When `stageResult.project` is falsy after outline generation — `noticeKey: 'authority.project_missing'`

**Preserved:**

- `if (stageResult.project) { setStage(stageResult.project.stage) }` — authoritative sync path intact
- Catch block (lines 113-130) already uses `createAuthorityFailureNotice` correctly — no changes needed

### Verification

- `npm run typecheck` → passes
- LSP diagnostics on both files → 0 errors

### Canonical Notice Path Reused

```
AuthorityFailureDto (with noticeKey)
  -> createAuthorityFailureNotice() [T5 canonical mapper]
  -> setGenerationNotice()
  -> ProjectGenerationBanner (renders notice)
```

### Scope Notes

- useScriptStageActions.ts verified clean — no `setStage()` calls, not modified
- No shared helper extraction performed (per task constraint)
- No orchestrator/runtime/main-process changes
- Changes narrow to exactly the 2 files / 3 fallback branches identified

---

## 2026-03-23 T9 Repair: Hook-Order Violation Fix

### Issue

After Task 9 implementation, browser console showed React error: "React has detected a change in the order of Hooks called by HomePage" / "Should have a queue. You are likely calling Hooks conditionally."

### Root Cause

The `setGenerationNotice` hook was called at the top level of `useHomePageActions` (line 101), but the calls to `setGenerationNotice(...)` in `enterProject()` happen inside an async event handler function, not during render. In certain React/Zustand versions, this can cause React's fiber hook tracking to become confused when hooks are called from nested non-render functions.

### Fix Applied

**File:** `src/renderer/src/features/home/ui/useHomePageActions.ts`

1. Removed `setGenerationNotice` from the top-level Zustand hook destructuring (line 101)
2. Changed `enterProject()` to use `useWorkflowStore.getState().setGenerationNotice(...)` instead of the hook

This is correct because:

- `enterProject()` is an async event handler, not a render function
- It is NOT called during render, so using `getState()` is safe and avoids any hook-order issues
- The hook at top level was unnecessary since the actual invocations happened inside `enterProject`

### Verification

- `npm run typecheck` → passes
- LSP diagnostics on useHomePageActions.ts → 0 errors

### Preserved

- Task 9 fallback removal behavior remains intact
- All three authority failure notices still use `createAuthorityFailureNotice()` and route through `setGenerationNotice`
- Authoritative success path `if (stageResult.project) { setStage(...) }` unchanged

---

## 2026-03-23 T10: generationStatus Optimistic Core State Elimination

### What Was Found

The renderer was constructing authoritative `generationStatus` objects locally in three files:

| File                                               | Lines   | Fields Constructed by Renderer                                      |
| -------------------------------------------------- | ------- | ------------------------------------------------------------------- |
| `useChatStageActions.ts`                           | 41-49   | `task`, `stage`, `title`, `detail`, `startedAt`, `estimatedSeconds` |
| `useDetailedOutlineStageActions.ts`                | 28-38   | `task`, `stage`, `title`, `detail`, `startedAt`, `estimatedSeconds` |
| `useScriptStageActions.ts` (handleStartGeneration) | 184-194 | `task`, `stage`, `title`, `detail`, `startedAt`, `estimatedSeconds` |
| `useScriptStageActions.ts` (StartFresh)            | 573-583 | `task`, `stage`, `title`, `detail`, `startedAt`, `estimatedSeconds` |

These objects were passed to `startGenerationRun()` which sent them to main via `saveGenerationStatus`. Main just persisted whatever renderer sent instead of deriving authoritative fields itself.

### Solution Architecture

**Before (wrong):**

```
Renderer constructs full status with startedAt, estimatedSeconds, title, detail
  -> saveGenerationStatus IPC
  -> Main persists (no derivation)
```

**After (correct):**

```
Renderer sends only: projectId, task, stage (minimal intent)
  -> startGenerationStatus IPC (new)
  -> Main derives: startedAt, estimatedSeconds, title, detail
  -> Main persists
  -> Returns authoritative status to renderer
  -> Renderer updates local store from authority-confirmed result
```

### Implementation

1. **Added `StartGenerationStatusInputDto`** to `workspace.ts` contracts:
   - Fields: `projectId`, `task`, `stage`
   - Minimal context only

2. **Created `startGenerationStatus()` in `project-store.ts`**:
   - Derives `startedAt: Date.now()`
   - Derives `estimatedSeconds` based on task type
   - Derives `title` and `detail` based on task type
   - Persists and returns authoritative `ProjectGenerationStatusDto`

3. **Added `workspace:start-generation-status` IPC handler** in `workspace-project-handlers.ts`:
   - Calls `startGenerationStatus()` which derives authoritative fields

4. **Added `startGenerationStatus()` preload API** in `workspace.ts`:
   - Returns full `ProjectGenerationStatusDto` from main

5. **Modified `generation-status.ts` `startGenerationRun()`**:
   - Changed signature from `status: ProjectGenerationStatusDto` to `task` + `stage`
   - Calls new `startGenerationStatus` IPC
   - Updates local store from returned authoritative result

6. **Updated all callers** to pass minimal context:
   - `useChatStageActions.ts`: passes `task: 'outline_bundle'`, `stage: 'chat'`
   - `useDetailedOutlineStageActions.ts`: passes `task: 'detailed_outline'`, `stage: 'detailed_outline'`
   - `useScriptStageActions.ts` (handleStartGeneration): passes `task: 'script'`, `stage: 'script'`
   - `useScriptStageActions.ts` (StartFresh): passes `task: 'script'`, `stage: 'script'`

### Files Modified

- `src/shared/contracts/workspace.ts` — added `StartGenerationStatusInputDto`
- `src/main/infrastructure/storage/project-store.ts` — added `startGenerationStatus()` function with derivation logic
- `src/main/ipc/workspace-project-handlers.ts` — added `workspace:start-generation-status` handler
- `src/preload/api/workspace.ts` — added `startGenerationStatus()` API
- `src/renderer/src/app/utils/generation-status.ts` — modified `startGenerationRun()` to send minimal context
- `src/renderer/src/features/chat/ui/useChatStageActions.ts` — removed local status construction
- `src/renderer/src/features/detailed-outline/ui/useDetailedOutlineStageActions.ts` — removed local status construction
- `src/renderer/src/features/script/ui/useScriptStageActions.ts` — removed local status construction (2 places)

### Key Design Decisions

1. **Main derives ALL authoritative fields** (`startedAt`, `estimatedSeconds`, `title`, `detail`) based on `task` type. This ensures single authority producer.

2. **Default estimates used** in main derivation. For `detailed_outline`, the renderer previously computed `estimatedSeconds` with episode count from `normalizedOutline.summaryEpisodes.length`. This is now a default in main (300s = 10 episodes \* 30s). If more precise estimates are needed, a future enhancement could pass episode count as additional context.

3. **Pure loading/disabled UI preserved**. The `finishGenerationRun()` function remains unchanged - it's still called after generation completes to clear the status.

4. **Authority-first stage sync preserved**. The successful stage transition pattern `if (result.project) { setStage(result.project.stage) }` in `useChatStageActions.ts` remains unchanged.

### Verification

- `npm run typecheck` → passes
- All LSP diagnostics → 0 errors
- Confirmed no remaining renderer-side construction of authoritative `generationStatus` core fields in the targeted flow

---

---

## 2026-03-23 T11 Scope Analysis: Orchestrator Live Path Boundary

### What Is Task 11

> 让 start / resume / rewrite 真正接入 orchestrator

Task 11 must make `workflow:start-script-generation` IPC handler (`script-generation-runtime-handlers.ts:37`) route through `ScriptOrchestrator.execute()` instead of calling `runScriptGenerationInWorker()` directly.

---

### Current Bypass Evidence

| Operation | Current Path                                                                      | Orchestrator Used? |
| --------- | --------------------------------------------------------------------------------- | ------------------ |
| START     | handler:71 → `runScriptGenerationInWorker()` → worker → `startScriptGeneration()` | NEVER              |
| RESUME    | Same path (mode='resume' by `input.plan.mode` at line 42)                         | NEVER              |
| REWRITE   | Manual clear + same path (`existingScript: []` at line 617)                       | NEVER              |
| STOP      | handler:160 → `stopScriptGenerationRun()` → `Worker.terminate()`                  | NEVER              |
| PAUSE     | NOT IMPLEMENTED anywhere                                                          | N/A                |
| CONTINUE  | NOT IMPLEMENTED anywhere                                                          | N/A                |

`grep "new ScriptOrchestrator"` returns ZERO matches across the entire codebase. The orchestrator class (815 lines) is defined but never instantiated.

---

### Task 11 Strict Scope — What to Modify NOW

**File: `src/main/ipc/workflow/script-generation-runtime-handlers.ts`**

The `workflow:start-script-generation` handler (line 37) must be refactored to:

1. **Instantiate `ScriptOrchestrator`** once, stored at module scope as a singleton
2. **Wire all required dependencies** as constructor options:
   - `resolveRuntimeProfile` → `resolveScriptRuntimeProfile` from `src/main/application/script-generation/plan/resolve-runtime-profile.ts`
   - `resolveResumeFromBoard` → from `progress-board.ts`
   - `persistState` → a callback that calls `updateRuntimeTask`
   - `getProject` → `getProject` from `project-store.ts`
   - `buildExecutionPlan` → `buildScriptGenerationExecutionPlan` from `build-execution-plan.ts`
   - `createInitialBoard` → `createInitialProgressBoard` from `progress-board.ts`
   - `runScriptGenerationBatch` → `runScriptGenerationBatch` from `run-script-generation-batch.ts`
   - `repairGeneratedScenes` → `repairGeneratedScenes` from `repair-generated-scenes.ts`
   - `atomicSaveGenerationState` → `atomicSaveGenerationState` from `project-store.ts`
   - `runtimeConfig` → `runtimeProviderConfig` (already available from `registerScriptGenerationRuntimeHandlers`)
   - `onProgress` → callback that calls `updateRuntimeTask`

3. **Replace `runScriptGenerationInWorker()` call at line 71** with `orchestrator.execute(command)` where command is a `ScriptGenerationCommand` built from the `StartScriptGenerationInputDto` input.

4. **Build `ScriptGenerationCommand`** from `StartScriptGenerationInputDto`:
   - `projectId: input.projectId`
   - `planId: input.plan.id`
   - `mode: input.plan.mode === 'resume' ? 'continue' : input.plan.mode === 'fresh_start' ? 'restart' : 'rewrite'` (maps to orchestrator's `'continue' | 'restart' | 'rewrite'`)
   - `batchSize: input.plan.runtimeProfile?.recommendedBatchSize || input.plan.targetEpisodes`
   - `stopSignal: null` (AbortController managed by caller/renderer)

**What stays the same:**

- Renderer side (`useScriptStageActions.ts:398`, `useScriptStageActions.ts:582`) does NOT change — same IPC channel, same payload shape
- `StartScriptGenerationInputDto` contract stays compatible
- Handler's runtime task creation (`createRuntimeTask`, `updateRuntimeTask`, `finalizeRuntimeTask`) stays — orchestrator's `onProgress` callback drives these

**What T11 must create:**

- Module-level singleton: `let _orchestrator: ScriptOrchestrator | null = null`
- The orchestrator instance must be accessible to Task 12's stop/pause/continue handlers

---

### Task 12 Boundary — What T11 Must NOT Touch

Task 12 modifies `workflow:stop-script-generation` handler (line 154):

- Currently calls `stopScriptGenerationRun()` directly (line 160)
- Must call `orchestrator.stop()` instead
- Requires access to the SAME orchestrator instance created in T11
- PAUSE/CONTINUE IPC handlers do not exist — Task 12 must create `workflow:pause-script-generation` and `workflow:resume-script-generation` from scratch

**T11 must NOT implement:**

- PAUSE IPC handler (`workflow:pause-script-generation`)
- CONTINUE IPC handler (`workflow:resume-script-generation`)
- Preload API for pause/resume
- Renderer buttons for pause/resume

**T11 creates the orchestrator instance; T12 uses it for control-plane operations.**

---

### Task 13 Boundary — What T11 Must NOT Touch

**Persistence conflict identified:**

Renderer calls `atomicSaveGenerationState` directly in 4 places after each cycle (`useScriptStageActions.ts:424, 486, 616, 633`). The orchestrator's `_persistState` method (line 682) ALSO calls `atomicSaveGenerationState` internally. After T11 wires the orchestrator, both will fire — double-persist.

Task 13 must resolve this by choosing one of:

1. Orchestrator auto-persists and renderer does NOT call `atomicSaveGenerationState` after successful result
2. Orchestrator returns before persisting and renderer is responsible for all persistence

**T11 must NOT decide this persistence strategy — that is Task 13's decision.**

**Error surface:**

The orchestrator's `OrchestratorResult.failure` (line 120) is a `ScriptGenerationFailureResolutionDto` — structured and authoritative. The renderer currently maps failures using `resolveScriptFailureNotice()` (local ad-hoc mapping at `useScriptStageActions.ts:70-110`). Task 13 may need to map orchestrator failure to `AuthorityFailureDto.noticeKey`, but T11 should NOT implement this — T11 just wires the orchestrator so its results flow back through the existing IPC return value.

---

### Task 11 Entry Points (Exact Lines to Modify)

**`src/main/ipc/workflow/script-generation-runtime-handlers.ts`**

| Line   | Change                                                                                                                                                         |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 1-32   | Add imports: `ScriptOrchestrator`, orchestrator interfaces, dependency functions                                                                               |
| ~34    | Add module-level orchestrator singleton: `let \_orchestrator: ScriptOrchestrator                                                                               | null = null` |
| 37-151 | Refactor `workflow:start-script-generation` handler: build `ScriptGenerationCommand`, call `orchestrator.execute()` instead of `runScriptGenerationInWorker()` |

**Orchestrator construction inside `registerScriptGenerationRuntimeHandlers`:**

The orchestrator instance created once with all dependencies wired. The orchestrator's `onProgress` callback forwards progress events to `updateRuntimeTask`.

---

### Start vs Stop/Pause/Continue — Key Distinction

**START/RESUME/REWRITE (Task 11):**

- Goes through `orchestrator.execute(command)` — async, returns `OrchestratorResult`
- RESUME and REWRITE are just mode flags (`'continue'` and `'rewrite'`) in `ScriptGenerationCommand.mode`
- Same execute path, same handler

**STOP (Task 12):**

- Goes through `orchestrator.stop()` — async, returns `void`
- Terminates running `execute()` via `AbortController`
- Handler returns `StopScriptGenerationResultDto`

**PAUSE/CONTINUE (Task 12):**

- Go through `orchestrator.pause()` / `orchestrator.resume()`
- No IPC handlers exist today
- No preload APIs exist today
- No renderer buttons exist today
- Task 12 must create all three layers

---

### Summary: What T11 Does vs What T12/T13 Do

| Concern               | Task 11                                                             | Task 12                          | Task 13                                      |
| --------------------- | ------------------------------------------------------------------- | -------------------------------- | -------------------------------------------- |
| START path            | Wire through orchestrator.execute()                                 | —                                | —                                            |
| RESUME path           | Wire through orchestrator.execute() (mode='continue')               | —                                | —                                            |
| REWRITE path          | Wire through orchestrator.execute() (mode='rewrite')                | —                                | —                                            |
| STOP path             | —                                                                   | Wire through orchestrator.stop() | —                                            |
| PAUSE path            | —                                                                   | Create IPC + preload + renderer  | —                                            |
| CONTINUE path         | —                                                                   | Create IPC + preload + renderer  | —                                            |
| Persistence           | Orchestrator.\_persistState wired (calls atomicSaveGenerationState) | —                                | Resolve double-persist conflict              |
| Error surface         | OrchestratorResult.failure returned through IPC                     | —                                | Map failure to AuthorityFailureDto.noticeKey |
| Orchestrator instance | Created once, stored as singleton                                   | Uses singleton from T11          | —                                            |

---

## 2026-03-23 T11: ScriptOrchestrator Live Path Wiring — IMPLEMENTATION COMPLETE

### What Was Changed

**File modified:** `src/main/ipc/workflow/script-generation-runtime-handlers.ts`

**Key changes:**

1. **Removed direct worker bypass** — Handler no longer calls `runScriptGenerationInWorker()` directly
2. **Orchestrator now instantiated** — `createScriptOrchestrator()` factory creates `ScriptOrchestrator` with all dependencies
3. **START/RESUME/REWRITE now flow through orchestrator.execute()** — Command mapped: `fresh_start → restart`, `resume → continue`, `rewrite → rewrite`
4. **Dependencies wired into orchestrator:**
   - `resolveRuntimeProfile` → `resolveScriptRuntimeProfile`
   - `resolveResumeFromBoard` → `resolveResumeFromBoard`
   - `persistState` → progress callback
   - `getProject` → `getProject`
   - `buildExecutionPlan` → `buildScriptGenerationExecutionPlan`
   - `createInitialBoard` → `createInitialProgressBoard`
   - `runScriptGenerationBatch` → `runScriptGenerationBatch`
   - `repairGeneratedScenes` → `repairGeneratedScenes`
   - `atomicSaveGenerationState` → `atomicSaveGenerationState`
   - `runtimeConfig` → passed through

5. **Removed unused imports:**
   - `registerScriptGenerationWorker` — no longer needed (orchestrator handles internally)
   - `runScriptGenerationInWorker` — bypass removed

### Implementation Pattern

```typescript
function createScriptOrchestrator(
  runtimeConfig: RuntimeProviderConfig,
  onProgress?: (payload: {
    phase: string
    detail: string
    board: ScriptGenerationProgressBoardDto
  }) => void
): ScriptOrchestrator {
  const options: ScriptOrchestratorOptions = {
    resolveRuntimeProfile:
      resolveScriptRuntimeProfile as ScriptOrchestratorOptions['resolveRuntimeProfile']
    // ... all other dependencies
  }
  return new ScriptOrchestrator(options)
}
```

Handler calls `orchestrator.execute()` with `ScriptGenerationCommand`:

- `projectId` — from input
- `planId` — empty (not used in current implementation)
- `mode` — mapped from `input.plan.mode` via `mapModeToCommand()`
- `batchSize` — from `input.plan.runtimeProfile.recommendedBatchSize`
- `stopSignal` — null (stop/pause/continue deferred to T12)

### Type Bridging Required

Some implementation types don't perfectly match orchestrator interfaces. Type assertions were used:

- `resolveScriptRuntimeProfile` has `detailedOutlineBlocks` required, interface has it optional
- `repairGeneratedScenes` returns `ScreenplayQualityBatchReport` with `sceneNo: number | null`, interface expects `number`

### Postflight Computation

`finalizeScriptPostflight()` called after orchestrator completes to compute ledger/postflight (not persisted — orchestrator handles persistence via `atomicSaveGenerationState`).

### Verification

- `npm run typecheck` → passes
- `npm run build` → succeeds

### Scope Boundaries Respected

- STOP handler unchanged (belongs to Task 12)
- PAUSE/CONTINUE not implemented (belongs to Task 12)
- Persistence/failure surface not unified (belongs to Task 13)

---

## 2026-03-23 T12: STOP/PAUSE/CONTINUE via Orchestrator Control Plane — IMPLEMENTATION COMPLETE

### What Was Changed

**File modified:** `src/main/ipc/workflow/script-generation-runtime-handlers.ts`

**Key changes:**

1. **Added orchestrator registry** — `activeOrchestrators: Map<string, ScriptOrchestrator>` to store active orchestrator instances by projectId, enabling control operations to access the same orchestrator instance created by START handler.

2. **Modified START handler** — Added `activeOrchestrators.set(projectId, orchestrator)` after orchestrator creation to store for later control operations. Added `activeOrchestrators.delete(projectId)` in finally block for cleanup.

3. **Rewrote STOP handler** — Now routes through `orchestrator.stop()` instead of direct `stopScriptGenerationRun()` call:
   - First attempts `orchestrator.stop()` if orchestrator exists in registry
   - Falls back to legacy `stopScriptGenerationRun()` if no orchestrator found (e.g., generation already ended)
   - Calls `finalizeRuntimeTask()` to update task status to 'stopped'

4. **Added PAUSE handler** — `workflow:pause-script-generation`:
   - Retrieves orchestrator from registry
   - Calls `orchestrator.pause()`
   - Returns `{ ok: boolean; error?: string }`

5. **Added CONTINUE handler** — `workflow:resume-script-generation`:
   - Retrieves orchestrator from registry
   - Calls `orchestrator.resume()`
   - Returns `{ ok: boolean; error?: string }`

### Control Plane Architecture

```
STOP → orchestrator.stop() → _abortController.abort() → batch execution interrupted
PAUSE → orchestrator.pause() → _isPaused = true → _emitProgress('executing', 'Generation paused by user')
CONTINUE → orchestrator.resume() → _isPaused = false → _emitProgress('executing', 'Generation resumed by user')
```

### Key Design Decisions

1. **Orchestrator registry by projectId** — Allows STOP/PAUSE/CONTINUE to access the same orchestrator instance from START handler
2. **Graceful fallback for STOP** — If orchestrator not found (already completed), falls back to legacy `stopScriptGenerationRun()` for worker cleanup
3. **Error handling for PAUSE/CONTINUE** — Returns explicit error message if orchestrator not found or operation not valid (e.g., pause when not executing)
4. **Orchestrator lifecycle** — Stored before execution starts, cleaned up in finally block after execution ends

### Verification

- `npm run typecheck` → passes

### Scope Boundaries Respected

- Task 11 start/resume/rewrite wiring unchanged
- Task 13 persistence/failure surface not touched
- Plan document unchanged
