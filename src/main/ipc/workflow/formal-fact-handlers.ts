import { ipcMain } from 'electron'
import { confirmFormalFactInOutline } from '../../application/formal-fact/confirm-formal-fact-in-outline'
import { declareFormalFact } from '../../application/formal-fact/declare-formal-fact'
import { evaluateFormalFactElevationUseCase } from '../../application/formal-fact/evaluate-formal-fact-elevation'
import { removeFormalFact } from '../../application/formal-fact/remove-formal-fact'
import { validateFormalFact } from '../../application/formal-fact/validate-formal-fact'
import { getProject, saveOutlineDraft } from '../../infrastructure/storage/project-store'
import type {
  ConfirmFormalFactForProjectInputDto,
  DeclareFormalFactForProjectInputDto,
  EvaluateFormalFactElevationInputDto,
  RemoveFormalFactForProjectInputDto,
  ValidateFormalFactInputDto
} from '../../../shared/contracts/workspace'

export function registerFormalFactHandlers(): void {
  ipcMain.handle('workflow:declare-formal-fact', async (_event, input: DeclareFormalFactForProjectInputDto) => {
    const project = await getProject(input.projectId)
    if (!project?.outlineDraft) return { project: null }

    const result = declareFormalFact({
      actor: 'user',
      stage: 'outline',
      declaration: input.declaration,
      outline: project.outlineDraft
    })

    const nextProject = await saveOutlineDraft({
      projectId: input.projectId,
      outlineDraft: result.outline
    })

    return { project: nextProject }
  })

  ipcMain.handle('workflow:confirm-formal-fact', async (_event, input: ConfirmFormalFactForProjectInputDto) => {
    const project = await getProject(input.projectId)
    if (!project?.outlineDraft) return { project: null }

    const nextOutline = confirmFormalFactInOutline({
      actor: 'user',
      stage: 'outline',
      factId: input.confirmation.factId,
      outline: project.outlineDraft
    })

    const nextProject = await saveOutlineDraft({
      projectId: input.projectId,
      outlineDraft: nextOutline
    })

    return { project: nextProject }
  })

  ipcMain.handle('workflow:remove-formal-fact', async (_event, input: RemoveFormalFactForProjectInputDto) => {
    const project = await getProject(input.projectId)
    if (!project?.outlineDraft) return { project: null }

    const nextOutline = removeFormalFact({
      actor: 'user',
      stage: 'outline',
      factId: input.removal.factId,
      outline: project.outlineDraft
    })

    const nextProject = await saveOutlineDraft({
      projectId: input.projectId,
      outlineDraft: nextOutline
    })

    return { project: nextProject }
  })

  ipcMain.handle('workflow:validate-formal-fact-definition', (_event, input: ValidateFormalFactInputDto) =>
    validateFormalFact(input)
  )

  ipcMain.handle('workflow:evaluate-formal-fact-elevation', (_event, input: EvaluateFormalFactElevationInputDto) =>
    evaluateFormalFactElevationUseCase(input)
  )
}
