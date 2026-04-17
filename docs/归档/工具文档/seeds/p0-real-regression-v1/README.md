# P0 Real Regression Seed Fixture

## Version

`p0-real-regression-v1`

## Source Snapshot

- **Path:** `C:\Users\Administrator\AppData\Roaming\xinjuben\workspace\projects.corrupt-mn1js644.json`
- **Extracted Project ID:** `project_mn1d9gkd`
- **Extraction Date:** 2026-03-23

## Intended Use

P0 real regression test seed for episodes 11-15 generation.

This fixture provides a stable, versioned snapshot of a single project that has:

- Completed episodes 1-10 in `scriptDraft`
- Valid `storyIntent`, `outlineDraft`, `characterDrafts`, `activeCharacterBlocks`, `detailedOutlineBlocks`
- stage = `script`

## Preserved Fields

The following fields are preserved as-is from the source snapshot:

- `id` — project identity
- `name` — project name (Chinese UTF-8 preserved)
- `workflowType` — `ai_write`
- `stage` — `script`
- `genre` — `玄幻修仙｜热血升级`
- `updatedAt` — last update timestamp
- `chatMessages` — empty array (reset)
- `generationStatus` — null (reset)
- `storyIntent` — complete story intent
- `outlineDraft` — full outline with summary, facts, outlineBlocks
- `characterDrafts` — 5 characters (黎明, 小柔, 李诚阳, 李科, 妖兽蛇子)
- `activeCharacterBlocks` — block 1 spanning episodes 1-10
- `detailedOutlineSegments` — opening/midpoint/climax/ending acts
- `detailedOutlineBlocks` — full 10-episode block with episodeBeats
- `scriptDraft` — 10 complete episode scripts (scenes 1-10)

## Sanitized/Reset Fields

The following runtime state fields are reset to `null` to ensure a clean seed state:

- `generationStatus` → `null`
- `scriptProgressBoard` → `null`
- `scriptResumeResolution` → `null`
- `scriptFailureResolution` → `null`
- `scriptRuntimeFailureHistory` → `[]`
- `scriptStateLedger` → `null`

## Fixture Structure

```
tools/e2e/seeds/p0-real-regression-v1/
├── README.md    # This manifest
└── seed.json    # Sanitized project snapshot (single project, no runtime state)
```

## Runtime Notes

- This fixture is self-contained and does NOT depend on `tools/e2e/out/userdata-*`
- No external AppData references at runtime
- UTF-8 content (Chinese characters) preserved correctly
- The fixture is read-only; runners must copy/hydrate to a workspace before use
