import { useEffect, useMemo, useState } from 'react'
import { Globe2, Save } from 'lucide-react'
import type { StoryIntentPackageDto } from '../../../../../shared/contracts/intake.ts'
import type {
  CharacterRosterDto,
  WorldBibleDto
} from '../../../../../shared/contracts/world-building.ts'
import { apiSaveStoryIntent } from '../../../services/api-client.ts'
import type { ProjectEntityStoreDto } from '../../../../../shared/contracts/entities.ts'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore.ts'
import {
  mergeWorldBibleIntoStoryIntent,
  splitWorldBibleListInput
} from '../model/story-foundation-edit.ts'

interface StoryFoundationPanelProps {
  projectId: string | null
  storyIntent: StoryIntentPackageDto | null
  worldBible: WorldBibleDto | null
  characterRoster: CharacterRosterDto | null
  fallbackRoleSlots: number
  entityStore: ProjectEntityStoreDto | null
}

interface WorldBibleFormState {
  definition: string
  worldType: string
  eraAndSpace: string
  socialOrder: string
  historicalWound: string
  powerOrRuleSystem: string
  coreResources: string
  taboosAndCosts: string
  shootableLocations: string
}

function toFormState(worldBible: WorldBibleDto | null): WorldBibleFormState {
  return {
    definition: worldBible?.definition || '',
    worldType: worldBible?.worldType || '',
    eraAndSpace: worldBible?.eraAndSpace || '',
    socialOrder: worldBible?.socialOrder || '',
    historicalWound: worldBible?.historicalWound || '',
    powerOrRuleSystem: worldBible?.powerOrRuleSystem || '',
    coreResources: (worldBible?.coreResources || []).join('\n'),
    taboosAndCosts: (worldBible?.taboosAndCosts || []).join('\n'),
    shootableLocations: (worldBible?.shootableLocations || []).join('\n')
  }
}

function buildWorldBibleFromForm(
  form: WorldBibleFormState,
  currentWorldBible: WorldBibleDto | null
): WorldBibleDto {
  return {
    definition: form.definition.trim() || '待补',
    worldType: form.worldType.trim() || '待补',
    eraAndSpace: form.eraAndSpace.trim() || '待补',
    socialOrder: form.socialOrder.trim() || '待补',
    historicalWound: form.historicalWound.trim() || '待补',
    powerOrRuleSystem: form.powerOrRuleSystem.trim() || '待补',
    coreResources: splitWorldBibleListInput(form.coreResources),
    taboosAndCosts: splitWorldBibleListInput(form.taboosAndCosts),
    shootableLocations: splitWorldBibleListInput(form.shootableLocations),
    source: currentWorldBible?.source || 'user_confirmed'
  }
}

function Field(props: {
  label: string
  value: string
  rows?: number
  onChange: (value: string) => void
}): JSX.Element {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/45">
        {props.label}
      </span>
      <textarea
        value={props.value}
        rows={props.rows ?? 3}
        onChange={(event) => props.onChange(event.target.value)}
        className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-black/15 px-3 py-3 text-[12px] leading-6 text-white/75 outline-none transition-colors placeholder:text-white/20 focus:border-emerald-400/40 focus:bg-black/20"
        placeholder="待补"
      />
    </label>
  )
}

