# Migration Strategy for Old Projects to New Truth System

## Overview

This document defines the migration strategy for old projects to enter the new unified truth system. The migration is **lazy** - no forced upgrade happens when opening old projects. Instead, the system normalizes and adapts to the project format on read.

## Migration Principles

### From Truth Authority Unification

1. **Lazy Migration**: Old projects are migrated on read, not on upgrade
2. **Read-Only Compatibility**: Compatibility layer is read-only for decisions
3. **Normalization First**: All missing/null fields are normalized before entering the truth system
4. **No Forced Conversion**: `legacyFormat` projects retain their format until explicitly converted

## Current Migration Architecture

### 1. Store-Level Migration (`project-store-migration.ts`)

#### Legacy Electron Store Migration

```
migrateLegacyElectronStoreIfNeeded(currentStorePath, appDataPath)
```

- **Trigger**: When current store is empty and legacy Electron store exists
- **Source**: `appData/Electron/workspace/projects.json`
- **Target**: `userData/workspace/projects.json`
- **Condition**: Current store has 0 projects AND legacy store has > 0 projects
- **Effect**: Copies legacy projects into current store

#### Corrupt Recovery

```
recoverCorruptProjectStoreIfNeeded(currentStorePath, appDataPath)
```

- **Trigger**: When current store is corrupt OR corrupt backup is richer
- **Sources Checked**:
  1. `projects.corrupt-*.json` backups (valid ones with most projects)
  2. Legacy Electron store as fallback
- **Selection**: Prefers richer backup (more projects and/or more content)

### 2. Normalization (`project-store-core.ts`)

```typescript
normalizeProjectSnapshot(project: ProjectSnapshotDto): ProjectSnapshotDto
```

- Converts array-like fields from null/undefined to empty arrays
- Ensures all optional array fields have default empty arrays
- Applied on every project read via `getProject()`

**Fields Normalized**:

- `chatMessages` → `[]` if null
- `characterDrafts` → `[]` if null
- `activeCharacterBlocks` → `[]` if null
- `detailedOutlineSegments` → `[]` if null
- `detailedOutlineBlocks` → `[]` if null
- `scriptDraft` → `[]` if null
- `scriptRuntimeFailureHistory` → `[]` if null

### 3. Legacy Format Handling (`useStageStore.ts`)

```typescript
normalizeScript(input?: ScriptSegment[] | null): ScriptSegment[]
```

**Legacy Format Detection**:

- `scene.legacyFormat === true` indicates old three-act format
- `scene.screenplay` is the PRIMARY body text (takes priority)
- `scene.action`, `scene.dialogue`, `scene.emotion` are legacy fields

**Conversion Priority**:

```
screenplay?.trim()
  ? { ...scene, screenplay: screenplay.trim(), screenplayScenes: [], legacyFormat: false }
  : buildLegacyScreenplaySegment({ sceneNo, action, dialogue, emotion })
```

## Migration Patterns

### Pattern 1: Empty Store Migration

```
Old store (Electron) → New store location
```

- Triggered automatically on first launch
- All legacy projects copied to new location
- No data transformation

### Pattern 2: Corrupt Recovery

```
Corrupt store → Richest valid backup
```

- Automatic on store read failure
- Prefers richer content over newer timestamp

### Pattern 3: Field Normalization

```
Old snapshot (partial fields) → Normalized snapshot
```

- Applied on every project read
- No data loss - only null→[] conversions

### Pattern 4: Script Legacy Conversion

```
Legacy scene (action/dialogue/emotion) → Normalized scene (screenplay)
```

- Applied during hydration in renderer
- If `screenplay` is empty but legacy fields exist, build screenplay from legacy
- `legacyFormat` flag set appropriately

## Version Migration Strategy

### Current State

- **No explicit version field**: Projects don't have a version marker
- **Implicit versioning**: System assumes all loaded projects need normalization only
- **No breaking changes**: All schema changes have been backward-compatible

### Future Version Migrations (If Needed)

1. **Add version field to schema**: `ProjectSnapshotDto.version: string`
2. **Migration function pattern**:

```typescript
async function migrateProjectToVersion(
  project: ProjectSnapshotDto,
  targetVersion: string
): Promise<ProjectSnapshotDto> {
  const currentVersion = project.version ?? '0.0.0'
  if (currentVersion >= targetVersion) return project

  // Apply migrations in order
  let migrated = { ...project }
  if (currentVersion < '1.0.0') {
    migrated = migrateToV1(migrated)
  }
  if (currentVersion < '2.0.0') {
    migrated = migrateToV2(migrated)
  }
  migrated.version = targetVersion
  return migrated
}
```

3. **Migration trigger**: In `getProject()` after normalization

## Rollback Strategy

### Migration Failure Handling

1. **Store corruption**: Auto-recovers from backup (see corrupt recovery)
2. **Project read failure**: Project is quarantined, other projects still load
3. **Partial migration**: Transaction-like - either all fields migrate or none

### Rollback Mechanisms

1. **Auto-backup before migration**: `projects.autobackup-*.json` created before overwrite
2. **Corrupt file rename**: Corrupt files renamed to `projects.corrupt-*.json` not deleted
3. **Legacy fallback**: Legacy Electron store always exists as fallback

## Legacy Compatibility Boundary

### What Legacy Can Do

- Provide initial data for migration
- Serve as recovery source
- Display in UI with `legacyFormat` marker

### What Legacy Cannot Do

- Influence repair decisions (`screenplay-repair-guard.ts`)
- Determine audit outcomes
- Control gate/resume logic
- Override `screenplay` as primary body

## Testing Requirements

### Migration Tests (see compatibility-checklist.md)

1. Empty store with legacy projects → Migration triggers
2. Current store with projects → Migration skipped
3. Corrupt store → Recovery triggers
4. Richer corrupt backup → Preferricher backup selection
5. Field normalization → All array fields properly initialized
6. Legacy script format → Proper screenplay field priority

### Compatibility Tests

1. Old project with all fields → Loads correctly
2. Old project with missing fields → Normalizes correctly
3. Legacy script with action/dialogue → Converts to screenplay
4. Mixed legacy/new projects → Both load correctly

## Key Files

| File                           | Responsibility                           |
| ------------------------------ | ---------------------------------------- |
| `project-store-migration.ts`   | Store-level migration and recovery       |
| `project-store-read-repair.ts` | Parse recovery with quarantine           |
| `project-store-core.ts`        | Field normalization                      |
| `useStageStore.ts`             | Script normalization + legacy conversion |
| `screenplay-format.ts`         | `buildLegacyScreenplaySegment`           |
| `truth-authority.ts`           | Authority boundary definitions           |

## Migration Freeze Window

For the current truth authority unification:

- **Migration rules**: FROZEN as of Task 21 completion
- **Sample pool**: Legacy fixtures in migration tests
- **No new migrations**: Until explicit version field added
