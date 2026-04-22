import { registerWorkspaceGenerationHandlers } from './workspace-generation-handlers.ts'
import { registerWorkspaceProjectHandlers } from './workspace-project-handlers.ts'

export function registerWorkspaceHandlers(): void {
  registerWorkspaceProjectHandlers()
  registerWorkspaceGenerationHandlers()
}
