import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto
} from '../../../shared/contracts/workflow.ts'
import type { ProjectSnapshotDto } from '../../../shared/contracts/project.ts'
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
  guardianEnforceDetailedOutlineSave({
    outline: outlineDraft,
    characters: input.characterDrafts,
    detailedOutlineSegments: input.detailedOutlineSegments,
    activeCharacterBlocks: input.activeCharacterBlocks
  })

  return {
    outlineDraft: input.outlineDraft,
    detailedOutlineSegments: input.detailedOutlineSegments,
    stage: 'detailed_outline',
    updatedAt: input.now ?? new Date().toISOString()
  }
}
