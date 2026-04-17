# Decisions: Authority Command Contract

## Decision 1: Command Name Convention

**Chosen:** `authority:gate`, `test:authority`, `authority:check`
**Rationale:** Colon-separated npm script names; `test:authority` avoids conflict with a global `npm test` (which doesn't exist in this project). The `authority:check` compound name groups related commands together.

## Decision 2: Test Execution Method

**Chosen:** Direct `node --test` with explicit file list
**Rationale:** The authority tests use Node's built-in `node:test` module and are plain TypeScript. No test runner configuration (jest, vitest) exists for these. Explicit file list ensures only authority-domain tests run, not all tests in the project.

## Decision 3: Failure Semantics

**Chosen:** `npm run authority:gate && npm run test:authority`
**Rationale:** `&&` ensures fail-fast: if gate fails, tests never run. npm scripts inherit shell exit codes naturally. This matches the requirement: "fails if either child fails."

## Decision 4: Gate Execution Method (Superseded by Task 3)

**Previous:** `sh scripts/authority-gate.sh`
**Current:** `node scripts/authority-gate.js`
**Rationale:** Task 3 implemented cross-platform Node gate using vanilla Node.js. The Node gate:

- Uses only built-in fs/path modules (no external dependencies)
- Mirrors shell gate semantics exactly (same patterns, same output, same exit codes)
- Works on any platform with Node.js installed (Windows, macOS, Linux)
- Shell script `authority-gate.sh` kept in place as historical reference

## Decision 5: Node Gate Implementation Details

**Technology:** Vanilla Node.js with built-in modules only
**File:** `scripts/authority-gate.js`
**No dependencies:** Avoids need for ts-node, esbuild, or any transpilation step

## Decision 7: Task 4 — package.json Wired to Node Gate

**Completed:** 2026-03-23
**Change:** `authority:gate` script in `package.json` changed from `sh scripts/authority-gate.sh` to `node scripts/authority-gate.js`

**Verification:** `npm run authority:check` succeeds with:

- Node gate: CLEAN (exit 0)
- 40 authority tests: all pass

**Status:** package.json now officially uses Node gate as the authoritative entrypoint. Shell gate (`authority-gate.sh`) remains as historical reference only.

## Decision 6: What This Contract Does NOT Cover

- Node gate implementation for cross-platform compatibility (downstream Task 4) — COMPLETED
- Test entry point fixes for renderer tests (downstream)
- Full `npm test` that runs all test files (out of scope for authority contract)
- Docs sync for authority (minimal implementation only)

## Decision 8: Task 8 — Authority Gate Boundary Statement Tightening

**Date:** 2026-03-23

**Change:** Tightened `计划总表.md` boundary statement (lines 145-152) to explicitly state `authority:check` ≠ product acceptance, and enumerated P0/P1/P2 as mandatory independent requirements that the authority gate cannot replace.

**What changed:**

- Old: `authority:check` through = "authority contract established, Node gate in place, tests executable"
- New: Added explicit "≠" framing plus enumerated the three remaining structural prerequisites (P0: 首稿质量密度/11-15集真实回归, P1: 恢复链可信闭环, P2: 60集长测新鲜证据) as independent gates

**Why this wording:**

- The old wording was structurally correct but lacked the unambiguous "≠" operator and did not list the remaining items at the same structural level as the authority gate itself
- This made it possible for executors to read "authority:check passes" as implying product readiness, when it only confirms structural readiness
- The new wording puts all four items (authority gate + P0 + P1 + P2) at the same structural level, making it clear they are independent gates, not sequential dependencies where passing one automatically validates the others

**No change to P0/P1/P2 order or sequencing** — this decision only tightened the boundary statement language.
