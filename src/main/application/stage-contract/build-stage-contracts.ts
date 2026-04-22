import type {
  CharacterStageContractDto,
  DetailedOutlineStageContractDto,
  OutlineStageContractDto,
  ScriptStageContractDto,
  StageContractFingerprintDto,
  StageContractType
} from '../../../shared/contracts/stage-contract.ts'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../shared/contracts/workflow.ts'
import { getConfirmedFormalFactLabels } from '../../../shared/domain/formal-fact/selectors.ts'

function computeChecksum(input: string): string {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index)
    hash |= 0
  }
  return `sc_${Math.abs(hash).toString(36)}`
}

function createFingerprint(
  sourceStage: StageContractType,
  payload: unknown
): StageContractFingerprintDto {
  return {
    checksum: computeChecksum(JSON.stringify(payload)),
    sourceStage,
    generatedAt: new Date().toISOString()
  }
}

export function buildOutlineStageContract(outline: OutlineDraftDto): OutlineStageContractDto {
  return {
    type: 'outline',
    fingerprint: createFingerprint('outline', outline),
    outline
  }
}

export function buildCharacterStageContract(input: {
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
}): CharacterStageContractDto {
  const outlineContract = buildOutlineStageContract(input.outline)
  const confirmedFormalFacts = getConfirmedFormalFactLabels(input.outline)

  return {
    type: 'character',
    fingerprint: createFingerprint('character', input),
    upstreamOutlineFingerprint: outlineContract.fingerprint.checksum,
    outlineSummary: {
      title: input.outline.title,
      genre: input.outline.genre,
      theme: input.outline.theme,
      mainConflict: input.outline.mainConflict,
      protagonist: input.outline.protagonist,
      confirmedFormalFacts
    },
    characters: input.characters
  }
}

export function buildDetailedOutlineStageContract(input: {
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  segments: DetailedOutlineSegmentDto[]
}): DetailedOutlineStageContractDto {
  const outlineContract = buildOutlineStageContract(input.outline)
  const characterContract = buildCharacterStageContract({
    outline: input.outline,
    characters: input.characters
  })
  const confirmedFormalFacts = getConfirmedFormalFactLabels(input.outline)

  return {
    type: 'detailed_outline',
    fingerprint: createFingerprint('detailed_outline', input),
    upstreamOutlineFingerprint: outlineContract.fingerprint.checksum,
    upstreamCharacterFingerprint: characterContract.fingerprint.checksum,
    outlineSummary: {
      title: input.outline.title,
      genre: input.outline.genre,
      theme: input.outline.theme,
      mainConflict: input.outline.mainConflict,
      confirmedFormalFacts
    },
    characters: input.characters,
    segments: input.segments
  }
}

export function buildScriptStageContract(input: {
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  segments: DetailedOutlineSegmentDto[]
  existingScript: ScriptSegmentDto[]
}): ScriptStageContractDto {
  const detailedOutlineContract = buildDetailedOutlineStageContract({
    outline: input.outline,
    characters: input.characters,
    segments: input.segments
  })
  const characterContract = buildCharacterStageContract({
    outline: input.outline,
    characters: input.characters
  })
  const confirmedFormalFacts = getConfirmedFormalFactLabels(input.outline)

  return {
    type: 'script',
    fingerprint: createFingerprint('script', input),
    upstreamDetailedOutlineFingerprint: detailedOutlineContract.fingerprint.checksum,
    upstreamCharacterFingerprint: characterContract.fingerprint.checksum,
    outlineTitle: input.outline.title,
    confirmedFormalFacts,
    characters: input.characters,
    segments: input.segments,
    existingScript: input.existingScript
  }
}
