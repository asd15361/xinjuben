import type { ProjectSnapshotDto } from '../../../../../shared/contracts/project.ts'
import type { OutlineDraftDto } from '../../../../../shared/contracts/workflow.ts'
import { hasConfirmedSevenQuestions } from '../../../../../shared/domain/workflow/seven-questions-authority.ts'

export function requireConfirmedSevenQuestionsPersisted(
  project: Pick<ProjectSnapshotDto, 'outlineDraft'> | null
): OutlineDraftDto {
  const outlineDraft = project?.outlineDraft ?? null

  if (!outlineDraft || !hasConfirmedSevenQuestions(outlineDraft)) {
    throw new Error('seven_questions_confirm_save_failed')
  }

  return outlineDraft
}
