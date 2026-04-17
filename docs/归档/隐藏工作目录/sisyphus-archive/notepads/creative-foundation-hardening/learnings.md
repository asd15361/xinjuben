# Creative Foundation Hardening — Learnings

## Task 1: Truth Owner Matrix (2026-03-23)

### Key Insights

**visibleResult and formalRelease are dual-state mechanism**

- From plan T12: "失败结果可见但正式联动受阻的双轨机制"
- visibleResult = displayable result (visible even when gate blocked)
- formalRelease = official gate (NOT granted automatically when visible result exists)
- This separates "user can see result" from "result is officially released"

**failureHistory is a QUEUE, not scalar**

- Code in generation-state.ts shows failureHistory is accumulated
- On success: cleared atomically
- On failure: appended to history
- Must persist recent N failures, not just latest

**ledger is computed derived state**

- ledger (ScriptStateLedgerDto) is NOT just stored state
- Built by main's ledger-building logic in ledger-semantic-hash.ts, ledger-postflight.ts etc.
- Contains: character states, fact confirmations, momentum, openHooks, knowledge boundaries
- Both RENDERER (display) and MAIN (downstream) consume it

**All 10 domains now in one place**

- stage, blockedReason, resumeEligibility, generationStatus, scriptRuntimeState, facts, failureHistory, ledger, visibleResult, formalRelease
- Single source of truth for "who owns what"
- Used by T2 (enforcement hooks) and T3 (renderer writer purge)

### Patterns Observed

**Single-writer enforcement in existing code**

- truth-authority.ts already had isProducer(), mayWrite(), enforceWriteAuthority()
- authority-constitution.ts had ForbiddenFallbackPatterns and AuthorityOwnedFacts
- This matrix complements by providing the DOMAIN INVENTORY that those helpers operate on

**displayOnly field for future use**

- Not currently used but structured for future cases
- Supports patterns where renderer reads for display but must NOT cache as authoritative

### Verification

- TypeScript typecheck passes (npm run typecheck)
- LSP diagnostics on new file: no errors
- Module validates itself on import (throws if matrix invalid)

## Task 2: IPC/Main Truth Enforcement Hooks (2026-03-23)

### Key Insights

**Enforcement at TWO layers required**

- Plan explicitly required BOTH: IPC generation/stage entry AND key main application dispatch paths
- IPC layer alone was rejected as incomplete
- Must add enforcement to `src/main/application/**` dispatch entry functions

**Enforcement points added (7 total)**

IPC layer (3 handlers):

- `src/main/ipc/workflow/script-generation-runtime-handlers.ts` — start-script-generation, build-ledger-preview
- `src/main/ipc/workspace-generation-handlers.ts` — create-outline-seed, generate-outline-characters, generate-detailed-outline
- `src/main/ipc/workflow/formal-fact-handlers.ts` — declare-formal-fact, confirm-formal-fact, remove-formal-fact

Application dispatch layer (4 functions):

- `src/main/application/script-generation/start-script-generation.ts` — main generation orchestration entry
- `src/main/application/formal-fact/declare-formal-fact.ts` — formal fact declaration dispatch
- `src/main/application/formal-fact/confirm-formal-fact.ts` — formal fact confirmation dispatch
- `src/main/application/formal-fact/remove-formal-fact.ts` — formal fact removal dispatch

### Enforcement Helper Pattern

- Uses existing `truth-enforcement.ts` with `EnforcementContext` labels
- `assertMainProducer()` checks MAIN is producer for domain being written
- Throws `AuthorityFailureError` on violation
- `[T2 ENFORCEMENT]` comment marker for grep detection

### What Remains for T3/T9

**T3 (renderer second-writer purge):**

- Renderer stores (useWorkflowStore) still have direct setters for truth domains
- Direct setter paths for stage, generationStatus, etc. need to be removed
- NOT in T2 scope — T2 is about main-side enforcement, not renderer cleanup

**T9 (process-boundary guardian):**

- Stage boundary checks (outline → character → detailed outline → script)
- Blocking of downstream reading incomplete upstream
- Different from T2 which focuses on truth domain ownership, T9 focuses on stage progression rules

### Verification

- TypeScript typecheck passes
- ESLINT passes on modified files
- Grep-detectable: `[T2 ENFORCEMENT]` found in 7 files
- Grep-detectable: `enforceScriptGenerationEntry|enforceFormalFactEntry` found in 8 files (definition + 7 usages)

## Task 9: Process-Boundary Guardian — First Slice (2026-03-23)

### Key Insights

**Two types of boundaries protected in this slice:**

