import { useMemo } from 'react'
import { PenTool, Play, RefreshCw } from 'lucide-react'
import { ProjectGenerationBanner } from '../../../components/ProjectGenerationBanner'
import { StageExportButton } from '../../../components/StageExportButton'
import { useProjectStageExport } from '../../../app/hooks/useProjectStageExport'
import { switchStageSession } from '../../../app/services/stage-session-service'
import { useStageStore } from '../../../store/useStageStore'
import { useScriptStageActions } from './useScriptStageActions'
import { useScriptGenerationPlan } from '../../../app/hooks/useScriptGenerationPlan'
import { resolveProjectEpisodeCount } from '../../../../../shared/domain/workflow/episode-count'
import {
  collectOverflowScriptEpisodeNos,
  countCoveredScriptEpisodes
} from '../../../../../shared/domain/workflow/script-episode-coverage'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'
import type { ScriptSegmentDto } from '../../../../../shared/contracts/workflow.ts'
import { buildScreenplayFromStructuredScene } from '../../../../../shared/domain/script/screenplay-format.ts'

interface ScriptEpisodeCardViewModel {
  episodeNo: number
  screenplay: string
  hasContent: boolean
  missingFields: string[]
}

function collectMissingFields(scene?: ScriptSegmentDto): string[] {
  if (!scene) return []

  const missing: string[] = []
  if (!scene.action?.trim()) missing.push('动作')
  if (!scene.dialogue?.trim()) missing.push('对白')
  if (!scene.emotion?.trim()) missing.push('情绪')
  return missing
}

function buildEpisodeCards(
  script: ScriptSegmentDto[],
  targetEpisodes: number
): ScriptEpisodeCardViewModel[] {
  const scriptByEpisode = new Map<number, ScriptSegmentDto>()
  for (const scene of script) {
    scriptByEpisode.set(scene.sceneNo, scene)
  }

  const maxEpisodeNo = script.reduce((max, scene) => Math.max(max, scene.sceneNo), 0)
  const totalEpisodes = Math.max(targetEpisodes, maxEpisodeNo, 1)

  return Array.from({ length: totalEpisodes }, (_, index) => {
    const episodeNo = index + 1
    const scene = scriptByEpisode.get(episodeNo)
    const screenplay = scene ? buildScreenplayFromStructuredScene(scene) : ''

    return {
      episodeNo,
      screenplay,
      hasContent: Boolean(screenplay.trim()),
      missingFields: collectMissingFields(scene)
    }
  })
}

