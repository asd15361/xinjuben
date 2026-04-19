import {
  AuthorityFailureError,
  AuthorityFailureType,
  AuthorityOwnedFacts
} from './authority-constitution'
import { validateStageInputContract } from '../../../application/input-contract/validate-stage-input'
import type { InputContractIssueDto } from '../../contracts/input-contract'
import type { StageContractType } from '../../contracts/stage-contract'
import type {
  CharacterBlockDto,
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../contracts/workflow'
import type { StoryIntentPackageDto } from '../../contracts/intake'

export const GuardianContext = {
  SCRIPT_ENTRY: 'guardian:script-generation-entry',
  OUTLINE_SAVE: 'guardian:outline-persistence',
  CHARACTER_SAVE: 'guardian:character-persistence',
  DETAILED_OUTLINE_SAVE: 'guardian:detailed-outline-persistence'
} as const

export type GuardianContextLabel = (typeof GuardianContext)[keyof typeof GuardianContext]

export interface StageGuardianPayload {
  storyIntent?: StoryIntentPackageDto | null
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  activeCharacterBlocks?: CharacterBlockDto[]
  segments?: DetailedOutlineSegmentDto[]
  script: ScriptSegmentDto[]
}

export interface GuardianResult {
  ok: boolean
  issues: InputContractIssueDto[]
  targetStage: StageContractType
}

export function guardianOk(targetStage: StageContractType): GuardianResult {
  return { ok: true, issues: [], targetStage }
}

export function guardianFail(
  targetStage: StageContractType,
  issues: InputContractIssueDto[]
): GuardianResult {
  return { ok: false, issues, targetStage }
}

function validateForStage(
  targetStage: StageContractType,
  payload: StageGuardianPayload
): GuardianResult {
  const validation = validateStageInputContract(targetStage, {
    ...payload,
    segments: payload.segments || []
  })
  if (validation.ready) {
    return guardianOk(targetStage)
  }
  return guardianFail(targetStage, validation.issues)
}

export function guardianEnforceScriptEntry(payload: StageGuardianPayload): void {
  const result = validateForStage('script', payload)

  if (!result.ok) {
    const issueSummary = result.issues.map((i) => i.code).join(', ')
    throw new AuthorityFailureError(
      AuthorityFailureType.INCOMPLETE_RESULT,
      AuthorityOwnedFacts.DETAILED_OUTLINE_BLOCKS,
      `[${GuardianContext.SCRIPT_ENTRY}] Upstream detailed_outline is not ready. Blocking script generation. Issues: ${issueSummary}. Messages: ${result.issues.map((i) => i.message).join(' | ')}`
    )
  }
}

export function guardianEnforceOutlineSave(outline: OutlineDraftDto): void {
  const payload: StageGuardianPayload = {
    outline,
    characters: [],
    script: []
  }

  const result = validateForStage('outline', payload)

  if (!result.ok) {
    const issueSummary = result.issues.map((i) => i.code).join(', ')
    throw new AuthorityFailureError(
      AuthorityFailureType.INCOMPLETE_RESULT,
      AuthorityOwnedFacts.OUTLINE_DRAFT,
      `[${GuardianContext.OUTLINE_SAVE}] Outline state violates stage contract. Issues: ${issueSummary}. Messages: ${result.issues.map((i) => i.message).join(' | ')}`
    )
  }
}

export function guardianEnforceCharacterSave(input: {
  storyIntent?: StoryIntentPackageDto | null
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  activeCharacterBlocks?: CharacterBlockDto[]
}): void {
  const payload: StageGuardianPayload = {
    storyIntent: input.storyIntent,
    outline: input.outline,
    characters: input.characters,
    activeCharacterBlocks: input.activeCharacterBlocks,
    script: []
  }

  const result = validateForStage('character', payload)

  if (!result.ok) {
    const issueSummary = result.issues.map((i) => i.code).join(', ')
    throw new AuthorityFailureError(
      AuthorityFailureType.INCOMPLETE_RESULT,
      AuthorityOwnedFacts.CHARACTER_DRAFTS,
      `[${GuardianContext.CHARACTER_SAVE}] Character save would create invalid upstream state. Upstream outline incomplete. Issues: ${issueSummary}. Messages: ${result.issues.map((i) => i.message).join(' | ')}`
    )
  }
}

export function guardianEnforceDetailedOutlineSave(input: {
  storyIntent?: StoryIntentPackageDto | null
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  detailedOutlineSegments?: DetailedOutlineSegmentDto[]
  activeCharacterBlocks?: CharacterBlockDto[]
}): void {
  const payload: StageGuardianPayload = {
    storyIntent: input.storyIntent,
    outline: input.outline,
    characters: input.characters,
    activeCharacterBlocks: input.activeCharacterBlocks,
    segments: input.detailedOutlineSegments || [],
    script: []
  }

  const result = validateForStage('detailed_outline', payload)

  if (!result.ok) {
    const issueSummary = result.issues.map((i) => i.code).join(', ')
    throw new AuthorityFailureError(
      AuthorityFailureType.INCOMPLETE_RESULT,
      AuthorityOwnedFacts.DETAILED_OUTLINE_BLOCKS,
      `[${GuardianContext.DETAILED_OUTLINE_SAVE}] Detailed outline save would create invalid upstream state. Issues: ${issueSummary}. Messages: ${result.issues.map((i) => i.message).join(' | ')}`
    )
  }
}

export function isGuardianContext(context: string): boolean {
  return (Object.values(GuardianContext) as string[]).includes(context)
}

export function getGuardianTargetStage(context: GuardianContextLabel): StageContractType {
  switch (context) {
    case GuardianContext.SCRIPT_ENTRY:
      return 'script'
    case GuardianContext.OUTLINE_SAVE:
      return 'outline'
    case GuardianContext.CHARACTER_SAVE:
      return 'character'
    case GuardianContext.DETAILED_OUTLINE_SAVE:
      return 'detailed_outline'
  }
}
