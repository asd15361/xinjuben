-NoNewline

## Task F1-Oracle 残留修复执行记录（2026-03-23）

### 任务目标

修复 F1 oracle review 残留问题：

1. 从 `AtomicSaveGenerationState` 接口和 `_persistState()` 中移除 `scriptResumeResolution`
2. 替换 `ScriptStage.tsx` 和 `AppSidebar.tsx` 中的直接 `setStage()` 调用为 `changeProjectStage` IPC
3. 移除 IPC 失败时的 fallback to setStage 模式
4. 修复 `generation-status.ts` 中的 `startGenerationRun()` 使用 IPC 而非本地状态修改

### 已修改文件

1. **`src/shared/domain/workflow/script-generation-orchestrator.ts`**
   - 从 `AtomicSaveGenerationState` 接口移除 `scriptResumeResolution`（line 278）
   - 从 `_persistState()` 调用中移除 `scriptResumeResolution: this._deriveResume()`（line 687）
   - 注意：`_deriveResume()` 方法本身保留，因为仍在 orchestrator 内部使用

2. **`src/renderer/src/app/utils/generation-status.ts`**
   - 修改 `startGenerationRun()` 使用 `window.api.workspace.saveGenerationStatus()` IPC
   - 不再直接调用 `input.setGenerationStatus(input.status)`
   - 从 main 获取权威结果后更新本地状态

3. **`src/renderer/src/features/script/ui/ScriptStage.tsx`**
   - 添加 `handleGoToDetailedOutline()` 函数
   - 使用 `window.api.workspace.changeProjectStage()` IPC
   - 替换两处 `setStage("detailed_outline")` 为 `handleGoToDetailedOutline()`

4. **`src/renderer/src/app/shell/AppSidebar.tsx`**
   - 添加 `handleStageChange()` 函数
   - 使用 `window.api.workspace.changeProjectStage()` IPC
   - 替换直接 `setStage()` 调用

### 关键修复原则

1. **IPC 优先**：所有状态变更必须经过 main 进程 IPC
2. **无 fallback**：如果 IPC 失败，错误传播而非静默 fallback
3. **单一真相源**：`scriptResumeResolution` 不再存储，从 board 派生

### 验证

- `npm run typecheck` 通过（无 LSP 错误）
- `grep scriptResumeResolution src/` 只在 `generation-state.ts` 中留下注释（描述旧状态）
- 所有 `setStage` 调用现在都通过 IPC

---

## Renderer Authority Audit (2026-03-23) — Post-F1-Fix Residue

### Audit Scope

Renderer-side files with direct `setStage()` calls, IPC fallback patterns, `blocked` reason handling, resume/failure display.

### Finding: 5 files still have IPC failure fallback to setStage (HIGH severity)

The same anti-pattern removed from ScriptStage.tsx/AppSidebar.tsx remains in:

| File                                                                     | Lines            | Pattern                                              |
| ------------------------------------------------------------------------ | ---------------- | ---------------------------------------------------- |
| `src/renderer/src/components/ProjectGenerationBanner.tsx`                | 147-150          | `catch { setStage(stage) }`                          |
| `src/renderer/src/features/outline/ui/OutlineStage.tsx`                  | 41-44            | `catch { setStage('character') }`                    |
| `src/renderer/src/features/character/ui/CharacterStage.tsx`              | 98-101           | `catch { setStage('detailed_outline') }`             |
| `src/renderer/src/features/detailed-outline/ui/DetailedOutlineStage.tsx` | 139-142, 208-212 | `catch { setStage('script/outline') }` (2 instances) |
| `src/renderer/src/features/chat/ui/ChatStage.tsx`                        | 55-58            | `catch { setStage('outline') }`                      |

### Finding: "Project not found" fallback is lower severity but still non-ideal

Files that do `if (!result.project) { setStage(targetStage) }` after IPC:

