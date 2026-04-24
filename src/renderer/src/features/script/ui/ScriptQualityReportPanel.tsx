import { AlertTriangle, CheckCircle, BookOpen, Target } from 'lucide-react'
import type { ScriptStateLedgerDto } from '../../../../../shared/contracts/script-ledger.ts'
import type { MarketProfileDto } from '../../../../../shared/contracts/project.ts'

interface ScriptQualityReportPanelProps {
  ledger?: ScriptStateLedgerDto | null
  marketProfile?: MarketProfileDto | null
}

const LANE_LABELS: Record<string, string> = {
  male: '男频',
  female: '女频'
}

function getScoreTone(score: number): { bar: string; text: string; label: string } {
  if (score >= 75) return { bar: 'bg-emerald-400', text: 'text-emerald-300', label: '良好' }
  if (score >= 60) return { bar: 'bg-yellow-400', text: 'text-yellow-300', label: '一般' }
  return { bar: 'bg-red-400', text: 'text-red-300', label: '偏低' }
}

function ScoreBar({ label, score }: { label: string; score: number }): JSX.Element {
  const tone = getScoreTone(score)

  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-[11px] text-white/60">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`w-8 text-right text-[11px] font-black ${tone.text}`}>{score}</span>
    </div>
  )
}

function formatAudienceLane(lane?: string | null): string {
  if (!lane) return '未设置市场定位'
  return LANE_LABELS[lane] || lane
}

export function ScriptQualityReportPanel({ ledger, marketProfile }: ScriptQualityReportPanelProps): JSX.Element | null {
  const quality = ledger?.postflight?.quality
  if (!quality && !marketProfile) return null

  const hasMarketPosition = Boolean(marketProfile?.audienceLane)
  const weakEpisodes = quality?.weakEpisodes || []
  const issues = ledger?.postflight?.issues || []
  const failCount = (quality?.episodeCount || 0) - (quality?.passedEpisodes || 0)

  return (
    <div className="mb-6 rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-5 sm:p-6">
      {/* 1. 市场定位 */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Target size={14} className="text-purple-400" />
          <span className="text-[11px] font-black text-white/70">市场定位</span>
        </div>
        {hasMarketPosition ? (
          <div className="rounded-xl border border-white/5 bg-white/3 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-400/10 text-purple-300 border border-purple-400/20">
                {formatAudienceLane(marketProfile!.audienceLane)}
              </span>
              <span className="text-[12px] text-white/70">{marketProfile!.subgenre}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/3 p-3">
            <p className="text-[11px] text-white/45">未设置市场定位</p>
          </div>
        )}
      </div>

      {/* 2. 总体质量（分赛道） */}
      {(quality?.informationDensityScore !== undefined || quality?.screenplayFormatScore !== undefined || quality?.marketQualityScore !== undefined || quality?.storyContinuityScore !== undefined) && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={14} className="text-emerald-400" />
            <span className="text-[11px] font-black text-white/70">质量概览</span>
          </div>
          <div className="space-y-2">
            {quality?.marketQualityScore !== undefined && (
              <ScoreBar label="市场匹配度" score={quality.marketQualityScore} />
            )}
            {quality?.informationDensityScore !== undefined && (
              <ScoreBar label="信息密度" score={quality.informationDensityScore} />
            )}
            {quality?.screenplayFormatScore !== undefined && (
              <ScoreBar label="剧本格式" score={quality.screenplayFormatScore} />
            )}
            {quality?.storyContinuityScore !== undefined && (
              <ScoreBar label="连续性" score={quality.storyContinuityScore} />
            )}
          </div>
        </div>
      )}

      {/* 3. 商业传播力（现有评分） */}
      {(quality?.openingShockScore !== undefined) && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={14} className="text-orange-400" />
            <span className="text-[11px] font-black text-white/70">商业传播力</span>
          </div>
          <div className="space-y-2">
            {quality.openingShockScore !== undefined && <ScoreBar label="开局冲击" score={quality.openingShockScore} />}
            {quality.punchlineDensityScore !== undefined && <ScoreBar label="金句密度" score={quality.punchlineDensityScore} />}
            {quality.catharsisPayoffScore !== undefined && <ScoreBar label="爽点兑现" score={quality.catharsisPayoffScore} />}
            {quality.villainOppressionQualityScore !== undefined && <ScoreBar label="反派压迫" score={quality.villainOppressionQualityScore} />}
            {quality.hookRetentionScore !== undefined && <ScoreBar label="集尾留客" score={quality.hookRetentionScore} />}
          </div>
        </div>
      )}

      {/* 4. 返修建议 */}
      {weakEpisodes.length > 0 && (
        <div className="mb-3 rounded-2xl border border-yellow-400/15 bg-yellow-400/8 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-yellow-400" />
            <span className="text-[11px] font-black text-yellow-300">需要关注</span>
          </div>
          <p className="text-[10px] text-white/45 mb-2">
            共 {quality?.episodeCount || 0} 集，{failCount} 集未通过质检
            {quality && `，平均字数 ${quality.averageCharCount}`}
          </p>
          <ul className="space-y-2">
            {weakEpisodes.slice(0, 6).map((ep, i) => (
              <li key={i} className="text-[11px] text-white/70 leading-relaxed">
                <span className="text-white/40">第{ep.sceneNo}集 · {ep.charCount}字 · {ep.sceneCount}场：</span>
                {ep.problems.join(' · ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* issues 中的高优问题 */}
      {issues.filter((i) => i.severity === 'high' || i.severity === 'medium').length > 0 && (
        <div className="mb-3 rounded-2xl border border-red-400/15 bg-red-400/8 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-red-400" />
            <span className="text-[11px] font-black text-red-300">后飞行断言</span>
          </div>
          <ul className="space-y-1.5">
            {issues.filter((i) => i.severity === 'high' || i.severity === 'medium').slice(0, 4).map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-white/70">
                <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-black ${
                  issue.severity === 'high' ? 'bg-red-400/20 text-red-300' : 'bg-yellow-400/15 text-yellow-300'
                }`}>
                  {issue.severity === 'high' ? '高' : '中'}
                </span>
                <span>{issue.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 修稿链状态提示 */}
      {ledger?.postflight && (
        <div className="rounded-xl border border-white/5 bg-white/3 p-3">
          <p className="text-[10px] text-white/40">
            修稿链已启用，详情以生成日志为准。
          </p>
        </div>
      )}

      {/* 全部通过 */}
      {failCount === 0 && weakEpisodes.length === 0 && quality && (
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/8 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-400" />
            <span className="text-[11px] font-black text-emerald-300">本批内容质量通过</span>
          </div>
        </div>
      )}
    </div>
  )
}
