import type { ProjectEntityStoreDto } from '../../../../../shared/contracts/entities.ts'
import { buildOutlineEntityStoreViewModel } from '../model/build-outline-entity-store-view-model.ts'

export function OutlineEntityStorePanel(input: {
  entityStore: ProjectEntityStoreDto | null
}): JSX.Element {
  const viewModel = buildOutlineEntityStoreViewModel(input.entityStore)

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">
            世界底账观察口
          </p>
          <p className="text-sm font-black text-white/85">
            先看系统已经识别出哪些势力、人物和关系。
          </p>
          <p className="text-[11px] text-white/40 leading-relaxed">
            这一块现在先做只读观察，不在这里补编辑。目的是先确认确认信息阶段有没有把世界底账立起来。
          </p>
        </div>
        <div className="hidden lg:grid grid-cols-5 gap-2 text-center">
          {[
            ['人物', viewModel.counts.characters],
            ['势力', viewModel.counts.factions],
            ['地点', viewModel.counts.locations],
            ['物件', viewModel.counts.items],
            ['关系', viewModel.counts.relations]
          ].map(([label, count]) => (
            <div
              key={label}
              className="rounded-xl border border-white/8 bg-black/20 px-3 py-2 min-w-[62px]"
            >
              <p className="text-[10px] text-white/25">{label}</p>
              <p className="text-sm font-black text-orange-400">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {viewModel.isEmpty ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-black/10 px-4 py-4 text-[12px] text-white/45">
          当前确认信息里还没有沉淀出可见的世界底账。后面这块会继续承接势力、人物位和轻量人物卡。
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="rounded-xl border border-white/8 bg-black/15 p-4 space-y-3">
            <p className="text-[11px] font-black text-white/70 uppercase tracking-widest">
              已识别势力
            </p>
            {viewModel.factions.length > 0 ? (
              viewModel.factions.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-black text-white/85">{item.name}</span>
                    <span className="text-[10px] text-orange-400">已挂 {item.seatCount} 人</span>
                  </div>
                  <p className="text-[11px] text-white/45 leading-relaxed">
                    {item.summary || '暂无摘要'}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-white/35">这轮还没从确认信息里识别出明确势力。</p>
            )}
          </div>

          <div className="rounded-xl border border-white/8 bg-black/15 p-4 space-y-3">
            <p className="text-[11px] font-black text-white/70 uppercase tracking-widest">
              已识别人物
            </p>
            {viewModel.characters.length > 0 ? (
              viewModel.characters.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-black text-white/85">{item.name}</span>
                    <span className="text-[10px] text-orange-400">{item.roleLayerLabel}</span>
                  </div>
                  <p className="text-[11px] text-white/45 leading-relaxed">
                    {item.summary || '暂无摘要'}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-white/35">这轮还没沉淀出可用人物底账。</p>
            )}
          </div>

          <div className="rounded-xl border border-white/8 bg-black/15 p-4 space-y-3">
            <p className="text-[11px] font-black text-white/70 uppercase tracking-widest">
              已识别关系
            </p>
            {viewModel.relations.length > 0 ? (
              viewModel.relations.map((item) => (
                <p key={item} className="text-[11px] text-white/50 leading-relaxed">
                  {item}
                </p>
              ))
            ) : (
              <p className="text-[11px] text-white/35">这轮还没抽出明确关系线。</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
