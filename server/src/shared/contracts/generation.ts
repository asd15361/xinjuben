import type { WorkflowStage } from './workflow'

export type ProjectGenerationTaskDto =
  | 'confirm_story_intent'
  | 'seven_questions'
  | 'outline_and_characters'
  | 'detailed_outline'
  | 'script'

export interface ProjectGenerationStatusDto {
  task: ProjectGenerationTaskDto
  stage: WorkflowStage
  title: string
  detail: string
  startedAt: number
  estimatedSeconds: number
  scope?: 'project'
  autoChain?: boolean
  nextTask?: ProjectGenerationTaskDto | null
}
