import { useMemo, useState } from 'react'
import { ValidationBadge, WorkspaceInput } from '../../../components/WorkspaceCommons'
import { FactEngine } from '../../../services/coreEngines'
import type { OutlineDraftDto } from '../../../../../shared/contracts/workflow'
import { FormalFactList } from './FormalFactList'

type FactLevel = 'core' | 'supporting'

const EMPTY_DRAFT: {
  label: string
  description: string
  level: FactLevel
} = {
  label: '',
  description: '',
  level: 'core'
}

export function FormalFactDeclarationPanel(input: {
  outline: OutlineDraftDto
  onDeclare: (draft: { label: string; description: string; level: FactLevel }) => Promise<void>
  onConfirm: (factId: string) => Promise<void>
  onRemove: (factId: string) => Promise<void>
}): JSX.Element {
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  const validation = useMemo(() => {
    if (!draft.description.trim()) return null
    return FactEngine.validateCoreFact(
      draft.description,
      input.outline.mainConflict,
      input.outline.theme
    )
  }, [draft.description, input.outline.mainConflict, input.outline.theme])

  async function handleDeclare(): Promise<void> {
    if (!draft.label.trim() || !draft.description.trim()) return
    await input.onDeclare({
      label: draft.label.trim(),
      description: draft.description.trim(),
      level: draft.level
    })
    setDraft(EMPTY_DRAFT)
  }

  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">
            核心设定确认
          </p>
          <p className="text-[11px] text-white/35 mt-1">
            这一页用来把故事里最关键的真相先钉住。后面的页面只负责接着往下写，不再改这里的根。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {validation && <ValidationBadge score={validation.score} label="提交前检查" />}
          <button
            onClick={() => void handleDeclare()}
            className="rounded-xl px-3 py-2 text-[11px] font-bold text-black"
            style={{ background: '#FF7A00' }}
          >
            确认这条设定
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WorkspaceInput
          label="设定名称"
          placeholder="例：婚约原件"
          value={draft.label}
          onChange={(value) => setDraft({ ...draft, label: value })}
        />
        <label className="block space-y-2">
          <span className="block text-[10px] uppercase tracking-widest text-white/25 font-bold">
            设定级别
          </span>
          <select
            value={draft.level}
            onChange={(event) => setDraft({ ...draft, level: event.target.value as FactLevel })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
          >
            <option value="core">核心设定</option>
            <option value="supporting">辅助设定</option>
          </select>
        </label>
      </div>

      <WorkspaceInput
        label="设定内容"
        placeholder="例：女主手里持有一份足以改写婚约真相和继承权归属的原件。"
        value={draft.description}
        onChange={(value) => setDraft({ ...draft, description: value })}
        multiline
        rows={3}
        hint="先把这里写清楚，后面的页面就只负责把它写进人物、推进和场景里。"
      />

      <FormalFactList
        facts={input.outline.facts}
        onConfirm={(factId) => void input.onConfirm(factId)}
        onRemove={(factId) => void input.onRemove(factId)}
      />

      {validation && validation.suggestions.length > 0 && (
        <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-xl p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400/60">
            这一条还可以再补强
          </p>
          {validation.suggestions.map((item, index) => (
            <p key={index} className="text-[11px] text-yellow-300/50 leading-relaxed">
              · {item}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
