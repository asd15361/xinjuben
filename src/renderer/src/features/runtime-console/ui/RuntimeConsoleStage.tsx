import type { ReactElement } from 'react'
import { Activity, AlertTriangle, PauseCircle, PlayCircle } from 'lucide-react'
import { switchStageSession } from '../../../app/services/stage-session-service'
import { useRuntimeConsoleStore } from '../../../app/store/useRuntimeConsoleStore'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'

function formatElapsed(startedAt: number): string {
  const elapsedMs = Math.max(0, Date.now() - startedAt)
  return `${Math.floor(elapsedMs / 1000)} 秒`
}

export function RuntimeConsoleStage(): ReactElement {
  const projectId = useWorkflowStore((state) => state.projectId)
  const state = useRuntimeConsoleStore((store) =>
    projectId ? store.byProjectId[projectId] || { activeTask: null, recentEvents: [] } : null
  )

  if (!projectId || !state) {
    return (
      <div className="h-full overflow-y-auto pr-2 pb-24 custom-scrollbar">
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
          <p className="text-sm font-black text-white/85">当前还没有选中项目。</p>
        </div>
      </div>
    )
  }

  const activeTask = state.activeTask

  return (
    <div className="h-full overflow-y-auto pr-2 pb-24 custom-scrollbar space-y-6">
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.05] pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <Activity size={18} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white/90">运行控制台</h2>
            <p className="text-[11px] text-white/40 mt-0.5">
              这里只放任务、进度、失败和恢复，不放创作正文。
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            if (projectId) {
              void switchStageSession(projectId, 'script')
            }
          }}
          className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black text-white/70 hover:text-white hover:bg-white/5 transition-colors"
        >
          回剧本
        </button>
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-4">
        <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">当前任务</p>
        {activeTask ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-black text-white/90">{activeTask.title}</p>
                <p className="text-[11px] text-white/55">{activeTask.detail}</p>
              </div>
              <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[10px] font-black text-orange-300">
                {activeTask.phase}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-white/8 bg-black/15 px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-white/20">状态</p>
                <p className="mt-2 text-sm font-black text-white/85">{activeTask.status}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/15 px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-white/20">已运行</p>
                <p className="mt-2 text-sm font-black text-white/85">
                  {formatElapsed(activeTask.startedAt)}
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/15 px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-white/20">批次</p>
                <p className="mt-2 text-sm font-black text-white/85">
                  {activeTask.board
                    ? `第 ${activeTask.board.batchContext.startEpisode}-${activeTask.board.batchContext.endEpisode} 集`
                    : '等待批次信息'}
                </p>
              </div>
            </div>
            {activeTask.status === 'running' && (
              <button
                onClick={() => {
                  if (window.api.workflow.stopScriptGeneration) {
                    void window.api.workflow.stopScriptGeneration({ projectId })
                  }
                }}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black text-white/80 hover:text-white hover:bg-white/5 transition-colors"
              >
                停止当前任务
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-white/45">当前没有正在运行的后台任务。</p>
        )}
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-4">
        <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">最近事件</p>
        {state.recentEvents.length === 0 ? (
          <p className="text-sm text-white/45">当前还没有可显示的运行事件。</p>
        ) : (
          <div className="space-y-3">
            {state.recentEvents.map((event) => {
              const Icon =
                event.level === 'error'
                  ? AlertTriangle
                  : event.message.includes('停止')
                    ? PauseCircle
                    : PlayCircle
              return (
                <div
                  key={event.id}
                  className="rounded-xl border border-white/8 bg-black/15 px-4 py-3 flex items-start gap-3"
                >
                  <Icon
                    size={16}
                    className={event.level === 'error' ? 'text-rose-300' : 'text-orange-300'}
                  />
                  <div className="min-w-0">
                    <p className="text-[12px] text-white/80">{event.message}</p>
                    <p className="mt-1 text-[10px] text-white/30">
                      {new Date(event.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
