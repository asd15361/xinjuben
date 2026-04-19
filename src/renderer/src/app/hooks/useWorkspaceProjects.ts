import { useEffect, useState } from 'react'
import type { CreateProjectInputDto, ProjectSummaryDto } from '../../../../shared/contracts/project'
import type { ProjectSnapshotDto } from '../../../../shared/contracts/project'
import type {
  OutlineSeedDto,
  SaveCharacterDraftsInputDto,
  SaveDetailedOutlineSegmentsInputDto,
  SaveOutlineDraftInputDto,
  SaveScriptDraftInputDto,
  SaveScriptRuntimeStateInputDto,
  SaveStoryIntentInputDto
} from '../../../../shared/contracts/workspace'
import {
  apiCreateProject,
  apiGetProject,
  apiListProjects,
  apiSaveCharacterDrafts,
  apiSaveDetailedOutlineSegments,
  apiSaveOutlineDraft,
  apiSaveScriptDraft,
  apiSaveScriptRuntimeState,
  apiSaveStoryIntent
} from '../../services/api-client'

interface WorkspaceProjectsState {
  projects: ProjectSummaryDto[]
  activeProject: ProjectSnapshotDto | null
  createProject: (input: CreateProjectInputDto) => Promise<void>
  openProject: (projectId: string) => Promise<void>
  saveStoryIntent: (input: SaveStoryIntentInputDto) => Promise<ProjectSnapshotDto | null>
  saveOutlineDraft: (input: SaveOutlineDraftInputDto) => Promise<ProjectSnapshotDto | null>
  saveCharacterDrafts: (input: SaveCharacterDraftsInputDto) => Promise<ProjectSnapshotDto | null>
  saveDetailedOutlineSegments: (input: SaveDetailedOutlineSegmentsInputDto) => Promise<ProjectSnapshotDto | null>
  saveScriptDraft: (input: SaveScriptDraftInputDto) => Promise<ProjectSnapshotDto | null>
  saveScriptRuntimeState: (input: SaveScriptRuntimeStateInputDto) => Promise<ProjectSnapshotDto | null>
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

  async function saveStoryIntent(input: SaveStoryIntentInputDto): Promise<ProjectSnapshotDto | null> {
    const result = await apiSaveStoryIntent(input)
    setActiveProject(result.project)
    await reload()
    return result.project
  }

  async function saveOutlineDraft(input: SaveOutlineDraftInputDto): Promise<ProjectSnapshotDto | null> {
    const result = await apiSaveOutlineDraft(input)
    setActiveProject(result.project)
    await reload()
    return result.project
  }

  async function saveCharacterDrafts(input: SaveCharacterDraftsInputDto): Promise<ProjectSnapshotDto | null> {
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

  async function saveScriptDraft(input: SaveScriptDraftInputDto): Promise<ProjectSnapshotDto | null> {
    const result = await apiSaveScriptDraft(input)
    setActiveProject(result.project)
    await reload()
    return result.project
  }

  async function saveScriptRuntimeState(input: SaveScriptRuntimeStateInputDto): Promise<ProjectSnapshotDto | null> {
    const result = await apiSaveScriptRuntimeState(input)
    setActiveProject(result.project)
    await reload()
    return result.project
  }

  async function createOutlineSeed(projectId: string): Promise<OutlineSeedDto | null> {
    return window.api.workspace.createOutlineSeed({ projectId })
  }

  useEffect(() => {
    void reload()
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
    createOutlineSeed,
    reload
  }
}
