import { ipcMain } from 'electron'
import { createOutlineSeed } from '../application/workspace/create-outline-seed.ts'
import {
  generateDetailedOutlineFromContext,
  isDetailedOutlineModelResultComplete
} from '../application/workspace/generate-detailed-outline.ts'
import { buildOutlineDraftWithConfirmedSevenQuestions } from '../application/workspace/save-confirmed-seven-questions.ts'
import { generateOutlineAndCharactersFromConfirmedSevenQuestions } from '../application/workspace/generate-outline-and-characters-from-confirmed-seven-questions.ts'
import { summarizeChatForGeneration } from '../application/workspace/summarize-chat-for-generation.ts'
import { confirmStoryIntentFromChat } from '../application/workspace/confirm-story-intent-from-chat.ts'
import { deriveOutlineEpisodeCount } from '../../shared/domain/workflow/episode-count.ts'
import {
  runWorkspaceGenerationTask,
  throwIfWorkspaceGenerationAborted
} from '../application/workspace/workspace-generation-run-registry.ts'
import { isConfirmedStoryIntentForTranscript } from '../../shared/domain/workflow/confirmed-story-intent.ts'
import type { SevenQuestionsResultDto } from '../../shared/contracts/workflow.ts'
import { loadRuntimeProviderConfig } from '../infrastructure/runtime-env/provider-config.ts'
import { appendRuntimeDiagnosticLog } from '../infrastructure/diagnostics/runtime-diagnostic-log.ts'
import {
  getProject,
  saveStoryIntent,
  saveDetailedOutlineSegments,
  saveOutlineAndCharacters,
  saveOutlineDraftWithSevenQuestions
} from '../infrastructure/storage/project-store.ts'
import {
  ConfirmStoryIntentFromChatInputDto,
  GenerateDetailedOutlineInputDto,
  LegacyGenerateOutlineAndCharactersBlockedInputDto,
  GenerateSevenQuestionsDraftInputDto,
  SaveConfirmedSevenQuestionsInputDto,
  SaveConfirmedSevenQuestionsResultDto,
  GenerateOutlineAndCharactersFromConfirmedSevenQuestionsInputDto
} from '../../shared/contracts/workspace.ts'
import {
  setProjectGenerationStatus,
  clearProjectGenerationStatus
} from '../application/runtime/project-generation-status-hub.ts'
import type { ProjectGenerationStatusDto } from '../../shared/contracts/generation.ts'
import type { OutlineDraftDto } from '../../shared/contracts/workflow.ts'
import { validateStageInputContract } from '../../shared/domain/workflow/validate-stage-input-contract.ts'

function createEmptyOutlineDraft(): OutlineDraftDto {
  return {
    title: '',
    genre: '',
    theme: '',
    mainConflict: '',
    protagonist: '',
    summary: '',
    summaryEpisodes: [],
    facts: []
  }
}

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

