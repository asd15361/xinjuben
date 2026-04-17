# Compatibility Test Checklist for Old Project Migration

## Overview

This checklist verifies that old projects can be opened and work with the new unified truth system. It covers migration, normalization, hydration, and legacy format handling.

## Test Categories

### Category 1: Store Migration

#### Test 1.1: Legacy Electron Store Migration

```
Preconditions:
  - Current store is empty (no projects.json or empty projects object)
  - Legacy Electron store exists at appData/Electron/workspace/projects.json
  - Legacy store has N projects

Action:
  - Load the application

Expected Result:
  - migrateLegacyElectronStoreIfNeeded() returns true
  - Legacy projects appear in current store
  - Console log: "[project-store] migrated_legacy_electron_store:..."
```

#### Test 1.2: Migration Skipped When Current Has Projects

```
Preconditions:
  - Current store has M projects
  - Legacy Electron store has N projects (M > 0, N > 0)

Action:
  - Load the application

Expected Result:
  - migrateLegacyElectronStoreIfNeeded() returns false
  - Current store projects unchanged
  - Legacy projects NOT copied
```

#### Test 1.3: Corrupt Store Recovery

```
Preconditions:
  - Current store file is invalid JSON
  - projects.corrupt-*.json backup exists with valid projects

Action:
  - Load the application

Expected Result:
  - Current corrupt store renamed to projects.corrupt-TIMESTAMP.json
  - Recovery store restored from richest valid backup
  - Console log: "[project-store] restored_from_backup:..."
```

#### Test 1.4: Richer Backup Preferred

```
Preconditions:
  - Current store has 2 projects
  - projects.corrupt-newer.json has 5 projects (created later)

Action:
  - Load the application

Expected Result:
  - shouldPreferRicherBackup() returns true
  - Current store replaced with richer backup
  - projects.corrupt-newer.json restored
```

### Category 2: Field Normalization

#### Test 2.1: Null Arrays Normalized

```
Preconditions:
  - Project has null values for array fields

Action:
  - getProject(projectId)

Expected Result:
  - All array fields return [] instead of null
  - normalizeProjectSnapshot() applied
  - No fields are null/undefined for arrays
```

#### Test 2.2: All Array Fields Covered

```
Preconditions:
  - Project with minimal fields (only required fields)

Action:
  - getProject(projectId)
  - Check all array fields

Expected Result:
  - chatMessages: []
  - characterDrafts: []
  - activeCharacterBlocks: []
  - detailedOutlineSegments: []
  - detailedOutlineBlocks: []
  - scriptDraft: []
  - scriptRuntimeFailureHistory: []
```

### Category 3: Legacy Script Format

#### Test 3.1: Legacy Format Detection

```
Preconditions:
  - Script scene with legacyFormat=true
  - Scene has action, dialogue, emotion fields

Action:
  - Hydrate project in renderer
  - Check normalized script

Expected Result:
  - legacyFormat preserved as true
  - screenplay not empty (converted from legacy)
```

#### Test 3.2: Screenplay Priority Over Legacy

```
Preconditions:
  - Script scene with BOTH screenplay and legacy fields

Action:
  - normalizeScript() processing

Expected Result:
  - screenplay field takes priority
  - legacyFormat set to false
  - action/dialogue/emotion ignored
```

#### Test 3.3: Legacy Conversion When No Screenplay

```
Preconditions:
  - Script scene with empty screenplay
  - Scene has action, dialogue, emotion

Action:
  - normalizeScript() processing

Expected Result:
  - buildLegacyScreenplaySegment() called
  - screenplay populated from action/dialogue/emotion
  - legacyFormat set to true
```

### Category 4: Hydration Compatibility

#### Test 4.1: Atomic Hydration (No Multi-Wave)

```
Preconditions:
  - Project with large script (50+ scenes)
  - Detailed outline with multiple blocks

Action:
  - Open project
  - Monitor re-renders

Expected Result:
  - Single atomic set in hydrateProjectDrafts
  - No deferred normalization
  - UI interactive quickly
```

#### Test 4.2: Hydration With Missing Fields

```
Preconditions:
  - Project with partial data (some fields missing)

Action:
  - Open project

Expected Result:
  - All missing fields normalized to defaults
  - No hydration errors
  - UI displays empty states properly
```

### Category 5: Truth Authority Compatibility

#### Test 5.1: Legacy Cannot Override Repair Decisions

```
Preconditions:
  - Project with legacyFormat scenes
  - Script with quality issues

Action:
  - Attempt repair operation

Expected Result:
  - repair uses screenplay field only
  - legacyFormat does not influence repair
  - action/dialogue/emotion fields ignored
```

#### Test 5.2: Stage Derivation From Main Only

```
Preconditions:
  - Project with explicit stage field

Action:
  - deriveProjectStage(project)

Expected Result:
  - Stage derived from main process
  - Renderer cannot override
  - deriveStage() from stage-derivation.ts used
```

### Category 6: Old Project Snapshots

#### Test 6.1: Project Without version Field

```
Preconditions:
  - Project snapshot without version field (old format)

Action:
  - Load project

Expected Result:
  - Project loads successfully
  - Normalization applied
  - No version migration errors
```

#### Test 6.2: Project Without runtime Fields

```
Preconditions:
  - Project snapshot without scriptProgressBoard, scriptResumeResolution, etc.

Action:
  - Load project

Expected Result:
  - All runtime fields default to null
  - Project can enter generation workflow
  - Resume eligibility computed fresh
```

#### Test 6.3: Project Without storyIntent

```
Preconditions:
  - Project snapshot with storyIntent=null

Action:
  - Load project

Expected Result:
  - storyIntent null is preserved
  - Stage derivation handles null storyIntent
  - UI shows appropriate empty state
```

### Category 7: Cross-Version Projects

#### Test 7.1: Mixed Legacy and New Format

```
Preconditions:
  - Multiple projects:
    - Project A: legacyFormat=true (old three-act)
    - Project B: legacyFormat=false (new screenplay)

Action:
  - Load both projects alternately

Expected Result:
  - Project A: legacy conversion applied
  - Project B: direct load
  - Both work correctly
```

#### Test 7.2: Resume From Pre-Unification Project

```
Preconditions:
  - Old project with scriptProgressBoard from before unification

Action:
  - Attempt to resume generation

Expected Result:
  - Runtime state loaded from existing board
  - Resume eligibility computed correctly
  - Generation can continue
```

## Success Criteria

All tests must pass for Task 21 to be considered complete:

- [ ] Store migration works correctly
- [ ] Corrupt recovery functions properly
- [ ] Field normalization handles all edge cases
- [ ] Legacy format conversion works correctly
- [ ] Hydration is atomic and fast
- [ ] Legacy cannot override new truth system
- [ ] Old project snapshots load without errors
- [ ] Mixed legacy/new projects coexist

## Run Commands

```bash
# Run migration tests
node --test src/main/infrastructure/storage/project-store-migration.test.ts

# Run typecheck
npm run typecheck

# Manual testing (requires Electron app)
# 1. Clear userData workspace
# 2. Place legacy projects in appData/Electron/workspace/
# 3. Launch app
# 4. Verify migration in console logs
```
