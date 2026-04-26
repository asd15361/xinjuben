import { ipcMain } from 'electron'
import { summarizeChatForGeneration } from '../application/workspace/summarize-chat-for-generation.ts'
import { confirmStoryIntentFromChat } from '../application/workspace/confirm-story-intent-from-chat.ts'
import {
  runWorkspaceGenerationTask,
  throwIfWorkspaceGenerationAborted
} from '../application/workspace/workspace-generation-run-registry.ts'
import { loadRuntimeProviderConfig } from '../infrastructure/runtime-env/provider-config.ts'
import { getProject, saveStoryIntent } from '../infrastructure/storage/project-store.ts'
import { ConfirmStoryIntentFromChatInputDto } from '../../shared/contracts/workspace.ts'
import {
  setProjectGenerationStatus,
  clearProjectGenerationStatus
} from '../application/runtime/project-generation-status-hub.ts'
import type { ProjectGenerationStatusDto } from '../../shared/contracts/generation.ts'

async function waitForProject(
  projectId: string,
  signal?: AbortSignal
): Promise<Awaited<ReturnType<typeof getProject>>> {
  let project = null as Awaited<ReturnType<typeof getProject>>
  for (let attempt = 0; attempt < 50; attempt += 1) {
    throwIfWorkspaceGenerationAborted(signal)
    project = await getProject(projectId)
    if (project) break
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return project
}

export function registerWorkspaceGenerationHandlers(): void {
  ipcMain.handle(
    'workspace:confirm-story-intent-from-chat',
    async (event, input: ConfirmStoryIntentFromChatInputDto) => {
      return runWorkspaceGenerationTask({
        sender: event.sender,
        projectId: input.projectId,
        task: 'confirm_story_intent',
        run: async (signal) => {
          const status: ProjectGenerationStatusDto = {
            task: 'confirm_story_intent',
            stage: 'chat',
            title: '正在确认当前创作信息',
            detail: '我在把刚才的聊天收成正式创作信息。',
            startedAt: Date.now(),
            estimatedSeconds: 45,
            scope: 'project'
          }
          setProjectGenerationStatus(input.projectId, status)
          try {
            const project = await waitForProject(input.projectId, signal)
            if (!project) {
              return {
                project: null,
                storyIntent: null,
                generationBriefText: ''
              }
            }

            const runtimeConfig = loadRuntimeProviderConfig()
            const confirmed = await confirmStoryIntentFromChat({
              projectId: input.projectId,
              chatTranscript: input.chatTranscript,
              existingEntityStore: project.entityStore,
              runtimeConfig,
              signal,
              summarizeChat: summarizeChatForGeneration
            })
            throwIfWorkspaceGenerationAborted(signal)
            const nextProject = await saveStoryIntent({
              projectId: input.projectId,
              storyIntent: confirmed.storyIntent,
              entityStore: confirmed.entityStore
            })

            return {
              project: nextProject,
              storyIntent: confirmed.storyIntent,
              generationBriefText: confirmed.generationBriefText
            }
          } finally {
            clearProjectGenerationStatus(input.projectId)
          }
        }
      })
    }
  )
}
