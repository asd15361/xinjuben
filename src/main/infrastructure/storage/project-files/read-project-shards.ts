import { access } from 'fs/promises'

import type { ProjectSnapshotDto } from '../../../../shared/contracts/project'
import { normalizeProjectSnapshot } from '../project-snapshot-normalize.ts'
import { readParsedStoreWithRepair } from '../project-store-read-repair.ts'
import { readProjectsIndex } from './read-index.ts'
import {
  createBaseSnapshot,
  getAllShardNames,
  getShardFilePath,
  type ProjectCharactersShard,
  type ProjectChatShard,
  type ProjectDetailedOutlineShard,
  type ProjectGenerationShard,
  type ProjectMetaShard,
  type ProjectOutlineShard,
  type ProjectScriptShard,
  type ProjectVisibleShard,
  type ShardName
} from './write-shard.ts'

type StageOrShard = ProjectSnapshotDto['stage'] | 'runtime_console' | ShardName | 'all' | 'shell'

function stageToShardNames(stage: StageOrShard): ShardName[] {
  switch (stage) {
    case 'chat':
      return ['meta', 'chat', 'generation']
    case 'seven_questions':
      return ['meta', 'outline', 'generation']
    case 'outline':
      return ['meta', 'outline', 'generation']
    case 'character':
      return ['meta', 'characters', 'generation']
    case 'detailed_outline':
      return ['meta', 'detailed-outline', 'generation']
    case 'script':
      return ['meta', 'script', 'generation', 'visible']
    case 'runtime_console':
      return ['meta', 'script', 'generation']
    case 'shell':
      return ['meta']
    case 'all':
      return getAllShardNames()
    default:
      return [stage]
  }
}

async function readOptionalShard<T>(filePath: string): Promise<T | null> {
  try {
    await access(filePath)
  } catch {
    return null
  }

  const { parsed } = await readParsedStoreWithRepair(filePath, {
    backupSuffix: `.corrupt-${Date.now().toString(36)}.json`,
    parse: (raw) => JSON.parse(raw) as T,
    readAttempts: 6,
    retryDelayMs: 50
  })
  return parsed
}

export async function readProjectShards(
  workspaceDir: string,
  projectId: string,
  stages: StageOrShard[] = ['all']
): Promise<ProjectSnapshotDto | null> {
  const index = await readProjectsIndex(workspaceDir)
  const indexEntry = index.projects[projectId]
  if (!indexEntry) {
    return null
  }

  const shardNames = Array.from(new Set(stages.flatMap(stageToShardNames)))
  let project = createBaseSnapshot(indexEntry)

  for (const shardName of shardNames) {
    const shardPath = getShardFilePath(workspaceDir, projectId, shardName)
    switch (shardName) {
      case 'meta': {
        const shard = await readOptionalShard<ProjectMetaShard>(shardPath)
        if (shard) {
          project = { ...project, ...shard }
        }
        break
      }
      case 'chat': {
        const shard = await readOptionalShard<ProjectChatShard>(shardPath)
        if (shard) {
          project = {
            ...project,
            chatMessages: Array.isArray(shard.chatMessages) ? shard.chatMessages : [],
            storyIntent: shard.storyIntent ?? null
          }
        }
        break
      }
      case 'outline': {
        const shard = await readOptionalShard<ProjectOutlineShard>(shardPath)
        if (shard) {
          project = { ...project, outlineDraft: shard.outlineDraft ?? null }
        }
        break
      }
      case 'characters': {
        const shard = await readOptionalShard<ProjectCharactersShard>(shardPath)
        if (shard) {
          project = {
            ...project,
            entityStore: shard.entityStore ?? project.entityStore,
            characterDrafts: Array.isArray(shard.characterDrafts) ? shard.characterDrafts : []
          }
        }
        break
      }
      case 'detailed-outline': {
        const shard = await readOptionalShard<ProjectDetailedOutlineShard>(shardPath)
        if (shard) {
          project = {
            ...project,
            detailedOutlineBlocks: Array.isArray(shard.detailedOutlineBlocks)
              ? shard.detailedOutlineBlocks
              : [],
            detailedOutlineSegments: Array.isArray(shard.detailedOutlineSegments)
              ? shard.detailedOutlineSegments
              : []
          }
        }
        break
      }
      case 'script': {
        const shard = await readOptionalShard<ProjectScriptShard>(shardPath)
        if (shard) {
          project = {
            ...project,
            scriptDraft: Array.isArray(shard.scriptDraft) ? shard.scriptDraft : [],
            scriptProgressBoard: shard.scriptProgressBoard ?? null,
            scriptFailureResolution: shard.scriptFailureResolution ?? null,
            scriptRuntimeFailureHistory: Array.isArray(shard.scriptRuntimeFailureHistory)
              ? shard.scriptRuntimeFailureHistory
              : [],
            scriptStateLedger: shard.scriptStateLedger ?? null
          }
        }
        break
      }
      case 'visible': {
        const shard = await readOptionalShard<ProjectVisibleShard>(shardPath)
        if (shard) {
          project = {
            ...project,
            visibleResult: shard.visibleResult ?? project.visibleResult,
            formalRelease: shard.formalRelease ?? project.formalRelease
          }
        }
        break
      }
      case 'generation': {
        const shard = await readOptionalShard<ProjectGenerationShard>(shardPath)
        if (shard) {
          project = {
            ...project,
            generationStatus: shard.generationStatus ?? null
          }
        }
        break
      }
    }
  }

  return normalizeProjectSnapshot(project)
}
