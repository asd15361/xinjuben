# Creative Foundation Hardening — Decisions

## Task 1: Truth Owner Matrix (2026-03-23)

### Naming Decisions

**TruthDomain enum vs string literals**

- Used `TruthDomain` as enum with readonly values for type safety
- All 10 required domains present: stage, blockedReason, resumeEligibility, generationStatus, scriptRuntimeState, facts, failureHistory, ledger, visibleResult, formalRelease
- Type is `TruthDomainType = (typeof TruthDomain)[keyof typeof TruthDomain]`

**DomainNaming convention**

- Used UPPER_SNAKE_CASE for domain keys (TruthDomain.STAGE)
- This aligns with existing AuthorityOwnedFacts in authority-constitution.ts which also uses UPPER_SNAKE_CASE
- Kept readable names: `SCRIPT_RUNTIME_STATE` not `SCRIPT_RUNTIME_STATE_` etc.

**visibleResult vs formalRelease distinction**

- visibleResult: what user can see/display regardless of gate status
- formalRelease: official gate status requiring separate conditions
- Both have MAIN as producer, RENDERER as consumer, PERSISTER as persister
- This implements T12 dual-state mechanism: "失败结果可见但正式联动受阻"

**failureHistory is a queue**

- failureHistory is NOT just "latest failure" — it's an accumulated queue across generations
- MAIN appends on failure, clears atomically on success
- Consumers: RENDERER (display), MAIN (risk assessment)

**ledger built by MAIN's ledger-building logic**

- ledger (ScriptStateLedgerDto) is built by main's ledger builders
- Contains character states, fact confirmations, momentum, openHooks, knowledge boundaries
- Not just a simple state — computed derived state from main

### Owner Decisions

**All domains have MAIN as producer**

- Confirmed: stage, blockedReason, resumeEligibility, generationStatus, scriptRuntimeState, facts, failureHistory, ledger, visibleResult, formalRelease
- RENDERER is never a producer for any domain (enforced in validation)

**facts domain has MAIN + MAIN as consumers**

- RENDERER: displays facts to user
- MAIN: downstream computation using facts
- This is the only domain where MAIN appears as consumer (besides as producer)

**displayOnly consumers**

- Currently empty for all domains
- The field exists to support future cases where a component may read for display but must NOT cache/store as authoritative
- This is structural readiness for T12 and T11 patterns

### File Location Decision

**Colocated at `src/shared/domain/workflow/truth-owner-matrix.ts`**

- Next to existing `truth-authority.ts` and `authority-constitution.ts`
- These three files form the truth governance trinity:
  - truth-authority.ts: runtime enforcement helpers (isProducer, mayWrite, enforceWriteAuthority)
  - authority-constitution.ts: hard rules, forbidden patterns, failure contract
  - truth-owner-matrix.ts: domain inventory and owner matrix (this file)
- Alternative considered: creating new subdirectory — rejected, keeping co-location with related files

### Validation on Module Load

- `validateTruthOwnerMatrix()` runs on import
- Checks: all domains present, single producer per domain, MAIN producer for core truths, RENDERER never producer
- Throws on validation failure — matrix is wrong if it doesn't pass

### Query Helpers Provided

- `getProducer(domain)`, `getConsumers(domain)`, `getPersister(domain)`, `getDisplayOnly(domain)`
- `isProducer(owner, domain)`, `isConsumer(owner, domain)`, `isDisplayOnly(owner, domain)`
- `mayWrite(owner, domain)` — true if producer OR persister
- `getProducedDomains(owner)`, `getConsumedDomains(owner)`

### Dependencies

- Imports `TruthOwner` and `TruthOwnerType` from `./truth-authority`
- Does NOT import from `authority-constitution.ts` to keep it standalone
- Matrix can be used independently of constitution enforcement

## Task 2: IPC/Main Truth Enforcement Hooks (2026-03-23)

### Enforcement Architecture Decision

**Two-layer enforcement (IPC + Application Dispatch)**

