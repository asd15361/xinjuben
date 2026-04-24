import type { AudienceLane, MarketProfileDto, Subgenre } from '../../../../../shared/contracts/project.ts'

interface HomeHeroPanelProps {
  status: string
  busy: boolean
  projectName: string
  canCreate: boolean
  audienceLane: AudienceLane | ''
  subgenre: Subgenre | ''
  onProjectNameChange: (value: string) => void
  onAudienceLaneChange: (value: AudienceLane) => void
  onSubgenreChange: (value: Subgenre) => void
  onCreate: () => void
}

const maleSubgenres: Subgenre[] = ['男频都市逆袭', '男频玄幻修仙', '男频历史军政']
const femaleSubgenres: Subgenre[] = ['女频霸总甜宠', '女频古言宅斗', '女频现代逆袭']

export function HomeHeroPanel(props: HomeHeroPanelProps): JSX.Element {
  const {
    status,
    busy,
    projectName,
    canCreate,
    audienceLane,
    subgenre,
    onProjectNameChange,
    onAudienceLaneChange,
    onSubgenreChange,
    onCreate
  } = props

  const availableSubgenres = audienceLane === 'male' ? maleSubgenres : audienceLane === 'female' ? femaleSubgenres : []

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 mb-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-bold">开始创作</p>
          <h2 className="text-xl font-black text-white">你的项目总览</h2>
          <p className="text-[11px] text-white/40 leading-relaxed max-w-xl">
            在这里新建、查看和继续你的项目。点进任意项目，就能接着往下写。
          </p>
        </div>

        <div className="flex-1 max-w-xl bg-white/[0.03] border border-white/10 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              value={projectName}
              onChange={(event) => onProjectNameChange(event.target.value)}
              placeholder="新项目名称..."
              className="flex-1 bg-transparent px-2 py-1 text-[13px] text-white placeholder-white/20 focus:outline-none"
              disabled={busy}
            />
            <button
              onClick={onCreate}
              disabled={!canCreate}
              className="shrink-0 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest text-[#050505] disabled:opacity-40 transition-all hover:opacity-90 active:scale-95 shadow-lg shadow-orange-500/10"
              style={{ background: '#FF7A00' }}
            >
              快速创建
            </button>
          </div>
          <div className="flex gap-2">
            <select
              value={audienceLane}
              onChange={(event) => onAudienceLaneChange(event.target.value as AudienceLane)}
              disabled={busy}
              className="flex-1 bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1 text-[12px] text-white focus:outline-none"
            >
              <option value="">选择男频/女频</option>
              <option value="male">男频</option>
              <option value="female">女频</option>
            </select>
            <select
              value={subgenre}
              onChange={(event) => onSubgenreChange(event.target.value as Subgenre)}
              disabled={busy || !audienceLane}
              className="flex-1 bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1 text-[12px] text-white focus:outline-none disabled:opacity-40"
            >
              <option value="">选择垂类</option>
              {availableSubgenres.map((sg) => (
                <option key={sg} value={sg}>
                  {sg}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
        <p className="text-[10px] text-white/25 font-medium tracking-wide">{status}</p>
      </div>
    </div>
  )
}
