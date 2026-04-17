import type { WorkflowStage } from '../../../../shared/contracts/workflow'
import type { GenerationNotice } from '../store/useWorkflowStore'

export function createGenerationResultNotice(input: {
  kind: 'success' | 'error'
  title: string
  detail: string
  primaryAction?: { label: string; stage: WorkflowStage }
  secondaryAction?: { label: string; stage: WorkflowStage }
}): GenerationNotice {
  return {
    kind: input.kind,
    title: input.title,
    detail: input.detail,
    primaryAction: input.primaryAction,
    secondaryAction: input.secondaryAction
  }
}

export function createStageGateNotice(input: {
  title: string
  detail: string
  primaryAction?: { label: string; stage: WorkflowStage }
  secondaryAction?: { label: string; stage: WorkflowStage }
}): GenerationNotice {
  return {
    kind: 'error',
    title: input.title,
    detail: input.detail,
    primaryAction: input.primaryAction,
    secondaryAction: input.secondaryAction
  }
}
