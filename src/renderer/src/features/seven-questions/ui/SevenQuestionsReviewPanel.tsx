import { useState, useCallback, useEffect, useRef } from 'react'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'
import { useStageStore } from '../../../store/useStageStore'
import { useAuthStore } from '../../../app/store/useAuthStore'
import { ProjectGenerationBanner } from '../../../components/ProjectGenerationBanner'
import { LoginModal } from '../../../components/LoginModal'
import { useTrackedGeneration } from '../../../app/hooks/useTrackedGeneration'
import {
  resolveOutlineBundleEstimatedSeconds,
  resolveSevenQuestionsEstimatedSeconds
} from '../../../app/utils/stage-estimates'
import type {
  SevenQuestionsResultDto,
  SevenQuestionsSectionDto,
  SevenQuestionCandidateDto,
  SevenQuestionsSessionDto
} from '../../../../../shared/contracts/workflow'
import type { ProjectGenerationStatusDto } from '../../../../../shared/contracts/generation'
import type { StoryIntentPackageDto } from '../../../../../shared/contracts/intake'
import { extractConfirmedSevenQuestions } from '../../../../../shared/domain/workflow/seven-questions-authority.ts'
import {
  generateSevenQuestionsDraft,
  saveConfirmedSevenQuestions,
  saveSevenQuestionsSession
} from '../api'
import { requireConfirmedSevenQuestionsPersisted } from '../model/confirmed-seven-questions-persistence.ts'
import { normalizeWorkspaceChatErrorMessage } from '../../workspace/ui/workspace-chat-error-message'
import { ApiError, apiGenerateOutlineAndCharacters } from '../../../services/api-client'
import { motion } from 'framer-motion'

const SEVEN_FIELD_LABELS: Array<{
  key: keyof import('../../../../../shared/contracts/workflow').SevenQuestionsDto
  label: string
}> = [
  { key: 'goal', label: '目标' },
  { key: 'obstacle', label: '阻碍' },
  { key: 'effort', label: '努力' },
  { key: 'result', label: '结果' },
  { key: 'twist', label: '意外' },
  { key: 'turnaround', label: '转折' },
  { key: 'ending', label: '结局' }
]

function SectionCard({
  section,
  onChange
}: {
  section: SevenQuestionsSectionDto
  onChange: (sectionNo: number, field: string, value: string) => void
}): JSX.Element {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-3">
      <div className="flex items-center gap-3 pb-2 border-b border-white/5">
        <div className="px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[10px] font-black text-orange-400">
          篇章 {section.sectionNo}
        </div>
        <span className="text-[13px] font-black text-white/80">{section.sectionTitle}</span>
        <span className="text-[11px] text-white/30 ml-auto">
          第{section.startEpisode}—第{section.endEpisode}集
        </span>
      </div>

      {SEVEN_FIELD_LABELS.map(({ key, label }) => (
        <div key={key} className="grid grid-cols-[60px_1fr] gap-3 items-start">
          <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold pt-1.5">
            {label}
          </label>
          <textarea
            className="w-full bg-white/[0.03] border border-white/8 rounded-xl px-3 py-2 text-[12px] text-white/70 leading-relaxed outline-none focus:border-orange-500/40 focus:text-white/90 transition-colors resize-none"
            rows={2}
            value={section.sevenQuestions[key]}
            onChange={(e) => {
              onChange(section.sectionNo, key, e.target.value)
            }}
          />
        </div>
      ))}
    </div>
  )
}