- T2 requires enforcement at BOTH IPC boundary AND application dispatch
- IPC handlers: first line of defense, routes external requests
- Application dispatch: entry point for business logic, verifies before processing
- Both layers use same `truth-enforcement.ts` helpers to stay consistent

**Minimal dispatch points chosen**

- `start-script-generation.ts`: main generation orchestration (writes generationStatus, scriptRuntimeState, formalRelease)
- `declare-formal-fact.ts`, `confirm-formal-fact.ts`, `remove-formal-fact.ts`: formal fact operations (write facts)
- NOT adding enforcement to every intermediate function — only at dispatch entry where truth domains are first written

**Enforcement context labels**

- Each enforcement call uses `EnforcementContext` enum for traceability
- Examples: `START_SCRIPT_GENERATION`, `FORMAL_FACT_DECLARE`, `SCRIPT_GENERATION_ORCHESTRATOR`
- Helps identify where in call stack enforcement occurred

**Grep-detectable marker pattern**

- Used `[T2 ENFORCEMENT]` comment before each enforcement call
- Allows automated verification that enforcement is in place
- Pattern: `grep -r '\[T2 ENFORCEMENT\]' src/main/`

## Task 6: EntityStore Persistence Path (2026-03-23)

### What was added

**Minimal save path through existing project-store infrastructure:**

1. **Contract** (`src/shared/contracts/workspace.ts`):
   - Added `SaveEntityStoreInputDto { projectId, entityStore }`
   - entityStore typed as `ProjectEntityStoreDto` (from entities.ts)

2. **Normalization on read** (`src/main/infrastructure/storage/project-store-core.ts`):
   - Updated `normalizeProjectSnapshot` to call `normalizeEntityStore(project.entityStore)` instead of inline array guards
   - This ensures entityStore is fully normalized on every project read via `getProject()`

3. **Save function** (`src/main/infrastructure/storage/project-store.ts`):
   - Added `saveEntityStore(input: SaveEntityStoreInputDto)` following existing save pattern
   - Uses `updateProject()` with normalization happening on the read side

4. **IPC handler** (`src/main/ipc/workspace-project-handlers.ts`):
   - Registered `workspace:save-entity-store` handler

5. **Preload API** (`src/preload/api/workspace.ts`):
   - Exposed `saveEntityStore()` through `workspaceApi`

### Why this is sufficient for T6 but not T7/T8

- **T6 scope**: entityStore becomes a real persisted part of project state with explicit save path and consistent normalization on load
- **Not T7**: No draft↔master mapping yet — entityStore is standalone, not connected to characterDrafts or other stage-local data
- **Not T8**: No intake decomposition yet — entities must be explicitly saved, not auto-extracted from chat/intake

### Design decisions

- **Reused existing patterns**: saveEntityStore follows identical pattern to saveCharacterDrafts, saveOutlineDraft etc.
- **Normalization always on read**: normalizeEntityStore called in normalizeProjectSnapshot ensures any entityStore loaded from disk is normalized before use
- **No new storage infrastructure**: entityStore lives in ProjectSnapshotDto.entityStore which is already persisted as part of project JSON
- **Smallest authoritative API surface**: Only one new IPC channel `workspace:save-entity-store` plus preload method

### Files created/modified

- `src/shared/contracts/workspace.ts` — added SaveEntityStoreInputDto
- `src/main/infrastructure/storage/project-store-core.ts` — use normalizeEntityStore in normalizeProjectSnapshot
- `src/main/infrastructure/storage/project-store.ts` — added saveEntityStore function
- `src/main/ipc/workspace-project-handlers.ts` — registered IPC handler
- `src/preload/api/workspace.ts` — exposed saveEntityStore in preload API

## Task 7 (First Slice): Character Master↔Draft Mapping (2026-03-23)

### Why Character-Only First Slice

**Breaking isolation with minimal change:**

- T6 established entityStore as persisted master data, but characterDrafts remained isolated
- This slice proves that characterDrafts can carry stable entity IDs and map to/from entityStore.characters
- Later slices (T7 full, T8) can expand to factions/locations/items/relations once this pattern is validated

