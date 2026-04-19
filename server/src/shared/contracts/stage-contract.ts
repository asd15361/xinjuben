import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from './workflow'

export type StageContractType = 'outline' | 'character' | 'detailed_outline' | 'script'

export interface StageContractFingerprintDto {
  checksum: string
  sourceStage: StageContractType
  generatedAt: string
}

export interface OutlineStageContractDto {
  type: 'outline'
  fingerprint: StageContractFingerprintDto
  outline: OutlineDraftDto
}

export interface CharacterStageContractDto {
  type: 'character'
  fingerprint: StageContractFingerprintDto
  upstreamOutlineFingerprint: string
  outlineSummary: {
    title: string
    genre: string
    theme: string
    mainConflict: string
    protagonist: string
    confirmedFormalFacts: string[]
  }
  characters: CharacterDraftDto[]
}

export interface DetailedOutlineStageContractDto {
  type: 'detailed_outline'
  fingerprint: StageContractFingerprintDto
  upstreamOutlineFingerprint: string
  upstreamCharacterFingerprint: string
  outlineSummary: {
    title: string
    genre: string
    theme: string
    mainConflict: string
    confirmedFormalFacts: string[]
  }
  characters: CharacterDraftDto[]
  segments: DetailedOutlineSegmentDto[]
}

export interface ScriptStageContractDto {
  type: 'script'
  fingerprint: StageContractFingerprintDto
  upstreamDetailedOutlineFingerprint: string
  upstreamCharacterFingerprint: string
  outlineTitle: string
  confirmedFormalFacts: string[]
  characters: CharacterDraftDto[]
  segments: DetailedOutlineSegmentDto[]
  existingScript: ScriptSegmentDto[]
}
