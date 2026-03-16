import { ipcMain } from 'electron'
import { createOutlineSeed } from '../application/workspace/create-outline-seed'
import { generateDetailedOutlineFromContext } from '../application/workspace/generate-detailed-outline'
import { generateOutlineAndCharactersFromChat } from '../application/workspace/generate-outline-and-characters'
import { loadRuntimeProviderConfig } from '../infrastructure/runtime-env/provider-config'
import { getProject, saveDetailedOutlineSegments, saveOutlineAndCharacters } from '../infrastructure/storage/project-store'
import type { GenerateDetailedOutlineInputDto, GenerateOutlineAndCharactersInputDto } from '../../shared/contracts/workspace'

async function waitForProject(projectId: string) {
  let project = null as Awaited<ReturnType<typeof getProject>>
  for (let attempt = 0; attempt < 50; attempt += 1) {
    project = await getProject(projectId)
    if (project) break
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return project
}

async function persistGeneratedWorkspace(input: {
  projectId: string
  storyIntent: Awaited<ReturnType<typeof generateOutlineAndCharactersFromChat>>['storyIntent']
  outlineDraft: Awaited<ReturnType<typeof generateOutlineAndCharactersFromChat>>['outlineDraft']
  characterDrafts: Awaited<ReturnType<typeof generateOutlineAndCharactersFromChat>>['characterDrafts']
}) {
  let nextProject = null as Awaited<ReturnType<typeof saveOutlineAndCharacters>>
  for (let attempt = 0; attempt < 5; attempt += 1) {
    nextProject = await saveOutlineAndCharacters({
      projectId: input.projectId,
      storyIntent: input.storyIntent,
      outlineDraft: input.outlineDraft,
      characterDrafts: input.characterDrafts
    })
    if (nextProject) break
    await new Promise((resolve) => setTimeout(resolve, 120))
  }
  return nextProject
}

export function registerWorkspaceGenerationHandlers(): void {
  ipcMain.handle('workspace:create-outline-seed', async (_event, input: { projectId: string }) => {
    const project = await getProject(input.projectId)
    if (!project) return null
    return createOutlineSeed(project)
  })

  ipcMain.handle(
    'workspace:generate-outline-and-characters',
    async (_event, input: GenerateOutlineAndCharactersInputDto) => {
      const project = await waitForProject(input.projectId)
      if (!project) {
        return {
          project: null,
          storyIntent: null,
          outlineDraft: null,
          characterDrafts: []
        }
      }

      const runtimeConfig = loadRuntimeProviderConfig()
      const generated = await generateOutlineAndCharactersFromChat({
        chatTranscript: input.chatTranscript,
        runtimeConfig
      })

      const nextProject = await persistGeneratedWorkspace({
        projectId: input.projectId,
        storyIntent: generated.storyIntent,
        outlineDraft: generated.outlineDraft,
        characterDrafts: generated.characterDrafts
      })

      return {
        project: nextProject,
        storyIntent: generated.storyIntent,
        outlineDraft: generated.outlineDraft,
        characterDrafts: generated.characterDrafts
      }
    }
  )

  ipcMain.handle('workspace:generate-detailed-outline', async (_event, input: GenerateDetailedOutlineInputDto) => {
    const project = await waitForProject(input.projectId)
    if (!project) {
      return {
        project: null,
        detailedOutlineSegments: []
      }
    }

    const runtimeConfig = loadRuntimeProviderConfig()
    const detailedOutlineSegments = await generateDetailedOutlineFromContext({
      outline: input.outline,
      characters: input.characters,
      storyIntent: input.storyIntent || project.storyIntent || null,
      runtimeConfig
    })

    const nextProject = await saveDetailedOutlineSegments({
      projectId: input.projectId,
      detailedOutlineSegments
    })

    return {
      project: nextProject,
      detailedOutlineSegments
    }
  })
}
