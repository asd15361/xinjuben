import type { ScriptAuditReportDto, ScriptRepairPlanDto } from '../../contracts/script-audit.ts'
import type { ScriptGenerationExecutionPlanDto } from '../../contracts/script-generation.ts'
import type { ScriptStateLedgerDto } from '../../contracts/script-ledger.ts'
import type { ScriptSegmentDto } from '../../contracts/workflow.ts'
import { auditPolicySnapshot, buildAuditExecutionSnapshot } from './audit/audit-policy.ts'
import {
  buildPressureExecutionSnapshot,
  pressurePolicyMetadata
} from './pressure/pressure-policy.ts'
import {
  buildProgressionExecutionSnapshot,
  progressionPolicyMetadata
} from './progression/progression-policy.ts'
import { buildRepairExecutionSnapshot, repairPolicySnapshot } from './repair/repair-policy.ts'
import {
  buildRuntimeExecutionSnapshot,
  runtimePolicyMetadata,
  runtimePolicyName
} from './runtime/runtime-policy.ts'
import type { EngineAssetStatus } from './engine-assets.ts'

export interface EngineAssetStatusInput {
  generationPlan: ScriptGenerationExecutionPlanDto | null | undefined
  ledger: ScriptStateLedgerDto | null | undefined
  auditReport: ScriptAuditReportDto | null | undefined
  repairPlan: ScriptRepairPlanDto | null | undefined
  scriptScenes?: ScriptSegmentDto[] | null | undefined
}

export function buildRuntimePolicyStatus(input: EngineAssetStatusInput): EngineAssetStatus {
  const runtimeSnapshot = buildRuntimeExecutionSnapshot(input.generationPlan)
  return input.generationPlan
    ? {
        key: 'runtime_policy',
        title: '运行时策略',
        status: input.generationPlan.ready ? 'active' : 'warning',
        assetName: runtimePolicyName,
        assetVersion: runtimePolicyMetadata.version,
        lineage: runtimePolicyMetadata.lineage,
        source: runtimePolicyMetadata.source,
        detail: `主通道 ${input.generationPlan.recommendedPrimaryLane} / 回退 ${input.generationPlan.recommendedFallbackLane}`,
        snapshotSummary: runtimeSnapshot.summary
      }
    : {
        key: 'runtime_policy',
        title: '运行时策略',
        status: 'warning',
        assetName: runtimePolicyName,
        assetVersion: runtimePolicyMetadata.version,
        lineage: runtimePolicyMetadata.lineage,
        source: runtimePolicyMetadata.source,
        detail: '尚未形成执行计划，策略资产还没真正挂到本轮生成。',
        snapshotSummary: runtimeSnapshot.summary
      }
}

export function buildLedgerPolicyStatus(input: EngineAssetStatusInput): EngineAssetStatus {
  return input.ledger
    ? {
        key: 'ledger_policy',
        title: '账本策略',
        status: input.ledger.preflight.issues.length === 0 ? 'active' : 'warning',
        assetName: 'script_ledger_policy_v1',
        assetVersion: 'v1.0',
        lineage: 'stage4-ledger-mainline -> stage6-semantic-hash/postflight',
        source: '旧项目连续性账本经验 + 新仓库 ledger 主链',
        detail:
          input.ledger.preflight.issues.length === 0
            ? 'ledger preflight 通过，连续性约束已收口。'
            : `存在 ${input.ledger.preflight.issues.length} 条 preflight 风险。`,
        snapshotSummary: `语义哈希 ${input.ledger.semanticHash}，开放钩子 ${input.ledger.openHooks.length} 个。`
      }
    : {
        key: 'ledger_policy',
        title: '账本策略',
        status: 'warning',
        assetName: 'script_ledger_policy_v1',
        assetVersion: 'v1.0',
        lineage: 'stage4-ledger-mainline -> stage6-semantic-hash/postflight',
        source: '旧项目连续性账本经验 + 新仓库 ledger 主链',
        detail: '尚未生成 ledger 预检，后置链还没有连续性依据。',
        snapshotSummary: '当前还没有 ledger 快照。'
      }
}