function CandidateCard({
  candidate,
  isSelected,
  isLocked,
  onSelect
}: {
  candidate: SevenQuestionCandidateDto
  isSelected: boolean
  isLocked: boolean
  onSelect: () => void
}): JSX.Element {
  const hasErrors = candidate.validationErrors && candidate.validationErrors.length > 0

  return (
    <div
      className={`rounded-xl border p-4 cursor-pointer transition-all ${
        isSelected
          ? hasErrors
            ? 'border-rose-500/40 bg-rose-500/5'
            : 'border-orange-500/40 bg-orange-500/5'
          : hasErrors
            ? 'border-rose-500/20 bg-rose-500/[0.02] hover:border-rose-500/30'
            : 'border-white/8 bg-white/[0.02] hover:border-white/15'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-2 h-2 rounded-full ${
            hasErrors ? 'bg-rose-500' : isSelected ? 'bg-orange-500' : 'bg-white/20'
          }`}
        />
        <span className="text-[12px] font-black text-white/80">{candidate.title}</span>
        {hasErrors && (
          <span className="ml-auto text-[10px] font-bold text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full">
            有错误
          </span>
        )}
        {isLocked && !hasErrors && (
          <span className="ml-auto text-[10px] font-bold text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full">
            已锁定
          </span>
        )}
        {candidate.source === 'edited' && !isLocked && !hasErrors && (
          <span className="ml-auto text-[10px] font-bold text-white/40 border border-white/10 px-2 py-0.5 rounded-full">
            已编辑
          </span>
        )}
      </div>
      <p className="text-[11px] text-white/50 leading-relaxed">{candidate.summary}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[10px] text-white/30">
          {candidate.result.sections.length} 个篇章 /{' '}
          {candidate.result.sections.reduce(
            (acc, s) => acc + (s.endEpisode - s.startEpisode + 1),
            0
          )}{' '}
          集
        </span>
      </div>
      {hasErrors && (
        <div className="mt-2 space-y-1">
          {candidate.validationErrors?.map((err, idx) => (
            <p key={idx} className="text-[10px] text-rose-300/80 leading-relaxed">
              · {err.message}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

export function useSevenQuestionsReviewActions(): {
  storyIntent: StoryIntentPackageDto | null
  generationStatus: ProjectGenerationStatusDto | null
  status: string
  draft: SevenQuestionsResultDto | null
  editingSections: SevenQuestionsSectionDto[]
  candidates: SevenQuestionCandidateDto[]
  selectedCandidateId: string | null
  lockedCandidateId: string | null
  needsMoreCandidates: boolean
  isSaved: boolean
  isGenerating: boolean
  elapsedSeconds: number
  creditsError: string | null
  requireLogin: boolean
  clearCreditsError: () => void
  setRequireLogin: (value: boolean) => void
  handleGenerateDraft: () => Promise<void>
  handleRegenerate: () => Promise<void>
  handleSelectCandidate: (id: string) => void
  handleSectionChange: (sectionNo: number, field: string, value: string) => void
  handleSaveConfirmed: () => Promise<void>
  handleGenerateOutlineAndCharacters: () => Promise<void>
} {
  const projectId = useWorkflowStore((s) => s.projectId)
  const storyIntent = useWorkflowStore((s) => s.storyIntent)
  const generationStatus = useWorkflowStore((s) => s.generationStatus)
  const setGenerationNotice = useWorkflowStore((s) => s.setGenerationNotice)
  const clearGenerationNotice = useWorkflowStore((s) => s.clearGenerationNotice)
  const hydrateProjectDrafts = useStageStore((s) => s.hydrateProjectDrafts)
  const outline = useStageStore((s) => s.outline)
  const trackedGeneration = useTrackedGeneration()

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const refreshCredits = useAuthStore((s) => s.refreshCredits)

  // 候选列表（新增）
  const [candidates, setCandidates] = useState<SevenQuestionCandidateDto[]>([])
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [lockedCandidateId, setLockedCandidateId] = useState<string | null>(null)
  const [needsMoreCandidates, setNeedsMoreCandidates] = useState(false)

  // 兼容旧状态：editingResult 是当前编辑中的七问结果
  const [editingResult, setEditingResult] = useState<SevenQuestionsResultDto | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [status, setStatus] = useState(
    '这里先生成七问候选。你可以对比不同方案，选一个最对味的再编辑确认。'
  )
  const [creditsError, setCreditsError] = useState<string | null>(null)
  const [requireLogin, setRequireLogin] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // P0: session 持久化
  const sessionHydrated = useRef(false)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pushErrorNotice = useCallback(
    (title: string, error: unknown) => {
      const detail = normalizeWorkspaceChatErrorMessage(error)
      setGenerationNotice({
        kind: 'error',
        title,
        detail,
        primaryAction: { label: '留在七问页检查', stage: 'seven_questions' },
        secondaryAction: { label: '去粗纲页看现状', stage: 'outline' }
      })
      setStatus(`${title}：${detail}`)
    },
    [setGenerationNotice]
  )

  const clearCreditsError = useCallback(() => {
    setCreditsError(null)
  }, [])

  // P0: 持久化候选会话到后端（fire-and-forget，不阻塞 UI）
  const persistSession = useCallback(
    (overrides?: Partial<SevenQuestionsSessionDto>) => {
      if (!projectId) return
      const session: SevenQuestionsSessionDto = {
        candidates: overrides?.candidates ?? candidates,
        selectedCandidateId: overrides?.selectedCandidateId ?? selectedCandidateId,
        lockedCandidateId: overrides?.lockedCandidateId ?? lockedCandidateId
      }
      saveSevenQuestionsSession(projectId, session).catch(() => {
        // 静默失败：session 持久化不影响主流程
      })
    },
    [projectId, candidates, selectedCandidateId, lockedCandidateId]
  )

  // 防抖持久化（用于编辑场景，避免每次按键都请求）
  const schedulePersistSession = useCallback(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current)
    }
    persistTimerRef.current = setTimeout(() => {
      persistSession()
    }, 2000)
  }, [persistSession])

  // 从 outline 恢复已保存的七问或候选会话
  useEffect(() => {
    // 优先恢复已确认的七问
    const persisted = extractConfirmedSevenQuestions(outline)
    if (persisted) {
      setEditingResult(persisted)
      setIsSaved(true)
      setStatus('已读取已保存的七问。你可以继续修改后再保存，或单独启动粗纲和人物生成。')
      // 已确认 → 不恢复候选会话（流程已向前推进）
      sessionHydrated.current = true
      return
    }

    // 未确认 → 尝试从 session 恢复候选列表
    if (sessionHydrated.current) return
    sessionHydrated.current = true

    const session = outline.sevenQuestionsSession
    if (session && session.candidates.length > 0) {
      setCandidates(session.candidates)
      setSelectedCandidateId(session.selectedCandidateId)
      setLockedCandidateId(session.lockedCandidateId)
      setIsSaved(false)

      // 恢复 editingResult
      if (session.selectedCandidateId) {
        const selected = session.candidates.find((c) => c.id === session.selectedCandidateId)
        if (selected) {
          setEditingResult(selected.result)
        }
      }

      const lockedLabel = session.lockedCandidateId ? '已锁定' : '未锁定'
      setStatus(
        `已恢复 ${session.candidates.length} 个候选方案（${lockedLabel}）。你可以继续对比或编辑确认。`
      )
    }
  }, [outline])

  // P0: 组件卸载时清除防抖 timer
  useEffect(() => {
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current)
      }
    }
  }, [])

  // P1: 生成读秒
  useEffect(() => {
    if (!isGenerating) {
      setElapsedSeconds(0)
      return
    }
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [isGenerating])

  // 计算当前 draft（兼容旧代码）
  const draft = editingResult

  const editingSections = editingResult?.sections ?? []

  async function callGenerate(append = false): Promise<void> {
    if (!isLoggedIn) {
      setRequireLogin(true)
      return
    }

    if (!projectId || !storyIntent) {
      setStatus('还没有确认创作信息。先在聊天区确认信息，再生成七问。')
      return
    }

    setCreditsError(null)
    clearGenerationNotice()
    setIsGenerating(true)
    setStatus(append ? '正在生成更多七问候选，请稍等。' : '正在生成七问候选，请稍等。')

    try {
      const result = await trackedGeneration.track(
        {
          task: 'seven_questions',
          title: append ? '正在生成更多七问候选' : '正在生成七问候选',
          detail: append
            ? '正在补充更多篇章骨架方案，请稍候。'
            : '正在根据创作信息生成篇章骨架方案，请稍候。',
          fallbackSeconds: resolveSevenQuestionsEstimatedSeconds(),
          scope: 'project'
        },
        () => generateSevenQuestionsDraft(projectId, storyIntent)
      )

      if (result.candidates.length > 0) {
        const nextCandidates = append ? [...candidates, ...result.candidates] : result.candidates
        setCandidates(nextCandidates)
        setNeedsMoreCandidates(result.needsMoreCandidates)

        // 如果还没选中任何候选，自动选中第一个
        const autoSelectedId =
          !selectedCandidateId || !append ? result.candidates[0].id : selectedCandidateId
        if (!selectedCandidateId || !append) {
          setSelectedCandidateId(autoSelectedId)
          setEditingResult(result.candidates[0].result)
        }

        setIsSaved(false)
        setStatus(
          result.needsMoreCandidates
            ? `已生成 ${result.candidates.length} 个候选方案。可以继续生成更多方案，或选中一个编辑确认。`
            : `已生成 ${result.candidates.length} 个候选方案。选中一个编辑后点击确认锁定。`
        )

        // P0: 持久化候选会话
        persistSession({
          candidates: nextCandidates,
          selectedCandidateId: autoSelectedId,
          lockedCandidateId
        })
      } else {
        setStatus('七问生成失败，请再试一次。')
      }

      await refreshCredits()
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INSUFFICIENT_CREDITS') {
        setCreditsError('您的积分不足，请充值后继续使用')
        setStatus('积分不足，无法生成')
        return
      }

      if (error instanceof ApiError && error.code === 'TOKEN_EXPIRED') {
        setRequireLogin(true)
        return
      }

      pushErrorNotice('七问生成失败', error)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleGenerateDraft(): Promise<void> {
    await callGenerate(false)
  }

  async function handleRegenerate(): Promise<void> {
    await callGenerate(true)
  }

  function handleSelectCandidate(id: string): void {
    const candidate = candidates.find((c) => c.id === id)
    if (!candidate) return

    setSelectedCandidateId(id)
    setEditingResult(candidate.result)
    setIsSaved(false)
    clearGenerationNotice()
    setStatus(`已选中【${candidate.title}】。可以在下方编辑，确认后锁定。`)

    // P0: 持久化选中状态
    persistSession({ selectedCandidateId: id })
  }

  const handleSectionChange = useCallback(
    (sectionNo: number, field: string, value: string) => {
      setIsSaved(false)
      clearGenerationNotice()
      setStatus('你刚改了七问，但这版还没锁定。请先点击”确认并锁定七问”。')
      setEditingResult((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          sections: prev.sections.map((s) => {
            if (s.sectionNo !== sectionNo) return s
            return {
              ...s,
              sevenQuestions: { ...s.sevenQuestions, [field]: value }
            }
          })
        }
      })
      // P0: 防抖持久化编辑
      schedulePersistSession()
    },
    [clearGenerationNotice, schedulePersistSession]
  )

  async function handleSaveConfirmed(): Promise<void> {
    if (!isLoggedIn) {
      setRequireLogin(true)
      return
    }

    if (!projectId || !editingResult) return

    // 阻止保存验证失败的候选
    const selectedCandidate = candidates.find((c) => c.id === selectedCandidateId)
    if (selectedCandidate && selectedCandidate.validationErrors && selectedCandidate.validationErrors.length > 0) {
      const errorMessages = selectedCandidate.validationErrors.map((e) => e.message).join('；')
      setStatus(`此方案未通过验证，无法锁定。问题：${errorMessages}`)
      setGenerationNotice({
        kind: 'error',
        title: '此方案有验证错误，不能锁定',
        detail: errorMessages,
        primaryAction: { label: '留在七问页修改', stage: 'seven_questions' }
      })
      return
    }

    const confirmed: SevenQuestionsResultDto = editingResult

    clearGenerationNotice()
    setStatus('正在把七问锁定，请稍等。')

    try {
      const result = await saveConfirmedSevenQuestions(projectId, confirmed)
      const savedOutlineDraft = requireConfirmedSevenQuestionsPersisted(result.project)

      if (useWorkflowStore.getState().projectId === projectId) {
        const currentDrafts = useStageStore.getState()
        hydrateProjectDrafts({
          outline: savedOutlineDraft,
          characters: currentDrafts.characters,
          segments: currentDrafts.segments,
          script: currentDrafts.script
        })
        setLockedCandidateId(selectedCandidateId)
        setIsSaved(true)
        setGenerationNotice({
          kind: 'success',
          title: '七问已锁定',
          detail: '现在可以留在这里继续改，也可以单独去生成粗纲和人物。',
          primaryAction: { label: '留在七问页', stage: 'seven_questions' },
          secondaryAction: { label: '去粗纲页', stage: 'outline' }
        })
        setStatus('七问已成功锁定。下一步由你决定，是继续修改，还是启动粗纲和人物生成。')
      }
    } catch (error) {
      pushErrorNotice('七问保存失败', error)
    }
  }

  async function handleGenerateOutlineAndCharacters(): Promise<void> {
    if (!isLoggedIn) {
      setRequireLogin(true)
      return
    }

    if (!projectId || !editingResult) return

    if (!isSaved) {
      setGenerationNotice({
        kind: 'error',
        title: '还有未保存的七问改动',
        detail: '有未保存的改动，请先点击【确认并锁定七问】。',
        primaryAction: { label: '留在七问页保存', stage: 'seven_questions' }
      })
      setStatus('有未保存的改动，请先点击【确认并锁定七问】。')
      return
    }

    setCreditsError(null)
    clearGenerationNotice()
    setStatus('正在生成粗纲和人物，请稍等...')

    try {
      const result = await trackedGeneration.track(
        {
          task: 'outline_and_characters',
          title: '正在生成粗纲和人物',
          detail: '正在生成剧本骨架和人物小传，请稍候...',
          fallbackSeconds: resolveOutlineBundleEstimatedSeconds(),
          scope: 'project'
        },
        () =>
          apiGenerateOutlineAndCharacters({
            projectId
          })
      )

      if (result.success && useWorkflowStore.getState().projectId === projectId) {
        const latestProject = result.project
        hydrateProjectDrafts({
          outline: latestProject.outlineDraft ?? result.outlineDraft,
          characters: latestProject.characterDrafts ?? result.characterDrafts,
          segments: latestProject.detailedOutlineSegments ?? [],
          script: latestProject.scriptDraft ?? []
        })

        setGenerationNotice({
          kind: 'success',
          title: '粗纲和人物已经生成好了',
          detail: '先确认粗纲主线，再去看人物。',
          primaryAction: { label: '去看粗纲', stage: 'outline' },
          secondaryAction: { label: '去看人物', stage: 'character' }
        })
        setStatus('粗纲和人物已生成好了，先去看粗纲。')

        await refreshCredits()
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INSUFFICIENT_CREDITS') {
        setCreditsError('您的积分不足，生成粗纲和人物需要 3 积分，请充值后继续使用')
        setStatus('积分不足，无法生成')
        return
      }

      if (error instanceof ApiError && error.code === 'TOKEN_EXPIRED') {
        setRequireLogin(true)
        return
      }

      pushErrorNotice('粗纲和人物生成失败', error)
    }
  }

  return {
    storyIntent,
    generationStatus,
    status,
    draft,
    editingSections,
    candidates,
    selectedCandidateId,
    lockedCandidateId,
    needsMoreCandidates,
    isSaved,
    isGenerating,
    elapsedSeconds,
    creditsError,
    requireLogin,
    clearCreditsError,
    setRequireLogin,
    handleGenerateDraft,
    handleRegenerate,
    handleSelectCandidate,
    handleSectionChange,
    handleSaveConfirmed,
    handleGenerateOutlineAndCharacters
  }
}

export function SevenQuestionsReviewPanel(): JSX.Element {
  const {
    storyIntent,
    generationStatus,
    status,
    editingSections,
    candidates,
    selectedCandidateId,
    lockedCandidateId,
    needsMoreCandidates,
    isSaved,
    isGenerating,
    elapsedSeconds,
    creditsError,
    requireLogin,
    clearCreditsError,
    setRequireLogin,
    handleGenerateDraft,
    handleRegenerate,
    handleSelectCandidate,
    handleSectionChange,
    handleSaveConfirmed,
    handleGenerateOutlineAndCharacters
  } = useSevenQuestionsReviewActions()

  const hasUnsavedChanges = editingSections.length > 0 && !isSaved
  const statusToneClass = hasUnsavedChanges
    ? 'border-rose-500/25 bg-rose-500/10'
    : 'border-orange-500/20 bg-orange-500/5'
  const statusTextClass = hasUnsavedChanges ? 'text-rose-200/90' : 'text-white/60'

  const hasLocked = Boolean(lockedCandidateId)

  return (
    <div className="space-y-4">
      {generationStatus && <ProjectGenerationBanner status={generationStatus} />}

      <div className={`rounded-xl border px-4 py-3 ${statusToneClass}`}>
        <p className={`text-[11px] leading-relaxed ${statusTextClass}`}>{status}</p>
      </div>

      {/* 积分不足提示 */}
      {creditsError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 flex items-center justify-between"
        >
          <p className="text-sm font-bold text-rose-300">{creditsError}</p>
          <button
            onClick={clearCreditsError}
            className="text-xs text-rose-400/60 hover:text-rose-300 transition-colors ml-4"
          >
            关闭
          </button>
        </motion.div>
      )}

      {/* 需要更多候选提示 */}
      {needsMoreCandidates && candidates.length > 0 && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-2">
          <p className="text-[11px] text-yellow-200/70">
            只生成了 {candidates.length} 个候选方案，可以点击“生成更多方案”继续生成。
          </p>
        </div>
      )}

      {/* 初始状态：没有候选时显示生成按钮 */}
      {candidates.length === 0 && (
        <div className="flex flex-col items-center gap-2 pt-4">
          <button
            onClick={() => void handleGenerateDraft()}
            disabled={!storyIntent || Boolean(generationStatus) || isGenerating}
            className="rounded-xl px-6 py-3 text-xs font-black text-[#050505] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ background: '#FF7A00' }}
          >
            {isGenerating ? '生成中...' : '生成七问候选'}
          </button>
          {isGenerating && (
            <p className="text-[11px] text-white/40">
              已等待 {elapsedSeconds} 秒，预计 30-60 秒
              {elapsedSeconds > 90 && (
                <span className="text-yellow-400/70">（耗时较长，请耐心等待）</span>
              )}
            </p>
          )}
        </div>
      )}

      {/* 候选列表 */}
      {candidates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider">
              七问候选方案 ({candidates.length})
            </p>
            <div className="flex items-center gap-3">
              {isGenerating && (
                <span className="text-[10px] text-white/30">
                  {elapsedSeconds}s
                  {elapsedSeconds > 90 && '（耗时较长）'}
                </span>
              )}
              <button
                onClick={() => void handleRegenerate()}
                disabled={Boolean(generationStatus) || isGenerating}
                className="text-[10px] font-bold text-orange-400 hover:text-orange-300 transition-colors disabled:opacity-30"
              >
                {isGenerating ? '生成中...' : '+ 生成更多方案'}
              </button>
            </div>
          </div>
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              isSelected={candidate.id === selectedCandidateId}
              isLocked={candidate.id === lockedCandidateId}
              onSelect={() => handleSelectCandidate(candidate.id)}
            />
          ))}
        </div>
      )}

      {/* 编辑区：选中候选后显示 */}
      {editingSections.length > 0 && (
        <>
          <div className="space-y-4">
            {editingSections.map((section) => (
              <SectionCard
                key={section.sectionNo}
                section={section}
                onChange={handleSectionChange}
              />
            ))}
          </div>

          <div className="flex justify-center pt-2 pb-4">
            <div className="flex flex-col items-center justify-center gap-3">
              {hasUnsavedChanges && (
                <p className="text-[11px] font-bold text-rose-300">
                  有未保存的改动，请先点击【确认并锁定七问】。
                </p>
              )}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => void handleSaveConfirmed()}
                  disabled={Boolean(generationStatus) || isGenerating}
                  className="rounded-xl px-6 py-3 text-xs font-black text-[#050505] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-orange-500/20"
                  style={{ background: '#FF7A00' }}
                >
                  {hasLocked ? '确认并锁定七问' : '确认并锁定七问'}
                </button>
                <button
                  onClick={() => void handleGenerateOutlineAndCharacters()}
                  disabled={Boolean(generationStatus) || !isSaved || isGenerating}
                  className="rounded-xl px-6 py-3 text-xs font-black border border-white/10 text-white/75 transition-all hover:text-white hover:bg-white/5 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  生成粗纲和人物
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <LoginModal isOpen={requireLogin} onClose={() => setRequireLogin(false)} />
    </div>
  )
}
