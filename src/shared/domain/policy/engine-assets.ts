import {
  buildAuditPolicyStatus,
  buildLedgerPolicyStatus,
  buildPressurePolicyStatus,
  buildProgressionPolicyStatus,
  buildRepairPolicyStatus,
  buildRuntimePolicyStatus,
  type EngineAssetStatusInput
} from './engine-asset-status-builders'

export interface EngineAssetStatus {
  key: string
  title: string
  status: 'active' | 'warning'
  assetName: string
  assetVersion: string
  lineage: string
  source: string
  detail: string
  snapshotSummary: string
}

export function buildScriptEngineAssetStatus(input: EngineAssetStatusInput): EngineAssetStatus[] {
  return [
    buildRuntimePolicyStatus(input),
    buildLedgerPolicyStatus(input),
    buildAuditPolicyStatus(input),
    buildRepairPolicyStatus(input),
    buildPressurePolicyStatus(input),
    buildProgressionPolicyStatus(input)
  ]
}
