import type { CharacterDraftDto, DetailedOutlineSegmentDto, OutlineDraftDto } from '../../../shared/contracts/workflow'
import type { ProjectSnapshotDto } from '../../../shared/contracts/project'
import { guardianEnforceDetailedOutlineSave } from '../../../shared/domain/workflow/stage-guardians.ts'

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

export function resolveDetailedOutlinePersistence(input: {
  outlineDraft: ProjectSnapshotDto['outlineDraft']
  characterDrafts: CharacterDraftDto[]
  activeCharacterBlocks: ProjectSnapshotDto['activeCharacterBlocks']
  detailedOutlineSegments: DetailedOutlineSegmentDto[]
  now?: string
}): Pick<ProjectSnapshotDto, 'outlineDraft' | 'detailedOutlineSegments' | 'stage' | 'updatedAt'> {
  const outlineDraft = input.outlineDraft ?? createEmptyOutlineDraft()
  guardianEnforceDetailedOutlineSave(
    outlineDraft,
    input.characterDrafts,
    input.detailedOutlineSegments,
    input.activeCharacterBlocks
  )

  return {
    outlineDraft: input.outlineDraft,
    detailedOutlineSegments: input.detailedOutlineSegments,
    stage: 'detailed_outline',
    updatedAt: input.now ?? new Date().toISOString()
  }
}