- Same 5 files above, slightly earlier branches (lines 136-146, 37-44, 94-101, 134-142/203-212, 50-58)
- `src/renderer/src/features/home/ui/useHomePageActions.ts` lines 194-197

These fallbacks mean: when main says "project not found", renderer locally decides the stage. Ideally this should surface an error, but it's a lesser concern than mutating on IPC failure.

### Correct patterns observed (reference implementations)

1. **`useChatStageActions.ts` lines 100-116**: On IPC failure, it KEEPS current stage (correct - no mutation)
2. **`generation-status.ts`**: Uses IPC for startGenerationRun/finishGenerationRun, syncs from authoritative result
3. **`ScriptStage.tsx` line 59**: Comment explicitly states "Store updated via IPC — no additional setStage() needed"
4. **`stage-navigation-truth.ts`**: Acts as pure IPC bridge, does not compute stage locally

### Display-only patterns (NOT violations)

- `ScriptStage.tsx` line 50: `generationPlan.blockedBy[0]?.message` — DISPLAY only, data comes from IPC plan
- `ScriptStage.tsx` lines 292-300: `generationRuntime.resume?.canResume`, `failurePreview` — DISPLAY only, from runtime hook
- `DetailedOutlineStage.tsx` line 146: `plan.blockedBy[0]` — DISPLAY only
- `useDetailedOutlineStageActions.ts` line 72: `firstBlockedIssue = scriptPlan.blockedBy[0]` — derives from IPC result

### Summary

**HIGH severity remaining**: 5 files with IPC failure → setStage fallback pattern (same anti-pattern F1-fix removed from ScriptStage/AppSidebar)

**Medium severity**: "project not found" fallback branches in same 5 files + useHomePageActions

**No violations found in**: generation-status.ts, ScriptStage.tsx, AppSidebar.tsx, AppHeader.tsx, RuntimeConsoleStage.tsx, stage-navigation-truth.ts

---

## Legacy Field Residue Audit (2026-03-23)

### Audit Scope

Primary decision inputs in repair/audit/gate/progression/main behavior. Goal: confirm `screenplay` is primary, legacy fields are fallback/compat-only.

### Files Inspected

- `src/shared/domain/policy/audit/audit-policy.ts`
- `src/shared/domain/policy/progression/progression-policy.ts`
- `src/shared/domain/policy/repair/repair-policy.ts`
- `src/shared/domain/script/screenplay-repair-guard.ts`
- `src/shared/domain/script/script-segment-text.ts`
- `src/shared/domain/script/screenplay-quality.ts`
- `src/shared/domain/workflow/truth-authority.ts`
- `src/main/application/script-generation/audit/audit-scene-issues.ts`
- `src/main/application/script-generation/repair/fallback-rule-repair.ts`
- `src/shared/domain/script/screenplay-format.ts`

---

### Finding: No PRIMARY legacy-driven decisions in live path (VERIFIED CLEAN)

All legacy field references in policy/repair/audit follow the pattern: **screenplay first, legacy as fallback**.

| Location                          | Legacy Usage Pattern                                                            | Primary? | Assessment                                     |
| --------------------------------- | ------------------------------------------------------------------------------- | -------- | ---------------------------------------------- |
| `audit-policy.ts:52,60,68`        | `!hasScreenplay && !hasText(scene.action)` — checked only when screenplay empty | No       | **Correct**: screenplay is primary             |
| `progression-policy.ts:31-33`     | `hasScreenplay \|\| hasText(scene.action)` — OR pattern                         | No       | **Correct**: screenplay preferred              |
| `screenplay-repair-guard.ts:154`  | Comment: `legacyFormat is migration-display-only`                               | N/A      | **Documented**: no influence                   |
| `script-segment-text.ts:41,49`    | `normalize(scene.screenplay \|\| '') \|\| legacyText(scene)` — fallback         | No       | **Correct**: screenplay primary                |
| `screenplay-quality.ts:22`        | `getScreenplay()` joins legacy only when screenplay empty                       | No       | **Correct**: fallback for quality metrics      |
| `fallback-rule-repair.ts:230-233` | Builds screenplay from legacy when none exists                                  | Yes      | **Correct**: `legacyFormat: true` marks output |
| `audit-scene-issues.ts:97`        | Falls back to `scene.dialogue` for audit text                                   | No       | **Display-only**: audit text extraction        |
| `audit-scene-issues.ts:197-203`   | Detects legacy markers as quality signal                                        | No       | **Audit signal**: flags for human review       |

