import type { CreateProjectInputDto, ProjectSnapshotDto, ProjectSummaryDto } from '../../../shared/contracts/project'
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
import { createProjectId, readStore, toSummary, withStoreLock, writeStore } from './project-store-core'
import { updateProject } from './project-store-updater'

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
      outlineDraft: null,
      characterDrafts: [],
      detailedOutlineSegments: [],
      scriptDraft: [],
      scriptProgressBoard: null,
      scriptResumeResolution: null,
      scriptFailureResolution: null,
      scriptStateLedger: null
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const store = await readStore()
      store.projects[project.id] = project
      await writeStore(store)

      const verify = await readStore()
      if (verify.projects[project.id]) {
        return project
      }

      await new Promise((resolve) => setTimeout(resolve, 80 * (attempt + 1)))
    }

    const finalStore = await readStore()
    finalStore.projects[project.id] = project
    await writeStore(finalStore)
    return project
  })
}

export async function deleteProject(projectId: string): Promise<boolean> {
  return withStoreLock(async () => {
    const store = await readStore()
    if (!store.projects[projectId]) return false
    delete store.projects[projectId]
    await writeStore(store)
    return true
  })
}

export async function getProject(projectId: string): Promise<ProjectSnapshotDto | null> {
  const store = await readStore()
  return store.projects[projectId] ?? null
}

export async function saveStoryIntent(input: SaveStoryIntentInputDto): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => ({
      ...existing,
      storyIntent: input.storyIntent,
      updatedAt: new Date().toISOString()
    }))
}

export async function saveChatMessages(input: SaveChatMessagesInputDto): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => ({
      ...existing,
      chatMessages: input.chatMessages,
      updatedAt: new Date().toISOString()
    }))
}

export async function saveGenerationStatus(input: SaveGenerationStatusInputDto): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => ({
      ...existing,
      generationStatus: input.generationStatus,
      updatedAt: new Date().toISOString()
    }))
}

export async function saveOutlineDraft(input: SaveOutlineDraftInputDto): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => ({
      ...existing,
      outlineDraft: input.outlineDraft,
      genre: input.outlineDraft.genre.trim() || existing.genre,
      updatedAt: new Date().toISOString()
    }))
}

export async function saveCharacterDrafts(input: SaveCharacterDraftsInputDto): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => ({
      ...existing,
      characterDrafts: input.characterDrafts,
      updatedAt: new Date().toISOString()
    }))
}

export async function saveDetailedOutlineSegments(
  input: SaveDetailedOutlineSegmentsInputDto
): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => ({
      ...existing,
      detailedOutlineSegments: input.detailedOutlineSegments,
      updatedAt: new Date().toISOString()
    }))
}

export async function saveScriptDraft(input: SaveScriptDraftInputDto): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => ({
      ...existing,
      scriptDraft: input.scriptDraft,
      updatedAt: new Date().toISOString()
    }))
}

export async function saveScriptRuntimeState(input: SaveScriptRuntimeStateInputDto): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => ({
      ...existing,
      scriptProgressBoard: input.scriptProgressBoard,
      scriptResumeResolution: input.scriptResumeResolution,
      scriptFailureResolution: input.scriptFailureResolution,
      scriptStateLedger: input.scriptStateLedger ?? existing.scriptStateLedger,
      updatedAt: new Date().toISOString()
    }))
}

export async function saveOutlineAndCharacters(input: {
  projectId: string
  storyIntent: ProjectSnapshotDto['storyIntent']
  outlineDraft: ProjectSnapshotDto['outlineDraft']
  characterDrafts: ProjectSnapshotDto['characterDrafts']
}): Promise<ProjectSnapshotDto | null> {
  return updateProject(input.projectId, (existing) => ({
      ...existing,
      storyIntent: input.storyIntent ?? existing.storyIntent,
      outlineDraft: input.outlineDraft,
      characterDrafts: input.characterDrafts,
      detailedOutlineSegments: [],
      scriptDraft: [],
      scriptProgressBoard: null,
      scriptResumeResolution: null,
      scriptFailureResolution: null,
      scriptStateLedger: null,
      genre: input.outlineDraft?.genre?.trim() || existing.genre,
      stage: 'outline',
      updatedAt: new Date().toISOString()
    }))
}
