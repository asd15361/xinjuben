import { useEffect, useMemo, useState } from 'react'
import type { ProjectSummaryDto } from '../../../../../shared/contracts/project.ts'
import { openProjectSession } from '../../../app/services/stage-session-service.ts'
import {
  apiCreateProject,
  apiDeleteProject,
  apiListProjects
} from '../../../services/api-client.ts'

export function formatProjectTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function useHomePageActions(): {
  busy: boolean
  canCreate: boolean
  projectName: string
  projects: ProjectSummaryDto[]
  query: string
  status: string
  visibleProjects: ProjectSummaryDto[]
  setProjectName: (value: string) => void
  setQuery: (value: string) => void
  createProject: () => Promise<void>
  openProject: (projectId: string) => Promise<void>
  reload: () => Promise<void>
  removeProject: (projectId: string, name: string) => Promise<void>
} {
  const [projects, setProjects] = useState<ProjectSummaryDto[]>([])
  const [busy, setBusy] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState(
    '第 1 步：先创建或打开一个项目。进入项目后，默认就是和 AI 聊天。'
  )

  async function reload(): Promise<void> {
    const list = await apiListProjects()
    setProjects(list.projects)
  }

  async function removeProject(projectId: string, name: string): Promise<void> {
    if (busy) return
    const ok = window.confirm(`确定删除项目「${name}」吗？删除后无法恢复。`)
    if (!ok) return
    setBusy(true)
    try {
      await apiDeleteProject(projectId)
      await reload()
      setStatus(`已删除项目「${name}」。`)
    } finally {
      setBusy(false)
    }
  }

  async function openProject(projectId: string): Promise<void> {
    setBusy(true)
    try {
      const result = await openProjectSession(projectId)
      if (!result) {
        setStatus('打开失败：项目不存在或已损坏。')
        return
      }

      const openedProjectName =
        result.project?.name ??
        projects.find((project) => project.id === projectId)?.name ??
        '未命名项目'
      setStatus(`已进入项目「${openedProjectName}」。`)
    } finally {
      setBusy(false)
    }
  }

  async function createProject(): Promise<void> {
    if (!canCreate) return
    setBusy(true)
    try {
      await apiCreateProject({
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
    return projects.filter((project) =>
      `${project.name} ${project.genre} ${project.stage}`.toLowerCase().includes(q)
    )
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