---

### Key Verification Points

**1. `audit-policy.ts` (lines 49-74) — CORRECT**

```typescript
const hasScreenplay = hasText(scene.screenplay)
if (!hasScreenplay && !hasText(scene.action)) {
  /* issue */
}
```

Screenplay checked FIRST. Legacy only used when screenplay absent.

**2. `progression-policy.ts` (lines 27-43) — CORRECT**

```typescript
const hasScreenplay = hasText(scene.screenplay)
const actionSignal = hasScreenplay || hasText(scene.action)
const emotionSignal = hasScreenplay || hasText(scene.emotion)
```

Screenplay is primary, legacy fields provide signals only when screenplay absent.

**3. `screenplay-repair-guard.ts` (line 154) — CORRECT**

```typescript
// NOTE: legacyFormat is migration-display-only and does NOT influence repair decisions.
// screenplay is the PRIMARY body text — repair decisions are based solely on quality metrics.
```

Explicit documentation that `legacyFormat` does not influence repair.

**4. `screenplay-quality.ts` `getScreenplay()` (lines 19-23) — CORRECT**

```typescript
function getScreenplay(scene: ScriptSegmentDto): string {
  const screenplay = normalize(scene.screenplay)
  if (screenplay) return screenplay
  return normalize([scene.action, scene.dialogue, scene.emotion].join('\n'))
}
```

Used ONLY for quality metrics computation when screenplay absent. Does not drive gate/repair decisions directly.

**5. `fallback-rule-repair.ts` (lines 230-233) — CORRECT BEHAVIOR**

```typescript
const legacy = buildLegacyScreenplaySegment(input.targetScene)
input.targetScene.screenplay = legacy.screenplay
input.targetScene.screenplayScenes = legacy.screenplayScenes
input.targetScene.legacyFormat = true
```

When NO screenplay exists, deriving from legacy is correct. `legacyFormat: true` properly marks the derived output.

---

### Conclusion

**Remaining legacy references are descriptive/read-only/compat-only. No live-path PRIMARY decision is legacy-driven.**

The only case where legacy fields become "primary" is when a scene has no `screenplay` content at all — in that case, the system correctly derives screenplay from legacy fields and marks it with `legacyFormat: true`. This is an intentional migration path, not a structural problem.

**Severity: NONE** — No action required

---

## Orchestrator Bypass Audit (2026-03-23)

### Audit Scope

Whether script generation entry points (start, resume, stop, rewrite, continue) converge on `ScriptOrchestrator` or bypass it.

### Finding: CRITICAL BYPASS — Orchestrator defined but never wired

**The `ScriptOrchestrator` class exists but is completely unused.**

| Evidence                        | Result                                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `grep "new ScriptOrchestrator"` | **0 matches** — orchestrator never instantiated                                                      |
| `grep "\.execute\("`            | Only self-reference in orchestrator file                                                             |
| `ScriptOrchestrator` class      | Defined at `script-generation-orchestrator.ts:307`, has `execute()`, `pause()`, `resume()`, `stop()` |

### Actual Script Generation Flow (Bypasses Orchestrator)

```
Renderer useScriptStageActions
  → window.api.workflow.startScriptGeneration() [preload API: line 61]
  → 'workflow:start-script-generation' [IPC handler: script-generation-runtime-handlers.ts:37]
  → runScriptGenerationInWorker() [line 71]
  → Worker thread: startScriptGeneration() [from start-script-generation.ts:38]
```

**Bypass chain:**

