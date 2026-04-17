import { useState, useCallback, useEffect } from 'react'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'
import { useStageStore } from '../../../store/useStageStore'
import { useAuthStore } from '../../../app/store/useAuthStore'
import { ProjectGenerationBanner } from '../../../components/ProjectGenerationBanner'
import { LoginModal } from '../../../components/LoginModal'
import type { SevenQuestionsResultDto, SevenQuestionsSectionDto } from '../../../../../shared/contracts/workflow'
import { extractConfirmedSevenQuestions } from '../../../../../shared/domain/workflow/seven-questions-authority.ts'
import {
  generateSevenQuestionsDraft,
  saveConfirmedSevenQuestions,
  generateOutlineAndCharactersFromConfirmedSevenQuestions
} from '../api'
import { requireConfirmedSevenQuestionsPersisted } from '../model/confirmed-seven-questions-persistence.ts'
import { switchStageSession } from '../../../app/services/stage-session-service'
import { normalizeWorkspaceChatErrorMessage } from '../../workspace/ui/workspace-chat-error-message'
import { ApiError, apiGenerateOutlineAndCharacters } from '../../../services/api-client'
import { motion } from 'framer-motion'

const SEVEN_FIELD_LABELS: Array<{ key: keyof import('../../../../../shared/contracts/workflow').SevenQuestionsDto; label: string }> = [
  { key: 'goal', label: '目标' },
  { key: 'obstacle', label: '阻碍' },
  { key: 'effort', label: '努力' },
  { key: 'result', label: '结果' },
  { key: 'twist', label: '意外' },
  { key: 'turnaround', label: '转折' },
  { key: 'ending', label: '结局' }
]

function SectionCard(props: {
  section: SevenQuestionsSectionDto
  onChange: (updated: SevenQuestionsSectionDto) => void
}) {
  const { section, onChange } = props

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
              onChange({
                ...section,
                sevenQuestions: { ...section.sevenQuestions, [key]: e.target.value }
              })
            }}
          />
        </div>
      ))}
    </div>
  )
}

