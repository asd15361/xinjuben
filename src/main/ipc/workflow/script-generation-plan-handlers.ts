import { ipcMain } from 'electron'
import { buildScriptGenerationExecutionPlan } from '../../application/script-generation/build-execution-plan.ts'
import {
  createFailureResolution,
  createInitialProgressBoard,
  resolveResumeFromBoard
} from '../../application/script-generation/progress-board.ts'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake.ts'
import type {
  BuildScriptGenerationPlanInputDto,
  ScriptGenerationExecutionPlanDto,
  ScriptGenerationFailureResolutionDto,
  ScriptGenerationProgressBoardDto
} from '../../../shared/contracts/script-generation.ts'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../shared/contracts/workflow.ts'

export function registerScriptGenerationPlanHandlers(): void {
  ipcMain.handle(
    'workflow:build-script-generation-plan',
    (
      _event,
      input: {
        plan: BuildScriptGenerationPlanInputDto
        storyIntent?: StoryIntentPackageDto | null
        outline: OutlineDraftDto
        characters: CharacterDraftDto[]
        segments: DetailedOutlineSegmentDto[]
        script: ScriptSegmentDto[]
      }
    ) =>
      buildScriptGenerationExecutionPlan(
        {
          storyIntent: input.storyIntent,
          outline: input.outline,
          characters: input.characters,
          segments: input.segments,
          script: input.script
        },
        input.plan
      )
  )

  ipcMain.handle(
    'workflow:create-script-generation-progress-board',
    (
      _event,
      input: { plan: ScriptGenerationExecutionPlanDto; stageContractFingerprint: string | null }
    ) => createInitialProgressBoard(input.plan, input.stageContractFingerprint)
  )

  ipcMain.handle(
    'workflow:resolve-script-generation-resume',
    (_event, input: { board: ScriptGenerationProgressBoardDto }) =>
      resolveResumeFromBoard(input.board)
  )

  ipcMain.handle(
    'workflow:create-script-generation-failure-resolution',
    (
      _event,
      input: {
        board: ScriptGenerationProgressBoardDto
        kind: ScriptGenerationFailureResolutionDto['kind']
        reason: string
        errorMessage?: string
        lockRecoveryAttempted?: boolean
      }
    ) => createFailureResolution(input)
  )
}
