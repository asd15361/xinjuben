# Creative Foundation Hardening — Issues

## Final Verification Wave F2 — 2026-03-23

- REJECT: `tools/e2e/contract_guard_check.mjs` fails. Current output reports `src/shared/contracts/workflow.ts` `CharacterDraftDto` has an extra field `conflictTrigger`, and the required guard helper `hasUsableCharacterDraft` cannot be found anywhere in `src/`.
- REJECT: four-layer verification is not actually complete. `package.json` defines `verify:quality` as a hard-coded `not_ready` JSON stub, and `tools/e2e/foundation-verdicts.mjs` also hard-codes the quality layer to `status: 'not_ready'` instead of a real gate.
- REJECT: visible-result vs formal-release separation is still largely contract-only. `src/shared/contracts/visible-release-state.ts` defines the model, but current code search only found consumption in `src/renderer/src/app/hooks/useScriptGenerationRuntime.ts`; no corresponding main-side producer/persistence wiring was found in reviewed implementation.

## Visible Gate Navigation Task — 2026-03-23

- Updated `tools/e2e/electron_p0_real_regression.mjs` to use the current `剧本` stage label and current script-page marker text.
- `npm run verify:visible` no longer fails on missing `剧本草稿`; it now gets past the stale label mismatch but still stops earlier with a 30s `page.waitForFunction` timeout while waiting for the script-stage body marker to appear, so the remaining failure is a downstream visible/runtime issue rather than the old stage-entry label mismatch.

## Quality Gate Baseline After Formalization — 2026-03-23

- New official quality gate is wired and reporting correctly, but the current baseline is red: `typecheck`, `authority:check`, and screenplay-domain quality tests all fail on the repository's present trusted base.
- This task intentionally did not fix those underlying failures; it only formalized truthful quality reporting so the layer is no longer masked by `not_ready`.

## Final Verification Wave F2 Rerun — 2026-03-23

- Formal and quality prior blockers are cleared in current state: `npm run verify:formal`, `npm run verify:quality`, and `npm run build` all pass.
- REJECT: the `visibleResult` / `formalRelease` layer still is not a real MAIN-produced, persisted truth despite `src/shared/contracts/visible-release-state.ts` and `src/shared/domain/workflow/truth-owner-matrix.ts` declaring it as such. `src/shared/contracts/project.ts` and `src/shared/contracts/workspace.ts` have no persisted fields or save DTOs for those states; `src/main/infrastructure/storage/project-store.ts` has no save path for them; `src/renderer/src/app/hooks/useScriptGenerationRuntime.ts` fabricates `generationResult` client-side from `scriptFailureResolution` / `generationStatus`.
- REJECT: renderer-side derivation currently overclaims formal release. In `useScriptGenerationRuntime()`, the `nextBoard.batchContext.status === 'completed'` branch creates `createFormalReleasedState('Generation passed formal gates')` with `createVisibleSuccessState([], ...)`, even though no independent formal gate result or persisted visible payload is read.

## Final Verification Wave F4 Rerun — 2026-03-23

- T15/T16 are no longer rejectable on the old `not_ready` basis: `verify:formal` now passes, `verify:quality` now passes with a real machine-readable non-E2E gate, and `verify:foundation` reports the four layers independently with official runner taxonomy + evidence routing.
- Remaining material scope gap is elsewhere: T12 still stops at first-consumer derivation in `useScriptGenerationRuntime.ts` instead of main-produced/persisted `visibleResult` / `formalRelease`, so the dual-state mechanism is not yet fully "真正进入 `src/main/ipc/`、`src/main/application/`、`src/renderer/` 边界` as the plan requires.
- Another material partial remains in T14: current code formalizes 10/10/5 and adds load-bearing annotations, but the batch builder still does not implement true grouped/layered governance; source comments explicitly mark grouped/layered upgrade as deferred later slices.

## T12 Remaining Constraint After Persistence Fix — 2026-03-23

- Current repo still has no independent formal gate engine beyond existing runtime signals, so persisted `formalRelease` is now authoritative but intentionally defaults to blocked unless some future main-side gate explicitly approves release. This is narrow-by-design for T12 and avoids sneaking T14 governance into the fix.

## Final Verification Wave F2 Final Rerun — 2026-03-23

- REJECT: `visibleResult` / `formalRelease` are now persisted and consumed correctly, but MAIN is still not the sole producer in actual write paths. `src/renderer/src/features/script/ui/useScriptStageActions.ts` calls `resolvePersistedGenerationTruth()` in rewrite/failure/success flows and sends the derived states through `window.api.workspace.saveScriptRuntimeState()` / `atomicSaveGenerationState()`, while `src/main/ipc/workspace-project-handlers.ts` and `src/main/infrastructure/storage/project-store.ts` persist those renderer-supplied values without re-deriving or enforcing producer ownership.
- Minor: `src/shared/domain/workflow/persisted-generation-truth.ts` currently collapses all persisted script-success cases to `UNKNOWN_BLOCKED`; truthful but coarse. This is acceptable for now, but future formal gate work should replace the placeholder blocked reason with independent gate-specific provenance.

## Final Verification Wave F4 Final Rerun — 2026-03-23

- APPROVE on scope fidelity: the two prior material blockers are now closed in code, not just in notes. T12 persists `visibleResult` / `formalRelease` on `ProjectSnapshotDto`, save DTOs, and main storage paths, and renderer now reads those persisted states instead of fabricating release from board status.
- APPROVE on T14 closure: `buildScriptBatchContexts()` now emits formal `governance.grouped / governance.layered / governance.batched`, and targeted tests assert that batch governance is present with group/layer/batch structure rather than only linear 5-episode slicing.
- `verify:formal`, `verify:quality`, `verify:foundation`, and `npm run build` all pass in the current rerun. `verify:foundation` still reports visible fail, but classification is `environment_failure`, and user explicitly halted E2E work, so that does not constitute a remaining foundation-scope blocker for this F4 judgment.
- Remaining narrowness is acceptable rather than rejectable over-delivery/under-delivery: persisted `formalRelease` currently defaults blocked unless independently approved, which stays consistent with the plan's requirement that visible result and formal release remain separate instead of being auto-promoted.

## Final Verification Wave F2 Post-Leak Final Review — 2026-03-23

- APPROVE: prior F2 blocker is closed in current code. `src/renderer/src/features/script/ui/useScriptStageActions.ts` no longer sends renderer-derived `visibleResult` / `formalRelease`; save payloads are limited to runtime inputs (`scriptProgressBoard`, `scriptFailureResolution`, `scriptStateLedger`, `scriptRuntimeFailureHistory`).
- APPROVE: MAIN now re-derives dual-state truth on save paths in `src/main/infrastructure/storage/project-store.ts` (`saveScriptRuntimeState()` and `atomicSaveGenerationState()`) via `resolveRuntimePersistenceTruth()` / `resolvePersistedGenerationTruth()` instead of trusting renderer-supplied truth fields.
- APPROVE: renderer consumption boundary is now consumer-only. `src/renderer/src/app/hooks/useScriptGenerationRuntime.ts` reads persisted `snapshot.visibleResult` / `snapshot.formalRelease` through `buildPersistedGenerationResult()` and no longer fabricates release from board status.
- Minor only: `src/shared/domain/workflow/persisted-generation-truth.ts` still uses coarse default blocked reasons like `UNKNOWN_BLOCKED` for non-approved success states. This is truthful and non-blocking for F2, but future formal-gate work should replace it with gate-specific provenance.
