import { Plus } from 'lucide-react'
import { WorkspaceInput } from '../../../components/WorkspaceCommons'

export interface ScriptSceneDraft {
  sceneNo: number
  action: string
  dialogue: string
  emotion: string
}

interface ScriptSceneDraftEditorProps {
  draft: ScriptSceneDraft
  onChange: (draft: ScriptSceneDraft) => void
  onSave: () => void
}

export function ScriptSceneDraftEditor(props: ScriptSceneDraftEditorProps) {
  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">第 {props.draft.sceneNo} 场 · 手动补写</p>
        <button
          onClick={props.onSave}
          className="ml-auto flex items-center gap-2 text-[11px] font-bold text-orange-400 border border-orange-500/30 px-3 py-1.5 rounded-lg hover:bg-orange-500/10 transition-all"
        >
          <Plus size={13} /> 保存场景
        </button>
      </div>

      <WorkspaceInput
        label="这一场发生了什么"
        placeholder="例：她将合同整齐叠好，放进公文包，侧过脸看向窗外。窗外下着雨。"
        value={props.draft.action}
        onChange={(value) => props.onChange({ ...props.draft, action: value })}
        multiline
        rows={3}
        hint="把人物动作、现场变化和压迫感写具体。"
      />

      <WorkspaceInput
        label="这一场最该留下的台词"
        placeholder="例：「你以为拿走文件，就能拿走你欠我的那五年？」"
        value={props.draft.dialogue}
        onChange={(value) => props.onChange({ ...props.draft, dialogue: value })}
        multiline
        rows={3}
        hint="把最能钉住冲突的那一句写出来。"
      />

      <WorkspaceInput
        label="这一场情绪怎么变了"
        placeholder="例：从愤怒→冰冷决意，完成内心翻盘"
        value={props.draft.emotion}
        onChange={(value) => props.onChange({ ...props.draft, emotion: value })}
        hint="写清这场之前和这场之后，人物心态有什么变化。"
      />
    </div>
  )
}