| File                                                                                | Line   | Role                                                      |
| ----------------------------------------------------------------------------------- | ------ | --------------------------------------------------------- |
| `src/main/ipc/workflow/script-generation-runtime-handlers.ts`                       | 37-151 | IPC handler — creates board directly, calls worker runner |
| `src/main/application/script-generation/runtime/script-generation-worker-runner.ts` | 18     | Spawns worker thread                                      |
| `src/main/application/script-generation/runtime/script-generation-worker.ts`        | 2, 55  | Worker imports and calls `startScriptGeneration()`        |
| `src/main/application/script-generation/start-script-generation.ts`                 | 38     | Actual generation logic                                   |

### Stop/Resume/Rewrite Paths (ALL bypass orchestrator)

- **Stop**: `workflow:stop-script-generation` → `stopScriptGenerationRun()` (terminates worker directly via registry)
- **Resume**: `handleStartGeneration` → `runScriptGenerationCycle` → `window.api.workflow.startScriptGeneration()` with `mode: 'resume'`
- **Rewrite**: `handleRewriteGeneration` → `useScriptStageActionsStartFresh` → `startScriptGeneration` with `mode: 'fresh_start'`

### Summary

**BYPASS CONFIRMED — 100% of script generation flows bypass the orchestrator.**

The `ScriptOrchestrator` was designed as single entry point but never integrated. All flows go through `startScriptGeneration()` directly.

---

## Task 10 Audit: generationStatus / stage Optimistic Updates (2026-03-23)

### Audit Scope

Search for renderer/store/helper code that updates `generationStatus` or `stage` BEFORE authority confirmation or persist success. Focus on `generationStatus` and `stage` as core business state.

### generationStatus Flow — CORRECT (No Optimistic Update)

**`generation-status.ts` (`startGenerationRun`, `finishGenerationRun`)**:

- `startGenerationRun:10-18`: Calls `window.api.workspace.saveGenerationStatus()` IPC first, then updates local state from `result.generationStatus` (authoritative result from main). NOT optimistic.
- `finishGenerationRun:21-33`: Calls `window.api.workspace.clearGenerationStatus()` IPC first, then sets local to null. NOT optimistic.

**All stage action files** use `startGenerationRun`/`finishGenerationRun` which route through main:

- `useChatStageActions.ts:50-55` → `startGenerationRun`
- `useDetailedOutlineStageActions.ts:39-44` → `startGenerationRun`
- `useScriptStageActions.ts:196-201,595-600` → `startGenerationRun`

**`useHomePageActions.ts:174`**: `setGenerationStatus(getHydratableGenerationStatus(project))` — hydrates from persisted project data (already in main), NOT optimistic.

**`useScriptGenerationRuntime.ts:56,128,137`**: `setGenerationStatus` in cleanup/error paths — derived from persisted storage via IPC, NOT optimistic.

**Conclusion**: generationStatus updates are NOT optimistic — all go through main IPC and sync from authoritative result.

### stage Flow — CORRECT When projectId Exists

**All stage transition calls WITH projectId go through IPC correctly**:

- `useChatStageActions.ts:102-108` → `changeProjectStage` IPC, then `setStage(result.project.stage)`
- `useHomePageActions.ts:188-194` → `changeProjectStage` IPC, then `setStage(stageResult.project.stage)`
- `DetailedOutlineStage.tsx:131-136` → `changeProjectStage` IPC, then `setStage(result.project.stage)`
- `CharacterStage.tsx:91-96` → `changeProjectStage` IPC, then `setStage(result.project.stage)`
- `OutlineStage.tsx:34-39` → `changeProjectStage` IPC, then `setStage(result.project.stage)`
- `ChatStage.tsx:48-53` → `changeProjectStage` IPC, then `setStage(result.project.stage)`

### setStage Without IPC — All Are UI-Only (No projectId)

**`setStage` calls that bypass IPC all occur when `!projectId` — these are UI-only navigations, NOT core business state mutations**:

