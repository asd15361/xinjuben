import { useState } from 'react'
import { PenTool, Play } from 'lucide-react'
import { ProjectGenerationBanner } from '../../../components/ProjectGenerationBanner'
import { switchStageSession } from '../../../app/services/stage-session-service'
import { useStageStore } from '../../../store/useStageStore'
import { ScriptSceneNavigator } from './ScriptSceneNavigator'
import { ScriptSceneDraftEditor } from './ScriptSceneDraftEditor'
import { ScriptSceneList } from './ScriptSceneList'
import { useScriptSceneFilter } from './useScriptSceneFilter'
import { useScriptStageActions } from './useScriptStageActions'
import { useScriptGenerationPlan } from '../../../app/hooks/useScriptGenerationPlan'
import { resolveProjectEpisodeCount } from '../../../../../shared/domain/workflow/episode-count'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'

function getScriptBlockedSummary(code: string | undefined, fallback: string | undefined): string {
  if (code === 'script_formal_fact_missing') {
    return '先回粗纲把最关键的设定确认下来，再开始写剧本。'
  }
  if (code === 'script_formal_fact_segment_missing') {
    return '当前详细大纲还没把关键设定真正接进去，先回详细大纲补齐，再开始写剧本。'
  }
  if (code === 'script_segment_missing' || code === 'script_segment_structure_weak') {
    return '当前详细大纲还不够完整，先把这一版详细大纲补齐，再开始写剧本。'
  }
  if (code === 'script_character_missing') {
    return '关键人物还没准备好，先回人物页补齐，再开始写剧本。'
  }
  if (code === 'script_anchor_roster_missing' || code === 'script_heroine_anchor_missing') {
    return '角色关系和主线推进还没完全对上，先回人物页或详细大纲页补齐。'
  }
  return fallback || '先把详细大纲、人物和关键设定补齐，再开始写剧本。'
}

export function ScriptStage() {
  const script = useStageStore((state) => state.script)
  const addScript = useStageStore((state) => state.addScriptSegment)
  const outline = useStageStore((state) => state.outline)
  const projectId = useWorkflowStore((state) => state.projectId)
  const storyIntent = useWorkflowStore((state) => state.storyIntent)
  const targetEpisodes = resolveProjectEpisodeCount({ outline, storyIntent })
  const generationPlan = useScriptGenerationPlan({ targetEpisodes })
  const { generationStatus, handleStartGeneration } = useScriptStageActions({
    generationPlan,
    audit: { report: null } as any
  })
  const generationPlanReady = generationPlan?.ready === true
  const generationPlanPending = generationPlan === null
  const generationBlockedMessage =
    generationPlan?.ready === false
      ? getScriptBlockedSummary(
          generationPlan.blockedBy[0]?.code,
          generationPlan.blockedBy[0]?.message
        )
      : ''

  const [draft, setDraft] = useState({
    sceneNo: script.length + 1,
    action: '',
    dialogue: '',
    emotion: ''
  })
  const { sceneSearch, sceneFilter, visibleScenes, setSceneSearch, setSceneFilter } =
    useScriptSceneFilter(script)

  async function handleGoToDetailedOutline(): Promise<void> {
    if (!projectId) return
    const result = await switchStageSession(projectId, 'detailed_outline')
    if (!result) {
      return
    }
  }

  function handleAdd(): void {
    if (!draft.action && !draft.dialogue) return
    addScript(draft)
    setDraft({ sceneNo: draft.sceneNo + 1, action: '', dialogue: '', emotion: '' })
  }

  return (
    <div className="h-full flex flex-col">
      {/* 极简页头 */}
      <div className="shrink-0 flex items-center justify-between gap-4 border-b border-white/[0.05] pb-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <PenTool size={18} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white/90">剧本定稿</h2>
            <p className="text-[11px] text-white/40 mt-0.5">
              这一页只做一件事：把详细大纲真正写成可看的场次。
            </p>
            <p className="text-[10px] text-orange-400/90 mt-1">
              当前按 {targetEpisodes} 集链路推进
            </p>
          </div>
        </div>

        <button
          onClick={() => void handleStartGeneration()}
          disabled={Boolean(generationStatus) || !generationPlanReady}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black text-[#050505] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/20 disabled:opacity-40"
          style={{ background: '#FF7A00' }}
        >
          <Play size={14} fill="currentColor" /> 一键执笔生成
        </button>
      </div>

      <div className="shrink-0 mb-6">
        <ProjectGenerationBanner status={generationStatus} />
      </div>

      {!generationStatus && script.length === 0 && (
        <div className="shrink-0 mb-6 rounded-2xl border border-orange-500/20 bg-orange-500/8 p-5">
          <p className="text-[10px] uppercase tracking-widest text-orange-300 font-black">
            剧本还没开始写
          </p>
          <p className="mt-1 text-sm font-black text-white/90">
            {generationPlanPending
              ? '我正在检查这一页能不能直接开写，请先等入口准备好。'
              : generationPlanReady
                ? '点右上角“一键执笔生成”，生成完成后会直接把场次放到下面。'
                : generationBlockedMessage}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => {
                void handleGoToDetailedOutline()
              }}
              className="rounded-xl border border-white/10 px-4 py-2 text-[11px] font-black text-white/75 hover:text-white hover:bg-white/5 transition-colors"
            >
              先回详细大纲检查
            </button>
            <button
              onClick={() => void handleStartGeneration()}
              disabled={!generationPlanReady}
              className="rounded-xl bg-orange-300 px-4 py-2 text-[11px] font-black text-[#1f1200] hover:bg-orange-200 transition-colors disabled:opacity-40"
            >
              现在开始写剧本
            </button>
          </div>
        </div>
      )}

      {script.length > 0 && (
        <div className="shrink-0 mb-6 rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">
                当前结果
              </p>
              <p className="text-sm font-black text-white/85">
                下面已经写出 {script.length} 场，你可以直接往下看、手动补，或者继续生成。
              </p>
            </div>
            <button
              onClick={() => {
                void handleGoToDetailedOutline()
              }}
              className="rounded-xl border border-white/10 px-4 py-2 text-[11px] font-black text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              回详细大纲
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 flex gap-8">
        {/* 左侧：列表与编辑器 */}
        <div className="flex-1 min-h-0 flex flex-col space-y-6">
          <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar space-y-6">
            <ScriptSceneList script={visibleScenes} />
            <ScriptSceneDraftEditor draft={draft} onChange={setDraft} onSave={handleAdd} />
          </div>
        </div>

        {/* 右侧：极简导航 */}
        <div className="w-64 shrink-0 overflow-y-auto pr-1 custom-scrollbar">
          <ScriptSceneNavigator
            script={script}
            filter={sceneFilter}
            search={sceneSearch}
            onFilterChange={setSceneFilter}
            onSearchChange={setSceneSearch}
          />
        </div>
      </div>
    </div>
  )
}
