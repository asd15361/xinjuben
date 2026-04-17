import type { OutlineDraftDto } from '../../../shared/contracts/workflow.ts'

export function mergeOutlineDraftAuthorityForSave(input: {
  existing: OutlineDraftDto | null
  incoming: OutlineDraftDto
}): OutlineDraftDto {
  const existingOutlineBlocks = Array.isArray(input.existing?.outlineBlocks)
    ? input.existing.outlineBlocks
    : []
  const incomingOutlineBlocks = Array.isArray(input.incoming.outlineBlocks)
    ? input.incoming.outlineBlocks
    : []

  if (incomingOutlineBlocks.length > 0 || existingOutlineBlocks.length === 0) {
    return input.incoming
  }

  return {
    ...input.incoming,
    outlineBlocks: existingOutlineBlocks
  }
}
