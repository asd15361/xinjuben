import { useMemo, useState } from 'react'
import { Users, Plus, Shield, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { switchStageSession } from '../../../app/services/stage-session-service'
import { useStageStore } from '../../../store/useStageStore'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'
import { CharacterStageEditor } from '../../../components/CharacterStageEditor'
import { CopyTextButton } from '../../../components/CopyTextButton'
import { ProjectGenerationBanner } from '../../../components/ProjectGenerationBanner'
import { StageExportButton } from '../../../components/StageExportButton'
import { useOutlineCharacterGeneration } from '../../../app/hooks/useOutlineCharacterGeneration.ts'
import { useProjectStageExport } from '../../../app/hooks/useProjectStageExport'
import { useTrackedGeneration } from '../../../app/hooks/useTrackedGeneration.ts'
import { useAuthStore } from '../../../app/store/useAuthStore.ts'
import { generateFactionsFromConfirmedStoryIntent } from '../../seven-questions/api.ts'
import {
  buildCharacterProfileCopyText,
  buildCharacterStageCopyText,
  buildFactionRosterCopyText,
  buildLightCharacterCopyText
} from '../model/character-stage-copy-text.ts'
import {
  buildCharacterStageSections,
  createCharacterDraftFromEntityStore
} from '../model/derive-character-stage-sections.ts'
import type { CharacterDraftDto } from '../../../../../shared/contracts/workflow.ts'
import type { CharacterStageLightCard } from '../model/derive-character-stage-sections.ts'
import { deriveWorldBibleFromStoryIntent } from '../../../../../shared/domain/world-building/world-foundation.ts'
import { CharacterRosterLedgerPanel } from './CharacterRosterLedgerPanel.tsx'
import { StoryFoundationPanel } from './StoryFoundationPanel.tsx'

function getCharacterCardKey(character: CharacterDraftDto): string {
  if (character.masterEntityId) {
    return character.masterEntityId
  }

  const fingerprint = [
    character.name,
    character.goal,
    character.biography,
    character.publicMask,
    character.hiddenPressure
  ]
    .map((item) => item.trim())
    .filter(Boolean)
    .join('|')

  return fingerprint || 'draft_character'
}

function buildLightCardDetails(card: CharacterStageLightCard): Array<{
  key: 'current-function' | 'public-identity' | 'stance' | 'voice-style'
  label: string
  value: string
}> {
  return (
    [
      { key: 'current-function', label: '当前功能', value: card.currentFunction || '' },
      { key: 'public-identity', label: '对外身份', value: card.publicIdentity || '' },
      { key: 'stance', label: '立场', value: card.stance || '' },
      { key: 'voice-style', label: '口风', value: card.voiceStyle || '' }
    ] as const
  ).filter((item) => item.value.trim())
}

function buildFullProfileEssentials(character: CharacterDraftDto): Array<{
  key:
    | 'appearance'
    | 'personality'
    | 'identity'
    | 'values'
    | 'plot-function'
    | 'payoff-tags'
    | 'reuse'
  label: string
  value: string
}> {
  const payoffTags = character.payoffTags?.filter(Boolean).join('、') || ''
  const reuseInfo = [
    character.reusableRoleKey,
    character.reuseSceneKeys?.filter(Boolean).join('、')
  ]
    .filter(Boolean)
    .join('｜')

  return (
    [
      { key: 'appearance', label: '外在形象', value: character.appearance || '' },
      { key: 'personality', label: '性格特点', value: character.personality || '' },
      { key: 'identity', label: '身份', value: character.identity || '' },
      { key: 'values', label: '价值观', value: character.values || '' },
      { key: 'plot-function', label: '剧情作用', value: character.plotFunction || '' },
      { key: 'payoff-tags', label: '爽点标签', value: payoffTags },
      { key: 'reuse', label: '复用机制', value: reuseInfo }
    ] as const
  ).filter((item) => item.value.trim())
}

export function CharacterStage(): JSX.Element {
  const characters = useStageStore((s) => s.characters)
  const updateCharacter = useStageStore((s) => s.updateCharacter)
  const addCharacter = useStageStore((s) => s.addCharacter)
  const removeCharacter = useStageStore((s) => s.removeCharacter)
  const projectId = useWorkflowStore((s) => s.projectId)
  const exportStage = useProjectStageExport()
  const { actionLabel, generationStatus, generationBusy, handleGenerateOutlineAndCharacters } =
    useOutlineCharacterGeneration('character')
  const setStoryIntent = useWorkflowStore((state) => state.setStoryIntent)
  const setProjectEntityStore = useWorkflowStore((state) => state.setProjectEntityStore)
  const refreshCredits = useAuthStore((state) => state.refreshCredits)
  const trackedGeneration = useTrackedGeneration()
  const [factionState, setFactionState] = useState<'idle' | 'generating' | 'saved' | 'failed'>('idle')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const entityStore = useWorkflowStore((state) => state.projectEntityStore)
  const storyIntent = useWorkflowStore((state) => state.storyIntent)
  const storyFoundation = storyIntent?.storyFoundation
  const worldBible =
    storyFoundation?.worldBible ??
    storyIntent?.worldBible ??
    (storyIntent ? deriveWorldBibleFromStoryIntent(storyIntent) : null)
  const characterRoster = storyFoundation?.characterRoster ?? storyIntent?.characterRoster ?? null
  const hasFactionMatrix = Boolean(storyFoundation?.factionMatrix ?? storyIntent?.factionMatrix)
  const sections = useMemo(
    () => buildCharacterStageSections({ characterDrafts: characters, entityStore }),
    [characters, entityStore]
  )

  async function handleGenerateFactions(): Promise<void> {
    if (!projectId || !storyIntent || factionState === 'generating') {
      setFactionState('failed')
      return
    }
    const requestProjectId = projectId
    setFactionState('generating')
    try {
      const result = await trackedGeneration.track(
        {
          task: 'factions',
          title: '正在生成阵营底账',
          detail: '正在根据世界观、故事背景和集数拆阵营、场域和角色位...',
          fallbackSeconds: 90,
          scope: 'project'
        },
        () => generateFactionsFromConfirmedStoryIntent(requestProjectId)
      )
      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setStoryIntent(result.project.storyIntent ?? result.storyIntent)
        setProjectEntityStore(result.project.entityStore ?? entityStore)
        setFactionState('saved')
        await refreshCredits()
      }
    } catch {
      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setFactionState('failed')
      }
    }
  }

  async function handleGoToOutline(): Promise<void> {
    if (!projectId) return
    const result = await switchStageSession(projectId, 'outline')
    if (!result) {
      return
    }
  }

  function handleRemoveCharacter(index: number): void {
    removeCharacter(index)
    setEditingIndex((current) => {
      if (current === null) return null
      if (current === index) return null
      if (current > index) return current - 1
      return current
    })
  }

  function createEmptyCharacter(): CharacterDraftDto {
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
      arc: '',
      roleLayer: 'active' as const
    }
  }

  function handleUpgradeLightCard(entityId: string): void {
    const draft = createCharacterDraftFromEntityStore({
      entityStore,
      characterEntityId: entityId
    })
    if (!draft) return
    addCharacter(draft)
    setEditingIndex(characters.length)
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
                世界底账先铺开，再把关键人物升级成完整小传。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <CopyTextButton
              label="复制全部人物"
              copiedLabel="已复制"
              getText={() => buildCharacterStageCopyText(sections)}
            />
            <StageExportButton
              onClick={() => {
                void exportStage('character')
              }}
            />
            <button
              onClick={() => {
                void handleGenerateFactions()
              }}
              disabled={factionState === 'generating' || !projectId || !storyIntent}
              className="flex items-center gap-2 rounded-xl border border-sky-400/25 bg-sky-400/10 px-4 py-2.5 text-xs font-black text-sky-100 transition-colors hover:bg-sky-400/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Wand2 size={13} />
              {factionState === 'generating'
                ? '生成中'
                : factionState === 'saved'
                  ? '阵营已更新'
                  : '生成阵营'}
            </button>
            {hasFactionMatrix ? (
              <button
                onClick={() => {
                  void handleGenerateOutlineAndCharacters()
                }}
                disabled={generationBusy}
                title={actionLabel}
                className="flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-2.5 text-xs font-black text-orange-300 transition-colors hover:bg-orange-500/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {actionLabel}
              </button>
            ) : (
              <div
                title="请先生成阵营"
                className="rounded-xl border border-sky-400/20 bg-sky-400/[0.06] px-4 py-2.5 text-xs font-black text-sky-100/70"
              >
                下一步：生成人物小传
              </div>
            )}
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
                void handleGoToOutline()
              }}
              className="rounded-xl px-5 py-2.5 text-xs font-black text-[#050505] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/20"
              style={{ background: '#FF7A00' }}
            >
              确认：进入剧本骨架
            </button>
          </div>
        </div>

        <ProjectGenerationBanner status={generationStatus} />

        <StoryFoundationPanel
          projectId={projectId}
          storyIntent={storyIntent}
          worldBible={worldBible}
          characterRoster={characterRoster}
          fallbackRoleSlots={sections.factionSeatCount}
          entityStore={entityStore}
        />

        <CharacterRosterLedgerPanel characterRoster={characterRoster} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">
              完整人物小传
            </p>
            <p className="mt-3 text-3xl font-black text-white/90">{sections.fullProfiles.length}</p>
            <p className="mt-2 text-[11px] leading-5 text-white/45">
              真正要深写的人再进这里。这里的每一张卡，都会直接喂给后面的详细大纲和剧本。
            </p>
          </div>

          <div className="rounded-2xl border border-orange-500/20 bg-orange-500/[0.05] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300/70">
              轻量人物卡
            </p>
            <p className="mt-3 text-3xl font-black text-orange-200">{sections.lightCards.length}</p>
            <p className="mt-2 text-[11px] leading-5 text-orange-100/70">
              这些人物已经进了世界底账，但还没升级成完整小传。需要时一键提上来就行。
            </p>
          </div>

          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.05] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-200/75">
              势力与人物位
            </p>
            <p className="mt-3 text-3xl font-black text-sky-100">{sections.factionSeatCount}</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-sky-100/45">
              已识别 {sections.factionRoster.length} 方势力
            </p>
            <p className="mt-2 text-[11px] leading-5 text-sky-100/70">
              先看清每个势力下面已经站了谁，还缺哪些只读席位，别再逼系统只认三四个人。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-[1.15fr_0.85fr] gap-4 items-start">
          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 xl:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-2.5">
                  <Sparkles size={16} className="text-orange-300" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white/90">待升级轻量人物卡</h3>
                  <p className="text-[11px] text-white/45 mt-1">
                    这里的人已经进了世界底账，但还没占用完整小传工位。
                  </p>
                </div>
              </div>
              <CopyTextButton
                label="复制轻量卡"
                getText={() =>
                  sections.lightCards.length > 0
                    ? sections.lightCards.map(buildLightCharacterCopyText).join('\n\n')
                    : '暂无轻量人物卡'
                }
              />
            </div>

            {sections.lightCards.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-6 text-[12px] leading-6 text-white/40">
                当前没有待升级的人物。新人物可以继续从上游识别进世界底账，也可以在下面直接手动补完整小传。
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
                {sections.lightCards.map((card) => {
                  const lightCardDetails = buildLightCardDetails(card)

                  return (
                    <div
                      key={card.entityId}
                      data-testid={
                        card.identityMode === 'slot'
                          ? 'character-slot-light-card'
                          : 'character-light-card'
                      }
                      data-entity-id={card.entityId}
                      data-identity-mode={card.identityMode}
                      className="rounded-2xl border border-orange-500/15 bg-orange-500/[0.04] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4
                            data-testid="character-light-card-name"
                            className="text-base font-black text-white/90"
                          >
                            {card.name}
                          </h4>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {card.identityMode === 'slot' && (
                              <span
                                data-testid="character-light-card-slot-badge"
                                className="rounded-md border border-sky-500/25 bg-sky-500/10 px-2 py-1 text-[10px] font-black text-sky-100"
                              >
                                势力人物位
                              </span>
                            )}
                            {card.factionRole && (
                              <span
                                data-testid="character-light-card-faction-role"
                                className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-200"
                              >
                                {card.factionRole}
                              </span>
                            )}
                            <span className="rounded-md border border-orange-500/25 bg-orange-500/10 px-2 py-1 text-[10px] font-black text-orange-200">
                              {card.roleLayerLabel}
                            </span>
                            {card.factionNames.map((factionName) => (
                              <span
                                key={`${card.entityId}_${factionName}`}
                                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black text-white/45"
                              >
                                {factionName}
                              </span>
                            ))}
                          </div>
                          {card.publicIdentity && (
                            <p
                              data-testid="character-light-card-public-identity-preview"
                              className="mt-3 text-[11px] font-black tracking-[0.08em] text-white/40"
                            >
                              对外身份：{card.publicIdentity}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <CopyTextButton
                            label="复制"
                            getText={() => buildLightCharacterCopyText(card)}
                          />
                          <button
                            type="button"
                            onClick={() => handleUpgradeLightCard(card.entityId)}
                            className="rounded-xl border border-orange-500/30 bg-orange-500/15 px-3 py-2 text-[11px] font-black text-orange-200 hover:bg-orange-500/25 transition-all"
                          >
                            升级成完整小传
                          </button>
                        </div>
                      </div>

                      <p className="mt-4 text-[12px] leading-6 text-white/55">
                        {card.summary || '世界底账已经识别到这个人物，但还没补出更细的人物说明。'}
                      </p>

                      {lightCardDetails.length > 0 && (
                        <dl
                          data-testid="character-light-card-detail-list"
                          className="mt-4 grid grid-cols-1 gap-2 rounded-2xl border border-white/8 bg-black/10 p-3"
                        >
                          {lightCardDetails.map((detail) => (
                            <div
                              key={`${card.entityId}_${detail.label}`}
                              data-testid={`character-light-card-detail-${detail.key}`}
                              className="flex items-start gap-2 text-[11px] leading-5"
                            >
                              <dt className="shrink-0 font-black text-orange-100/75">
                                {detail.label}：
                              </dt>
                              <dd className="text-white/55">{detail.value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}

                      {(card.goalPreview || card.pressurePreview) && (
                        <div className="mt-4 space-y-2">
                          {card.goalPreview && (
                            <p className="text-[11px] text-white/45 leading-5">
                              想要：{card.goalPreview}
                            </p>
                          )}
                          {card.pressurePreview && (
                            <p className="text-[11px] text-white/45 leading-5">
                              压力：{card.pressurePreview}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 xl:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-2.5">
                  <Shield size={16} className="text-sky-200" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white/90">势力与人物位</h3>
                  <p className="text-[11px] text-white/45 mt-1">
                    这一块先只读，先确认每方势力下面到底站了哪些人，还缺哪些可补的人物位。
                  </p>
                </div>
              </div>
              <CopyTextButton
                label="复制势力"
                getText={() =>
                  sections.factionRoster.length > 0
                    ? sections.factionRoster.map(buildFactionRosterCopyText).join('\n\n')
                    : '暂无势力与人物位'
                }
              />
            </div>

            {sections.factionRoster.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-6 text-[12px] leading-6 text-white/40">
                当前世界底账还没识别出正式势力。回确认信息和粗纲继续补，人物页这里只做观察，不额外造第二套势力数据。
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {sections.factionRoster.map((faction) => (
                  <div
                    key={faction.factionId}
                    className="rounded-2xl border border-sky-500/15 bg-sky-500/[0.04] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-black text-white/90">{faction.name}</h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-md border border-sky-500/25 bg-sky-500/10 px-2 py-1 text-[10px] font-black text-sky-100">
                            {faction.factionTypeLabel}
                          </span>
                          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black text-white/40">
                            已实名 {faction.members.length} / 总位 {faction.seatCount}
                          </span>
                        </div>
                      </div>
                      <CopyTextButton
                        label="复制"
                        getText={() => buildFactionRosterCopyText(faction)}
                      />
                    </div>

                    {faction.summary && (
                      <p className="mt-4 text-[12px] leading-6 text-white/55">{faction.summary}</p>
                    )}

                    <div className="mt-4 space-y-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                          已实名人物
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {faction.members.length === 0 ? (
                            <span className="rounded-md border border-dashed border-white/15 px-2 py-1 text-[10px] font-black text-white/35">
                              当前还没挂上实名人物
                            </span>
                          ) : (
                            faction.members.map((member) => (
                              <span
                                key={member.entityId}
                                className={`rounded-md border px-2 py-1 text-[10px] font-black ${
                                  member.isFullProfile
                                    ? 'border-orange-500/30 bg-orange-500/10 text-orange-200'
                                    : 'border-white/10 bg-white/5 text-white/45'
                                }`}
                              >
                                {member.name} ·{' '}
                                {member.isFullProfile ? '已升完整' : member.roleLayerLabel}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      {faction.placeholderSeats.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-100/45">
                            待补席位
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {faction.placeholderSeats.map((seat) => (
                              <span
                                key={seat.seatKey}
                                className="rounded-md border border-dashed border-sky-500/25 bg-sky-500/[0.05] px-2 py-1 text-[10px] font-black text-sky-100/75"
                              >
                                {seat.label} · {seat.roleLayerLabel}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex items-center justify-between gap-4 pt-1">
          <div>
            <h3 className="text-sm font-black text-white/90">完整人物小传</h3>
            <p className="mt-1 text-[11px] text-white/45">
              这里只放真正要深写、要持续驱动后面工序的人物。
            </p>
          </div>
          <CopyTextButton
            label="复制完整小传"
            getText={() =>
              sections.fullProfiles.length > 0
                ? sections.fullProfiles.map(buildCharacterProfileCopyText).join('\n\n')
                : '暂无完整人物小传'
            }
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          {sections.fullProfiles.map((c, i) => (
            <div
              key={getCharacterCardKey(c)}
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
                <div
                  role="button"
                  tabIndex={0}
                  className="p-5 cursor-pointer flex flex-col h-full w-full text-left"
                  onClick={() => setEditingIndex(i)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setEditingIndex(i)
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h3 className="text-base font-black text-white/90 tracking-tight leading-none">
                      {c.name || `未命名 ${i + 1}`}
                    </h3>
                    <div className="flex items-center gap-2">
                      <CopyTextButton
                        label="复制"
                        getText={() => buildCharacterProfileCopyText(c)}
                      />
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
                    {buildFullProfileEssentials(c).length > 0 && (
                      <div className="grid gap-2 rounded-xl border border-white/10 bg-black/15 p-3">
                        {buildFullProfileEssentials(c).map((item) => (
                          <p
                            key={item.key}
                            className="text-[11px] leading-relaxed text-white/60"
                          >
                            <span className="font-black text-white/80">{item.label}：</span>
                            {item.value}
                          </p>
                        ))}
                      </div>
                    )}
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
                          被逼动作点: {c.conflictTrigger}
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
                </div>
              )}
            </div>
          ))}

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
