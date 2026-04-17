# F2-C2 Fix Findings: shouldReusePersistedBoard batchContext.status check

## Task

Fix F2-C2: `shouldReusePersistedBoard` missing `batchContext.status` check.

## Problem

`useScriptGenerationRuntime.ts` lines 25-29 check fingerprint/batchSize/episodeCount but NOT `batchContext.status`. Paused/failed boards could be incorrectly reused.

## Fix Applied

File: `src/renderer/src/app/hooks/useScriptGenerationRuntime.ts`

Added to `shouldReusePersistedBoard` function:

```typescript
board.batchContext.status !== 'paused' && board.batchContext.status !== 'failed'
```

Now the function only returns `true` for reuse if status is 'completed' or 'idle'.

## Type Definition Reference

`ScriptBatchStatus = 'idle' | 'running' | 'paused' | 'failed' | 'completed'`

## Verification

- npm run typecheck: PASSED
- No other files modified
- No other reuse logic broken

## Date: 2026-03-23