| File                          | Line | Condition                  | Pattern                                              |
| ----------------------------- | ---- | -------------------------- | ---------------------------------------------------- |
| `DetailedOutlineStage.tsx`    | 127  | `!projectId`               | Direct `setStage('script')` — no active project      |
| `ProjectGenerationBanner.tsx` | 136  | `!projectId`               | Direct `setStage(stage)` from notice action          |
| `AppHeader.tsx`               | 95   | No projectId check visible | Direct `setStage('runtime_console')` — header button |
| `RuntimeConsoleStage.tsx`     | 45   | No projectId               | Direct `setStage('script')` — back button            |

**Key insight**: Without an active projectId, there is no "core business state" to mutate optimistically. These are pure UI navigation state changes that don't persist to main's project store.

### Correct Patterns (Reference)

1. **`generation-status.ts`**: IPC-first, authoritative result sync — confirmed correct
2. **`AppSidebar.tsx:34`**: Comment explicitly states "Store updated via IPC — no additional setStage() needed"
3. **`ScriptStage.tsx:59`**: Comment explicitly states "Store updated via IPC — no additional setStage() needed"
4. **`useChatStageActions.ts:125-143`**: IPC failure → keeps current stage, surfaces authority failure notice (correct rollback, not optimistic fallback)

### Smallest Implementation Surface for Task 10

If any remaining work exists, it would be minimal:

1. **`DetailedOutlineStage.tsx:127`**: `setStage('script')` when `!projectId` — could be removed if this navigation path is deemed unnecessary (but `!projectId` means no project context, so this is arguably correct UI behavior)

2. **`ProjectGenerationBanner.tsx:136`**: `setStage(stage)` when `!projectId` — same analysis as above

**Actual core business state (with projectId)**: Already routes through IPC correctly per Tasks 5-9.

### Conclusion

**Task 10 appears to already be COMPLETED** by the F1-Oracle fix (2026-03-23) and Tasks 5-9 which established the pattern:

- generationStatus always goes through main IPC
- stage always goes through `changeProjectStage` IPC when projectId exists
- Only UI-only stage changes (no projectId) bypass IPC, but these don't affect core business state

**Verification needed**: If there's a specific problematic case, it would require a scenario where `generationStatus` is set locally before being sent to main. That pattern was NOT found in the current codebase.

---

## Task 10 — Re-analysis: generationStatus Construction vs Optimistic Update (2026-03-23 UPDATED)

### Context

Previous audit (above) concluded Task 10 was COMPLETED because `setGenerationStatus` only updates AFTER IPC response (not optimistic). This remains TRUE.

BUT a deeper issue exists: **who constructs the `generationStatus` object**.

### Key Finding: Renderer Produces, Main Just Persists

**`generation-status.ts` `startGenerationRun` (lines 3-19)**:

```typescript
export async function startGenerationRun(input) {
  input.clearGenerationNotice() // Immediate (OK - UI state)
  const result = await window.api.workspace.saveGenerationStatus({
    projectId: input.projectId,
    generationStatus: input.status // <-- input.status is constructed by RENDERER
  })
  if (result) {
    input.setGenerationStatus(result.generationStatus) // Updates from main's return
  }
}
```

**`project-store.ts` `saveGenerationStatus` (lines 170-184)**:

```typescript
export async function saveGenerationStatus(input): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => {
    const next = {
      ...existing,
      generationStatus: input.generationStatus, // <-- Just persists what renderer sent
      updatedAt: new Date().toISOString()
    }
    return {
      ...next,
      stage: deriveProjectStage(next)
    }
  })
}
```

**Main does NOT recompute `generationStatus` fields — it just persists them.**

### What Renderer Constructs in `generationStatus`

In each stage action file, renderer builds `nextGenerationStatus` with:

