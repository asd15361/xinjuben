import { motion } from 'framer-motion'
import {
  ChevronRight,
  Sparkles,
  Users,
  FileText,
  PenTool,
  Zap,
  MessageCircle
} from 'lucide-react'
import type { WorkflowStage } from '../../../../shared/contracts/workflow'
import type { ProjectGenerationStatusDto } from '../../../../shared/contracts/generation'
import { useProjectGenerationProgress } from '../hooks/useProjectGenerationProgress'
import { switchStageSession } from '../services/stage-session-service'
import { getGenerationTimingLabel } from '../services/generation-timing-service'
import { useWorkflowStore } from '../store/useWorkflowStore'

const STAGES = [
  { id: 'chat', label: '灵感对话', icon: MessageCircle, desc: '先把故事说清楚' },
  { id: 'character', label: '人物小传', icon: Users, desc: '先锁角色关系' },
  { id: 'outline', label: '剧本骨架', icon: Sparkles, desc: '统一主线账本' },
  { id: 'detailed_outline', label: '详细大纲', icon: FileText, desc: '把推进和钩子排顺' },
  { id: 'script', label: '剧本定稿', icon: PenTool, desc: '把场景真正写出来' }
] as const

function isGenerationVisibleOnStage(
  status: ProjectGenerationStatusDto | null,
  stage: WorkflowStage
): boolean {
  if (!status) return false
  if (status.task === 'outline_and_characters') {
    return stage === 'outline' || stage === 'character'
  }
  return status.stage === stage
}

export function AppSidebar(): JSX.Element {
  const currentStage = useWorkflowStore((state) => state.currentStage)
  const clearGenerationNotice = useWorkflowStore((state) => state.clearGenerationNotice)
  const projectId = useWorkflowStore((state) => state.projectId)
  const generationStatus = useWorkflowStore((state) => state.generationStatus)
  const { elapsedSeconds, estimatedSeconds, progressPercent } =
    useProjectGenerationProgress(generationStatus)

  async function handleStageChange(targetStage: WorkflowStage): Promise<void> {
    clearGenerationNotice()
    if (!projectId) return
    const result = await switchStageSession(projectId, targetStage)
    if (!result) {
      return
    }
  }

  return (
    <motion.nav
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-20 lg:w-64 xl:w-72 glass-nav p-3 lg:p-6 xl:p-8 flex flex-col justify-between z-10 shrink-0"
    >
      <div className="space-y-6 lg:space-y-8 xl:space-y-10">
        <div>
          <motion.h1
            className="text-lg lg:text-2xl font-black tracking-tighter text-gradient mb-2 flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
          >
            <Zap className="fill-current text-orange-500" size={22} />
            <span className="hidden lg:inline">XINJUBEN</span>
          </motion.h1>
          <p className="hidden xl:block text-[10px] uppercase tracking-[0.3em] text-white/30 font-medium">
            故事创作流程
          </p>
        </div>

        <div className="space-y-2">
          <p className="hidden lg:block text-[10px] uppercase tracking-widest text-white/20 font-bold px-2 mb-4">
            当前步骤
          </p>
          {STAGES.map((stage) => {
            const isActive = currentStage === stage.id
            const Icon = stage.icon
            const lockedByProject = !projectId && stage.id !== 'chat'
            const isLocked = lockedByProject
            const lockHint = lockedByProject ? '先在首页选择一个项目' : ''
            const isStageGenerating = isGenerationVisibleOnStage(
              generationStatus,
              stage.id as WorkflowStage
            )
            const timingLabel = generationStatus ? getGenerationTimingLabel(generationStatus.task) : ''

            return (
              <motion.button
                key={stage.id}
                onClick={() => {
                  if (isLocked) return
                  void handleStageChange(stage.id as WorkflowStage)
                }}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full group relative flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'text-orange-400 border border-orange-500/30 bg-orange-500/10'
                    : isLocked
                      ? 'text-white/20 bg-white/2 border border-white/5 cursor-not-allowed'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
                style={isActive ? { boxShadow: '0 0 18px rgba(255,122,0,0.15)' } : {}}
              >
                <div
                  className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-orange-500/20' : 'bg-white/5 group-hover:bg-white/10'}`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <div className="hidden lg:block text-left min-w-0 flex-1">
                  <p className="text-sm font-bold tracking-tight">{stage.label}</p>
                  <p className="hidden xl:block text-[10px] opacity-50 font-medium">
                    {isStageGenerating
                      ? `${elapsedSeconds}/${estimatedSeconds}秒 · ${progressPercent}%`
                      : stage.desc}
                  </p>
                  {isLocked && <p className="text-[10px] text-white/25 mt-1">{lockHint}</p>}
                  {isStageGenerating && (
                    <div className="mt-2 space-y-1">
                      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-orange-500 transition-[width] duration-700"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <p className="hidden xl:block text-[9px] text-white/30 leading-tight">
                        {timingLabel}
                      </p>
                    </div>
                  )}
                </div>
                {isActive && (
                  <motion.div layoutId="active-indicator" className="absolute right-4">
                    <ChevronRight size={14} />
                  </motion.div>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      <div className="hidden lg:block bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">使用提醒</p>
        <div className="space-y-2 text-[11px] text-white/45 leading-relaxed">
          <p>先把故事说清楚，再往下写。</p>
          <p>每一页只做这一页该做的事。</p>
          <p>先把主线钉住，再补细节和钩子。</p>
        </div>
      </div>
    </motion.nav>
  )
}