### Chosen Direction: Sync Pair (draft→master + master→draft)

**Rationale:**

- `toMasterEntity()`: Draft → Master with stable ID resolution (name matching when masterEntityId absent)
- `fromMasterEntity()`: Master → Draft for UI/generation consumption
- This is sufficient as a first slice: provides both directions without requiring complex sync logic
- Stable identity via name-based resolution ensures duplicate entities are not created on each save

### What Was Added

**1. Contract change (`src/shared/contracts/workflow.ts`):**

- Added `masterEntityId?: string` to `CharacterDraftDto`
- This allows each draft to carry or resolve a stable master entity ID
- When present, indicates the draft is already mapped to a specific entity

**2. Mapper layer (`src/shared/domain/entities/character-draft-mapper.ts`):**

- `resolveMasterEntityId(draft, entityStore)`: Resolve stable ID by name matching
  - Priority: explicit masterEntityId > name-based lookup
- `fromMasterEntity(entity)`: Convert CharacterEntityDto → CharacterDraftDto
  - Maps entity.summary → draft.biography, entity.goals → draft.goal, etc.
- `toMasterEntity(draft, options)`: Convert CharacterDraftDto → CharacterEntityDto
  - Uses stable ID resolution to update existing entities rather than creating duplicates
- `draftsToMasterEntities()` / `masterEntitiesToDrafts()`: Batch conversions

**3. Field mapping decisions:**

- entity.summary ↔ draft.biography
- entity.goals (array) ↔ draft.goal (multiline string, joined by '\n')
- entity.pressures (array) ↔ draft.hiddenPressure (multiline string)
- entity.roleLayer ↔ draft.roleLayer (functional normalized to active)
- Aliases, tags, linked\* fields not in draft — preserved on update

### Why Not Full T7/T8

**Not full T7:**

- Only character mapping — factions/locations/items/relations deferred
- No intake decomposition (T8 scope)

**Not T8:**

- No automatic entity extraction from chat/intake
- Entities must still be explicitly mapped via this mapper

### Files Created/Modified

- `src/shared/contracts/workflow.ts` — added masterEntityId to CharacterDraftDto
- `src/shared/domain/entities/character-draft-mapper.ts` — NEW file with mapper functions

### Minimal Change Verification

This is character-only as required:

- No changes to FactionEntityDto, LocationEntityDto, ItemEntityDto, RelationEntityDto
- No changes to entityStore schema (T6 already done)
- No intake/decomposition logic (T8 scope)

## Task 8: Truth Decomposition Layer (2026-03-23)

### What Was Added

**1. Formal decomposition contract (`src/shared/contracts/decomposition.ts`):**

- `DecompositionResult`: Full structured output with characters, factions, locations, items, relations, immutableFacts, unresolved
- `DecompositionSourceInfo`: Tracks provenance (user_declared/ai_suggested/system_inferred) and confidence per entity
- `DecompositionCharacter/Faction/Location/Item/Relation`: Entity-specific structures with role hints and source metadata
- `DecompositionImmutableFact`: Labeled facts with source tracking
- `DecompositionUnresolved`: Ambiguous items requiring user confirmation
- `DecomposeInput`: Input interface accepting text and existing entity hints

**2. Decomposition engine (`src/main/application/workspace/decompose-chat-for-generation.ts`):**

- `decomposeFreeformInput(input: DecomposeInput)`: Main entry point
- Extracts from structured brief format when present, falls back gracefully for freeform text
- Reuses existing structured parser helpers (extractSectionMap, collectStructuredSections)
- Reuses name extraction (extractNamesFromText) and text utilities
- Produces result with all 7 required categories covered

### What the Decomposition Result Contains

**Characters** (DecompositionCharacter[]):

- name, aliases, roleHint (protagonist/antagonist/supporting/minor), summary
- Source tracks provenance tier and confidence

**Factions** (DecompositionFaction[]):

- name, factionType (sect/clan/organization/court/family/other), memberNames, summary
- Extracted from keywords in world/setting sections