export function buildAuditPolicyStatus(input: EngineAssetStatusInput): EngineAssetStatus {
  const auditSnapshot = buildAuditExecutionSnapshot(input.auditReport)
  return input.auditReport
    ? {
        key: 'audit_policy',
        title: '审核修补策略',
        status: input.auditReport.passed ? 'active' : 'warning',
        assetName: auditPolicySnapshot.metadata.name,
        assetVersion: auditPolicySnapshot.metadata.version,
        lineage: auditPolicySnapshot.metadata.lineage,
        source: auditPolicySnapshot.metadata.source,
        detail: input.auditReport.passed
          ? '当前脚本通过审核策略。'
          : `当前还有 ${input.auditReport.issues.length} 条审核问题待修补。`,
        snapshotSummary: auditSnapshot.summary
      }
    : {
        key: 'audit_policy',
        title: '审核修补策略',
        status: 'warning',
        assetName: auditPolicySnapshot.metadata.name,
        assetVersion: auditPolicySnapshot.metadata.version,
        lineage: auditPolicySnapshot.metadata.lineage,
        source: auditPolicySnapshot.metadata.source,
        detail: '尚未形成审核报告，修补策略还没进入闭环。',
        snapshotSummary: auditSnapshot.summary
      }
}

export function buildRepairPolicyStatus(input: EngineAssetStatusInput): EngineAssetStatus {
  const repairSnapshot = buildRepairExecutionSnapshot(input.repairPlan)
  return input.repairPlan
    ? {
        key: 'repair_policy',
        title: '修补策略',
        status: input.repairPlan.shouldRepair ? 'warning' : 'active',
        assetName: repairPolicySnapshot.metadata.name,
        assetVersion: repairPolicySnapshot.metadata.version,
        lineage: repairPolicySnapshot.metadata.lineage,
        source: repairPolicySnapshot.metadata.source,
        detail: input.repairPlan.shouldRepair ? '当前已有自动修补入口。' : '当前无需触发自动修补。',
        snapshotSummary: repairSnapshot.summary
      }
    : {
        key: 'repair_policy',
        title: '修补策略',
        status: 'warning',
        assetName: repairPolicySnapshot.metadata.name,
        assetVersion: repairPolicySnapshot.metadata.version,
        lineage: repairPolicySnapshot.metadata.lineage,
        source: repairPolicySnapshot.metadata.source,
        detail: '尚未形成修补计划，修补策略还没进入执行态。',
        snapshotSummary: repairSnapshot.summary
      }
}

export function buildPressurePolicyStatus(input: EngineAssetStatusInput): EngineAssetStatus {
  const pressureSnapshot = buildPressureExecutionSnapshot(input.ledger)
  return input.ledger
    ? {
        key: 'pressure_policy',
        title: '关系施压策略',
        status: pressureSnapshot.pressureCharacterCount > 0 ? 'active' : 'warning',
        assetName: pressurePolicyMetadata.name,
        assetVersion: pressurePolicyMetadata.version,
        lineage: pressurePolicyMetadata.lineage,
        source: pressurePolicyMetadata.source,
        detail:
          pressureSnapshot.pressureCharacterCount > 0
            ? `当前已有 ${pressureSnapshot.pressureCharacterCount} 个角色被账本识别出关系施压。`
            : '当前账本还没抓到明确关系施压。',
        snapshotSummary: pressureSnapshot.summary
      }
    : {
        key: 'pressure_policy',
        title: '关系施压策略',
        status: 'warning',
        assetName: pressurePolicyMetadata.name,
        assetVersion: pressurePolicyMetadata.version,
        lineage: pressurePolicyMetadata.lineage,
        source: pressurePolicyMetadata.source,
        detail: '尚未形成账本压力快照，关系施压策略还没进入执行态。',
        snapshotSummary: pressureSnapshot.summary
      }
}

export function buildProgressionPolicyStatus(input: EngineAssetStatusInput): EngineAssetStatus {
  const progressionSnapshot = buildProgressionExecutionSnapshot(input.scriptScenes)
  return input.scriptScenes && input.scriptScenes.length > 0
    ? {
        key: 'progression_policy',
        title: '推进链策略',
        status: progressionSnapshot.weakSceneCount === 0 ? 'active' : 'warning',
        assetName: progressionPolicyMetadata.name,
        assetVersion: progressionPolicyMetadata.version,
        lineage: progressionPolicyMetadata.lineage,
        source: progressionPolicyMetadata.source,
        detail:
          progressionSnapshot.weakSceneCount === 0
            ? '当前剧本场景都具备基础推进链信号。'
            : `当前还有 ${progressionSnapshot.weakSceneCount} 场推进链偏弱。`,
        snapshotSummary: progressionSnapshot.summary
      }
    : {
        key: 'progression_policy',
        title: '推进链策略',
        status: 'warning',
        assetName: progressionPolicyMetadata.name,
        assetVersion: progressionPolicyMetadata.version,
        lineage: progressionPolicyMetadata.lineage,
        source: progressionPolicyMetadata.source,
        detail: '尚未形成剧本场景快照，推进链策略还没进入执行态。',
        snapshotSummary: progressionSnapshot.summary
      }
}
