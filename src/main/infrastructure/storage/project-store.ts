import type {
  CreateProjectInputDto,
  ProjectSnapshotDto,
  ProjectSummaryDto
} from '../../../shared/contracts/project'
import { createFormalBlockedState } from '../../../shared/contracts/visible-release-state.ts'
import type { OutlineDraftDto } from '../../../shared/contracts/workflow'
import { resolvePersistedGenerationTruth } from '../../../shared/domain/workflow/persisted-generation-truth.ts'
import { deriveProjectCharacterBlocks } from '../../../shared/domain/workflow/planning-blocks.ts'
import { guardianEnforceCharacterSave } from '../../../shared/domain/workflow/stage-guardians.ts'
import type {
  SaveChatMessagesInputDto,
  SaveCharacterDraftsInputDto,
  SaveDetailedOutlineSegmentsInputDto,
  SaveGenerationStatusInputDto,
  SaveOutlineDraftInputDto,
  SaveScriptDraftInputDto,
  SaveScriptRuntimeStateInputDto,
  SaveStoryIntentInputDto
} from '../../../shared/contracts/workspace'
import {
  createProjectId,
  readStore,
  toSummary,
  withStoreLock,
  writeStore
} from './project-store-core'
import { mirrorProjectDeletion, mirrorProjectSnapshot } from './project-store-shard-sync.ts'
import { mergeOutlineDraftAuthorityForSave } from './merge-outline-draft-authority.ts'
import { updateProject } from './project-store-updater'
import { resolveDetailedOutlinePersistence } from './resolve-detailed-outline-persistence.ts'

function createEmptyOutlineDraft(): OutlineDraftDto {
  return {
    title: '',
    genre: '',
    theme: '',
    mainConflict: '',
    protagonist: '',
    summary: '',
    summaryEpisodes: [],
    facts: []
  }
}

function deriveProjectActiveCharacterBlocks(input: {
  outlineDraft: ProjectSnapshotDto['outlineDraft']
  characterDrafts: ProjectSnapshotDto['characterDrafts']
}): ProjectSnapshotDto['activeCharacterBlocks'] {
  return deriveProjectCharacterBlocks({
    outline: input.outlineDraft,
    characters: input.characterDrafts
  })
}

export async function listProjects(): Promise<ProjectSummaryDto[]> {
  const store = await readStore()
  return Object.values(store.projects)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(toSummary)
}

export async function createProject(input: CreateProjectInputDto): Promise<ProjectSnapshotDto> {
  return withStoreLock(async () => {
    const now = new Date().toISOString()
    const project: ProjectSnapshotDto = {
      id: createProjectId(),
      name: input.name.trim(),
      workflowType: input.workflowType,
      stage: 'chat',
      genre: input.genre?.trim() || '',
      updatedAt: now,
      chatMessages: [],
      generationStatus: null,
      storyIntent: null,
      entityStore: { characters: [], factions: [], locations: [], items: [], relations: [] },
      outlineDraft: null,
      characterDrafts: [],
      activeCharacterBlocks: [],
      detailedOutlineBlocks: [],
      detailedOutlineSegments: [],
      scriptDraft: [],
      scriptProgressBoard: null,
      scriptFailureResolution: null,
      scriptRuntimeFailureHistory: [],
      scriptStateLedger: null,
      visibleResult: {
        status: 'pending',
        description: '当前还没有可见结果。',
        payload: null,
        failureResolution: null,
        updatedAt: now
      },
      formalRelease: createFormalBlockedState(
        [{ code: 'UNKNOWN_BLOCKED', message: '当前还没有正式放行结果。', category: 'process' }],
        '当前还没有正式放行结果。'
      )
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const store = await readStore()
      store.projects[project.id] = project
      await writeStore(store)
      await mirrorProjectSnapshot(project)

      const verify = await readStore()
      if (verify.projects[project.id]) {
        return project
      }

      await new Promise((resolve) => setTimeout(resolve, 80 * (attempt + 1)))
    }

    const finalStore = await readStore()
    finalStore.projects[project.id] = project
    await writeStore(finalStore)
    await mirrorProjectSnapshot(project)
    return project
  })
}

export async function deleteProject(projectId: string): Promise<boolean> {
  return withStoreLock(async () => {
    const store = await readStore()
    if (!store.projects[projectId]) return false
    delete store.projects[projectId]
    await writeStore(store)
    await mirrorProjectDeletion(projectId)
    return true
  })
}

export async function getProject(projectId: string): Promise<ProjectSnapshotDto | null> {
  const store = await readStore()
  return store.projects[projectId] ?? null
}

export async function saveStoryIntent(
  input: SaveStoryIntentInputDto
): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => ({
    ...existing,
    storyIntent: input.storyIntent,
    entityStore: input.entityStore ?? existing.entityStore,
    updatedAt: new Date().toISOString()
  }))
}

export async function saveChatMessages(
  input: SaveChatMessagesInputDto
): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => ({
    ...existing,
    chatMessages: input.chatMessages,
    updatedAt: new Date().toISOString()
  }))
}

export async function saveGenerationStatus(
  input: SaveGenerationStatusInputDto
): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => ({
    ...existing,
    generationStatus: input.generationStatus,
    updatedAt: new Date().toISOString()
  }))
}