**Locations** (DecompositionLocation[]):

- name, locationType (region/city/site/interior/other), controllingFactionName, summary
- Extracted via keyword matching (镇/城/村/山/洞/府/宫/殿/楼/阁/寺/观/岛/域/境)

**Items** (DecompositionItem[]):

- name, itemType (artifact/weapon/evidence/resource/key/other), ownerName, summary
- Extracted via keyword matching (钥匙/秘宝/密库/法器/婚约/证据/秘卷等)

**Relations** (DecompositionRelation[]):

- fromName, toName, relationType (alliance/hostility/kinship/romance/debt/mastery/ownership/other), summary
- Extracted from relation summary sections with type inference from keywords

**Immutable Facts** (DecompositionImmutableFact[]):

- label, description pairs from core sections (核心冲突/核心错位/情绪兑现/设定成交句)
- All marked with provenance tracking

**Unresolved** (DecompositionUnresolved[]):

- item, ambiguity description, question for user confirmation
- Extracted from pendingConfirmations and softUnderstanding sections

### What Remains for Later Tasks

**T9 (Process Boundary Guardian):**

- Not implemented here — requires IPC/renderer integration to validate decomposition before passing to outline/character generation

**T6/T7 Integration:**

- Decomposition result can be consumed by entity master mapping (T7) to create/update master entities
- Not connected to entityStore persistence yet — downstream tasks will wire this up

**UI/Confirmation Flow:**

- Unresolved items need renderer UI to present confirmation questions to user
- Not implemented here — decomposition result just marks items as unresolved

**Test Coverage:**

- 13 tests passing covering core extraction scenarios
- Integration with full pipeline not tested (requires T9 boundary)

### Files Created/Modified

- `src/shared/contracts/decomposition.ts` — NEW file with full decomposition types
- `src/main/application/workspace/decompose-chat-for-generation.ts` — NEW file with decomposition engine
- `src/main/application/workspace/decompose-chat-for-generation.test.ts` — NEW file with 13 tests

### Design Decisions

**Reused existing helpers:**

- extractSectionMap, collectStructuredSections from structured parser
- extractNamesFromText, cleanPossibleName from shared utilities
- This avoids re-inventing name extraction and section parsing

**Separation preserved:**

- user_declared vs ai_suggested vs system_inferred tracked per entity via DecompositionSourceInfo
- Unresolved items not guessed — explicit question/ambiguity preserved

**Graceful degradation:**

- Empty text returns empty result (not error)
- Non-structured text still returns result with available data
- sectionMap always included for downstream inspection

### Verification

- Typecheck passes (tsc --noEmit for both node and web configs)
- 13/13 tests passing via tsx --test
- No breaking changes to existing contracts or functions

## Task 10 (First Slice): Downstream Invalidation for Combined Outline+Character Path (2026-03-23)

### Issue Investigation

**Issue #9 in task card claimed:**

- `saveOutlineAndCharacters()` does NOT clear `scriptRuntimeFailureHistory`
- Frontend chat success callback doesn't clear in-memory failure history
- `resolve-runtime-profile.ts` reads stale failure history

**Finding: Issue #9 is OUTDATED - fix was already applied**

Verification:

1. `saveOutlineAndCharacters` (project-store.ts:454-477) calls `invalidateScriptRuntimeState(existing)` at line 462
2. `invalidateScriptRuntimeState` (project-runtime-invalidation.ts:1-16) sets `scriptRuntimeFailureHistory: []` at line 12
3. Existing test in `project-runtime-invalidation.test.ts:140` verifies `failureHistory` is cleared

### Combined Generation/Save Path Coverage

**Path:** `workspace:generate-outline-and-characters` → `generateOutlineAndCharactersFromChat` → `persistGeneratedWorkspace` → `saveOutlineAndCharacters` → `invalidateScriptRuntimeState`

All runtime assets cleared on this path:

