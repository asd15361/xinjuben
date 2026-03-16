import type { ScriptRepairPlanDto, ScriptRepairSuggestionDto } from '../../../contracts/script-audit'
import type { ScriptStateLedgerDto } from '../../../contracts/script-ledger'
import type { PolicyMetadata } from '../policy-metadata'

export interface FallbackRepairDirectives {
  actionHint: string
  dialogueHint: string
  emotionHint: string
}

export interface RepairPolicySnapshot {
  metadata: PolicyMetadata
  summary: string
  fallbackEnabled: boolean
}

export interface RepairPromptSnapshot {
  openHook: string
  nextBridge: string
  relationTension: string
  perspective: string
  forbiddenRuleCount: number
  summary: string
}

export interface RepairPolicyExecutionSnapshot {
  suggestionCount: number
  targetSceneCount: number
  summary: string
}

export const repairPolicySnapshot: RepairPolicySnapshot = {
  metadata: {
    name: 'script_repair_policy_v1',
    version: 'v1.3',
    lineage: 'stage5-repair-closure -> stage6-ledger-driven-repair -> stage7-execution-snapshot -> stage7-policy-lineage',
    source: '旧项目修补经验 + ledger 驱动修补主链'
  },
  summary: '优先按 ledger 的动量、开放钩子和关系张力定向修补；保底只保留最小结构兜住，不再代替创作本身。',
  fallbackEnabled: true
}

export function buildRepairPromptRules(): string[] {
  return [
    '请只输出三段：',
    'Action:',
    'Dialogue:',
    'Emotion:',
    '要求：',
    '1. 只修补当前场，不改 sceneNo。',
    '2. 必须先把这场谁在压谁、谁在护谁、谁在嘴硬或难堪写出来，不得只补说明句。',
    '3. 必须承接上一场势能，不得全知透底。',
    '4. 动作要可拍，台词要命中冲突且带人物站位；先补这个人当前往哪边站、冲谁去、护谁或顶谁、为什么不能退。',
    '5. 如果一句话只有态度没有关系选择和代价感，说明站位还没落地，继续重写；如果换个人说也成立，也继续重写。',
    '6. 如果一句话已经有站位，但还听不出嘴硬、难堪、心虚、压抑或逼人的情绪负担，说明压强还没落地，继续重写。',
    '7. 不准只补“很生气”“很难过”这类情绪词，必须把压强落到停顿、让步、失手、反咬、硬撑这些当下反应里。',
    '8. 如果情绪只是嘴上说破了，却没有带出动作变化、关系后果或眼前代价，也算没写到位，继续重写。',
    '9. 禁止写成分析报告、情绪分层总结、说明文。',
    '10. 禁止输出 ## 标题、序号小节、括号讲解，只保留三段正文。'
  ]
}

export function buildRepairPromptSnapshot(input: {
  ledger: ScriptStateLedgerDto
  suggestion: ScriptRepairSuggestionDto
}): RepairPromptSnapshot {
  const openHook = input.ledger.openHooks[0]?.hookText || '当前未解信号'
  const nextBridge = input.ledger.storyMomentum.nextRequiredBridge || '承接当前冲突'
  const relationTension = input.ledger.characters[0]?.relationshipPressure[0]?.currentTension || 'medium'
  const perspective = input.ledger.knowledgeBoundaries.perspectiveCharacter || '当前主视角人物'
  const forbiddenRuleCount = input.ledger.knowledgeBoundaries.forbiddenOmniscienceRules.length

  return {
    openHook,
    nextBridge,
    relationTension,
    perspective,
    forbiddenRuleCount,
    summary: `修补目标“${input.suggestion.instruction}”将围绕钩子、势能、关系张力和视角边界执行。`
  }
}

export function buildRepairExecutionSnapshot(
  plan: ScriptRepairPlanDto | null | undefined
): RepairPolicyExecutionSnapshot {
  if (!plan) {
    return {
      suggestionCount: 0,
      targetSceneCount: 0,
      summary: '尚未形成修补计划，修补策略还没有当前执行快照。'
    }
  }

  const targetSceneCount = new Set(plan.suggestions.map((item) => item.targetSceneNo).filter((item) => item !== null)).size
  return {
    suggestionCount: plan.suggestions.length,
    targetSceneCount,
    summary: plan.shouldRepair
      ? `当前有 ${plan.suggestions.length} 条修补指令，涉及 ${targetSceneCount} 个场景。`
      : '当前无需进入自动修补。'
  }
}
