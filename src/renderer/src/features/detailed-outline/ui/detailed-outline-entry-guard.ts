import type {
  CharacterDraftDto,
  OutlineDraftDto
} from '../../../../../shared/contracts/workflow.ts'

export type DetailedOutlineEntryBlockCode = 'detailed_outline_character_missing'

export function resolveDetailedOutlineEntryBlock(params: {
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
}): DetailedOutlineEntryBlockCode | null {
  if (params.characters.length === 0) {
    return 'detailed_outline_character_missing'
  }

  return null
}
