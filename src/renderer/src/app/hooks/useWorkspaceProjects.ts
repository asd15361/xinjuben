import { useEffect, useState } from 'react'
import type {
  CreateProjectInputDto,
  ProjectSummaryDto
} from '../../../../shared/contracts/project.ts'
import type { ProjectSnapshotDto } from '../../../../shared/contracts/project.ts'
import type {
  OutlineSeedDto,
  SaveCharacterDraftsInputDto,
  SaveDetailedOutlineSegmentsInputDto,
  SaveOutlineDraftInputDto,
  SaveScriptDraftInputDto,
  SaveScriptRuntimeStateInputDto,
  SaveStoryIntentInputDto
} from '../../../../shared/contracts/workspace.ts'
import {
  apiCreateProject,
  apiGetProject,
  apiListProjects,
  apiSaveCharacterDrafts,
  apiSaveDetailedOutlineSegments,
  apiSaveOutlineDraft,
  apiSaveStoryIntent
} from '../../services/api-client.ts'
import { useAuthStore } from '../store/useAuthStore.ts'
import { createOutlineSeed } from '../../services/create-outline-seed.ts'

interface WorkspaceProjectsState {
  projects: ProjectSummaryDto[]
  activeProject: ProjectSnapshotDto | null
  createProject: (input: CreateProjectInputDto) => Promise<void>
  openProject: (projectId: string) => Promise<void>
  saveStoryIntent: (input: SaveStoryIntentInputDto) => Promise<ProjectSnapshotDto | null>
  saveOutlineDraft: (input: SaveOutlineDraftInputDto) => Promise<ProjectSnapshotDto | null>
  saveCharacterDrafts: (input: SaveCharacterDraftsInputDto) => Promise<ProjectSnapshotDto | null>
  saveDetailedOutlineSegments: (
    input: SaveDetailedOutlineSegmentsInputDto
  ) => Promise<ProjectSnapshotDto | null>
  saveScriptDraft: (input: SaveScriptDraftInputDto) => Promise<ProjectSnapshotDto | null>
  saveScriptRuntimeState: (
    input: SaveScriptRuntimeStateInputDto
  ) => Promise<ProjectSnapshotDto | null>
  createOutlineSeed: (projectId: string) => Promise<OutlineSeedDto | null>
  reload: () => Promise<void>
}

export function useWorkspaceProjects(): WorkspaceProjectsState {
  const [projects, setProjects] = useState<ProjectSummaryDto[]>([])
  const [activeProject, setActiveProject] = useState<ProjectSnapshotDto | null>(null)

  async function reload(): Promise<void> {
    const result = await apiListProjects()
    setProjects(result.projects)
  }

  async function createProject(input: CreateProjectInputDto): Promise<void> {
    const result = await apiCreateProject(input)
    await reload()
    setActiveProject(result.project)
  }

  async function openProject(projectId: string): Promise<void> {
    const result = await apiGetProject(projectId)
    setActiveProject(result.project)
  }

  async function saveStoryIntent(
    input: SaveStoryIntentInputDto
  ): Promise<ProjectSnapshotDto | null> {
    const result = await apiSaveStoryIntent(input)
    setActiveProject(result.project)
    await reload()
    return result.project
  }

  async function saveOutlineDraft(
    input: SaveOutlineDraftInputDto
  ): Promise<ProjectSnapshotDto | null> {
    const result = await apiSaveOutlineDraft(input)
    setActiveProject(result.project)
    await reload()
    return result.project
  }

  async function saveCharacterDrafts(
    input: SaveCharacterDraftsInputDto
  ): Promise<ProjectSnapshotDto | null> {
    const result = await apiSaveCharacterDrafts(input)
    setActiveProject(result.project)
    await reload()
    return result.project
  }

  async function saveDetailedOutlineSegments(
    input: SaveDetailedOutlineSegmentsInputDto
  ): Promise<ProjectSnapshotDto | null> {
    const result = await apiSaveDetailedOutlineSegments(input)
    setActiveProject(result.project)
    await reload()
    return result.project
  }

  async function saveScriptDraft(
    input: SaveScriptDraftInputDto
  ): Promise<ProjectSnapshotDto | null> {
    const userId = useAuthStore.getState().user?.id
    if (!userId) throw new Error('未登录')
    await window.api.workspace.saveScriptDraft(userId, input.projectId, input.scriptDraft)
    const next =
      activeProject && activeProject.id === input.projectId
        ? { ...activeProject, scriptDraft: input.scriptDraft }
        : activeProject
    setActiveProject(next)
    return next
  }

  async function saveScriptRuntimeState(
    input: SaveScriptRuntimeStateInputDto
  ): Promise<ProjectSnapshotDto | null> {
    const userId = useAuthStore.getState().user?.id
    if (!userId) throw new Error('未登录')
    await window.api.workspace.saveRuntimeState(userId, input.projectId, {
      scriptProgressBoard: input.scriptProgressBoard ?? null,
      scriptFailureResolution: input.scriptFailureResolution ?? null,
      scriptStateLedger: input.scriptStateLedger ?? null,
      scriptRuntimeFailureHistory: input.scriptRuntimeFailureHistory
    })
    const next =
      activeProject && activeProject.id === input.projectId
        ? {
            ...activeProject,
            scriptProgressBoard: input.scriptProgressBoard ?? null,
            scriptFailureResolution: input.scriptFailureResolution ?? null,
            scriptStateLedger: input.scriptStateLedger ?? null,
            scriptRuntimeFailureHistory: input.scriptRuntimeFailureHistory ?? []
          }
        : activeProject
    setActiveProject(next)
    return next
  }

  async function createOutlineSeedFromProject(projectId: string): Promise<OutlineSeedDto | null> {
    const result = await apiGetProject(projectId)
    if (!result.project) return null
    return createOutlineSeed(result.project)
  }

  useEffect(() => {
    let cancelled = false
    const load = async (): Promise<void> => {
      const result = await apiListProjects()
      if (!cancelled) {
        setProjects(result.projects)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return {
    projects,
    activeProject,
    createProject,
    openProject,
    saveStoryIntent,
    saveOutlineDraft,
    saveCharacterDrafts,
    saveDetailedOutlineSegments,
    saveScriptDraft,
    saveScriptRuntimeState,
    createOutlineSeed: createOutlineSeedFromProject,
    reload
  }
}
