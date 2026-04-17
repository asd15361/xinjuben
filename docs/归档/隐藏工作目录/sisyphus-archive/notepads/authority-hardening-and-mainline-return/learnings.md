# Learnings: Authority Command Contract

## Command Naming Decisions

- Used colon-separated names (`authority:gate`, `test:authority`, `authority:check`) following npm script conventions
- `authority:gate` runs anti-pattern shell script
- `test:authority` runs only the authority-specific test files (not all tests)
- `authority:check` chains gate and tests with `&&` for fail-fast semantics

## Order Semantics

- `authority:check` = gate first, tests second
- Gate failure = entire check fails (no tests run)
- Test failure = entire check fails
- This ordering is intentional: gate is structural guard, tests are behavioral verification

## Shell Script Compatibility

- `authority:gate` uses `sh scripts/authority-gate.sh` (not `bash`)
- Cross-platform Node gate wrapper is a downstream task (separate from this contract)
- Windows compatibility handled by downstream Task 4 per plan

## Test File Selection

- Authority test files targeted by `test:authority`:
  - `src/renderer/src/app/utils/authority-failure-regression.test.ts`
  - `src/renderer/src/app/utils/authority-failure-notice.test.ts`
- These use Node's built-in `node:test` module
- Other `.test.ts` files in project are NOT included (they're for other domains)

## Update 2026-03-23: Shared Contract Test Deferred

- Task 1 verification initially included src/shared/contracts/authority-failure.test.ts
- This file has runner incompatibility (cannot resolve ./authority-failure under direct Node ESM execution)
- This is a downstream Task 2 issue (test entry compatibility)
- For Task 1 verification, test:authority was narrowed to only the 2 working renderer tests
- The shared contract test will be re-added once Task 2 fixes the compatibility layer

## Task 2 Fix: Shared Contract Test ESM Import Extension

**Problem**: `src/shared/contracts/authority-failure.test.ts` failed under direct `node --test` with `ERR_MODULE_NOT_FOUND` because it imported `./authority-failure` without the `.ts` extension, while Node ESM cannot resolve TypeScript files without explicit extension.

**Root Cause**:

- Node ESM requires full file extension for imports (`.ts`, `.js`, etc.)
- The renderer tests already used explicit `.ts` extensions: `from './authority-failure-notice.ts'`
- The shared contract test used extensionless import: `from './authority-failure'`

**Fix Applied**:

- Changed `authority-failure.test.ts` line 14 from:
  ```typescript
  } from './authority-failure'
  ```
  to:
  ```typescript
  } from './authority-failure.ts'
  ```
- Updated `package.json` `test:authority` script to include all three tests:
  ```json
  "test:authority": "node --test src/shared/contracts/authority-failure.test.ts src/renderer/src/app/utils/authority-failure-regression.test.ts src/renderer/src/app/utils/authority-failure-notice.test.ts"
  ```

**Verification**:

- `node --test src/shared/contracts/authority-failure.test.ts` now passes all 10 tests
- `npm run test:authority` runs all 40 authority tests (10 + 19 + 11) and all pass

## Task 3: Node Authority Gate Implementation

**Created**: `scripts/authority-gate.js` - cross-platform Node.js version of the authority gate

**Implementation Approach**:

- Used vanilla Node.js (fs, path modules) for maximum cross-platform compatibility
- No external dependencies required - runs anywhere Node.js is available
- `.js` extension avoids need for any build/transpilation step

**Pattern Detection Parity with Shell Gate**:

1. **Pattern 1: `catch { setStage(...) }`**
   - Shell: Uses `grep -rn "catch"` with `-A 8` (8 lines after), filters for setStage
   - Node: Iterates files, finds `catch` keyword, extracts 8 lines after, checks for setStage
   - Both skip lines containing "authority-constitution"
   - Both skip comment-only lines

2. **Pattern 2: Optimistic setStage on missing result**
   - Shell: Uses `grep -rn "setStage"`, gets 5 lines before, checks for `if (!` pattern
   - Node: Iterates files, finds setStage, extracts 5 lines before, checks for `if\s*\(\s*!` regex
   - Both skip comment lines and setStage in comments

**Output Format Parity**:

- Both output identical header, pattern sections, and summary
- Both use `✓` and `✗` markers for clean/violation status
- Both show "RESULT: CLEAN (exit 0)" or "RESULT: VIOLATIONS FOUND (exit 1)"
- Both exit with same codes: 0 for clean, 1 for violations

**Verification**:

- Both gates return CLEAN on current codebase
- Both exit with code 0
- Output structure is identical

**Caveat - Shell vs Node Line Number Precision**:

- Shell uses `grep -n` for line numbers which counts from 1
- Node uses array index + 1, which also counts from 1
- Both should report same line numbers for violations

**Next Step**: Task 4 will wire this Node gate into package.json as the official `authority:gate` command

## Task 5: Authority Closure Note Wording Decisions

**Key boundary nuance decided**: The closure note explicitly distinguishes "structural cleanup complete" from "60-episode quality acceptance". This was intentional — the authority contract being satisfied does not imply the 60-episode delivery quality has passed.

**Phrasing choices**:

- "authority 路径已统一" instead of "authority 问题已解决" — because the issue was structural fragmentation, not correctness
- "authority failure 已显式化" instead of "authority 不再出错" — because we want to emphasize explicit failure rather than silent fallback
- "local fallback 不再作为 authority 层兜底" — clearly separates fallback domain from authority domain
- "verification-entry 正式化" labeled as non-blocking follow-up — keeps this entry accurate without overclaiming

**Placement**: Inserted between the 2026-03-21 closure quote and the "当前未完成项总表" section, as a third-level subsection under "2026-03-21 最新收口结论".

## Task 6: Active-Task Card Update - Wording Decisions

**Authority closure section placement**: Added as a new top-level section `## 2026-03-23 Authority 验收固化完成（Wave 1/2 收口）` at the end of active-task card, after E2E 清仓更新, to maintain chronological order. Did NOT modify existing sections or P0/P1/P2 ordering.

**Authority boundary declaration**: Used explicit `≠` notation: `authority:check` 通过 ≠ 60 集质量通过. This preserves the critical distinction that structural gate ≠ product acceptance. Written as a "结构性声明" to emphasize it's a hard boundary, not a suggestion.

**Mainline return sequence**: Wrote as numbered list: authority:check → P0 → P1 → P2. Used fixed phrase "固定不变" to signal this ordering is locked. Did NOT elevate authority to a P0/P1/P2 tier itself.

**Authority no longer main blocker**: Used explicit negative: "Authority 不再是当前主卡点". Listed completed items under "已完成". Listed remaining blockers as P0/P1/P2 without reordering. This ensures the active-task card clearly shows authority is done, not the current work.

## Task 9: Plan Table Return Sequence Sync - Wording Decisions

**Why add explicit return sequence to plan table**: Active-task card already had "当前主线回接顺序（固定不变）" with numbered steps. Plan table had the boundary statement but no matching explicit checklist. Task 9 required both formal records to show the sequence explicitly for executor clarity.

**Wording alignment decisions**:

- Plan table header: "Authority 尾活完成后回接顺序（固定不变）" vs active-task "当前主线回接顺序（固定不变）" — different framing but same substance
- Both use numbered list with same 4 steps
- Both use `npm run authority:check` command format (consistent with package.json script naming)
- Added explanatory note to plan table: "说明：authority gate 是每轮回主线前的结构守卫，不改变 P0/P1/P2 的本质目标和排序" — mirrors active-task's implicit constraint but makes it explicit

**Verification completed**:

- Plan table (计划总表.md) lines 154-161: explicit return sequence added
- Active-task card (当前任务卡.md) lines 653-658: already had return sequence (from Task 6)
- Both now consistent: authority:check → P0 → P1 → P2
- Authority gate defined as structural guard in both documents
- P0/P1/P2 substance unchanged
