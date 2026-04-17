# Project Open Slow Fix - Learnings

## Wave 3: DetailedOutlineViewModelTruth

### Fix Applied: Remove inline outlineBlocks.find() from render cycle

**Problem:**

- `DetailedOutlineStage.tsx` line 335 had `outlineBlocks.find((item) => item.blockNo === block.blockNo)?.label` being called during every render
- This violated the "NO render-period heavy computation" rule

**Solution:**

1. Added `blockLabels: Record<number, string>` to `DetailedOutlineViewModel` interface in `build-detailed-outline-view-model.ts`
2. Pre-computed the block label mapping in `buildDetailedOutlineViewModel()` using a simple for-loop to build `blockLabels` record
3. Replaced inline `.find()` call in `DetailedOutlineStage.tsx` with direct lookup: `blockLabels[block.blockNo]`

**Pattern Used:**

- For each outlineBlock, compute label once: `block.label || \`第${formatEpisodeRange(block.startEpisode, block.endEpisode)}规划块\``
- Store in `Record<blockNo, label>` for O(1) lookup during render
- Fallback to `formatEpisodeRange()` preserved for blocks without a label

**Files Modified:**

- `src/renderer/src/features/detailed-outline/model/build-detailed-outline-view-model.ts` - Added blockLabels to interface and computation
- `src/renderer/src/features/detailed-outline/ui/DetailedOutlineStage.tsx` - Removed inline find(), using pre-computed blockLabels

**Verification:**

- `npm run typecheck` passed
- `npm run build` passed
- `rg "outlineBlocks\.find\(" src/renderer/src/features/detailed-outline/ui/DetailedOutlineStage.tsx` returns 0 matches
