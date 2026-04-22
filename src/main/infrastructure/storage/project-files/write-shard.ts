import { copyFile, mkdir, rename, rm, unlink, writeFile } from 'fs/promises'
import { join } from 'path'

import type {
  ProjectCounts,
  ProjectShellDto,
  ProjectSnapshotDto
} from '../../../../shared/contracts/project.ts'
import type { WorkflowStage } from '../../../../shared/contracts/workflow.ts'
import { resolvePersistedGenerationTruth } from '../../../../shared/domain/workflow/persisted-generation-truth.ts'

export type ShardName =
  | 'meta'
  | 'chat'
  | 'outline'
  | 'characters'
  | 'detailed-outline'
  | 'script'
  | 'visible'
  | 'generation'

export interface ProjectsIndexEntry {
  id: string
  name: string
  workflowType: 'ai_write' | 'novel_adapt'
  stage: WorkflowStage
  genre: string
  updatedAt: string
  counts: ProjectCounts
}

export interface ProjectsIndexShape {
  version: 1
  projects: Record<string, ProjectsIndexEntry>
}

export interface ProjectMetaShard {
  id: string
  name: string
  workflowType: 'ai_write' | 'novel_adapt'
  stage: WorkflowStage
  genre: string
  updatedAt: string
}

export interface ProjectChatShard {
  chatMessages: ProjectSnapshotDto['chatMessages']
  storyIntent: ProjectSnapshotDto['storyIntent']
}

export interface ProjectOutlineShard {
  outlineDraft: ProjectSnapshotDto['outlineDraft']
}

export interface ProjectCharactersShard {
  entityStore: ProjectSnapshotDto['entityStore']
  characterDrafts: ProjectSnapshotDto['characterDrafts']
}

export interface ProjectDetailedOutlineShard {
  detailedOutlineBlocks: ProjectSnapshotDto['detailedOutlineBlocks']
  detailedOutlineSegments: ProjectSnapshotDto['detailedOutlineSegments']
}

export interface ProjectScriptShard {
  scriptDraft: ProjectSnapshotDto['scriptDraft']
  scriptProgressBoard: ProjectSnapshotDto['scriptProgressBoard']
  scriptFailureResolution: ProjectSnapshotDto['scriptFailureResolution']
  scriptRuntimeFailureHistory: ProjectSnapshotDto['scriptRuntimeFailureHistory']
  scriptStateLedger: ProjectSnapshotDto['scriptStateLedger']
}

export interface ProjectVisibleShard {
  visibleResult: ProjectSnapshotDto['visibleResult']
  formalRelease: ProjectSnapshotDto['formalRelease']
}

export interface ProjectGenerationShard {
  generationStatus: ProjectSnapshotDto['generationStatus']
}

export type ProjectShardPayloadMap = {
  meta: ProjectMetaShard
  chat: ProjectChatShard
  outline: ProjectOutlineShard
  characters: ProjectCharactersShard
  'detailed-outline': ProjectDetailedOutlineShard
  script: ProjectScriptShard
  visible: ProjectVisibleShard
  generation: ProjectGenerationShard
}

const DEFAULT_ENTITY_STORE: NonNullable<ProjectSnapshotDto['entityStore']> = {
  characters: [],
  factions: [],
  locations: [],
  items: [],
  relations: []
}

const ALL_SHARDS: ShardName[] = [
  'meta',
  'chat',
  'outline',
  'characters',
  'detailed-outline',
  'script',
  'visible',
  'generation'
]

export function getAllShardNames(): ShardName[] {
  return [...ALL_SHARDS]
}

export function createEmptyProjectsIndex(): ProjectsIndexShape {
  return {
    version: 1,
    projects: {}
  }
}

export function getProjectsIndexPath(workspaceDir: string): string {
  return join(workspaceDir, 'projects-index.json')
}

export function getProjectDirectoryPath(workspaceDir: string, projectId: string): string {
  return join(workspaceDir, 'projects', projectId)
}

export function getShardFilePath(
  workspaceDir: string,
  projectId: string,
  shardName: ShardName
): string {
  return join(getProjectDirectoryPath(workspaceDir, projectId), `${shardName}.json`)
}

export async function writeJsonAtomic(filePath: string, payload: unknown): Promise<void> {
  await mkdir(filePath.replace(/[/\\][^/\\]+$/, ''), { recursive: true })
  const tmpPath = filePath.replace(/\.json$/i, `.tmp-${Date.now().toString(36)}.json`)
  const serialized = JSON.stringify(payload, null, 2)
  await writeFile(tmpPath, serialized, 'utf8')

  let lastError: unknown = null
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await rename(tmpPath, filePath)
      return
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)))
    }
  }

  try {
    await copyFile(tmpPath, filePath)
  } finally {
    await unlink(tmpPath).catch(() => undefined)
  }

  if (lastError) {
    console.warn(
      '[project-store] rename fallback used',
      lastError instanceof Error ? lastError.message : String(lastError)
    )
  }
}

export async function writeShard<K extends ShardName>(input: {
  workspaceDir: string
  projectId: string
  shardName: K
  payload: ProjectShardPayloadMap[K]
}): Promise<void> {
  await writeJsonAtomic(
    getShardFilePath(input.workspaceDir, input.projectId, input.shardName),
    input.payload
  )
}

