# P0 Generation Pipeline Refactor Spec

## Problem

The outline-and-characters flow is no longer failing because of one prompt or one display string. It has accumulated multiple active truth sources and stage responsibilities inside one generation path:

- The HTTP route starts a single "outline and characters" task and charges it as one unit.
- The service retries the whole candidate when the character contract is weak.
- The central generator creates faction matrix, character profiles, rough outline, legacy character drafts, entity store, filtering, enrichment, protagonist fallback, roster trimming, and diagnostics in one function.
- The persistence layer saves outline, characters, and project meta/entity store as separate writes.
- The renderer derives display sections from both `characterDrafts` and `entityStore`.
- There are duplicate shared/main/server code paths whose behavior is not identical.

This makes repeated prompt fixes brittle. A downstream cleanup or display derivation can reopen a bug that an upstream prompt tried to close.

## Evidence

- `server/src/application/workspace/generate-outline-and-characters-from-confirmed-seven-questions.ts` is the orchestration hotspot. It generates faction matrix and V2 profiles, maps V2 to legacy drafts, generates rough outline, filters by brief role cards, enriches missing fields, builds entity store, attaches master IDs, limits full profiles, and trims to visible roster.
- `server/src/application/workspace/outline-characters-service.ts` retries and persists a whole generated candidate, then separately saves outline, character drafts, and project meta/entity store.
- `server/src/infrastructure/pocketbase/project-repository.ts` has separate `saveOutlineDraft`, `saveCharacterDrafts`, and `saveProjectMeta` methods; character save reads the already-persisted outline to validate.
- `src/renderer/src/app/hooks/useOutlineCharacterGeneration.ts` hydrates UI from `latestProject.outlineDraft`, `latestProject.characterDrafts`, and `latestProject.entityStore`, so display correctness depends on three synchronized payloads.
- `server/tsconfig.json` maps `@shared/*` to `../src/shared/*`, while `server/src/shared/*` still contains duplicate shared files. The copies already diverge, so it is unsafe to keep editing shared contracts without retiring one path.
- `src/main/application/workspace/generate-outline-and-characters-from-confirmed-seven-questions.ts` still contains an older same-name flow, used by Electron IPC. It does not produce the same bundle shape as the server flow.

## Product Goal

After chat confirmation, the software must produce a stable and internally consistent generation package:

1. Full character bios are natural, non-duplicated, and tied to faction/plot function.
2. Light cards and faction seats are not accidental copies of full bios.
3. Faction roster ownership is deterministic; a person has one primary faction unless explicitly marked as sleeper/undercover.
4. Rough outline consumes character/faction data but does not mutate or reinterpret the character roster.
5. UI renders from one canonical bundle, not from multiple drifting sources.

## Non-Goals

- No new UI feature work.
- No broad rewrite of script generation or detailed outline stages.
- No model swap, fine-tuning, or training.
- No further one-off prompt patches until the pipeline boundary is fixed, except for regression tests that expose current failures.

## Canonical Artifact

Introduce a canonical `OutlineCharacterGenerationBundle` as the only contract between the generation pipeline, persistence, and UI hydration:

```ts
interface OutlineCharacterGenerationBundle {
  storyIntent: StoryIntentPackageDto
  outlineDraft: OutlineDraftDto
  sevenQuestions: SevenQuestionsResultDto | null
  characterLedger: {
    factionMatrix?: FactionMatrixDto
    characterProfilesV2: CharacterProfileV2Dto[]
    normalizedDrafts: CharacterDraftDto[]
    fullProfileDrafts: CharacterDraftDto[]
    visibleCharacterDrafts: CharacterDraftDto[]
    entityStore: ProjectEntityStoreDto
  }
  diagnostics: GenerationDiagnostic[]
  warnings: GenerationWarning[]
  outlineGenerationError?: string
}
```

Rules:

- V2 profiles are the canonical generated character records.
- Legacy `CharacterDraftDto` is a projection for existing UI and downstream compatibility.
- `entityStore` is derived from V2 profiles plus faction matrix, not from display cards.
- `visibleCharacterDrafts` is derived once from the bundle and persisted with the bundle.
- Rough outline can read `factionMatrix`, `characterProfilesV2`, and `visibleCharacterDrafts`; it cannot filter or mutate the character ledger.

## Required Stage Boundaries

1. `buildGenerationAuthorityInput`
   - Reads project, story intent, confirmed seven questions, episode count.
   - Produces a normalized immutable input object.

2. `generateFactionMatrixStage`
   - Generates and validates `FactionMatrixDto`.
   - Owns faction count, branch count, cross-relation, and sleeper/undercover rules.

3. `generateCharacterProfilesStage`
   - Generates `CharacterProfileV2Dto[]` per faction.
   - Owns prompt, parse, retry, V2 field completeness.
   - Does not create legacy drafts.

4. `normalizeCharacterLedgerStage`
   - Deduplicates names, resolves primary faction, validates protagonist/antagonist coverage, and records warnings.
   - Applies one global quality policy and one global cleanup policy.

5. `deriveCharacterProjectionsStage`
   - Maps V2 to legacy full bios.
   - Builds `entityStore`.
   - Builds light cards/visible roster projections.

6. `generateRoughOutlineStage`
   - Consumes the frozen character/faction bundle.
   - Produces only `outlineDraft`.
   - On outline failure, records `outlineGenerationError` but must not mutate the character bundle.

7. `persistOutlineCharacterBundle`
   - Saves outline, characters, entity store, story intent, diagnostics, and stage status as one logical transaction or one repository method with version checking.

## Quality Gates

- Contract validation must fail if either legacy projection or V2 record is incomplete.
- Same-name full profile and light card cannot both display.
- A named profile cannot appear under two factions unless it has explicit sleeper/undercover metadata.
- `generationBriefText.characterCards` may seed required user anchors but cannot silently delete faction-generated active roles without a diagnostic.
- `server/src/shared/*` and `src/main/application/workspace/*` duplicate flows must be either retired, redirected to the server/shared canonical implementation, or explicitly marked legacy and excluded from active generation.

## Regression Cases

Use the recent hidden-bloodline/xianxia examples as golden tests:

- 主角宗门 and 仙盟/世家 must not swap rosters.
- 盟主/慕容雪/张天师 must not appear as 青虚宗实名成员 unless marked sleeper.
- 慕容管家 cannot duplicate as both 青虚宗 and 仙盟 member.
- Full bios cannot contain "身份是...；价值观...；剧情作用..." stitched output.
- `想要/压力` cannot repeat the same source sentence three times.
- Arc must include start, trigger, mid-wobble, cost choice, and end-state; it cannot be only a final result.
