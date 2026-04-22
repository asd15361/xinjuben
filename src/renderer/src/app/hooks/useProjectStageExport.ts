import { useCallback } from 'react'
import type { ExportableProjectStage } from '../../../../shared/contracts/workspace.ts'
import { useWorkflowStore } from '../store/useWorkflowStore.ts'

function stageLabel(stage: ExportableProjectStage): string {
  switch (stage) {
    case 'outline':
      return '粗略大纲'
    case 'character':
      return '人物小传'
    case 'detailed_outline':
      return '详细大纲'
    case 'script':
      return '剧本'
  }
}

export function useProjectStageExport(): (stage: ExportableProjectStage) => Promise<void> {
  const projectId = useWorkflowStore((state) => state.projectId)
  const setGenerationNotice = useWorkflowStore((state) => state.setGenerationNotice)

  const exportStage = useCallback(
    async (stage: ExportableProjectStage): Promise<void> => {
      if (!projectId) {
        setGenerationNotice({
          kind: 'error',
          title: '当前没有可下载的项目',
          detail: '先打开项目，再下载这一页的内容。'
        })
        return
      }

      try {
        const result = await window.api.workspace.exportProjectStageMarkdown({
          projectId,
          stage
        })

        if (!result.saved || !result.filePath) {
          return
        }

        setGenerationNotice({
          kind: 'success',
          title: `${stageLabel(stage)}已经下载好了`,
          detail: `文件已保存到：${result.filePath}`
        })
      } catch (error) {
        setGenerationNotice({
          kind: 'error',
          title: `${stageLabel(stage)}下载失败`,
          detail: `这次没有把文件写出来。${error instanceof Error ? error.message : String(error)}`
        })
      }
    },
    [projectId, setGenerationNotice]
  )

  return exportStage
}
