import type { ProjectSnapshotDto } from '../../../shared/contracts/project'
import { resolvePersistedGenerationTruth } from '../../../shared/domain/workflow/persisted-generation-truth.ts'

export function invalidateScriptRuntimeState(project: ProjectSnapshotDto): ProjectSnapshotDto {
  const initialGenerationTruth = resolvePersistedGenerationTruth({
    generationStatus: null,
    scriptFailureResolution: null,
    scriptDraft: []
  })

  return {
    ...project,
    generationStatus: null,
    detailedOutlineSegments: [],
    detailedOutlineBlocks: [],
    scriptDraft: [],
    scriptProgressBoard: null,
    scriptFailureResolution: null,
    scriptRuntimeFailureHistory: [],
    scriptStateLedger: null,
    visibleResult: initialGenerationTruth.visibleResult,
    formalRelease: initialGenerationTruth.formalRelease,
    stage: 'outline'
  }
}
