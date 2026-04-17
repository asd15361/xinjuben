import { ipcMain } from 'electron'
import {
  markBatchStatus,
  createInitialProgressBoard,
  createFailureResolution
} from '../../application/script-generation/progress-board.ts'
import { startScriptGeneration } from '../../application/script-generation/start-script-generation.ts'
import { buildScriptStateLedger } from '../../application/script-generation/ledger/build-script-ledger.ts'
import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config.ts'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake.ts'
import type { StartScriptGenerationInputDto } from '../../../shared/contracts/script-generation.ts'
import type { ProjectGenerationStatusDto } from '../../../shared/contracts/generation.ts'
import type {
  CharacterDraftDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../shared/contracts/workflow.ts'
import { guardianEnforceScriptEntry } from '../../../shared/domain/workflow/stage-guardians.ts'
import { AuthorityFailureError } from '../../../shared/domain/workflow/authority-constitution.ts'
import {
  setProjectGenerationStatus,
  clearProjectGenerationStatus
} from '../../application/runtime/project-generation-status-hub'
import { rewriteScriptEpisode } from '../../application/script-generation/runtime/rewrite-script-episode.ts'
import { getProject } from '../../infrastructure/storage/project-store'
import { buildCharacterFingerprint } from '../../../shared/domain/workflow/character-fingerprint.ts'

export function registerScriptGenerationRuntimeHandlers(
  runtimeProviderConfig: RuntimeProviderConfig
): void {
  ipcMain.handle(
    'workflow:start-script-generation',
    async (_event, input: StartScriptGenerationInputDto) => {
      // Main-side authoritative guardian: reject if upstream is incomplete
      try {
        guardianEnforceScriptEntry({
          storyIntent: input.storyIntent,
          outline: input.outline,
          characters: input.characters,
          activeCharacterBlocks: input.activeCharacterBlocks,
          segments: input.segments ?? [],
          script: input.existingScript
        })
      } catch (guardError) {
        if (guardError instanceof AuthorityFailureError) {
          // Guardian blocked — return formal failure without entering generation
          const blockingBoard = createInitialProgressBoard(input.plan, null)
          const blockedBoard = markBatchStatus(
            blockingBoard,
            'failed',
            `入口守卫拦截：${guardError.context}`
          )
          return {
            success: false,
            generatedScenes: [],
            board: blockedBoard,
            failure: createFailureResolution({
              board: blockedBoard,
              kind: 'failed',
              reason: guardError.context,
              errorMessage: guardError.message
            }),
            ledger: null,
            postflight: null
          }
        }
        // Re-throw unexpected errors
        throw guardError
      }

      const board = createInitialProgressBoard(input.plan, null)
      const startedBoard = markBatchStatus(board, 'running', '真实生成已启动。')

      // Build generationStatus for broadcast — projectId may be absent (graceful degradation)
      const targetEpisodes = input.plan.targetEpisodes ?? 0
      const estimatedSeconds = Math.max(60, targetEpisodes * 30) // ~30s per episode default
      const batchSize = input.plan.runtimeProfile?.recommendedBatchSize ?? 5
      const detail =
        input.plan.mode === 'rewrite'
          ? `我在按每批 ${batchSize} 集重写这 ${targetEpisodes} 集，旧稿会按目标集数被这一轮覆盖。`
          : `我在按每批 ${batchSize} 集自动续写，直到全部写完或真实失败。`

      const maybeSetStatus = (status: ProjectGenerationStatusDto) => {
        if (input.projectId) setProjectGenerationStatus(input.projectId, status)
      }
      const maybeClearStatus = () => {
        if (input.projectId) clearProjectGenerationStatus(input.projectId)
      }

      const generationStatus: ProjectGenerationStatusDto = {
        task: 'script',
        stage: 'script',
        title: '正在生成剧本',
        detail,
        startedAt: Date.now(),
        estimatedSeconds,
        scope: 'project'
      }

      maybeSetStatus(generationStatus)
      try {
        return await startScriptGeneration(
          input,
          runtimeProviderConfig,
          startedBoard,
          {
            outline: input.outline,
            characters: input.characters,
            existingScript: input.existingScript
          },
          {
            resolveLatestCharactersFingerprint: async () => {
              if (!input.projectId) return buildCharacterFingerprint(input.characters)
              const latestProject = await getProject(input.projectId)
              return buildCharacterFingerprint(latestProject?.characterDrafts || [])
            },
            onStaleWarning: async (warning) => {
              console.warn(
                `[script-generation] Stale Warning surfaced to runtime handler: ${warning.detail}`
              )
            },
            waitForRepairBatch: false
          }
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error || 'unknown_error')
        const failedBoard = markBatchStatus(startedBoard, 'failed', `生成失败：${message}`)
        return {
          success: false,
          generatedScenes: [],
          board: failedBoard,
          failure: createFailureResolution({
            board: failedBoard,
            kind: 'failed',
            reason: '生成过程中发生未捕获异常，已中断并等待续跑决策。',
            errorMessage: message
          }),
          ledger: null,
          postflight: null
        }
      } finally {
        maybeClearStatus()
      }
    }
  )

  ipcMain.handle(
    'workflow:build-script-ledger-preview',
    (
      _event,
      input: {
        storyIntent?: StoryIntentPackageDto | null
        outline: OutlineDraftDto
        characters: CharacterDraftDto[]
        script: ScriptSegmentDto[]
      }
    ) =>
      buildScriptStateLedger({
        storyIntent: input.storyIntent,
        outline: input.outline,
        characters: input.characters,
        script: input.script
      })
  )

  ipcMain.handle(
    'workflow:rewrite-script-episode',
    async (_event, input: StartScriptGenerationInputDto & { episodeNo: number }) =>
      rewriteScriptEpisode(
        {
          episodeNo: input.episodeNo,
          plan: input.plan,
          outlineTitle: input.outlineTitle,
          theme: input.theme,
          mainConflict: input.mainConflict,
          charactersSummary: input.charactersSummary,
          storyIntent: input.storyIntent,
          scriptControlPackage: input.scriptControlPackage,
          outline: input.outline,
          characters: input.characters,
          entityStore: input.entityStore,
          activeCharacterBlocks: input.activeCharacterBlocks,
          segments: input.segments,
          existingScript: input.existingScript
        },
        runtimeProviderConfig
      )
  )
}
