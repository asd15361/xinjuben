export interface DramaticChainPackage {
  seasonDesireLine: string
  seasonResistanceLine: string
  seasonCostLine: string
  relationshipLeverLine: string
  hookChainLine: string
}

function cleanLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function normalizeDramaticChainPackage(
  input: Partial<DramaticChainPackage>
): DramaticChainPackage {
  return {
    seasonDesireLine: cleanLine(input.seasonDesireLine || '') || '待补',
    seasonResistanceLine: cleanLine(input.seasonResistanceLine || '') || '待补',
    seasonCostLine: cleanLine(input.seasonCostLine || '') || '待补',
    relationshipLeverLine: cleanLine(input.relationshipLeverLine || '') || '待补',
    hookChainLine: cleanLine(input.hookChainLine || '') || '待补'
  }
}
