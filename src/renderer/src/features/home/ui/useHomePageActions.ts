import { useEffect, useMemo, useState } from 'react'
import type { ProjectSnapshotDto, ProjectSummaryDto } from '../../../../../shared/contracts/project'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'
import { useStageStore } from '../../../store/useStageStore'

export function formatProjectTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function useHomePageActions() {
  const setProjectId = useWorkflowStore((state) => state.setProjectId)
  const setProjectNameInShell = useWorkflowStore((state) => state.setProjectName)
  const setChatMessages = useWorkflowStore((state) => state.setChatMessages)
  const setGenerationStatus = useWorkflowStore((state) => state.setGenerationStatus)
  const setStage = useWorkflowStore((state) => state.setStage)
  const setStoryIntent = useWorkflowStore((state) => state.setStoryIntent)
  const hydrateProjectDrafts = useStageStore((state) => state.hydrateProjectDrafts)

  const [projects, setProjects] = useState<ProjectSummaryDto[]>([])
  const [busy, setBusy] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('第 1 步：先创建或打开一个项目。进入项目后，默认就是和 AI 聊天。')

  async function reload(): Promise<void> {
    const list = await window.api.workspace.listProjects()
    setProjects(list.projects)
  }

  function enterProject(project: ProjectSnapshotDto): void {
    setProjectId(project.id)
    setProjectNameInShell(project.name)
    setChatMessages(project.chatMessages || [])
    setGenerationStatus(project.generationStatus || null)
    setStoryIntent(project.storyIntent)
    hydrateProjectDrafts({
      outline: project.outlineDraft,
      characters: project.characterDrafts,
      segments: project.detailedOutlineSegments,
      script: project.scriptDraft
    })
    setStage('chat')
    setStatus(`已进入项目「${project.name}」。`)
  }

  async function removeProject(projectId: string, name: string): Promise<void> {
    if (busy) return
    const ok = window.confirm(`确定删除项目「${name}」吗？删除后无法恢复。`)
    if (!ok) return
    setBusy(true)
    try {
      await window.api.workspace.deleteProject({ projectId })
      await reload()
      setStatus(`已删除项目「${name}」。`)
    } finally {
      setBusy(false)
    }
  }

  async function openProject(projectId: string): Promise<void> {
    setBusy(true)
    try {
      const project = await window.api.workspace.getProject(projectId)
      if (!project) {
        setStatus('打开失败：项目不存在或已损坏。')
        return
      }

      enterProject(project)
    } finally {
      setBusy(false)
    }
  }

  async function createProject(): Promise<void> {
    if (!canCreate) return
    setBusy(true)
    try {
      await window.api.workspace.createProject({
        name: projectName.trim(),
        workflowType: 'ai_write'
      })
      setProjectName('')
      await reload()
      setStatus(`项目「${projectName.trim()}」创建成功，已添加到列表。`)
    } finally {
      setBusy(false)
    }
  }


  useEffect(() => {
    void reload()
  }, [])

  const canCreate = useMemo(() => projectName.trim().length > 0 && !busy, [projectName, busy])
  const visibleProjects = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return projects
    return projects.filter((project) => `${project.name} ${project.genre} ${project.stage}`.toLowerCase().includes(q))
  }, [projects, query])

  return {
    busy,
    canCreate,
    projectName,
    projects,
    query,
    status,
    visibleProjects,
    setProjectName,
    setQuery,
    createProject,
    openProject,
    reload,
    removeProject
  }
}
