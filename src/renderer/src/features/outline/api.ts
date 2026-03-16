import type {
  ConfirmFormalFactForProjectResultDto,
  DeclareFormalFactForProjectResultDto,
  EvaluateFormalFactElevationResultDto,
  RemoveFormalFactForProjectResultDto,
  ValidateFormalFactResultDto
} from '../../../../shared/contracts/workspace'

export async function validateFormalFact(input: {
  factDesc: string
  mainPlotContext: string
  theme: string
}): Promise<ValidateFormalFactResultDto> {
  return window.api.workflow.validateFormalFact(input)
}

export async function declareFormalFact(input: {
  projectId: string
  label: string
  description: string
  level?: 'core' | 'supporting'
}): Promise<DeclareFormalFactForProjectResultDto> {
  return window.api.workflow.declareFormalFact({
    projectId: input.projectId,
    declaration: {
      label: input.label,
      description: input.description,
      level: input.level
    }
  })
}

export async function confirmFormalFact(input: {
  projectId: string
  factId: string
}): Promise<ConfirmFormalFactForProjectResultDto> {
  return window.api.workflow.confirmFormalFact({
    projectId: input.projectId,
    confirmation: {
      factId: input.factId
    }
  })
}

export async function removeFormalFact(input: {
  projectId: string
  factId: string
}): Promise<RemoveFormalFactForProjectResultDto> {
  return window.api.workflow.removeFormalFact({
    projectId: input.projectId,
    removal: {
      factId: input.factId
    }
  })
}

export async function evaluateFormalFactElevation(input: {
  formalFactLabel: string
  conflictText: string
  emotionText: string
  themeText: string
}): Promise<EvaluateFormalFactElevationResultDto> {
  return window.api.workflow.evaluateFormalFactElevation(input)
}