- `generationStatus: null`
- `detailedOutlineSegments: []`
- `detailedOutlineBlocks: []`
- `scriptDraft: []`
- `scriptProgressBoard: null`
- `scriptFailureResolution: null`
- `scriptRuntimeFailureHistory: []`
- `scriptStateLedger: null`
- `stage: 'outline'` (re-derived after save)

### T10 Remaining Scope (Not in this slice)

Per T9 learnings line 153-156, the following were explicitly deferred:

- T9 Guardian for `saveOutlineAndCharacters()` combined save path (not yet added)
- Full invalidation coverage across ALL save paths (partially done - see below)

**Already covered by existing invalidation:**

- `saveOutlineDraft` → calls `invalidateScriptRuntimeState` ✓
- `saveCharacterDrafts` → calls `invalidateScriptRuntimeState` ✓
- `saveDetailedOutlineSegments` → calls `invalidateScriptRuntimeState` ✓
- `saveOutlineAndCharacters` → calls `invalidateScriptRuntimeState` ✓

### Files Modified (this slice)

No new files created - the fix was already present in the codebase.

### Verification

- Typecheck passes (npm run typecheck)
- `invalidateScriptRuntimeState` test passes (1/1)
- The combined outline+character update path correctly invalidates failureHistory and other runtime assets

## Task 11 (First Slice): UI Truth-Compression — First-Issue Truncation Fix (2026-03-23)

### What Was Fixed

**Removed `blockedBy[0]` / first-issue truncation from 4 renderer files:**

1. `src/renderer/src/app/utils/stage-navigation-truth.ts` — exported `summarizeIssues()` for reuse
2. `src/renderer/src/features/detailed-outline/ui/useDetailedOutlineStageActions.ts` — now uses full `blockedBy` list with `summarizeIssues()`
3. `src/renderer/src/features/detailed-outline/ui/DetailedOutlineStage.tsx` — now uses full `blockedBy` list with `summarizeIssues()`
4. `src/renderer/src/features/script/ui/useScriptStageActions.ts` — now uses full `blockedBy` list with `summarizeIssues()` (3 occurrences fixed)

### How It Works

`summarizeIssues()` helper (in stage-navigation-truth.ts, lines 34-38):

- 0 issues → return fallback string
- 1 issue → return single issue message
- 2+ issues → `"issue1；issue2（共 N 条）"` — shows first 2 issues with total count

All notices now pass `blockedBy.map(item => item.message).filter(Boolean)` to extract full message list before summarizing.

### Files Modified

- `src/renderer/src/app/utils/stage-navigation-truth.ts` — exported `summarizeIssues`
- `src/renderer/src/features/detailed-outline/ui/useDetailedOutlineStageActions.ts` — import + usage fix (line 66)
- `src/renderer/src/features/detailed-outline/ui/DetailedOutlineStage.tsx` — import + usage fix (line 185)
- `src/renderer/src/features/script/ui/useScriptStageActions.ts` — import + usage fix (lines 171, 374, 547)

### Verification

- `grep -r 'blockedBy\[0\]'` in targeted directories returns no matches
- Typecheck passes (npm run typecheck)

### T11 Remaining Scope (Broader Page-Snapshot Work Still Ahead)

Per task description: Atlas will independently verify this first T11 slice before deciding whether to continue broader page-only-display cleanup. The following broader work remains for future T11 slices:

