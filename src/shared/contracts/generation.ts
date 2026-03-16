export type ProjectGenerationTaskDto = 'outline_bundle' | 'detailed_outline' | 'script'

export interface ProjectGenerationStatusDto {
  task: ProjectGenerationTaskDto
  stage: 'chat' | 'detailed_outline' | 'script'
  title: string
  detail: string
  startedAt: number
  estimatedSeconds: number
  scope?: 'project'
  autoChain?: boolean
  nextTask?: ProjectGenerationTaskDto | null
}