export async function saveOutlineDraft(
  input: SaveOutlineDraftInputDto
): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => {
    const outlineDraft = mergeOutlineDraftAuthorityForSave({
      existing: existing.outlineDraft,
      incoming: input.outlineDraft
    })

    return {
      ...existing,
      outlineDraft,
      activeCharacterBlocks: deriveProjectActiveCharacterBlocks({
        outlineDraft,
        characterDrafts: existing.characterDrafts
      }),
      genre: outlineDraft.genre.trim() || existing.genre,
      updatedAt: new Date().toISOString()
    }
  })
}

/**
 * 保存含七问的 outlineDraft（七问只写 outlineBlocks，不写 project.sevenQuestions）。
 *
 * 这是七问确认工作流的唯一合法写入口。
 */
export async function saveOutlineDraftWithSevenQuestions(input: {
  projectId: string
  outlineDraft: OutlineDraftDto
}): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => ({
    ...existing,
    // 七问只写 outlineBlocks，顶层字段由 outlineBlocks 派生，不再独立写入
    outlineDraft: input.outlineDraft,
    activeCharacterBlocks: deriveProjectActiveCharacterBlocks({
      outlineDraft: input.outlineDraft,
      characterDrafts: existing.characterDrafts
    }),
    genre: input.outlineDraft.genre.trim() || existing.genre,
    updatedAt: new Date().toISOString()
  }))
}

export async function saveCharacterDrafts(
  input: SaveCharacterDraftsInputDto
): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => {
    const outlineDraft = existing.outlineDraft ?? createEmptyOutlineDraft()
    const activeCharacterBlocks = deriveProjectActiveCharacterBlocks({
      outlineDraft: existing.outlineDraft,
      characterDrafts: input.characterDrafts
    })
    guardianEnforceCharacterSave(outlineDraft, input.characterDrafts, activeCharacterBlocks)

    return {
      ...existing,
      characterDrafts: input.characterDrafts,
      activeCharacterBlocks,
      updatedAt: new Date().toISOString()
    }
  })
}

export async function saveDetailedOutlineSegments(
  input: SaveDetailedOutlineSegmentsInputDto
): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => ({
    ...existing,
    ...resolveDetailedOutlinePersistence({
      outlineDraft: existing.outlineDraft,
      characterDrafts: existing.characterDrafts,
      activeCharacterBlocks: existing.activeCharacterBlocks,
      detailedOutlineSegments: input.detailedOutlineSegments
    })
  }))
}

export async function saveScriptDraft(
  input: SaveScriptDraftInputDto
): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => {
    const generationTruth = resolvePersistedGenerationTruth({
      generationStatus: existing.generationStatus,
      scriptFailureResolution: existing.scriptFailureResolution,
      scriptDraft: input.scriptDraft,
      scriptStateLedger: existing.scriptStateLedger
    })

    return {
      ...existing,
      scriptDraft: input.scriptDraft,
      visibleResult: generationTruth.visibleResult,
      formalRelease: generationTruth.formalRelease,
      updatedAt: new Date().toISOString()
    }
  })
}

export async function saveScriptRuntimeState(
  input: SaveScriptRuntimeStateInputDto
): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => {
    const generationTruth = resolvePersistedGenerationTruth({
      generationStatus: existing.generationStatus,
      scriptFailureResolution: input.scriptFailureResolution,
      scriptDraft: existing.scriptDraft,
      scriptStateLedger: input.scriptStateLedger ?? existing.scriptStateLedger
    })

    return {
      ...existing,
      scriptProgressBoard: input.scriptProgressBoard,
      scriptFailureResolution: input.scriptFailureResolution,
      scriptRuntimeFailureHistory:
        input.scriptRuntimeFailureHistory ?? existing.scriptRuntimeFailureHistory,
      scriptStateLedger: input.scriptStateLedger ?? existing.scriptStateLedger,
      visibleResult: generationTruth.visibleResult,
      formalRelease: generationTruth.formalRelease,
      updatedAt: new Date().toISOString()
    }
  })
}

export async function saveOutlineAndCharacters(input: {
  projectId: string
  storyIntent: ProjectSnapshotDto['storyIntent']
  outlineDraft: ProjectSnapshotDto['outlineDraft']
  characterDrafts: ProjectSnapshotDto['characterDrafts']
}): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => {
    const outlineDraft = input.outlineDraft ?? createEmptyOutlineDraft()
    const activeCharacterBlocks = deriveProjectActiveCharacterBlocks({
      outlineDraft: input.outlineDraft,
      characterDrafts: input.characterDrafts
    })
    guardianEnforceCharacterSave(outlineDraft, input.characterDrafts, activeCharacterBlocks)

    const generationTruth = resolvePersistedGenerationTruth({
      generationStatus: existing.generationStatus,
      scriptFailureResolution: null,
      scriptDraft: []
    })

    return {
      ...existing,
      storyIntent: input.storyIntent ?? existing.storyIntent,
      outlineDraft: input.outlineDraft,
      characterDrafts: input.characterDrafts,
      activeCharacterBlocks,
      detailedOutlineSegments: [],
      scriptDraft: [],
      scriptProgressBoard: null,
      scriptFailureResolution: null,
      scriptRuntimeFailureHistory: [],
      scriptStateLedger: null,
      visibleResult: generationTruth.visibleResult,
      formalRelease: generationTruth.formalRelease,
      genre: input.outlineDraft?.genre?.trim() || existing.genre,
      stage: 'outline',
      updatedAt: new Date().toISOString()
    }
  })
}