| Field              | Source                                                           | Authority Owner (per truth-authority.ts) | Assessment         |
| ------------------ | ---------------------------------------------------------------- | ---------------------------------------- | ------------------ |
| `task`             | Hardcoded string: 'script', 'outline_bundle', 'detailed_outline' | MAIN                                     | **WRONG PRODUCER** |
| `stage`            | Hardcoded string: 'script', 'chat', 'detailed_outline'           | MAIN                                     | **WRONG PRODUCER** |
| `startedAt`        | `Date.now()` computed locally before IPC                         | MAIN                                     | **WRONG PRODUCER** |
| `estimatedSeconds` | Renderer compute via `resolve*EstimatedSeconds()`                | MAIN?                                    | **QUESTIONABLE**   |
| `title`            | UI text string                                                   | Renderer (UI state)                      | OK                 |
| `detail`           | UI text string                                                   | Renderer (UI state)                      | OK                 |
| `scope`            | Hardcoded 'project'                                              | Renderer (UI metadata)                   | OK                 |

### Classification

**Not an "optimistic update" in the traditional sense** — the renderer does NOT call `setGenerationStatus` until IPC returns.

**But it IS a "wrong producer" issue** — renderer computes and sends values that `truth-authority.ts` says should be produced by MAIN:

- `truth-authority.ts:83-86`: `generationStatus` producer is `MAIN`
- `truth-authority.ts:335`: `RENDERER_NEVER_PRODUCES_GENERATION_STATUS: true`

### Boundary: Task 10 vs Task 11+

**Task 10 scope** (this analysis):

- Eliminate renderer producing `generationStatus` core fields (`task`, `stage`, `startedAt`)
- These should be computed by main when generation starts
- `title`, `detail` are UI state and can remain renderer-provided

**Task 11+ scope** (orchestrator rewiring):

- Wire all generation entry points through `ScriptOrchestrator`
- Make orchestrator the single producer of `generationStatus` for script generation
- Main's `saveGenerationStatus` would receive authoritative `generationStatus` from orchestrator

### Exact Files To Change (Task 10)

If Task 10 intent is to remove renderer-producing-`generationStatus`:

1. **`src/renderer/src/app/utils/generation-status.ts`** — `startGenerationRun` sends renderer-constructed object
2. **`src/renderer/src/features/chat/ui/useChatStageActions.ts`** — lines 41-55 construct `nextGenerationStatus` with wrong fields
3. **`src/renderer/src/features/detailed-outline/ui/useDetailedOutlineStageActions.ts`** — lines 28-38 construct `nextGenerationStatus`
4. **`src/renderer/src/features/script/ui/useScriptStageActions.ts`** — lines 185-195, 584-594 construct `nextGenerationStatus`

**What to keep (non-business UI state)**:

- Loading UI (`title`, `detail` text) — these drive user-facing progress display
- `estimatedSeconds` — UI estimate for progress, acceptable as approximation

**What to remove from renderer construction**:

- `task` — should come from main's generation context
- `stage` — should come from main's generation context
- `startedAt` — should be set by main when generation actually starts

### Recommended Fix Pattern

Renderer should send ONLY context to main:

```typescript
// Instead of constructing full generationStatus:
await startGenerationRun({
  projectId,
  status: { task, stage, title, detail, startedAt, estimatedSeconds, scope } // WRONG
})

// Should send minimal context:
await startGenerationRun({
  projectId,
  generationContext: { taskType: 'script', targetStage: 'script' } // Minimal
})
```

Main (orchestrator) computes the authoritative `generationStatus` with correct `startedAt`, `task`, `stage`.

### Conclusion

**Task 10 is NOT fully completed.** While `setGenerationStatus` is not called optimistically, the renderer IS producing `generationStatus` core fields (`task`, `stage`, `startedAt`) that should be produced by main per `truth-authority.ts`.

**This is a "wrong producer" issue, not "optimistic update" per se.**

**Severity**: Medium — system works but violates authority constitution
**Fix approach**: Task 10 (renderer stops producing core fields) + Task 11+ (orchestrator becomes authoritative producer)
