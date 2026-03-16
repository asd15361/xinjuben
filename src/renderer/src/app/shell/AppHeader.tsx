import { Home } from 'lucide-react'
import { useProjectGenerationProgress } from '../hooks/useProjectGenerationProgress'
import { useWorkflowStore } from '../store/useWorkflowStore'
import { useRuntimeInfo } from '../hooks/useRuntimeInfo'
import { useStageStore } from '../../store/useStageStore'
import { AppIdentityBadge } from './AppIdentityBadge'

export function AppHeader() {
  const currentStage = useWorkflowStore((state) => state.currentStage)
  const projectId = useWorkflowStore((state) => state.projectId)
  const projectName = useWorkflowStore((state) => state.projectName)
  const generationStatus = useWorkflowStore((state) => state.generationStatus)
  const resetWorkflow = useWorkflowStore((state) => state.reset)
  const resetStage = useStageStore((state) => state.reset)
  const { appInfo } = useRuntimeInfo()
  const { remainingSeconds } = useProjectGenerationProgress(generationStatus)
  const currentStageLabel = {
    chat: '灵感对话',
    outline: '粗略大纲',
    character: '人物小传',
    detailed_outline: '详细大纲',
    script: '剧本定稿'
  }[currentStage]

  const backToHome = () => {
    // Hard reset: avoid "串项目" and multi-truth leaks.
    resetStage()
    resetWorkflow()
  }

  return (
    <header
      className="h-20 border-b border-white/5 flex items-center px-10 justify-between backdrop-blur-sm relative z-10"
      style={{ background: 'rgba(0,0,0,0.2)' }}
    >
      <div className="flex items-center gap-3">
        <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#FF7A00' }} />
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">
          {projectId ? (
            <>
              项目：<span className="text-white">{projectName || '未命名'}</span> /{' '}
              <span className="text-white">{currentStageLabel}</span>
            </>
          ) : (
            <>
              首页 / <span className="text-white">项目总览</span>
            </>
          )}
        </h2>
        {appInfo && <span className="text-[10px] text-white/20">v{appInfo.version}</span>}
      </div>

      <div className="flex items-center gap-6">
        {generationStatus && (
          <div className="hidden lg:flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/8 px-3 py-1.5">
            <span className="text-[10px] font-black text-orange-300">{generationStatus.title}</span>
            <span className="text-[10px] text-white/45">预计还要 {remainingSeconds} 秒</span>
            {generationStatus.autoChain && generationStatus.nextTask && (
              <span className="text-[10px] text-orange-200/65">完成后自动继续</span>
            )}
          </div>
        )}
        {projectId && (
          <button
            onClick={backToHome}
            className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/25 hover:text-white/70 transition-colors"
          >
            <Home size={12} className="opacity-70 group-hover:opacity-100 transition-opacity" />
            回到项目首页
          </button>
        )}
        <AppIdentityBadge appName={appInfo?.name || 'XINJUBEN'} />
      </div>
    </header>
  )
}
