import type { AiGenerateRequestDto, ModelRouteLane } from '../../../contracts/ai'
import type { ScriptGenerationExecutionPlanDto } from '../../../contracts/script-generation'
import type { PolicyMetadata } from '../policy-metadata'

export interface RuntimeRouteDecisionSignal {
  orderedLanes: ModelRouteLane[]
  reasonCodes: string[]
}

export interface RuntimePolicySnapshot {
  metadata: PolicyMetadata
  summary: string
  softContextLimit: number
  hardContextLimit: number
  keyEpisodeInterval: number
  strictMode: boolean
  rewriteMode: boolean
  highRiskMode: boolean
}

export interface RuntimePolicyExecutionSnapshot {
  primaryLane: ModelRouteLane | 'pending'
  fallbackLane: ModelRouteLane | 'pending'
  blockedIssueCount: number
  strictEpisodeCount: number
  highRiskEpisodeCount: number
  recoveryModeCounts: Record<'fresh' | 'retry_parse' | 'retry_coverage' | 'retry_runtime', number>
  summary: string
}

const SOFT_CONTEXT_LIMIT = 65000
const HARD_CONTEXT_LIMIT = 80000
const KEY_EPISODE_INTERVAL = 5
export const runtimePolicyName = 'runtime_route_policy_v1'
export const runtimePolicyMetadata: PolicyMetadata = {
  name: runtimePolicyName,
  version: 'v1.3',
  lineage: 'stage6-runtime-routing -> stage7-policy-assets -> stage7-execution-snapshot -> stage7-policy-lineage',
  source: '旧项目模型路由经验 + 新仓库执行计划主链'
}

export function isRuntimeKeyEpisode(episode: number, totalEpisodes: number): boolean {
  if (episode <= 1) return true
  if (episode >= totalEpisodes) return true
  return episode % KEY_EPISODE_INTERVAL === 0
}

export function buildRuntimePolicySnapshot(request: AiGenerateRequestDto): RuntimePolicySnapshot {
  const estimatedContextTokens = request.runtimeHints?.estimatedContextTokens ?? 0
  const strictMode = request.runtimeHints?.strictness === 'strict'
  const highRiskMode = Boolean(request.runtimeHints?.hasP0Risk || request.runtimeHints?.hasHardAlignerRisk)
  const rewriteMode = Boolean(request.runtimeHints?.isRewriteMode)

  return {
    metadata: runtimePolicyMetadata,
    summary:
      estimatedContextTokens >= SOFT_CONTEXT_LIMIT
        ? '长上下文优先，必要时提升到 Gemini 通道。'
        : highRiskMode
          ? '高风险批次优先走更稳的高质量通道。'
          : '默认以低成本主通道为先，失败再回退。',
    softContextLimit: SOFT_CONTEXT_LIMIT,
    hardContextLimit: HARD_CONTEXT_LIMIT,
    keyEpisodeInterval: KEY_EPISODE_INTERVAL,
    strictMode,
    rewriteMode,
    highRiskMode
  }
}

