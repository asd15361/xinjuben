import { useState } from 'react'
import { Users, Plus, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { switchStageSession } from '../../../app/services/stage-session-service'
import { useStageStore } from '../../../store/useStageStore'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'
import { CharacterStageEditor } from '../../../components/CharacterStageEditor'

export function CharacterStage() {
  const characters = useStageStore((s) => s.characters)
  const updateCharacter = useStageStore((s) => s.updateCharacter)
  const addCharacter = useStageStore((s) => s.addCharacter)
  const removeCharacter = useStageStore((s) => s.removeCharacter)
  const projectId = useWorkflowStore((s) => s.projectId)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  async function handleGoToDetailedOutline(): Promise<void> {
    if (!projectId) return
    const result = await switchStageSession(projectId, 'detailed_outline')
    if (!result) {
      return
    }
  }

  function handleRemoveCharacter(index: number) {
    removeCharacter(index)
    setEditingIndex((current) => {
      if (current === null) return null
      if (current === index) return null
      if (current > index) return current - 1
      return current
    })
  }

  function createEmptyCharacter() {
    return {
      name: '新人物',
      biography: '',
      publicMask: '',
      hiddenPressure: '',
      fear: '',
      protectTarget: '',
      conflictTrigger: '',
      advantage: '',
      weakness: '',
      goal: '',
      arc: ''
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 xl:pr-2 space-y-8 pb-32 custom-scrollbar">
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.05] pb-6 mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <Users size={18} className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white/90">人物小传</h2>
              <p className="text-[11px] text-white/40 mt-0.5">
                塑造角色灵魂，剧本的发动机就在这里。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                addCharacter(createEmptyCharacter())
                setEditingIndex(characters.length)
              }}
              className="flex items-center gap-2 text-xs font-black text-orange-400 bg-orange-500/5 border border-orange-500/20 px-4 py-2.5 rounded-xl hover:bg-orange-500/10 transition-all"
            >
              <Plus size={14} /> 添加角色
            </button>

            <button
              onClick={() => {
                void handleGoToDetailedOutline()
              }}
              className="rounded-xl px-5 py-2.5 text-xs font-black text-[#050505] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/20"
              style={{ background: '#FF7A00' }}
            >
              确认：生成详细大纲
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          <AnimatePresence mode="popLayout">
            {characters.map((c, i) => (
              <motion.div
                key={`${c.name || 'character'}_${i}`}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`group relative rounded-2xl border transition-all duration-300 ${
                  editingIndex === i
                    ? 'xl:col-span-2 w-full ring-2 ring-orange-500/30 border-orange-500/40 bg-orange-500/[0.04]'
                    : 'w-full border-white/10 bg-white/[0.02] hover:border-orange-500/30 hover:bg-orange-500/[0.01]'
                }`}
              >
                {editingIndex === i ? (
                  <div className="p-6">
                    <CharacterStageEditor
                      characters={characters}
                      draft={c}
                      editingIndex={i}
                      downstreamLocked={false}
                      onDraftChange={(val) => updateCharacter(i, val)}
                      onCharacterChange={(idx, val) => {
                        updateCharacter(idx, val)
                      }}
                    />
                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={() => setEditingIndex(null)}
                        className="flex-1 py-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[11px] font-black text-orange-400 hover:bg-orange-500/20 transition-all font-bold"
                      >
                        保存并关闭编辑器
                      </button>
                      <button
                        onClick={() => handleRemoveCharacter(i)}
                        className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-[11px] font-black text-red-300 hover:bg-red-500/15 transition-all"
                        title="删除这个人物"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="p-5 cursor-pointer flex flex-col h-full w-full text-left"
                    onClick={() => setEditingIndex(i)}
                  >
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <h3 className="text-base font-black text-white/90 tracking-tight leading-none">
                        {c.name || `未命名 ${i + 1}`}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[8px] text-white/30 font-black uppercase tracking-widest group-hover:text-orange-400 group-hover:border-orange-500/30 transition-all">
                          点击修饰
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation()
                            handleRemoveCharacter(i)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              event.stopPropagation()
                              handleRemoveCharacter(i)
                            }
                          }}
                          className="p-2 rounded-lg border border-white/10 text-white/20 hover:text-red-300 hover:border-red-500/30 hover:bg-red-500/10 transition-all"
                          title="删除这个人物"
                        >
                          <Trash2 size={12} />
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4 flex-1">
                      <div className="flex flex-wrap gap-2">
                        {c.protectTarget && (
                          <span className="px-2 py-1 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[9px] font-black uppercase tracking-tighter">
                            最想守: {c.protectTarget}
                          </span>
                        )}
                        {c.fear && (
                          <span className="px-2 py-1 rounded-md bg-white/5 text-white/40 border border-white/10 text-[9px] font-black uppercase tracking-tighter">
                            最怕失去: {c.fear}
                          </span>
                        )}
                        {c.conflictTrigger && (
                          <span className="px-2 py-1 rounded-md bg-red-500/10 text-red-200 border border-red-500/20 text-[9px] font-black uppercase tracking-tighter">
                            一碰就炸: {c.conflictTrigger}
                          </span>
                        )}
                        {c.goal && (
                          <span className="px-2 py-1 rounded-md bg-white/5 text-white/40 border border-white/10 text-[9px] font-black uppercase tracking-tighter">
                            目标: {c.goal}
                          </span>
                        )}
                      </div>
                      {(c.publicMask || c.hiddenPressure) && (
                        <div className="space-y-2">
                          {c.publicMask && (
                            <p className="text-[11px] text-white/55 leading-relaxed">
                              表面：{c.publicMask}
                            </p>
                          )}
                          {c.hiddenPressure && (
                            <p className="text-[11px] text-white/55 leading-relaxed">
                              暗里卡着：{c.hiddenPressure}
                            </p>
                          )}
                        </div>
                      )}
                      <p className="text-[12px] text-white/50 leading-relaxed font-medium line-clamp-4">
                        {c.biography || '这个人物很神秘，还没有写下 TA 的生平小传...'}
                      </p>
                    </div>
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          <button
            onClick={() => {
              addCharacter(createEmptyCharacter())
              setEditingIndex(characters.length)
            }}
            className="w-full min-h-[160px] rounded-2xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-3 text-white/15 hover:text-orange-400/50 hover:border-orange-500/20 hover:bg-orange-500/[0.01] transition-all group"
          >
            <Plus
              size={28}
              strokeWidth={1.5}
              className="group-hover:scale-110 transition-transform"
            />
            <span className="text-[9px] font-black uppercase tracking-[0.25em]">塑造新灵魂</span>
          </button>
        </div>
      </div>
    </div>
  )
}