export function StoryFoundationPanel(props: StoryFoundationPanelProps): JSX.Element {
  const setStoryIntent = useWorkflowStore((state) => state.setStoryIntent)
  const setProjectEntityStore = useWorkflowStore((state) => state.setProjectEntityStore)
  const [form, setForm] = useState<WorldBibleFormState>(() => toFormState(props.worldBible))
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const formKey = useMemo(() => JSON.stringify(props.worldBible ?? null), [props.worldBible])

  function updateForm(key: keyof WorldBibleFormState, value: string): void {
    setForm((current) => ({ ...current, [key]: value }))
    setSaveState('idle')
  }

  function handleReset(): void {
    setForm(toFormState(props.worldBible))
    setSaveState('idle')
  }

  async function persistCurrentWorldBible(): Promise<StoryIntentPackageDto | null> {
    if (!props.projectId || !props.storyIntent) return null
    const nextStoryIntent = mergeWorldBibleIntoStoryIntent(
      props.storyIntent,
      buildWorldBibleFromForm(form, props.worldBible)
    )

    const result = await apiSaveStoryIntent({
      projectId: props.projectId,
      storyIntent: nextStoryIntent,
      entityStore: props.entityStore
    })
    const persistedStoryIntent = result.project?.storyIntent ?? nextStoryIntent
    setStoryIntent(persistedStoryIntent)
    setProjectEntityStore(result.project?.entityStore ?? props.entityStore)
    return persistedStoryIntent
  }

  async function handleSave(): Promise<void> {
    setSaveState('saving')

    try {
      const persistedStoryIntent = await persistCurrentWorldBible()
      setSaveState(persistedStoryIntent ? 'saved' : 'failed')
    } catch {
      setSaveState('failed')
    }
  }

  useEffect(() => {
    setForm(toFormState(props.worldBible))
    setSaveState('idle')
  }, [formKey])

  return (
    <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 xl:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5">
            <Globe2 size={16} className="text-emerald-200" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white/90">世界观底账</h3>
            <p className="mt-1 text-[11px] text-emerald-100/60">
              世界、规则、阵营和角色规模先定住，再生成完整人物小传。
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3 xl:justify-end">
          <div className="grid grid-cols-3 gap-2 text-right">
            <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/30">
                角色位
              </p>
              <p className="mt-1 text-sm font-black text-white/85">
                {props.characterRoster?.actualRoleSlots ?? props.fallbackRoleSlots}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/30">
                最低
              </p>
              <p className="mt-1 text-sm font-black text-white/85">
                {props.characterRoster?.minimumRoleSlots ?? '-'}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/30">
                标准
              </p>
              <p className="mt-1 text-sm font-black text-white/85">
                {props.characterRoster?.standardRoleSlots ?? '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-black text-white/50 hover:bg-white/[0.07]"
            >
              重置
            </button>
            <button
              type="button"
              onClick={() => {
                void handleSave()
              }}
              disabled={!props.projectId || !props.storyIntent || saveState === 'saving'}
              className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-[11px] font-black text-emerald-100 hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save size={13} />
              {saveState === 'saving' ? '保存中' : saveState === 'saved' ? '已保存' : '保存底账'}
            </button>
          </div>
        </div>
      </div>

      {saveState === 'failed' && (
        <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[12px] font-black text-red-100">
          保存失败，世界观底账还没有写入项目。
        </p>
      )}

      <div className="mt-5 grid grid-cols-1 xl:grid-cols-3 gap-3">
        <Field
          label="世界定义"
          value={form.definition}
          onChange={(v) => updateForm('definition', v)}
        />
        <Field
          label="时代与空间"
          value={form.eraAndSpace}
          onChange={(v) => updateForm('eraAndSpace', v)}
        />
        <Field
          label="世界类型"
          value={form.worldType}
          onChange={(v) => updateForm('worldType', v)}
        />
        <Field
          label="秩序与规则"
          value={form.socialOrder}
          onChange={(v) => updateForm('socialOrder', v)}
        />
        <Field
          label="历史伤口"
          value={form.historicalWound}
          onChange={(v) => updateForm('historicalWound', v)}
        />
        <Field
          label="权力/超自然/制度规则"
          value={form.powerOrRuleSystem}
          onChange={(v) => updateForm('powerOrRuleSystem', v)}
        />
        <Field
          label="核心资源"
          value={form.coreResources}
          rows={4}
          onChange={(v) => updateForm('coreResources', v)}
        />
        <Field
          label="禁忌与代价"
          value={form.taboosAndCosts}
          rows={4}
          onChange={(v) => updateForm('taboosAndCosts', v)}
        />
        <Field
          label="可拍场域"
          value={form.shootableLocations}
          rows={4}
          onChange={(v) => updateForm('shootableLocations', v)}
        />
      </div>

      {props.characterRoster?.scaleWarning && (
        <p className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-[12px] font-black text-amber-100">
          {props.characterRoster.scaleWarning}
        </p>
      )}
    </section>
  )
}
