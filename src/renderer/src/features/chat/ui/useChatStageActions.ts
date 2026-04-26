import type { ProjectGenerationStatusDto } from '../../../../../shared/contracts/generation'
import type { StorySynopsisReadiness } from '../../../../../shared/domain/intake/story-synopsis.ts'
import { inspectProjectIntakeReadiness } from '../../../../../shared/domain/intake/story-synopsis.ts'
import { useState } from 'react'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore.ts'
import { apiConfirmStoryIntentFromChat } from '../../../services/api-client.ts'
import { useTrackedGeneration } from '../../../app/hooks/useTrackedGeneration.ts'
import { resolveConfirmStoryIntentEstimatedSeconds } from '../../../app/utils/stage-estimates.ts'

export function useChatStageActions(): {
  projectId: string | null
  status: string
  generationStatus: ProjectGenerationStatusDto | null
  setStatus: (value: string) => void
  handleConfirmIntent: (chatTranscript: string) => Promise<{
    generationBriefText: string
    readiness: StorySynopsisReadiness
  }>
} {
  const projectId = useWorkflowStore((state) => state.projectId)
  const generationStatus = useWorkflowStore((state) => state.generationStatus)
  const setGenerationNotice = useWorkflowStore((state) => state.setGenerationNotice)
  const clearGenerationNotice = useWorkflowStore((state) => state.clearGenerationNotice)
  const setStoryIntent = useWorkflowStore((state) => state.setStoryIntent)
  const trackedGeneration = useTrackedGeneration()
  const [status, setStatus] = useState(
    '先把题材、主角、困境、世界观、阵营/场域和角色池说清楚。确认总结后，先进入人物小传。'
  )

  async function handleConfirmIntent(
    chatTranscript: string
  ): Promise<{ generationBriefText: string; readiness: StorySynopsisReadiness }> {
    if (!projectId) {
      setStatus('还没选中项目。先回首页打开一个项目，再继续这轮创作。')
      throw new Error('未选中项目')
    }

    const requestProjectId = projectId
    clearGenerationNotice()
    setStatus('正在整理你的聊天内容，生成创作信息总结...')

    try {
      const result = await trackedGeneration.track(
        {
          task: 'confirm_story_intent',
          title: '正在整理创作信息',
          detail: '正在把聊天内容整理成可生成人物小传的世界观、阵营和角色底账，请稍候...',
          fallbackSeconds: resolveConfirmStoryIntentEstimatedSeconds(),
          scope: 'project'
        },
        () =>
          apiConfirmStoryIntentFromChat({
            projectId: requestProjectId,
            chatTranscript
          })
      )

      if (!result.storyIntent) {
        throw new Error('确认信息失败，请再试一次。')
      }

      // 质量门检测
      const readiness = inspectProjectIntakeReadiness(result.storyIntent)

      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setStoryIntent(result.storyIntent)
        if (readiness.ready) {
          setGenerationNotice({
            kind: 'success',
            title: '创作信息总结已生成',
            detail: '世界观、阵营/场域、角色底账和故事梗概已具备进入人物小传所需信息。'
          })
        } else {
          setGenerationNotice({
            kind: 'warning',
            title: '创作信息总结已生成，但创作底账还缺几项',
            detail: `缺：${readiness.missing.join('、')}。请继续补充这些信息，再进入人物小传。`
          })
        }
      }

      setStatus(
        readiness.ready
          ? '创作信息总结已生成，世界观、阵营/场域和角色底账完整。下一步可以进入人物小传。'
          : `创作信息总结已生成，但还缺：${readiness.missing.join('、')}。请继续补充后再进入人物小传。`
      )

      return {
        generationBriefText: result.generationBriefText,
        readiness
      }
    } catch (error) {
      setStatus('整理创作信息总结失败。继续补关键设定，再试一次。')
      throw error
    }
  }

  return {
    projectId,
    status: generationStatus ? generationStatus.detail : status,
    generationStatus,
    setStatus,
    handleConfirmIntent
  }
}