export function decideRuntimePolicyOrder(input: {
  request: AiGenerateRequestDto
  enabledLanes: ModelRouteLane[]
}): RuntimeRouteDecisionSignal {
  const { request, enabledLanes } = input
  const reasons: string[] = []
  const activeLanes = enabledLanes.filter((lane): lane is ModelRouteLane => lane === 'deepseek')

  if (activeLanes.length > 0) {
    const preferredActiveLane =
      request.preferredLane && activeLanes.includes(request.preferredLane) ? request.preferredLane : activeLanes[0]
    reasons.push('single_deepseek_runtime')
    if (request.preferredLane && request.preferredLane !== preferredActiveLane) {
      reasons.push('preferred_lane_standby_ignored')
    }
    return {
      orderedLanes: [preferredActiveLane],
      reasonCodes: reasons
    }
  }

  if (request.preferredLane && enabledLanes.includes(request.preferredLane)) {
    reasons.push('preferred_lane')
    return {
      orderedLanes: [request.preferredLane, ...enabledLanes.filter((lane) => lane !== request.preferredLane)],
      reasonCodes: reasons
    }
  }

  const snapshot = buildRuntimePolicySnapshot(request)
  const episode = request.runtimeHints?.episode ?? 1
  const totalEpisodes = request.runtimeHints?.totalEpisodes ?? 1
  const estimatedContextTokens = request.runtimeHints?.estimatedContextTokens ?? 0
  const isKeyEpisode = isRuntimeKeyEpisode(episode, totalEpisodes)
  const hasP0Risk = Boolean(request.runtimeHints?.hasP0Risk)
  const hasHardAlignerRisk = Boolean(request.runtimeHints?.hasHardAlignerRisk)

  if (estimatedContextTokens >= snapshot.hardContextLimit) reasons.push('ctx_hard_limit')
  if (estimatedContextTokens >= snapshot.softContextLimit) reasons.push('ctx_soft_limit')
  if (snapshot.strictMode) reasons.push('strict_mode')
  if (hasP0Risk) reasons.push('p0_risk')
  if (hasHardAlignerRisk) reasons.push('hard_aligner_risk')
  if (isKeyEpisode) reasons.push('key_episode')
  if (snapshot.rewriteMode) reasons.push('rewrite_mode')

  let orderedLanes: ModelRouteLane[]
  if ((hasP0Risk || (hasHardAlignerRisk && isKeyEpisode) || request.task === 'quality_audit') && enabledLanes.includes('gemini_pro')) {
    orderedLanes = ['gemini_pro', 'gemini_flash', 'deepseek']
  } else if (
    (estimatedContextTokens >= snapshot.softContextLimit ||
      request.task === 'rough_outline' ||
      request.task === 'character_profile' ||
      request.task === 'detailed_outline' ||
      snapshot.strictMode) &&
    enabledLanes.includes('gemini_flash')
  ) {
    orderedLanes = ['gemini_flash', 'deepseek', 'gemini_pro']
  } else {
    orderedLanes = ['deepseek', 'gemini_flash', 'gemini_pro']
    reasons.push('deepseek_default_lane')
  }

  return {
    orderedLanes: orderedLanes.filter((lane) => enabledLanes.includes(lane)),
    reasonCodes: reasons
  }
}

export function buildRuntimeExecutionSnapshot(
  plan: ScriptGenerationExecutionPlanDto | null | undefined
): RuntimePolicyExecutionSnapshot {
  if (!plan) {
    return {
      primaryLane: 'pending',
      fallbackLane: 'pending',
      blockedIssueCount: 0,
      strictEpisodeCount: 0,
      highRiskEpisodeCount: 0,
      recoveryModeCounts: { fresh: 0, retry_parse: 0, retry_coverage: 0, retry_runtime: 0 },
      summary: '尚未形成执行计划，运行时策略还没进入本轮生成。'
    }
  }

  const strictEpisodeCount = plan.episodePlans.filter((episode) => episode.runtimeHints?.strictness === 'strict').length
  const highRiskEpisodeCount = plan.episodePlans.filter(
    (episode) => episode.runtimeHints?.hasP0Risk || episode.runtimeHints?.hasHardAlignerRisk
  ).length
  const recoveryModeCounts = plan.episodePlans.reduce(
    (counts, episode) => {
      const mode = episode.runtimeHints?.recoveryMode || 'fresh'
      counts[mode] += 1
      return counts
    },
    { fresh: 0, retry_parse: 0, retry_coverage: 0, retry_runtime: 0 } as Record<
      'fresh' | 'retry_parse' | 'retry_coverage' | 'retry_runtime',
      number
    >
  )

  return {
    primaryLane: plan.recommendedPrimaryLane,
    fallbackLane: plan.recommendedFallbackLane,
    blockedIssueCount: plan.blockedBy.length,
    strictEpisodeCount,
    highRiskEpisodeCount,
    recoveryModeCounts,
    summary: plan.ready
      ? `主通道 ${plan.recommendedPrimaryLane}，回退 ${plan.recommendedFallbackLane}，恢复档位 fresh=${recoveryModeCounts.fresh} / parse=${recoveryModeCounts.retry_parse} / coverage=${recoveryModeCounts.retry_coverage} / runtime=${recoveryModeCounts.retry_runtime}。`
      : `当前有 ${plan.blockedBy.length} 条阻塞问题，运行时策略暂未放行。`
  }
}
