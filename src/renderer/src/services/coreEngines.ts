import { validateFormalFactDefinition } from '../../../shared/domain/formal-fact/definition-engine'
import { validateDramaProgression } from '../../../shared/domain/drama-progression/progression-engine'

export const FactEngine = {
  validateCoreFact: validateFormalFactDefinition,
  checkElevationReady(_factId: string, currentConflictLevel: number): boolean {
    return currentConflictLevel > 3
  }
}

export const DramaEngine = {
  validateActionLoop: validateDramaProgression
}
