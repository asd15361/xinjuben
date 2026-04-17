import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { ProjectGenerationBanner } from '../../../components/ProjectGenerationBanner'
import { StageExportButton } from '../../../components/StageExportButton'
import { useOutlineCharacterGeneration } from '../../../app/hooks/useOutlineCharacterGeneration.ts'
import { useProjectStageExport } from '../../../app/hooks/useProjectStageExport'
import { switchStageSession } from '../../../app/services/stage-session-service'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'
import { useStageStore } from '../../../store/useStageStore'
import type { ProjectEntityStoreDto } from '../../../../../shared/contracts/entities.ts'
import { ensureOutlineEpisodeShape } from '../../../../../shared/domain/workflow/outline-episodes'
import { declareFormalFact, confirmFormalFact, removeFormalFact } from '../api.ts'
import { OutlineBasicsPanel } from './OutlineBasicsPanel'
import { OutlineEntityStorePanel } from './OutlineEntityStorePanel.tsx'
import { FormalFactDeclarationPanel } from './FormalFactDeclarationPanel'

export function OutlineStage() {
  const outline = useStageStore((state) => state.outline)
  const setOutline = useStageStore((state) => state.setOutline)
  const projectId = useWorkflowStore((state) => state.projectId)
  const exportStage = useProjectStageExport()
  const {
    actionLabel,
    generationStatus,
    handleGenerateOutlineAndCharacters
  } = useOutlineCharacterGeneration('outline')
  const [entityStore, setEntityStore] = useState<ProjectEntityStoreDto | null>(null)
  const episodeCount = ensureOutlineEpisodeShape(outline).summaryEpisodes.filter((episode) =>
    episode.summary.trim()
  ).length

  useEffect(() => {
    let cancelled = false

    async function loadEntityStore(): Promise<void> {
      if (!projectId) {
        setEntityStore(null)
        return
      }

      const project = await window.api.workspace.getProject(projectId)
      if (!cancelled) {
        setEntityStore(project?.entityStore ?? null)
      }
    }

    void loadEntityStore()

    return () => {
      cancelled = true
    }
  }, [projectId])

  async function handleGoToCharacterStage(): Promise<void> {
    if (!projectId) return
    const result = await switchStageSession(projectId, 'character')
    if (!result) {
      return
    }
  }

  async function handleDeclareFormalFact(draft: {
    label: string
    description: string
    level: 'core' | 'supporting'
  }): Promise<void> {
    if (!projectId) return
    const result = await declareFormalFact({
      projectId,
      label: draft.label,
      description: draft.description,
      level: draft.level
    })
    if (result.project?.outlineDraft) {
      setOutline(result.project.outlineDraft)
    }
  }

  async function handleConfirmFormalFact(factId: string): Promise<void> {
    if (!projectId) return
    const result = await confirmFormalFact({ projectId, factId })
    if (result.project?.outlineDraft) {
      setOutline(result.project.outlineDraft)
    }
  }

  async function handleRemoveFormalFact(factId: string): Promise<void> {
    if (!projectId) return
    const result = await removeFormalFact({ projectId, factId })
    if (result.project?.outlineDraft) {
      setOutline(result.project.outlineDraft)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 xl:pr-2 space-y-8 pb-32 custom-scrollbar">
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.05] pb-6 mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <Sparkles size={18} className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white/90">粗略大纲</h2>
              <p className="text-[11px] text-white/40 mt-0.5">
                先把故事主骨架立住。每一集先写清楚发生什么、冲突怎么抬、钩子落在哪。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StageExportButton
              onClick={() => {
                void exportStage('outline')
              }}
            />
            <button
              onClick={() => {
                void handleGenerateOutlineAndCharacters()
              }}
              disabled={Boolean(generationStatus)}
              className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-2.5 text-xs font-black text-orange-300 transition-colors hover:bg-orange-500/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {actionLabel}
            </button>
            <div className="hidden lg:flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
              <span className="text-[10px] uppercase tracking-widest text-white/25 font-bold">
                当前粗纲
              </span>
              <span className="text-[12px] font-black text-orange-400">{episodeCount || 0} 集</span>
            </div>
            <button
              onClick={() => {
                void handleGoToCharacterStage()
              }}
              className="rounded-xl px-5 py-2.5 text-xs font-black text-[#050505] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/20"
              style={{ background: '#FF7A00' }}
            >
              确认：进入人物小传
            </button>
          </div>
        </div>

        <div className="max-w-4xl space-y-8">
          <ProjectGenerationBanner status={generationStatus} />
          <OutlineBasicsPanel outline={outline} onChange={setOutline} />
          <OutlineEntityStorePanel entityStore={entityStore} />
          <FormalFactDeclarationPanel
            outline={outline}
            onDeclare={handleDeclareFormalFact}
            onConfirm={handleConfirmFormalFact}
            onRemove={handleRemoveFormalFact}
          />
        </div>
      </div>
    </div>
  )
}
