## 2026-03-24

- Work Package A layered loading IPC follows existing workspace preload/main invoke patterns cleanly when shell loading stays `projectId: string` and stage loading uses a dedicated `{ projectId, stage }` input DTO.
- Main-process handlers can stay lightweight by reading `readStore()` directly and mapping only the requested fields into `ProjectShellDto` or stage payload DTOs, avoiding full `ProjectSnapshotDto` hydration on open.
- Renderer-side project opening can preserve the old enter flow by introducing a stage-payload hydrator that clears unrelated stage stores and only maps fields from the active `StagePayloadDto` branch.

- hydration now exposes stage-specific entrypoints (, , , , ) so project open only fills the active slice and clears stale data from other stages.
- Renderer project-open hydration no longer runs the old full-store normalization pass; consumes the stage DTO branch directly and relies on main-side payload shaping for open-time data.

- Correction: the previous shell append mangled code identifiers; the actual store hydration entrypoints are hydrateChatStage, hydrateOutlineStage, hydrateCharacterStage, hydrateDetailedOutlineStage, and hydrateScriptStage, and each one clears non-current stage slices before setting active-stage data.
- Open-project hydration now routes through hydrateStagePayload and consumes only the active StagePayloadDto branch, avoiding renderer-side full-project normalization during project-open hydration.

- Dirty-state gating works best as a stage-local registry outside the main store shape: hydrate marks a fresh version and clears dirty, user edit actions mark dirty, and successful page-edit saves clear dirty without changing the hydrated version.
- Character-stage derived activeCharacterBlocks should not mark the character stage dirty; otherwise computed sync in useEffect reintroduces write-on-open/page-switch regressions even when the user never edited content.