export function useSevenQuestionsReviewActions() {
  const projectId = useWorkflowStore((s) => s.projectId)
  const storyIntent = useWorkflowStore((s) => s.storyIntent)
  const generationStatus = useWorkflowStore((s) => s.generationStatus)
  const setGenerationNotice = useWorkflowStore((s) => s.setGenerationNotice)
  const clearGenerationNotice = useWorkflowStore((s) => s.clearGenerationNotice)
  const setStoryIntent = useWorkflowStore((s) => s.setStoryIntent)
  const hydrateProjectDrafts = useStageStore((s) => s.hydrateProjectDrafts)
  const outline = useStageStore((s) => s.outline)

  // 认证状态
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const refreshCredits = useAuthStore((s) => s.refreshCredits)

  const [draft, setDraft] = useState<SevenQuestionsResultDto | null>(null)
  const [editingSections, setEditingSections] = useState<SevenQuestionsSectionDto[]>([])
  const [isSaved, setIsSaved] = useState(false)
  const [status, setStatus] = useState(
    '这里先起草并确认篇章七问。确认后，系统才会继续生成粗纲和人物。'
  )
  // 积分不足提示状态
  const [creditsError, setCreditsError] = useState<string | null>(null)
  // 需要弹出登录框的信号
  const [requireLogin, setRequireLogin] = useState(false)
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

  // 清除积分错误提示
  const clearCreditsError = useCallback(() => {
    setCreditsError(null)
  }, [])

  useEffect(() => {
    const persisted = extractConfirmedSevenQuestions(outline)
    if (!persisted) return

    setDraft(persisted)
    setEditingSections(persisted.sections.map((section) => ({ ...section })))
    setIsSaved(true)
    setStatus('已读取已保存的七问。你可以继续修改后再保存，或单独启动粗纲和人物生成。')
  }, [outline])

  async function handleGenerateDraft(): Promise<void> {
    // === 无情拦截：未登录 ===
    if (!isLoggedIn) {
      setRequireLogin(true)
      return
    }

    if (!projectId || !storyIntent) {
      setStatus('还没有确认创作信息。先在聊天区确认信息，再生成七问。')
      return
    }

    // === 清除旧状态 ===
    setCreditsError(null)
    clearGenerationNotice()
    setStatus('正在生成七问初稿，请稍等。')

    try {
      const result = await generateSevenQuestionsDraft(projectId, storyIntent)
      if (result.sevenQuestions) {
        setDraft(result.sevenQuestions)
        setEditingSections(result.sevenQuestions.sections.map((s) => ({ ...s })))
        setIsSaved(false)
        setStatus('七问初稿已生成。你可以逐篇章修改，确认后再继续生成粗纲和人物。')
      } else {
        setStatus('七问生成失败，请再试一次。')
      }

      // === 账本实时同步：刷新积分 ===
      await refreshCredits()
    } catch (error) {
      // === 穷鬼拦截：积分不足 ===
      if (error instanceof ApiError && error.code === 'INSUFFICIENT_CREDITS') {
        setCreditsError('您的积分不足，请充值后继续使用')
        setStatus('积分不足，无法生成')
        return
      }

      // === Token 过期拦截 ===
      if (error instanceof ApiError && error.code === 'TOKEN_EXPIRED') {
        setRequireLogin(true)
        return
      }

      pushErrorNotice('七问生成失败', error)
    }
  }

  const handleSectionChange = useCallback((updated: SevenQuestionsSectionDto) => {
    setIsSaved(false)
    clearGenerationNotice()
    setStatus('你刚改了七问，但这版还没保存。请先点击“确认并保存七问”，再生成粗纲和人物。')
    setEditingSections((prev) =>
      prev.map((s) => (s.sectionNo === updated.sectionNo ? updated : s))
    )
  }, [clearGenerationNotice])

  async function handleSaveConfirmed(): Promise<void> {
    // === 全局登录守卫：未登录拦截 ===
    if (!isLoggedIn) {
      setRequireLogin(true)
      return
    }

    if (!projectId || !draft) return

    const confirmed: SevenQuestionsResultDto = {
      ...draft,
      sections: editingSections
    }

    clearGenerationNotice()
    setStatus('正在把七问落地，请稍等。')

    try {
      await saveConfirmedSevenQuestions(projectId, confirmed)
      const persistedProject = await window.api.workspace.getProject(projectId)
      const savedOutlineDraft = requireConfirmedSevenQuestionsPersisted(persistedProject)

      if (useWorkflowStore.getState().projectId === projectId) {
        const currentDrafts = useStageStore.getState()
        hydrateProjectDrafts({
          outline: savedOutlineDraft,
          characters: currentDrafts.characters,
          segments: currentDrafts.segments,
          script: currentDrafts.script
        })
        setDraft(confirmed)
        setEditingSections(confirmed.sections.map((section) => ({ ...section })))
        setIsSaved(true)
        setGenerationNotice({
          kind: 'success',
          title: '七问已经保存好了',
          detail: '现在可以留在这里继续改，也可以单独去生成粗纲和人物。',
          primaryAction: { label: '留在七问页', stage: 'seven_questions' },
          secondaryAction: { label: '去粗纲页', stage: 'outline' }
        })
        setStatus('七问已成功落盘。下一步由你决定，是继续修改，还是启动粗纲和人物生成。')
      }
    } catch (error) {
      pushErrorNotice('七问保存失败', error)
    }
  }

  async function handleGenerateOutlineAndCharacters(): Promise<void> {
    // === 全局登录守卫：未登录拦截 ===
    if (!isLoggedIn) {
      setRequireLogin(true)
      return
    }

    if (!projectId || !draft) return

    const confirmed: SevenQuestionsResultDto = {
      ...draft,
      sections: editingSections
    }

    if (!isSaved) {
      setGenerationNotice({
        kind: 'error',
        title: '还有未保存的七问改动',
        detail: '有未保存的改动，请先点击【确认并保存七问】。',
        primaryAction: { label: '留在七问页保存', stage: 'seven_questions' }
      })
      setStatus('有未保存的改动，请先点击【确认并保存七问】。')
      return
    }

    // === 清除旧状态 ===
    setCreditsError(null)
    clearGenerationNotice()
    setStatus('正在生成粗纲和人物，请稍等...')

    try {
      // === 调用 HTTP API（新）===
      const result = await apiGenerateOutlineAndCharacters({
        storyIntent: storyIntent || {},
        sevenQuestions: confirmed,
        totalEpisodes: 10
      })

      if (result.success && useWorkflowStore.getState().projectId === projectId) {
        // 更新 store
        hydrateProjectDrafts({
          outline: result.outlineDraft,
          characters: result.characterDrafts,
          segments: [],
          script: []
        })

        setGenerationNotice({
          kind: 'success',
          title: '粗纲和人物已经生成好了',
          detail: '先确认粗纲主线，再去看人物。',
          primaryAction: { label: '去看粗纲', stage: 'outline' },
          secondaryAction: { label: '去看人物', stage: 'character' }
        })
        setDraft(confirmed)
        setEditingSections(confirmed.sections.map((section) => ({ ...section })))
        setStatus('粗纲和人物已生成好了，先去看粗纲。')

        // === 账本实时同步：刷新积分 ===
        await refreshCredits()
      }
    } catch (error) {
      // === 穷鬼拦截：积分不足 ===
      if (error instanceof ApiError && error.code === 'INSUFFICIENT_CREDITS') {
        setCreditsError('您的积分不足，生成粗纲和人物需要 3 积分，请充值后继续使用')
        setStatus('积分不足，无法生成')
        return
      }

      // === Token 过期拦截 ===
      if (error instanceof ApiError && error.code === 'TOKEN_EXPIRED') {
        setRequireLogin(true)
        return
      }

      pushErrorNotice('粗纲和人物生成失败', error)
    }
  }

  return {
    projectId,
    storyIntent,
    generationStatus,
    status,
    draft,
    editingSections,
    isSaved,
    creditsError,
    requireLogin,
    clearCreditsError,
    setRequireLogin,
    handleGenerateDraft,
    handleSectionChange,
    handleSaveConfirmed,
    handleGenerateOutlineAndCharacters
  }
}

