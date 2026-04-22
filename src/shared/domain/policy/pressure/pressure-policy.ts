import type { StoryIntentPackageDto } from '../../../contracts/intake.ts'
import type { ScriptStateLedgerDto } from '../../../contracts/script-ledger.ts'
import type { PolicyMetadata } from '../policy-metadata.ts'

export interface RelationshipPressureSnapshot {
  leverLine: string
  summary: string
}

export interface PressurePolicyExecutionSnapshot {
  pressureCharacterCount: number
  unboundTraitCount: number
  summary: string
}

export const pressurePolicyMetadata: PolicyMetadata = {
  name: 'relationship_pressure_policy_v1',
  version: 'v1.0',
  lineage: 'stage6-pressure-signal -> stage7-repair-mapping -> stage8-ledger-pressure',
  source: '旧项目人物关系施压经验 + 新仓库 ledger / repair 主链'
}

export function buildRelationshipPressureSnapshot(input: {
  storyIntent?: StoryIntentPackageDto | null
  ledger?: ScriptStateLedgerDto | null
  leadPressure?: ScriptStateLedgerDto['characters'][number]['relationshipPressure'][number] | null
}): RelationshipPressureSnapshot {
  const leadPressure = input.leadPressure || input.ledger?.characters[0]?.relationshipPressure[0]
  if (leadPressure) {
    return {
      leverLine: [
        leadPressure.targetName || '关系对象',
        leadPressure.currentTension,
        leadPressure.leverageType,
        leadPressure.pressureMode
      ].join(':'),
      summary: `当前可直接从 ledger 里读取关系张力，最近证据：${leadPressure.evidence}`
    }
  }

  const fallbackAnchor =
    input.storyIntent?.manualRequirementNotes ||
    input.storyIntent?.freeChatFinalSummary ||
    '当前关系张力待补'

  return {
    leverLine: fallbackAnchor.slice(0, 40),
    summary: '当前还没有稳定 ledger 关系张力，先回退到 story intent 锚点。'
  }
}

export function buildPressureExecutionSnapshot(
  ledger: ScriptStateLedgerDto | null | undefined
): PressurePolicyExecutionSnapshot {
  if (!ledger) {
    return {
      pressureCharacterCount: 0,
      unboundTraitCount: 0,
      summary: '当前还没有 ledger 压力快照。'
    }
  }

  const pressureCharacterCount = ledger.characters.filter(
    (character) => character.relationshipPressure.length > 0
  ).length
  const unboundTraitCount = ledger.characters.reduce(
    (sum, character) => sum + character.traitBindings.filter((binding) => !binding.isBound).length,
    0
  )

  return {
    pressureCharacterCount,
    unboundTraitCount,
    summary:
      pressureCharacterCount > 0
        ? `已有 ${pressureCharacterCount} 个角色带最近关系施压信号，未落地特质 ${unboundTraitCount} 条。`
        : '当前还没抓到稳定关系施压，说明关系线可能偏平。'
  }
}
