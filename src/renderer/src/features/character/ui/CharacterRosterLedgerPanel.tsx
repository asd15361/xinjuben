import { ClipboardList } from 'lucide-react'
import type {
  CharacterRosterDto,
  CharacterRosterEntryDto,
  CharacterRosterLayer
} from '../../../../../shared/contracts/world-building.ts'
import { CopyTextButton } from '../../../components/CopyTextButton.tsx'

interface CharacterRosterLedgerPanelProps {
  characterRoster: CharacterRosterDto | null
}

const layerLabels: Record<CharacterRosterLayer, string> = {
  core: '核心人物',
  active: '中层活跃人物',
  functional: '功能人物',
  crowd: '群像/跑龙套'
}

const layerStyles: Record<CharacterRosterLayer, string> = {
  core: 'border-orange-500/25 bg-orange-500/10 text-orange-100',
  active: 'border-sky-500/25 bg-sky-500/10 text-sky-100',
  functional: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100',
  crowd: 'border-white/12 bg-white/[0.04] text-white/55'
}

function buildRosterText(entries: CharacterRosterEntryDto[]): string {
  if (entries.length === 0) return '暂无角色名册'

  return entries
    .map((entry) => {
      const parts = [
        `【${layerLabels[entry.layer]}】${entry.name}`,
        entry.factionName ? `阵营：${entry.factionName}` : '',
        entry.fieldName ? `场域：${entry.fieldName}` : '',
        `职责：${entry.duty}`,
        `小传：${entry.needsFullProfile ? '需要' : '不需要'}`,
        `台词潜力：${entry.dialoguePotential}`
      ].filter(Boolean)
      return parts.join('\n')
    })
    .join('\n\n')
}

export function CharacterRosterLedgerPanel(
  props: CharacterRosterLedgerPanelProps
): JSX.Element | null {
  if (!props.characterRoster) return null

  const entries = props.characterRoster.entries
  const entriesByLayer = (['core', 'active', 'functional', 'crowd'] as const).map((layer) => ({
    layer,
    entries: entries.filter((entry) => entry.layer === layer)
  }))

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 xl:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.05] p-2.5">
            <ClipboardList size={16} className="text-white/70" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white/90">角色名册底账</h3>
            <p className="mt-1 text-[11px] leading-5 text-white/45">
              核心人物、中层人物、功能人物和群像位都在这里，完整小传只是其中一层。
            </p>
          </div>
        </div>

        <CopyTextButton label="复制名册" getText={() => buildRosterText(entries)} />
      </div>

      <div className="mt-5 grid grid-cols-2 xl:grid-cols-4 gap-3">
        {entriesByLayer.map(({ layer, entries: layerEntries }) => (
          <div key={layer} className={`rounded-2xl border p-4 ${layerStyles[layer]}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">
              {layerLabels[layer]}
            </p>
            <p className="mt-3 text-2xl font-black">{layerEntries.length}</p>
          </div>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-6 text-[12px] leading-6 text-white/40">
          当前还没有角色位。先从灵感对话或阵营生成里补出角色名册，再进入完整小传。
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3">
          {entries.slice(0, 60).map((entry) => (
            <div
              key={entry.id}
              className="rounded-2xl border border-white/10 bg-black/10 p-4"
              data-testid="character-roster-ledger-entry"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-white/90">{entry.name}</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`rounded-md border px-2 py-1 text-[10px] font-black ${layerStyles[entry.layer]}`}
                    >
                      {layerLabels[entry.layer]}
                    </span>
                    <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black text-white/40">
                      {entry.identityMode === 'slot' ? '人物位' : '实名'}
                    </span>
                    {entry.needsFullProfile && (
                      <span className="rounded-md border border-orange-500/20 bg-orange-500/10 px-2 py-1 text-[10px] font-black text-orange-200">
                        需小传
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <p className="mt-3 text-[12px] leading-6 text-white/55">{entry.duty || '待补'}</p>

              {(entry.factionName || entry.fieldName) && (
                <p className="mt-3 text-[11px] leading-5 text-white/35">
                  {[entry.factionName, entry.fieldName].filter(Boolean).join(' / ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
