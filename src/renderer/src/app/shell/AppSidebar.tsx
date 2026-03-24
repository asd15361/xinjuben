import { motion } from 'framer-motion'
import { ChevronRight, Sparkles, Users, FileText, PenTool, Zap, MessageCircle } from 'lucide-react'
import type { WorkflowStage } from '../../../../shared/contracts/workflow'
import { switchStageSession } from '../services/stage-session-service'
import { useWorkflowStore } from '../store/useWorkflowStore'
import { useStageStore } from '../../store/useStageStore'

const STAGES = [
  { id: 'chat', label: '灵感对话', icon: MessageCircle, desc: '先把故事说清楚' },
  { id: 'outline', label: '粗略大纲', icon: Sparkles, desc: '先把十集骨架立住' },
  { id: 'character', label: '人物小传', icon: Users, desc: '把角色发动机写实' },
  { id: 'detailed_outline', label: '详细大纲', icon: FileText, desc: '把推进和钩子排顺' },
  { id: 'script', label: '剧本定稿', icon: PenTool, desc: '把场景真正写出来' }
] as const

export function AppSidebar() {
  const currentStage = useWorkflowStore((state) => state.currentStage)
  const clearGenerationNotice = useWorkflowStore((state) => state.clearGenerationNotice)
  const projectId = useWorkflowStore((state) => state.projectId)
  const outline = useStageStore((s) => s.outline)
  const characters = useStageStore((s) => s.characters)

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
            const lockedByUpstream =
              Boolean(projectId) &&
              stage.id !== 'chat' &&
              !outline.title.trim() &&
              characters.length === 0
            const isLocked = lockedByProject || lockedByUpstream
            const lockHint = lockedByProject
              ? '先在首页选择一个项目'
              : lockedByUpstream
                ? '先去聊天页生成第一版粗纲和人物'
                : ''

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
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-bold tracking-tight">{stage.label}</p>
                  <p className="hidden xl:block text-[10px] opacity-50 font-medium">{stage.desc}</p>
                  {isLocked && <p className="text-[10px] text-white/25 mt-1">{lockHint}</p>}
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