export function SevenQuestionsReviewPanel() {
  const {
    storyIntent,
    generationStatus,
    status,
    draft,
    editingSections,
    isSaved,
    creditsError,
    requireLogin,
    clearCreditsError,
    setRequireLogin,
    handleGenerateDraft,
    handleSectionChange,
    handleSaveConfirmed,
    handleGenerateOutlineAndCharacters
  } = useSevenQuestionsReviewActions()
  const hasUnsavedChanges = editingSections.length > 0 && !isSaved
  const statusToneClass = hasUnsavedChanges
    ? 'border-rose-500/25 bg-rose-500/10'
    : 'border-orange-500/20 bg-orange-500/5'
  const statusTextClass = hasUnsavedChanges ? 'text-rose-200/90' : 'text-white/60'

  return (
    <div className="space-y-4">
      {generationStatus && <ProjectGenerationBanner status={generationStatus} />}

      <div className={`rounded-xl border px-4 py-3 ${statusToneClass}`}>
        <p className={`text-[11px] leading-relaxed ${statusTextClass}`}>
          {status}
        </p>
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

      {!draft && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => void handleGenerateDraft()}
            disabled={!storyIntent || Boolean(generationStatus)}
            className="rounded-xl px-6 py-3 text-xs font-black text-[#050505] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ background: '#FF7A00' }}
          >
            生成七问初稿
          </button>
        </div>
      )}

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
                  有未保存的改动，请先点击【确认并保存七问】。
                </p>
              )}
              <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => void handleSaveConfirmed()}
                disabled={Boolean(generationStatus)}
                className="rounded-xl px-6 py-3 text-xs font-black text-[#050505] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-orange-500/20"
                style={{ background: '#FF7A00' }}
              >
                确认并保存七问
              </button>
              <button
                onClick={() => void handleGenerateOutlineAndCharacters()}
                disabled={Boolean(generationStatus) || !isSaved}
                className="rounded-xl px-6 py-3 text-xs font-black border border-white/10 text-white/75 transition-all hover:text-white hover:bg-white/5 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                生成粗纲和人物
              </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 登录弹窗：未登录时点击生成触发 */}
      <LoginModal
        isOpen={requireLogin}
        onClose={() => setRequireLogin(false)}
      />
    </div>
  )
}
