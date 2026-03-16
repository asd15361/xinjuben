import { useState } from 'react'
import { PenTool, Play } from 'lucide-react'
import { ProjectGenerationBanner } from '../../../components/ProjectGenerationBanner'
import { useStageStore } from '../../../store/useStageStore'
import { ScriptSceneNavigator } from './ScriptSceneNavigator'
import { ScriptSceneDraftEditor } from './ScriptSceneDraftEditor'
import { ScriptSceneList } from './ScriptSceneList'
import { useScriptSceneFilter } from './useScriptSceneFilter'
import { useScriptStageActions } from './useScriptStageActions'
import { useScriptGenerationPlan } from '../../../app/hooks/useScriptGenerationPlan'
import { resolveProjectEpisodeCount } from '../../../../../shared/domain/workflow/episode-count'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'

export function ScriptStage() {
  const script = useStageStore((state) => state.script)
  const addScript = useStageStore((state) => state.addScriptSegment)
  const outline = useStageStore((state) => state.outline)
  const storyIntent = useWorkflowStore((state) => state.storyIntent)
  const targetEpisodes = resolveProjectEpisodeCount({ outline, storyIntent })
  const generationPlan = useScriptGenerationPlan({ targetEpisodes })
  const { generationStatus, handleStartGeneration } = useScriptStageActions({ generationPlan, audit: { report: null } as any })

  const [draft, setDraft] = useState({ sceneNo: script.length + 1, action: '', dialogue: '', emotion: '' })
  const { sceneSearch, sceneFilter, visibleScenes, setSceneSearch, setSceneFilter } = useScriptSceneFilter(script)

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
            <p className="text-[11px] text-white/40 mt-0.5">注入细节，让文字在空气中响起。</p>
            <p className="text-[10px] text-orange-400/90 mt-1">当前按 {targetEpisodes} 集链路推进</p>
          </div>
        </div>

        <button
          onClick={() => void handleStartGeneration()}
          disabled={Boolean(generationStatus)}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black text-[#050505] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/20 disabled:opacity-40"
          style={{ background: '#FF7A00' }}
        >
          <Play size={14} fill="currentColor" /> 一键执笔生成
        </button>
      </div>

      <div className="shrink-0 mb-6">
        <ProjectGenerationBanner status={generationStatus} />
      </div>

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