export async function removeProjectDirectory(
  workspaceDir: string,
  projectId: string
): Promise<void> {
  await rm(getProjectDirectoryPath(workspaceDir, projectId), { recursive: true, force: true })
}

export function countDetailedOutlineBeats(
  detailedOutlineBlocks: ProjectSnapshotDto['detailedOutlineBlocks']
): number {
  return Array.isArray(detailedOutlineBlocks)
    ? detailedOutlineBlocks.reduce(
        (total, block) =>
          total + (Array.isArray(block.episodeBeats) ? block.episodeBeats.length : 0),
        0
      )
    : 0
}

export function getProjectCounts(project: ProjectSnapshotDto): ProjectCounts {
  return {
    chatMessages: Array.isArray(project.chatMessages) ? project.chatMessages.length : 0,
    outlineEpisodes: Array.isArray(project.outlineDraft?.summaryEpisodes)
      ? project.outlineDraft.summaryEpisodes.length
      : 0,
    characters: Array.isArray(project.characterDrafts) ? project.characterDrafts.length : 0,
    detailedOutlineBeats: countDetailedOutlineBeats(project.detailedOutlineBlocks),
    scriptSegments: Array.isArray(project.scriptDraft) ? project.scriptDraft.length : 0
  }
}

export function toProjectsIndexEntry(project: ProjectSnapshotDto): ProjectsIndexEntry {
  return {
    id: project.id,
    name: project.name,
    workflowType: project.workflowType,
    stage: project.stage,
    genre: project.genre,
    updatedAt: project.updatedAt,
    counts: getProjectCounts(project)
  }
}

export function buildShardPayloads(project: ProjectSnapshotDto): ProjectShardPayloadMap {
  return {
    meta: {
      id: project.id,
      name: project.name,
      workflowType: project.workflowType,
      stage: project.stage,
      genre: project.genre,
      updatedAt: project.updatedAt
    },
    chat: {
      chatMessages: Array.isArray(project.chatMessages) ? project.chatMessages : [],
      storyIntent: project.storyIntent ?? null
    },
    outline: {
      outlineDraft: project.outlineDraft ?? null
    },
    characters: {
      entityStore: project.entityStore ?? DEFAULT_ENTITY_STORE,
      characterDrafts: Array.isArray(project.characterDrafts) ? project.characterDrafts : []
    },
    'detailed-outline': {
      detailedOutlineBlocks: Array.isArray(project.detailedOutlineBlocks)
        ? project.detailedOutlineBlocks
        : [],
      detailedOutlineSegments: Array.isArray(project.detailedOutlineSegments)
        ? project.detailedOutlineSegments
        : []
    },
    script: {
      scriptDraft: Array.isArray(project.scriptDraft) ? project.scriptDraft : [],
      scriptProgressBoard: project.scriptProgressBoard ?? null,
      scriptFailureResolution: project.scriptFailureResolution ?? null,
      scriptRuntimeFailureHistory: Array.isArray(project.scriptRuntimeFailureHistory)
        ? project.scriptRuntimeFailureHistory
        : [],
      scriptStateLedger: project.scriptStateLedger ?? null
    },
    visible: {
      visibleResult: project.visibleResult,
      formalRelease: project.formalRelease
    },
    generation: {
      generationStatus: project.generationStatus ?? null
    }
  }
}

export function createBaseSnapshot(indexEntry: ProjectsIndexEntry): ProjectSnapshotDto {
  const generationTruth = resolvePersistedGenerationTruth({
    generationStatus: null,
    scriptFailureResolution: null,
    scriptDraft: []
  })

  return {
    id: indexEntry.id,
    name: indexEntry.name,
    workflowType: indexEntry.workflowType,
    stage: indexEntry.stage,
    genre: indexEntry.genre,
    updatedAt: indexEntry.updatedAt,
    chatMessages: [],
    generationStatus: null,
    storyIntent: null,
    entityStore: DEFAULT_ENTITY_STORE,
    outlineDraft: null,
    characterDrafts: [],
    activeCharacterBlocks: [],
    detailedOutlineSegments: [],
    detailedOutlineBlocks: [],
    scriptDraft: [],
    scriptProgressBoard: null,
    scriptFailureResolution: null,
    scriptRuntimeFailureHistory: [],
    scriptStateLedger: null,
    visibleResult: generationTruth.visibleResult,
    formalRelease: generationTruth.formalRelease
  }
}

export function toProjectShellFromIndex(
  indexEntry: ProjectsIndexEntry,
  visibleShard?: Partial<ProjectVisibleShard> | null
): ProjectShellDto {
  const generationTruth = resolvePersistedGenerationTruth({
    generationStatus: null,
    scriptFailureResolution: null,
    scriptDraft: []
  })

  return {
    id: indexEntry.id,
    name: indexEntry.name,
    workflowType: indexEntry.workflowType,
    stage: indexEntry.stage,
    genre: indexEntry.genre,
    updatedAt: indexEntry.updatedAt,
    generationTruth: visibleShard?.visibleResult ?? generationTruth.visibleResult,
    counts: indexEntry.counts
  }
}
