import type { ScriptSegmentDto } from '../../../../../shared/contracts/workflow'

export type SceneFilterMode = 'all' | 'missing_action' | 'missing_dialogue' | 'missing_emotion'

interface ScriptSceneNavigatorProps {
  script: ScriptSegmentDto[]
  filter: SceneFilterMode
  search: string
  onFilterChange: (value: SceneFilterMode) => void
  onSearchChange: (value: string) => void
}

function countMissing(script: ScriptSegmentDto[], field: 'action' | 'dialogue' | 'emotion'): number {
  return script.filter((scene) => !scene[field]?.trim()).length
}

export function ScriptSceneNavigator(props: ScriptSceneNavigatorProps) {
  if (props.script.length === 0) return null

  const filters: Array<{ key: SceneFilterMode; label: string }> = [
    { key: 'all', label: '全部' },
    { key: 'missing_action', label: `动作待补 ${countMissing(props.script, 'action')}` },
    { key: 'missing_dialogue', label: `对白待补 ${countMissing(props.script, 'dialogue')}` },
    { key: 'missing_emotion', label: `情绪待补 ${countMissing(props.script, 'emotion')}` }
  ]

  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-white/3 px-4 py-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold">场景目录</p>
          <p className="text-[11px] text-white/35 mt-1">先看哪一场已经成形，哪一场还要补动作、对白和情绪。</p>
        </div>
        <p className="text-[11px] text-white/35">当前共 {props.script.length} 场</p>
      </div>

      <input
        value={props.search}
        onChange={(event) => props.onSearchChange(event.target.value)}
        placeholder="搜索场次、动作内容或对白关键词"
        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-orange-500/40"
      />

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.key}
            onClick={() => props.onFilterChange(item.key)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold border transition-all ${
              props.filter === item.key
                ? 'border-orange-500/40 bg-orange-500/15 text-orange-300'
                : 'border-white/10 bg-black/20 text-white/40 hover:text-white/60'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
