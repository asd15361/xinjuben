## 2026-03-24

- Kept `workspace:open-project-shell` input as raw `projectId: string` to match the task contract exactly, while introducing `GetStagePayloadInputDto` for the stage-specific channel where a compound payload is required.
- Implemented stage payload selection in `workspace-project-handlers.ts` with an explicit `switch` on `WorkflowStage`, returning only the DTO fields needed by each stage instead of reusing `getProject()` and returning a full snapshot.
- Home-page open flow now routes through `openProjectShell()` + `getStagePayload()`; `enterProject()` accepts shell identity plus stage payload so the UI hydrates only the current stage while keeping the same stage-authority transition flow.

- Replaced the monolithic API with a dispatcher plus stage-specific hydrate methods in , and updated open-project/home hydration to use that single-stage contract.
- now hydrates only the outline and character slices produced by generation instead of stuffing unrelated detailed-outline/script data into the store, keeping stage state minimal between transitions.

- Correction: the replaced API was hydrateProjectDrafts, and the new dispatcher is hydrateStagePayload in useStageStore; open-project hydration now uses that single-stage dispatcher instead of a full-project hydrate.
- Chat generation follow-up now writes only outline and character slices needed for the next workflow steps, instead of hydrating detailed-outline or script slices preemptively.

- Added a dedicated renderer dirty registry (`dirty-registry.ts`) instead of embedding dirty flags into persisted stage data, so hydrate/clean semantics stay transient and per-stage while explicit AI-generation writes can bypass page-edit dirty checks with `force` saves.
- Navigation saves for outline/character/detailed-outline now call store-level save helpers that no-op when the stage is clean, preserving manual transition hooks without reintroducing mount-time autosave behavior.
