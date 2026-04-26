# P0 Generation Pipeline Refactor Plan

## Decision

Stop surface prompt patching for the outline-and-characters stage. Treat the current issue as a generation pipeline boundary problem.

## Phase 0: Freeze and Audit

Status: partial.

- Freeze new UI/content tweaks around character bios, light cards, faction seats, and rough outline.
- Record the current active entry points:
  - HTTP: `POST /api/generate/outline-and-characters`
  - frontend hook: `useOutlineCharacterGeneration`
  - seven-question panel direct action
  - legacy Electron IPC path
- Identify duplicate shared code and choose the canonical shared source.

Exit criteria:

- One written owner map exists for route, service, generator, repository, renderer, and legacy main path.
- Any duplicate shared code path is labeled as canonical, legacy, or dead.

## Phase 1: Add Failing Regression Tests

Status: partial complete.

Write tests before the refactor moves behavior:

- active `@shared` character contract must fail when legacy is complete but V2 is incomplete, and vice versa. ✅
- faction/person ownership must reject same named profile in multiple factions without sleeper metadata.
- outline generation failure must not mutate or reduce the character bundle. ✅
- user role-card filtering must preserve protagonist, antagonist, and faction-required active roles or emit warnings.
- frontend section derivation must not show the same character as both full profile and light card.

Exit criteria:

- The tests expose current coupling or lock existing corrected behavior.

## Phase 2: Extract Canonical Bundle Types

Status: first slice complete.

Add bundle contracts in shared code:

- `OutlineCharacterGenerationBundle`
- `CharacterLedger`
- `GenerationDiagnostic`
- `GenerationWarning`

Refactor return types so `generateOutlineAndCharactersFromConfirmedSevenQuestions` becomes a thin compatibility wrapper around bundle generation.

Exit criteria:

- Existing route response stays compatible.
- New internal code has a canonical bundle function; existing route still uses the compatibility projection until later stages finish.

## Phase 3: Split Generation Stages

Move responsibilities out of the monolith:

- `build-generation-authority-input.ts`
- `generate-faction-matrix-stage.ts`
- `generate-character-profiles-stage.ts`
- `normalize-character-ledger-stage.ts`
- `derive-character-projections-stage.ts`
- `generate-rough-outline-stage.ts`
- `persist-outline-character-bundle.ts`

Rules:

- Character stages finish before rough outline starts.
- Rough outline can consume characters but cannot filter or mutate them.
- Entity store derives from the normalized ledger, not from display output.

Exit criteria:

- The old monolith has only orchestration and compatibility code.
- Each stage has focused unit tests.

## Phase 4: Centralize Policies

Create one shared policy surface for generation quality:

- field completeness
- prompt anti-patterns
- text cleanup
- duplicate names
- faction ownership
- role-card authority
- visible roster limits

Remove scattered local patch rules where possible.

Exit criteria:

- No prompt/file-local rule is the only place enforcing a known global invariant.

## Phase 5: Persistence Boundary

Replace sequential saves with one logical repository operation:

- save outline
- save visible character drafts
- save entity store
- save story intent
- save diagnostics/warnings
- advance stage

If PocketBase cannot do a real transaction, use a single repository method with version checks, rollback-safe ordering, and explicit partial-failure status.

Exit criteria:

- The UI cannot observe new outline with old characters, or new characters with old entity store.

## Phase 6: Retire Duplicate Paths

Resolve these second sources:

- `server/src/shared/*`
- `src/main/application/workspace/generate-outline-and-characters-from-confirmed-seven-questions.ts`
- old Electron IPC outline-character generation path

Options:

- delete if dead
- redirect to canonical server/shared modules
- mark as legacy blocked if product no longer supports local Electron generation

Exit criteria:

- `rg generateOutlineAndCharactersFromConfirmedSevenQuestions` shows one canonical implementation plus wrappers only.

## Phase 7: Verification

Run:

- targeted unit tests for new stages
- shared contract tests
- server typecheck
- root typecheck
- full `npm test`
- build
- one manual generation smoke test against the local server

Acceptance:

- No duplicate full/light character.
- No cross-faction roster leak.
- No repeated `想要/压力` triplets.
- No stitched `身份。价值观。剧情作用。` biographies.
- On outline failure, characters remain usable and persisted consistently.
