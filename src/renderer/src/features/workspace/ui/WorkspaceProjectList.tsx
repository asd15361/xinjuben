import type { ProjectSnapshotDto, ProjectSummaryDto } from '../../../../../shared/contracts/project'

interface WorkspaceProjectListProps {
  projects: ProjectSummaryDto[]
  activeProject: ProjectSnapshotDto | null
  projectName: string
  onProjectNameChange: (value: string) => void
  onCreateProject: () => void
  onOpenProject: (projectId: string) => void
}

export function WorkspaceProjectList(props: WorkspaceProjectListProps) {
  return (
    <>
      <div className="flex gap-3">
        <input
          value={props.projectName}
          onChange={(event) => props.onProjectNameChange(event.target.value)}
          placeholder="输入项目名，例如：陆总风暴"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none"
        />
        <button
          onClick={props.onCreateProject}
          className="px-4 py-3 rounded-xl text-sm font-bold text-black"
          style={{ background: '#FF7A00' }}
        >
          新建项目
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">最近项目</p>
        {props.projects.length === 0 && <p className="text-xs text-white/35">还没有项目，先新建一个项目再开始。</p>}
        {props.projects.map((project) => {
          const isActive = props.activeProject?.id === project.id
          return (
            <button
              key={project.id}
              onClick={() => props.onOpenProject(project.id)}
              className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                isActive ? 'border-orange-500/30 bg-orange-500/10' : 'border-white/8 bg-white/3 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">{project.name}</p>
                  <p className="text-[11px] text-white/35">
                    {project.workflowType} / {project.stage} / {project.genre || '待定义题材'}
                  </p>
                </div>
                <span className="text-[10px] text-white/25">{new Date(project.updatedAt).toLocaleString()}</span>
              </div>
            </button>
          )
        })}
      </div>
    </>
  )
}
