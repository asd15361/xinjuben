import type { ProjectSnapshotDto } from '../../../../../shared/contracts/project'

export interface IntakeDraftState {
  title: string
  genre: string
  protagonist: string
  antagonist: string
  conflict: string
  theme: string
  relationship: string
  twist: string
}

interface WorkspaceStoryIntentPanelProps {
  activeProject: ProjectSnapshotDto | null
  draft: IntakeDraftState
  storyIntentReady: boolean
  onDraftChange: (updater: (prev: IntakeDraftState) => IntakeDraftState) => void
  onSaveStoryIntent: () => void
  onCreateOutlineSeed: () => void
}

interface FieldProps {
  label: string
  value: string
  placeholder: string
  multiline?: boolean
  onChange: (value: string) => void
}

function Field(props: FieldProps) {
  return (
    <label className="block space-y-2">
      <span className="block text-[10px] uppercase tracking-widest text-white/25 font-bold">{props.label}</span>
      {props.multiline ? (
        <textarea
          rows={3}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          placeholder={props.placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 resize-none focus:outline-none"
        />
      ) : (
        <input
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          placeholder={props.placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none"
        />
      )}
    </label>
  )
}

export function WorkspaceStoryIntentPanel(props: WorkspaceStoryIntentPanelProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">故事方向卡</p>
          <h4 className="text-sm font-bold mt-1">{props.activeProject?.name || '未选择项目'}</h4>
        </div>
        <span className={`text-[10px] uppercase tracking-widest ${props.storyIntentReady ? 'text-green-400/80' : 'text-white/25'}`}>
          {props.storyIntentReady ? '已保存' : '待补充'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="标题提示"
          value={props.draft.title}
          placeholder="例：她带着婚约归来"
          onChange={(value) => props.onDraftChange((prev) => ({ ...prev, title: value }))}
        />
        <Field
          label="题材"
          value={props.draft.genre}
          placeholder="例：都市情感逆袭"
          onChange={(value) => props.onDraftChange((prev) => ({ ...prev, genre: value }))}
        />
      </div>

      <Field
        label="主角"
        value={props.draft.protagonist}
        placeholder="主角的身份、欲望、困局"
        onChange={(value) => props.onDraftChange((prev) => ({ ...prev, protagonist: value }))}
      />
      <Field
        label="对手"
        value={props.draft.antagonist}
        placeholder="对手是谁，如何构成施压"
        onChange={(value) => props.onDraftChange((prev) => ({ ...prev, antagonist: value }))}
      />
      <Field
        label="核心冲突"
        value={props.draft.conflict}
        placeholder="一句话说明全剧发动机"
        multiline
        onChange={(value) => props.onDraftChange((prev) => ({ ...prev, conflict: value }))}
      />
      <Field
        label="主题方向"
        value={props.draft.theme}
        placeholder="例：身份真相逼迫人物完成自我价值觉醒"
        multiline
        onChange={(value) => props.onDraftChange((prev) => ({ ...prev, theme: value }))}
      />
      <Field
        label="关系杠杆"
        value={props.draft.relationship}
        placeholder="人物关系如何制造戏剧张力"
        onChange={(value) => props.onDraftChange((prev) => ({ ...prev, relationship: value }))}
      />
      <Field
        label="关键反转"
        value={props.draft.twist}
        placeholder="例：第3集公开她才是真正继承人"
        onChange={(value) => props.onDraftChange((prev) => ({ ...prev, twist: value }))}
      />

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={props.onSaveStoryIntent}
          className="rounded-xl px-4 py-3 text-sm font-bold text-black disabled:opacity-40"
          style={{ background: '#FF7A00' }}
          disabled={!props.activeProject}
        >
          保存故事意图
        </button>
        <button
          onClick={props.onCreateOutlineSeed}
          className="rounded-xl px-4 py-3 text-sm font-bold border border-white/15 text-white disabled:opacity-40"
          disabled={!props.activeProject}
        >
          生成粗纲草稿
        </button>
      </div>
    </div>
  )
}