async function persistGeneratedWorkspace(input: {
  projectId: string
  storyIntent: NonNullable<Awaited<ReturnType<typeof getProject>>>['storyIntent']
  outlineDraft: NonNullable<Awaited<ReturnType<typeof getProject>>>['outlineDraft']
  sevenQuestions?: SevenQuestionsResultDto | null
  characterDrafts: NonNullable<Awaited<ReturnType<typeof getProject>>>['characterDrafts']
  signal?: AbortSignal
}): Promise<Awaited<ReturnType<typeof saveOutlineAndCharacters>>> {
  let nextProject = null as Awaited<ReturnType<typeof saveOutlineAndCharacters>>
  for (let attempt = 0; attempt < 5; attempt += 1) {
    throwIfWorkspaceGenerationAborted(input.signal)
    nextProject = await saveOutlineAndCharacters({
      projectId: input.projectId,
      storyIntent: input.storyIntent,
      outlineDraft: input.outlineDraft,
      characterDrafts: input.characterDrafts
    })
    if (nextProject) break
    await new Promise((resolve) => setTimeout(resolve, 120))
  }
  return nextProject
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

  ipcMain.handle('workspace:create-outline-seed', async (_event, input: { projectId: string }) => {
    const project = await getProject(input.projectId)
    if (!project) return null
    return createOutlineSeed(project)
  })

  ipcMain.handle(
    'workspace:generate-outline-and-characters',
    async (event, input: LegacyGenerateOutlineAndCharactersBlockedInputDto) => {
      return runWorkspaceGenerationTask({
        sender: event.sender,
        projectId: input.projectId,
        task: 'outline_and_characters',
        run: async (signal) => {
          try {
            const project = await waitForProject(input.projectId, signal)
            if (!project) {
              return {
                project: null,
                storyIntent: null,
                outlineDraft: null,
                characterDrafts: []
              }
            }

            const confirmedStoryIntent = isConfirmedStoryIntentForTranscript(
              project.storyIntent,
              input.chatTranscript
            )
              ? project.storyIntent
              : null
            if (!confirmedStoryIntent) {
              throw new Error('confirmed_story_intent_missing')
            }
            throw new Error('seven_questions_confirmation_required')
          } finally {
            clearProjectGenerationStatus(input.projectId)
          }
        }
      })
    }
  )

  ipcMain.handle(
    'workspace:generate-detailed-outline',
    async (event, input: GenerateDetailedOutlineInputDto) => {
      return runWorkspaceGenerationTask({
        sender: event.sender,
        projectId: input.projectId,
        task: 'detailed_outline',
        run: async (signal) => {
          const DETAILED_OUTLINE_ESTIMATED_SECONDS = 90
          const status: ProjectGenerationStatusDto = {
            task: 'detailed_outline',
            stage: 'detailed_outline',
            title: '正在生成详细大纲',
            detail: '我在根据粗纲和人物，把这一版详细大纲补齐成真正能往下写的推进图。',
            startedAt: Date.now(),
            estimatedSeconds: DETAILED_OUTLINE_ESTIMATED_SECONDS,
            scope: 'project'
          }
          setProjectGenerationStatus(input.projectId, status)
          try {
            const project = await waitForProject(input.projectId, signal)
            if (!project) {
              await appendRuntimeDiagnosticLog(
                'workspace',
                `generateDetailedOutline missing project projectId=${input.projectId}`
              )
              throw new Error(`detailed_outline_project_missing:${input.projectId}`)
            }

            const outlineDraft = project.outlineDraft ?? createEmptyOutlineDraft()
            const entryValidation = validateStageInputContract('detailed_outline', {
              storyIntent: project.storyIntent,
              outline: outlineDraft,
              characters: project.characterDrafts,
              segments: project.detailedOutlineSegments,
              script: project.scriptDraft
            })
            if (!entryValidation.ready) {
              const primaryIssue = entryValidation.issues[0]
              await appendRuntimeDiagnosticLog(
                'workspace',
                `generateDetailedOutline blocked projectId=${input.projectId} issues=${entryValidation.issues.map((issue) => issue.code).join(',')}`
              )
              throw new Error(primaryIssue?.code || 'detailed_outline_input_contract_blocked')
            }

            const runtimeConfig = loadRuntimeProviderConfig()
            const detailedOutlineResult = await generateDetailedOutlineFromContext({
              outline: outlineDraft,
              characters: project.characterDrafts,
              entityStore: project.entityStore,
              storyIntent: project.storyIntent,
              runtimeConfig,
              diagnosticLogger: (message) =>
                appendRuntimeDiagnosticLog('detailed_outline', message),
              signal
            })

            throwIfWorkspaceGenerationAborted(signal)
            if (detailedOutlineResult.segments.length === 0) {
              await appendRuntimeDiagnosticLog(
                'workspace',
                `generateDetailedOutline empty_segments projectId=${input.projectId} diagnostic=${detailedOutlineResult.diagnostic}`
              )
              throw new Error(`detailed_outline_empty_segments:${detailedOutlineResult.diagnostic}`)
            }

            // FAIL-CLOSED: Validate episode coverage before save
            const totalEpisodes = deriveOutlineEpisodeCount(outlineDraft)
            if (
              !isDetailedOutlineModelResultComplete(detailedOutlineResult.segments, totalEpisodes)
            ) {
              const actualBeats = detailedOutlineResult.segments.reduce(
                (sum, seg) => sum + (seg.episodeBeats?.length ?? 0),
                0
              )
              await appendRuntimeDiagnosticLog(
                'workspace',
                `generateDetailedOutline episode_count_short projectId=${input.projectId} expected=${totalEpisodes} actual=${actualBeats} diagnostic=${detailedOutlineResult.diagnostic}`
              )
              throw new Error(
                `detailed_outline_episode_count_short:expected=${totalEpisodes},actual=${actualBeats}`
              )
            }

            const nextProject = await saveDetailedOutlineSegments({
              projectId: input.projectId,
              detailedOutlineSegments: detailedOutlineResult.segments
            })

            if (!nextProject) {
              await appendRuntimeDiagnosticLog(
                'workspace',
                `generateDetailedOutline save_failed projectId=${input.projectId} diagnostic=${detailedOutlineResult.diagnostic}`
              )
              throw new Error(`detailed_outline_save_failed:${input.projectId}`)
            }

            const beatCount = detailedOutlineResult.segments.reduce(
              (total, segment) => total + (segment.episodeBeats?.length || 0),
              0
            )
            const sceneCount = detailedOutlineResult.segments.reduce(
              (total, segment) =>
                total +
                (segment.episodeBeats ?? []).reduce(
                  (episodeTotal, episode) => episodeTotal + (episode.sceneByScene?.length || 0),
                  0
                ),
              0
            )
            await appendRuntimeDiagnosticLog(
              'workspace',
              `generateDetailedOutline projectId=${input.projectId} source=${detailedOutlineResult.source} segments=${detailedOutlineResult.segments.length} beats=${beatCount} scenes=${sceneCount} saved=${nextProject ? 'yes' : 'no'} diagnostic=${detailedOutlineResult.diagnostic}`
            )

            return {
              project: nextProject,
              detailedOutlineSegments: detailedOutlineResult.segments,
              source: detailedOutlineResult.source
            }
          } finally {
            clearProjectGenerationStatus(input.projectId)
          }
        }
      })
    }
  )

  // ─── 七问工作流 handlers ───────────────────────────────────────────────
  // Note: workspace:generate-seven-questions-draft has been migrated to HTTP server.
  // This IPC handler placeholder is kept for backward compatibility only.
  // Renderer should use apiGenerateSevenQuestions() instead.

  ipcMain.handle(
    'workspace:generate-seven-questions-draft',
    async (_event, _input: GenerateSevenQuestionsDraftInputDto) => {
      throw new Error('ipc_deprecated:generate-seven-questions-draft:use_http_api')
    }
  )

  ipcMain.handle(
    'workspace:save-confirmed-seven-questions',
    async (
      _event,
      input: SaveConfirmedSevenQuestionsInputDto
    ): Promise<SaveConfirmedSevenQuestionsResultDto> => {
      const project = await getProject(input.projectId)
      if (!project?.storyIntent) {
        return { project: null, outlineDraft: null }
      }

      const { outlineDraft } = buildOutlineDraftWithConfirmedSevenQuestions({
        storyIntent: project.storyIntent,
        sevenQuestions: input.sevenQuestions
      })

      const nextProject = await saveOutlineDraftWithSevenQuestions({
        projectId: input.projectId,
        outlineDraft
      })

      return {
        project: nextProject,
        outlineDraft: nextProject?.outlineDraft ?? null
      }
    }
  )

  ipcMain.handle(
    'workspace:generate-outline-and-characters-from-confirmed-seven-questions',
    async (event, input: GenerateOutlineAndCharactersFromConfirmedSevenQuestionsInputDto) => {
      return runWorkspaceGenerationTask({
        sender: event.sender,
        projectId: input.projectId,
        task: 'outline_and_characters',
        run: async (signal) => {
          const status: ProjectGenerationStatusDto = {
            task: 'outline_and_characters',
            stage: 'seven_questions',
            title: '正在生成粗纲和人物',
            detail: '我在根据已确认的七问，生成粗纲和人物小传。',
            startedAt: Date.now(),
            estimatedSeconds: 600,
            scope: 'project'
          }
          setProjectGenerationStatus(input.projectId, status)
          try {
            const project = await waitForProject(input.projectId, signal)
            if (!project) {
              return {
                project: null,
                storyIntent: null,
                outlineDraft: null,
                characterDrafts: []
              }
            }

            if (!project.storyIntent) {
              throw new Error('confirmed_story_intent_missing')
            }

            const runtimeConfig = loadRuntimeProviderConfig()
            const generated = await generateOutlineAndCharactersFromConfirmedSevenQuestions({
              storyIntent: project.storyIntent,
              outlineDraft: project.outlineDraft,
              runtimeConfig,
              signal
            })

            throwIfWorkspaceGenerationAborted(signal)

            const nextProject = await persistGeneratedWorkspace({
              projectId: input.projectId,
              storyIntent: generated.storyIntent,
              outlineDraft: generated.outlineDraft,
              sevenQuestions: generated.sevenQuestions,
              characterDrafts: generated.characterDrafts,
              signal
            })

            return {
              project: nextProject,
              storyIntent: generated.storyIntent,
              outlineDraft: generated.outlineDraft,
              characterDrafts: generated.characterDrafts
            }
          } finally {
            clearProjectGenerationStatus(input.projectId)
          }
        }
      })
    }
  )
}
