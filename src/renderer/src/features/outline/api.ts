import type {
  ConfirmFormalFactForProjectResultDto,
  DeclareFormalFactForProjectResultDto,
  EvaluateFormalFactElevationResultDto,
  RemoveFormalFactForProjectResultDto,
  ValidateFormalFactResultDto
} from '../../../../shared/contracts/workspace.ts'
import {
  apiDeclareFormalFact,
  apiConfirmFormalFact,
  apiRemoveFormalFact
} from '../../services/api-client.ts'

export async function validateFormalFact(input: {
  factDesc: string
  mainPlotContext: string
  theme: string
}): Promise<ValidateFormalFactResultDto> {
  // TODO: 迁移到 HTTP 路由
  return window.api.workflow.validateFormalFact(input)
}

export async function declareFormalFact(input: {
  projectId: string
  label: string
  description: string
  level?: 'core' | 'supporting'
}): Promise<DeclareFormalFactForProjectResultDto> {
  const result = await apiDeclareFormalFact({
    projectId: input.projectId,
    declaration: {
      label: input.label,
      description: input.description,
      level: input.level
    }
  })
  return { project: result.project }
}

export async function confirmFormalFact(input: {
  projectId: string
  factId: string
}): Promise<ConfirmFormalFactForProjectResultDto> {
  return apiConfirmFormalFact({
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
  return apiRemoveFormalFact({
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
  // TODO: 迁移到 HTTP 路由
  return window.api.workflow.evaluateFormalFactElevation(input)
}