1. **Script generation entry path** (`workflow:start-script-generation`)
   - Guardian: `guardianEnforceScriptEntry()`
   - Throws `AuthorityFailureError` if upstream detailed_outline is not ready
   - Uses existing `validateStageInputContract('script', payload)` for upstream completeness check

2. **Persistence save paths** (outline, character, detailed outline)
   - `saveOutlineDraft` → `guardianEnforceOutlineSave()`
   - `saveCharacterDrafts` → `guardianEnforceCharacterSave()`
   - `saveDetailedOutlineSegments` → `guardianEnforceDetailedOutlineSave()`
   - All throw `AuthorityFailureError` if saving would create invalid upstream state

**Guardian semantics vs truth enforcement:**

- T2 (`truth-enforcement.ts`): Checks WHO can write to truth domains (ownership)
- T9 (`stage-guardians.ts`): Checks IF data is valid before allowing stage progression (completeness)

**New file created:**

- `src/shared/domain/workflow/stage-guardians.ts`
  - `guardianEnforceScriptEntry()` — script generation entry guardian
  - `guardianEnforceOutlineSave()` — outline persistence guardian
  - `guardianEnforceCharacterSave()` — character persistence guardian
  - `guardianEnforceDetailedOutlineSave()` — detailed outline persistence guardian
  - All throw `AuthorityFailureError` with `INCOMPLETE_RESULT` type on violation

**Files modified:**

- `src/main/ipc/workflow/script-generation-runtime-handlers.ts`
  - Added `guardianEnforceScriptEntry()` call at `workflow:start-script-generation` entry
  - `[T9 GUARDIAN]` comment marker for grep detection

- `src/main/infrastructure/storage/project-store.ts`
  - Added `guardianEnforceOutlineSave()` to `saveOutlineDraft()`
  - Added `guardianEnforceCharacterSave()` to `saveCharacterDrafts()`
  - Added `guardianEnforceDetailedOutlineSave()` to `saveDetailedOutlineSegments()`
  - All `[T9 GUARDIAN]` comment markers for grep detection

### What Remains for T9 Expansion

**Not in this first slice (deferred to later T9 work):**

- Guardian for `saveOutlineAndCharacters()` combined save path
- Guardian for workspace generation handlers (outline/character generation entry)
- Guardian for formal fact persistence paths
- Full invalidation policy (T10) — upstream changes → downstream state invalidation
- UI display enforcement (T11) — page-only display, not second writer/judge/publisher

**Verification:**

- TypeScript typecheck passes (npm run typecheck)
- LSP diagnostics on all modified files: no errors
- Grep-detectable: `[T9 GUARDIAN]` found in 3 files
- Grep-detectable: `guardianEnforceScriptEntry|guardianEnforceOutlineSave|guardianEnforceCharacterSave|guardianEnforceDetailedOutlineSave` found in 4 files

## Formal Guard Alignment: Character Contract Truth (2026-03-23)

- Stale assumption corrected: `contract_guard_check.mjs` still enforced a 10-field `CharacterDraftDto` and looked for removed `hasUsableCharacterDraft`, but the current official path is `parseCharacterBundleText()` → `generateOutlineAndCharactersFromChat()` normalization.
- Current formal truth now includes `masterEntityId?`, `conflictTrigger`, `roleLayer?`, and `activeBlockNos?`, and the guard now verifies that canonical parser/normalizer path instead of rejecting those fields by history inertia.

## Visible Gate Navigation Alignment (2026-03-23)

- Current official script-stage label is `剧本`, not `剧本草稿`; the visible runner had drifted behind the UI copy.
- The script page truth marker is now `这一页只做一件事：把详细大纲真正写成剧本。`, so visible verification should key off that current marker instead of the older `剧本草稿` wording.

## Visible Runner RegExp Serialization Bug Fix (2026-03-23)

- **Bug**: `pattern.test is not a function` when passing RegExp through Playwright's `filter({ hasText: regex })`
- **Cause**: RegExp objects don't serialize properly when passed from Node.js to browser context in Playwright; the RegExp becomes a string representation like `/剧本/` which doesn't have `.test()` method
- **Fix**: Changed `filter({ hasText: SCRIPT_STAGE_TAB_PATTERN })` to `filter({ hasText: '剧本' })` using string literal directly
- **Also fixed**: Removed unused `SCRIPT_STAGE_TAB_PATTERN` and `SCRIPT_STAGE_LABEL` constants
- **Result**: Stage navigation now works (get past script content verification) but start button visibility is a separate downstream issue

## Quality Gate Formalization (2026-03-23)

