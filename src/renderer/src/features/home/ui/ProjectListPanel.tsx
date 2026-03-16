import type { ProjectSummaryDto } from '../../../../../shared/contracts/project'
import { formatProjectTime } from './useHomePageActions'

interface ProjectListPanelProps {
  busy: boolean
  projects: ProjectSummaryDto[]
  visibleProjects: ProjectSummaryDto[]
  query: string
  onQueryChange: (value: string) => void
  onReload: () => void
  onOpenProject: (projectId: string) => void
  onRemoveProject: (projectId: string, name: string) => void
}

export function ProjectListPanel(props: ProjectListPanelProps) {
  const { busy, projects, visibleProjects, query, onQueryChange, onReload, onOpenProject, onRemoveProject } = props

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white/[0.01] rounded-2xl border border-white/[0.05] p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-sm font-black text-white/80 flex items-center gap-2">
            我的项目库
            <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-[10px] text-white/30">{projects.length}</span>
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="搜索..."
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-white placeholder-white/20 focus:outline-none focus:border-orange-500/50 transition-all w-32 sm:w-48"
              disabled={busy}
            />
          </div>
          <button
            onClick={onReload}
            className="rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-all"
            disabled={busy}
          >
            同步
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 -mr-1 custom-scrollbar">
        {visibleProjects.length === 0 ? (
          <div className="h-40 flex items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
            <p className="text-[11px] text-white/20 tracking-wider">
              {projects.length === 0 ? '暂无项目数据，请在上方快速创建' : '未找到匹配的项目'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pb-4">
            {visibleProjects.map((project) => (
              <div
                key={project.id}
                className="group relative rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] hover:border-orange-500/30 transition-all duration-300 p-4"
              >
                <button
                  onClick={() => onOpenProject(project.id)}
                  className="w-full text-left outline-none"
                  disabled={busy}
                >
                  <div className="flex justify-between items-start mb-2 group-hover:translate-x-0.5 transition-transform">
                    <p className="text-[13px] font-black text-white/70 group-hover:text-orange-400 transition-colors truncate pr-4">
                      {project.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-white/30 font-bold uppercase tracking-tighter bg-white/5 px-1.5 py-0.5 rounded">
                      {project.genre || '未分类'}
                    </span>
                    <span className="text-white/20">|</span>
                    <span className="text-white/25">{project.stage}</span>
                  </div>
                  <p className="text-[9px] text-white/15 mt-4 font-mono">最近更新：{formatProjectTime(project.updatedAt).split(',')[0]}</p>
                </button>

                <button
                  onClick={() => onRemoveProject(project.id, project.name)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-500/20 text-white/10 hover:text-red-400 transition-all z-10"
                  disabled={busy}
                  title="删除项目"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
