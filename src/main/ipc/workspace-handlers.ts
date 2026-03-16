import { registerWorkspaceGenerationHandlers } from './workspace-generation-handlers'
import { registerWorkspaceProjectHandlers } from './workspace-project-handlers'

export function registerWorkspaceHandlers(): void {
  registerWorkspaceProjectHandlers()
  registerWorkspaceGenerationHandlers()
}
