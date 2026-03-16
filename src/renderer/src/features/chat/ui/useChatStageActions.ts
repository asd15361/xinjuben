import { useState } from 'react'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'
import { useStageStore } from '../../../store/useStageStore'
import { ensureOutlineEpisodeShape } from '../../../../../shared/domain/workflow/outline-episodes'

const OUTLINE_ESTIMATED_SECONDS = 160

export function useChatStageActions() {
  const projectId = useWorkflowStore((state) => state.projectId)
  const setStage = useWorkflowStore((state) => state.setStage)
  const generationStatus = useWorkflowStore((state) => state.generationStatus)
  const setGenerationStatus = useWorkflowStore((state) => state.setGenerationStatus)
  const setGenerationNotice = useWorkflowStore((state) => state.setGenerationNotice)
  const clearGenerationNotice = useWorkflowStore((state) => state.clearGenerationNotice)
  const setStoryIntent = useWorkflowStore((state) => state.setStoryIntent)
  const hydrateProjectDrafts = useStageStore((state) => state.hydrateProjectDrafts)
  const [status, setStatus] = useState(
    '先把题材、主角、困境和冲突说清楚。聊到差不多时，我会帮你收成第一版粗纲和人物。'
  )
  function countEpisodes(summary: string): number {
    return ensureOutlineEpisodeShape({
      title: '',
      genre: '',
      theme: '',
      mainConflict: '',
      protagonist: '',
      summary,
      summaryEpisodes: [],
      facts: []
    }).summaryEpisodes.filter((episode) => episode.summary.trim()).length
  }

  async function handleGenerate(chatTranscript: string): Promise<void> {
    if (!projectId) {
      setStatus('还没选中项目。先回首页打开一个项目，再继续这轮创作。')
      throw new Error('未选中项目')
    }

    const requestProjectId = projectId
    const nextGenerationStatus = {
      task: 'outline_bundle',
      stage: 'chat',
      title: '正在生成粗纲和人物',
      detail: '我在把刚才的聊天整理成第一版粗纲和人物。',
      startedAt: Date.now(),
      estimatedSeconds: OUTLINE_ESTIMATED_SECONDS,
      scope: 'project'
    } as const
    clearGenerationNotice()
    setGenerationStatus(nextGenerationStatus)
    void window.api.workspace.saveGenerationStatus({ projectId: requestProjectId, generationStatus: nextGenerationStatus })
    setStatus('正在把聊天内容整理成第一版粗纲和人物，请先稍等。')

    try {
      const result = await window.api.workspace.generateOutlineAndCharacters({
        projectId: requestProjectId,
        chatTranscript
      })

      if (!result.project || !result.outlineDraft) {
        throw new Error('系统生成失败，请再试一次。')
      }

      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setStoryIntent(result.storyIntent)
        hydrateProjectDrafts({
          outline: result.outlineDraft,
          characters: result.characterDrafts,
          segments: result.project.detailedOutlineSegments,
          script: result.project.scriptDraft
        })
      }
      const episodeCount = countEpisodes(result.outlineDraft.summary || '')
      await window.api.workspace.saveGenerationStatus({ projectId: requestProjectId, generationStatus: null })
      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setGenerationStatus(null)
        setGenerationNotice({
          kind: 'success',
          title: '第一版粗纲和人物已经生成好了',
          detail: `这次一共整理出粗略大纲 ${episodeCount} 集、重点人物 ${result.characterDrafts.length} 个。先确认粗纲主线，再去看人物。`,
          primaryAction: { label: '去看粗纲', stage: 'outline' },
          secondaryAction: { label: '去看人物', stage: 'character' }
        })
        setStage('outline')
      }
      setStatus(
        `第一版已经出来了：粗略大纲 ${episodeCount} 集，重点人物 ${result.characterDrafts.length} 个。先确认粗纲，再补人物。`
      )
    } catch (error) {
      await window.api.workspace.saveGenerationStatus({ projectId: requestProjectId, generationStatus: null })
      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setGenerationStatus(null)
        setGenerationNotice({
          kind: 'error',
          title: '粗纲和人物这次没有生成成功',
          detail: '先别换方向，继续补一句题材、主角困境或核心冲突，再重新生成一版。'
        })
      }
      setStatus('这次收束没有成功。继续补关键冲突或人物关系，再生成一版。')
      throw error
    }
  }

  return {
    projectId,
    status: generationStatus ? generationStatus.detail : status,
    generationStatus,
    setStatus,
    handleGenerate
  }
}