- `verify:quality` is now a real non-E2E gate backed by `tools/e2e/quality-gate.mjs` instead of a hard-coded `not_ready` stub.
- Current trusted base for the quality layer is structural only: `typecheck`, `authority:check`, and screenplay-domain quality tests; this keeps quality independent from probe/visible/formal.
- The quality verdict is intentionally truthful: it currently returns `fail` because existing repo checks already fail, but it now emits machine-readable JSON with per-check status and excerpts.
- `foundation-verdicts.mjs` now consumes the real quality verdict, so foundation output preserves the four-layer invariant without faking readiness.

## Screenplay Domain Quality Gate Fixes (2026-03-23)

- Node `--test` ESM execution required explicit `.ts` extensions on the screenplay quality / repair-guard local import chain; extensionless local specifiers were the direct cause of the remaining quality-test module resolution failures.
- The fresh runtime parser sample in `.codex/script-parse-failure-scene-1.txt` now truthfully asserts the sample's actual parsed roster (`黎明 / 小柔 / 小柔父 / 李科 / 李科手下甲 / 乙 / 围观人群` and `黎明 / 小柔 / 小柔父 / 李科手下丙`) instead of the stale older-character expectation.

## Quality Gate Windows npm Spawn Fix (2026-03-23)

- **Bug**: `spawnSync('npm.cmd', ['run', 'typecheck'], { shell: false })` returned `EINVAL` on Windows because `spawnSync` with `shell: false` cannot execute `.cmd` files directly — Windows requires `cmd.exe` to handle `.cmd` scripts.
- **Symptom**: `verify:quality` incorrectly reported `typecheck` and `authority` as fail even though both pass when run normally.
- **Fix**: On Windows, route through `cmd.exe /c npm.cmd run <script>` instead of trying to exec `npm.cmd` directly with `shell: false`.

## T12 Producer Boundary Closure — Renderer Save Payload Purge (2026-03-23)

- `useScriptStageActions.ts` no longer computes `visibleResult` / `formalRelease` or calls `resolvePersistedGenerationTruth()` in rewrite, success, or failure save paths.
- `SaveScriptRuntimeStateInputDto` and `AtomicSaveGenerationStateInputDto` now only carry authoritative runtime inputs from renderer (`scriptProgressBoard`, `scriptFailureResolution`, `scriptStateLedger`, `scriptRuntimeFailureHistory`).
- `project-store.ts` now re-derives persisted dual-state truth inside MAIN from existing stored `scriptDraft` plus incoming runtime inputs, preserving the invariant that visible result existence does not auto-release the formal gate.

## T12 Persisted Dual-State Truth Alignment (2026-03-23)

- `visibleResult` / `formalRelease` are now carried on `ProjectSnapshotDto` and runtime save DTOs, so the declared MAIN→PERSISTER ownership is no longer contract-only.
- The minimal truthful producer for current repo state is `resolvePersistedGenerationTruth()`: failure => visible failed + blocked gate, in-flight => pending + blocked gate, persisted script draft => visible + still blocked gate by default, empty => none + blocked gate.
- The key invariant is now enforced in consumption too: renderer reads stored `snapshot.visibleResult` / `snapshot.formalRelease` through `buildPersistedGenerationResult()` and no longer auto-promotes `board.batchContext.status === 'completed'` to `released`.
- **Changed**: `tools/e2e/quality-gate.mjs` — `runNpmScript()` now uses `cmd.exe /c npm.cmd` on win32, preserving `shell: false` for robustness.
- **Result**: `npm run verify:quality` now correctly shows all three checks (typecheck, authority, screenplay-quality-tests) as `pass`.

## T14 Grouped/Layered/Batched Governance Formalization (2026-03-23)

- `buildScriptBatchContexts()` no longer stops at linear 5-episode slicing plus loose annotations; each batch now emits a formal `governance` object with three explicit tiers: `grouped`, `layered`, and `batched`.
- The new governance model consumes existing truth only: outline blocks provide the planning-block anchor for `batched`, load-bearing role/entity/thread analysis feeds `grouped`, and current character/entity/thread importance is normalized into `layered` instead of inventing a second planning truth.
- Large projects can now express different batch governance across planning blocks because the governance output carries planning block linkage plus batch-specific active-role grouping, so later batches can differ structurally from earlier ones even when the script batch size remains 5.
- While implementing targeted T14 tests, Node ESM execution surfaced a real missing `.ts` import on `planning-blocks.ts` for `load-bearing-annotations`; fixing that import keeps the targeted workflow tests executable under the repo's current node test path.
