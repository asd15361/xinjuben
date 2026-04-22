import type { ProjectGenerationStatusDto } from '../../../../../shared/contracts/generation'
import { useState } from 'react'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore.ts'
import { apiConfirmStoryIntentFromChat } from '../../../services/api-client.ts'

export function useChatStageActions(): {
  projectId: string | null
  status: string
  generationStatus: ProjectGenerationStatusDto | null
  setStatus: (value: string) => void
  handleConfirmIntent: (chatTranscript: string) => Promise<string>
} {
  const projectId = useWorkflowStore((state) => state.projectId)
  const generationStatus = useWorkflowStore((state) => state.generationStatus)
  const setGenerationNotice = useWorkflowStore((state) => state.setGenerationNotice)
  const clearGenerationNotice = useWorkflowStore((state) => state.clearGenerationNotice)
  const setStoryIntent = useWorkflowStore((state) => state.setStoryIntent)
  const [status, setStatus] = useState(
    '先把题材、主角、困境和冲突说清楚。聊到差不多时，我会先帮你收成正式创作信息，再进入七问确认。'
  )

  async function handleConfirmIntent(chatTranscript: string): Promise<string> {
    if (!projectId) {
      setStatus('还没选中项目。先回首页打开一个项目，再继续这轮创作。')
      throw new Error('未选中项目')
    }

    const requestProjectId = projectId
    clearGenerationNotice()
    setStatus('正在整理你刚才确认的内容，请先等我收成正式信息。')

    try {
      const result = await apiConfirmStoryIntentFromChat({
        projectId: requestProjectId,
        chatTranscript
      })

      if (!result.storyIntent) {
        throw new Error('确认信息失败，请再试一次。')
      }

      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setStoryIntent(result.storyIntent)
        setGenerationNotice({
          kind: 'success',
          title: '当前创作信息已经确认',
          detail: '下一步先确认七问，再用确认版七问去生成粗纲和人物。'
        })
      }
      setStatus('当前创作信息已经确认。下一步先去确认七问，再继续生成粗纲和人物。')
      return result.generationBriefText
    } catch (error) {
      setStatus('这次没有收成正式信息。继续补关键设定，再确认一版。')
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
