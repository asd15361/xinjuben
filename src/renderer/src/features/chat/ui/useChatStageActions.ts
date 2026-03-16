import { useState } from 'react'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'
import { useStageStore } from '../../../store/useStageStore'
import { ensureOutlineEpisodeShape } from '../../../../../shared/domain/workflow/outline-episodes'

const OUTLINE_ESTIMATED_SECONDS = 160

export function useChatStageActions() {
  const projectId = useWorkflowStore((state) => state.projectId)
  const generationStatus = useWorkflowStore((state) => state.generationStatus)
  const setGenerationStatus = useWorkflowStore((state) => state.setGenerationStatus)
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
      detail: '我在把刚才的聊天收成第一版创作底稿。',
      startedAt: Date.now(),
      estimatedSeconds: OUTLINE_ESTIMATED_SECONDS,
      scope: 'project',
      autoChain: true,
      nextTask: 'detailed_outline'
    } as const
    setGenerationStatus(nextGenerationStatus)
    void window.api.workspace.saveGenerationStatus({ projectId: requestProjectId, generationStatus: nextGenerationStatus })
    setStatus(`正在把聊天内容收成第一版创作底稿，预计还要 ${OUTLINE_ESTIMATED_SECONDS} 秒。`)

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
      }
      setStatus(
        `已经生成：粗略大纲 ${episodeCount} 集，重点人物 ${result.characterDrafts.length} 个。先去粗纲把主线钉住，再进人物。`
      )
    } catch (error) {
      await window.api.workspace.saveGenerationStatus({ projectId: requestProjectId, generationStatus: null })
      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setGenerationStatus(null)
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