- Other renderer files with truth compression (e.g., ScriptStage.tsx — found via grep, but NOT in this slice's target list)
- Page-level snapshot consumption patterns that may still truncate to first issue
- Any other UI paths that derive display state from blockedBy or other multi-issue lists

## Task 12 (First Slice): Visible Result vs Formal Release Separation — Contract Wiring (2026-03-23)

### What Was Added

**Contract file already existed** from previous session:

- `src/shared/contracts/visible-release-state.ts` — explicit two-state types (VisibleResultStatus, FormalReleaseStatus, VisibleResultState, FormalReleaseState, GenerationResultState, factory helpers)

**This slice wired the contract into the first real consumer path:**

**File modified: `src/renderer/src/app/hooks/useScriptGenerationRuntime.ts`**

- Added `generationResult: GenerationResultState | null` to `ScriptGenerationRuntimeState` interface
- Added import of `GenerationResultState`, `createVisibleFailureState`, `createVisibleSuccessState`, `createInitialVisibleResult`, `createFormalBlockedState`, `createFormalReleasedState`, `createGenerationResultState` from `visible-release-state.ts`
- Added `generationResult` state variable
- Constructed `GenerationResultState` in `syncRuntime()` with proper two-state derivation:
  - `failurePreview` exists → `visibleResult.status = 'failed'` (visible for analysis), `formalRelease.status = 'blocked'` with `QUALITY_NOT_PASSED`
  - `board.batchContext.status === 'completed'` → `visibleResult.status = 'visible'`, `formalRelease.status = 'released'`
  - `generationStatus` present (in-flight) → `visibleResult.status = 'pending'`, `formalRelease.status = 'blocked'` with `GENERATION_IN_PROGRESS`
- Added `setGenerationResult(null)` to all cleanup paths (disabled, catch, early-return)
- Exposed `generationResult` in return value

### Why This Consumer Path

**`useScriptGenerationRuntime` is the natural first consumer because:**

- It already manages generation runtime state (`failurePreview`, `generationStatus`, `failureHistory`)
- It is the first renderer hook that encounters generation results
- It already has the data needed to derive both states from existing snapshot fields
- It is consumed by UI components that need to know "can I see the result?" and "can I proceed formally?"

### Semantic Invariant Preserved

The wiring correctly implements the T12 invariant:

- `visibleResult` can exist (status `'visible'` or `'failed'`) independently of `formalRelease.status`
- A failed generation creates `visibleResult.status = 'failed'` (user can analyze) while `formalRelease.status = 'blocked'` (no formal progression)
- `formalRelease.status = 'released'` requires explicit completion without failure — NOT auto-granted from visible result existing

### What Remains for Later Slices

**Full T12 UI adoption requires:**

1. `ProjectSnapshotDto` to carry explicit `visibleResult: VisibleResultState | null` and `formalRelease: FormalReleaseState | null` fields from persistence
2. IPC handler to populate these fields on save
3. `useScriptGenerationRuntime` to read from snapshot fields instead of deriving
4. UI components (`ProjectGenerationBanner`, script stage page) to consume `generationResult` instead of implicit combinations
5. `ProjectGenerationBanner.tsx` to use `generationResult.isVisible` / `generationResult.isReleased` instead of `generationNotice` + `failurePreview` + `generationPlan.ready`

### Files Modified

- `src/renderer/src/app/hooks/useScriptGenerationRuntime.ts` — wired GenerationResultState contract as first real consumer

### Verification

- Typecheck passes (npm run typecheck:node && npm run typecheck:web)
- `visible-release-state.ts` is now imported and used in a concrete consumer path
- Semantic invariant preserved: visible can exist while formal is blocked

## Task 13 (First Slice): Load-Bearing Role/Entity Analysis — Batch Context Annotation (2026-03-23)

### What Was Added

**1. Load-bearing annotation types (`src/shared/domain/workflow/load-bearing-annotations.ts`):**

- `LoadBearingRoleAnnotation`: name, reason, category, episodeNos
- `LoadBearingEntityAnnotation`: entityId, name, reason, category, episodeNos
- `LoadBearingAnnotations`: { roles, entities, narrativeThreads }
- `LOAD_BEARING_CATEGORIES`: narrative_carrier | conflict_driver | relationship_lever | theme_fulfiller | plot_anchor | pressure_point

**2. Rule-based analysis functions:**

- `analyzeLoadBearingRoles()`: Derives role load-bearing from storyContract characterSlots, eventSlots, activeBlocks, hardFacts
- `analyzeLoadBearingEntities()`: Derives entity load-bearing from entityStore roleLayer=core, slot matches, hardFacts bindings
- `deriveNarrativeThreads()`: Derives narrative threads from eventSlots and storyIntent anchors
- `analyzeLoadBearing()`: Combined function returning full annotations

**3. Contract update (`src/shared/contracts/workflow.ts`):**

- `ScriptBatchContextDto` gains optional fields:
  - `loadBearingRoles?: LoadBearingRoleAnnotation[]`
  - `loadBearingEntities?: LoadBearingEntityAnnotation[]`
  - `narrativeThreads?: Array<{ thread: string; reason: string }>`

**4. Integration into planning (`src/shared/domain/workflow/planning-blocks.ts`):**

- `buildScriptBatchContexts()` now accepts optional load-bearing inputs (storyContract, userAnchorLedger, storyIntent, activeCharacterBlocks, entityStore)
- When inputs provided, calls `analyzeLoadBearing()` and populates load-bearing fields in each batch context
- `buildScriptBatchContext()` also updated to pass through load-bearing inputs

### Rule Inputs Chosen (Contract-Driven, Not ML)

**For role load-bearing analysis:**

1. `storyContract.characterSlots` (protagonist/antagonist/heroine/mentor) → narrative_carrier category
2. `storyContract.eventSlots.antagonistPressure` → conflict_driver category for antagonist
3. `storyContract.eventSlots.antagonistLoveConflict` → conflict_driver category for antagonist
4. `storyContract.eventSlots.relationshipShift` → relationship_lever category for matching characters
5. `storyContract.eventSlots.themeRealization` → theme_fulfiller category for matching characters
6. `storyIntent.relationAnchors` → relationship_lever category for matching characters
7. `storyContract.hardFacts` → plot_anchor category for characters mentioned in facts
8. `activeCharacterBlocks` (when block overlaps batch episodes) → pressure_point category

**For entity load-bearing analysis:**

1. `entityStore.characters` with roleLayer=core → narrative_carrier
2. Character slot name matches → narrative_carrier
3. Factions/locations/items bound to hardFacts → plot_anchor
4. Relations from relationAnchors or relationshipShift → relationship_lever

**For narrative threads:**

1. `eventSlots.finalePayoff` → '终局必须回收的事件线'
2. `eventSlots.antagonistPressure` (if requireAntagonistContinuity) → '对手贯穿压力线'
3. `eventSlots.antagonistLoveConflict` (if requireAntagonistLoveConflict) → '对手情感争夺线'
4. `eventSlots.relationshipShift` (if requireRelationshipShift) → '关系转折线'
5. `eventSlots.healingTechnique` (if requireHealingTechnique) → '关键救治技术线'
6. `eventSlots.themeRealization` (if requireThemeRealization) → '主题兑现线'
7. `userAnchorLedger.heroineRequired` → '用户锚定的情感对象线'
8. `storyIntent.worldAnchors` → '世界观锚定线'
9. `storyIntent.relationAnchors` (uncovered) → '关系锚定线'

### What Remains for T13 Full / T14

**T13 remaining scope:**

- Full T13 would connect load-bearing annotations to actual prompt construction in `create-script-generation-prompt.ts`
- Currently annotations are produced but not yet consumed by prompt builder
- entityStore parameter is optional — some call sites may not have entityStore available

**T14 (grouped/layered/batched generation):**

- T14 formalizes 10/10/5 batching as contract/test/evidence-hardened governance
- T14 adds group/layer/batch three-tier governance on top of load-bearing annotations
- T14 does NOT redesign the batching system — it formalizes existing 10/10/5 structure

### Files Created/Modified

- `src/shared/domain/workflow/load-bearing-annotations.ts` — NEW file with rule-based analyzer
- `src/shared/contracts/workflow.ts` — ScriptBatchContextDto extended with load-bearing fields
- `src/shared/domain/workflow/planning-blocks.ts` — buildScriptBatchContexts/buildScriptBatchContext updated

### Verification

- Typecheck passes (npm run typecheck:node && npm run typecheck:web)
- Load-bearing annotations are produced from rules/contracts, not ML
- No breaking changes to existing function signatures (all load-bearing inputs are optional)

## Task 14 (First Slice): 10/10/5 Batching Contract Formalization (2026-03-23)

### What Was Added

**1. Batching contract (`src/shared/domain/workflow/batching-contract.ts`):**

Formalizes the current `10集规划 / 10集详纲 / 5集写作` batching as explicit governance invariants:

- `OUTLINE_BLOCK_EPISODES_GOVERNANCE = 10` — Episodes per outline block (10集规划)
- `DETAILED_OUTLINE_UNIT_EPISODES_GOVERNANCE = 10` — Episodes per detailed outline planning unit (10集详纲)
- `SCRIPT_BATCH_EPISODES_GOVERNANCE = 5` — Episodes per script batch (5集写作)

Contract functions provided:

- `assertOutlineBlockEpisodesConstant(value)` — Validates implementation matches governance
- `assertScriptBatchEpisodesConstant(value)` — Validates implementation matches governance
- `assertBlockSpanMatchesGovernance(start, end)` — Validates block span = 10
- `assertBatchSpanMatchesGovernance(start, end)` — Validates batch span = 5
- `computeExpectedOutlineBlockCount(totalEpisodes)` — Computes expected block count
- `computeExpectedScriptBatchCount(totalEpisodes)` — Computes expected batch count
- `getOutlineBlockBatchingLabel()` / `getDetailedOutlineBatchingLabel()` / `getScriptBatchBatchingLabel()` — Human-readable labels

**2. Targeted tests (`src/shared/domain/workflow/planning-blocks.test.ts`):**

32 tests covering:

**10集规划 (Outline Blocks) tests:**

- 10 episodes → 1 block ✓
- 20 episodes → 2 blocks ✓
- 15 episodes → 2 blocks (10 + 5) ✓
- Custom planningUnitEpisodes works ✓
- `findOutlineBlockByEpisode` correctly locates blocks ✓
- `getPlanningUnitEpisodes` defaults to governance value ✓

**5集写作 (Script Batches) tests:**

- 5 episodes → 1 batch ✓
- 10 episodes → 2 batches ✓
- 12 episodes → 3 batches (5 + 5 + 2) ✓
- Custom batchUnitEpisodes works ✓
- `findScriptBatchContext` correctly locates batches ✓

**Batch count computation tests:**

- All episode count scenarios for outline blocks and script batches ✓

**Governance assertion tests:**

- Correct values pass ✓
- Wrong values throw with governance mismatch error ✓

**Integration tests:**

- 50 episode project → 5 outline blocks + 10 script batches ✓
- Episode 25 correctly maps to block 3 and batch 5 ✓

### Scope of This Slice

**This slice ONLY formalized current batching:**

- 10集规划: outline blocks built in groups of 10
- 10集详纲: detailed outline planning unit of 10
- 5集写作: script batches built in groups of 5

**NOT added in this slice (deferred to later T14 slices):**

- Grouped/layered governance models (grouping by role type, entity type, etc.)
- New batching semantics or output changes
- UI or documentation changes
- T15 test-layer system integration

### Files Created

- `src/shared/domain/workflow/batching-contract.ts` — NEW file with governance constants and contract functions
- `src/shared/domain/workflow/planning-blocks.test.ts` — NEW file with 32 targeted tests

### Verification

- Typecheck passes (npm run typecheck:node && npm run typecheck:web)
- 32/32 tests passing via `npx tsx --test`
- Governance constants match implementation defaults (10, 10, 5)
- No breaking changes to existing contracts or function signatures

### T14 Remaining Scope (For Later Slices)

Per task description: "先把它硬化，再在上头搭 grouped/layered governance"。The following remain for later T14 slices:

1. **Grouped governance**: Group characters/entities by type (core/active/minor), faction, relationship cluster
2. **Layered governance**: Layer within batch (which characters appear in which episodes)
3. **Load-bearing integration**: Connect load-bearing annotations (T13) to batch grouping decisions
4. **60/100集 evidence**: Prove that large projects benefit from grouping/layering, not just fixed batch size
5. **Batch builder upgrade**: Formal group/layer/batch three-tier governance in `buildScriptBatchContexts`