export function ScriptStage() {
  const script = useStageStore((state) => state.script)
  const outline = useStageStore((state) => state.outline)
  const projectId = useWorkflowStore((state) => state.projectId)
  const storyIntent = useWorkflowStore((state) => state.storyIntent)
  const exportStage = useProjectStageExport()
  const targetEpisodes = resolveProjectEpisodeCount({ outline, storyIntent })
  const generationPlan = useScriptGenerationPlan({ targetEpisodes })
  const { generationStatus, handleRewriteEpisode, handleStartGeneration } = useScriptStageActions({
    generationPlan,
    targetEpisodes,
    audit: { report: null } as any
  })
  const generationPlanPending = generationPlan === null
  const episodeCards = useMemo(
    () => buildEpisodeCards(script, targetEpisodes),
    [script, targetEpisodes]
  )
  const generatedEpisodeCount = episodeCards.filter(
    (episode) => episode.episodeNo <= targetEpisodes && episode.hasContent
  ).length
  const coveredEpisodeCount = countCoveredScriptEpisodes(script, targetEpisodes)
  const overflowEpisodeNos = collectOverflowScriptEpisodeNos(script, targetEpisodes)
  const hasOverflowEpisodes = overflowEpisodeNos.length > 0
  const isTargetComplete = coveredEpisodeCount >= targetEpisodes
  const primaryActionLabel = isTargetComplete
    ? `重新生成这${targetEpisodes}集`
    : coveredEpisodeCount > 0
      ? '继续写后面几集'
      : '现在开始写剧本'
  const startHint = isTargetComplete
    ? `这 ${targetEpisodes} 集已经写满了。现在点这个按钮会整轮重写，不会再偷偷往下续出第 ${targetEpisodes + 1} 集。`
    : generationPlanPending
      ? '点“现在开始写剧本”就会按你当前的粗纲、人物和详纲直接往下写。'
      : '点“现在开始写剧本”，系统会直接按当前材料开写，不再把你卡回上一层。'

  async function handleGoToDetailedOutline(): Promise<void> {
    if (!projectId) return
    const result = await switchStageSession(projectId, 'detailed_outline')
    if (!result) {
      return
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 xl:pr-2 pb-32 custom-scrollbar">
        <div className="max-w-5xl">
          <div className="mb-6 flex items-start justify-between gap-4 border-b border-white/[0.05] pb-6">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <PenTool size={18} className="text-orange-400" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-black text-white/90">逐集剧本</h2>
                <p className="text-[11px] text-white/45 leading-relaxed">
                  这一页只认按集剧本。每一集单独展开，从上往下整页连续读，不再拆成右侧目录和小滚动框。
                </p>
                <p className="text-[10px] text-orange-400/90">
                  当前按 {targetEpisodes} 集目标展示
                  {hasOverflowEpisodes
                    ? `，并额外标出超出的第 ${overflowEpisodeNos.join('、')} 集`
                    : ''}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <StageExportButton
                onClick={() => {
                  void exportStage('script')
                }}
              />
              <button
                onClick={() => {
                  void handleGoToDetailedOutline()
                }}
                className="rounded-xl border border-white/10 px-4 py-2 text-[11px] font-black text-white/75 hover:text-white hover:bg-white/5 transition-colors"
              >
                回详细大纲
              </button>
              <button
                onClick={() => void handleStartGeneration()}
                disabled={Boolean(generationStatus)}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black text-[#050505] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/20 disabled:opacity-40"
                style={{ background: '#FF7A00' }}
              >
                <Play size={14} fill="currentColor" /> {primaryActionLabel}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <ProjectGenerationBanner status={generationStatus} />
          </div>

          <div className="mb-6 rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(255,122,0,0.16),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.28em] text-orange-300/80 font-black">
                  当前状态
                </p>
                <p className="text-base font-black text-white/90">
                  目标内已写出 {generatedEpisodeCount}/{targetEpisodes}{' '}
                  集，页面展示口径已经和粗纲、详纲统一。
                </p>
                <p className="text-[12px] text-white/60 leading-relaxed">
                  你现在只需要从上往下滚动整页看剧本。每张卡就是一集，没写出的集数也不会消失。
                  {hasOverflowEpisodes
                    ? ` 当前这份稿子里还有超出目标集数的旧内容，重写后会按 ${targetEpisodes} 集重新收口。`
                    : ''}
                </p>
              </div>
              <div className="hidden lg:flex flex-col items-end gap-2 text-right">
                <span className="text-[10px] uppercase tracking-widest text-white/20">
                  阅读方式
                </span>
                <span className="text-[12px] font-black text-orange-300">整页滚动</span>
              </div>
            </div>
          </div>

          {hasOverflowEpisodes && (
            <div className="mb-6 rounded-2xl border border-yellow-300/20 bg-yellow-300/8 p-5">
              <p className="text-[10px] uppercase tracking-widest text-yellow-200 font-black">
                检测到旧逻辑残留
              </p>
              <p className="mt-1 text-sm font-black text-white/90">
                当前稿子里出现了超出目标集数的内容：第 {overflowEpisodeNos.join('、')} 集。
              </p>
              <p className="mt-2 text-[11px] text-white/65 leading-relaxed">
                这不是正常续写。现在继续生成时，我会先按 {targetEpisodes}{' '}
                集口径收口，不再把它们当成合法进度往下接。
              </p>
            </div>
          )}

          {!generationStatus && coveredEpisodeCount === 0 && (
            <div className="mb-6 rounded-2xl border border-orange-500/20 bg-orange-500/8 p-5">
              <p className="text-[10px] uppercase tracking-widest text-orange-300 font-black">
                剧本还没开始写
              </p>
              <p className="mt-1 text-sm font-black text-white/90">{startHint}</p>
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
                  disabled={Boolean(generationStatus)}
                  className="rounded-xl bg-orange-300 px-4 py-2 text-[11px] font-black text-[#1f1200] hover:bg-orange-200 transition-colors disabled:opacity-40"
                >
                  {primaryActionLabel}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {episodeCards.map((episode) => (
              <article
                key={episode.episodeNo}
                className="overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/6 px-5 py-4 sm:px-6">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/25 font-bold">
                      第 {episode.episodeNo} 集
                    </p>
                    <p className="text-sm font-black text-white/88">
                      {episode.hasContent ? '这一集剧本已经落到正文' : '这一集还没有落出可读剧本'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      onClick={() => void handleRewriteEpisode(episode.episodeNo)}
                      disabled={Boolean(generationStatus) || !episode.hasContent}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-1.5 text-[10px] font-black text-white/72 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <RefreshCw size={12} />
                      重写这一集
                    </button>
                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] font-black ${
                        episode.hasContent
                          ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                          : 'border-white/10 bg-white/6 text-white/45'
                      }`}
                    >
                      {episode.hasContent ? '已生成' : '待生成'}
                    </span>
                    {episode.episodeNo > targetEpisodes && (
                      <span className="rounded-full border border-yellow-300/15 bg-yellow-300/8 px-3 py-1 text-[10px] font-black text-yellow-100/80">
                        超出目标集数
                      </span>
                    )}
                    {episode.missingFields.length > 0 && episode.hasContent && (
                      <span className="rounded-full border border-yellow-300/15 bg-yellow-300/8 px-3 py-1 text-[10px] font-black text-yellow-100/80">
                        补写参考：{episode.missingFields.join(' / ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-5 py-5 sm:px-6 sm:py-6">
                  {episode.hasContent ? (
                    <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-7 text-white/78">
                      {episode.screenplay}
                    </pre>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-4">
                      <p className="text-[12px] font-black text-white/70">这一集还没写出来。</p>
                      <p className="mt-2 text-[12px] leading-relaxed text-white/45">
                        生成后会直接把第 {episode.episodeNo}{' '}
                        集完整剧本放在这里，不再塞进右侧场景目录，也不会只留一个很小的滚动区域。
                      </p>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
