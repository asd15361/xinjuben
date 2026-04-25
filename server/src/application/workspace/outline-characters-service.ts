import {
  hasValidApiKey,
  loadRuntimeProviderConfig
} from '../../infrastructure/runtime-env/provider-config'
import { ProjectRepository } from '../../infrastructure/pocketbase/project-repository'
import { generateOutlineAndCharactersFromConfirmedSevenQuestions } from './generate-outline-and-characters-from-confirmed-seven-questions'
import {
  getCharacterBundleContractIssues,
  resolveCharacterContractAnchors
} from '@shared/domain/workflow/character-contract'
import type { ProjectSnapshotDto } from '@shared/contracts/project'

export interface OutlineAndCharactersProjectRequest {
  userId: string
  projectId: string
}

export interface OutlineAndCharactersProjectResponse {
  project: ProjectSnapshotDto
  success: boolean
  outlineGenerationError?: string
}

const projectRepository = new ProjectRepository()

export async function generateOutlineAndCharactersForProject(
  request: OutlineAndCharactersProjectRequest
): Promise<OutlineAndCharactersProjectResponse> {
  const runtimeConfig = loadRuntimeProviderConfig()
  if (!hasValidApiKey(runtimeConfig)) {
    throw new Error('ai_not_configured: 请配置可用的 AI API Key')
  }

  const existingProject = await projectRepository.getProject(request.userId, request.projectId)
  if (!existingProject) {
    throw new Error('project_not_found')
  }
  if (!existingProject.storyIntent?.generationBriefText?.trim()) {
    throw new Error('confirmed_story_intent_missing')
  }

  let result = null as Awaited<
    ReturnType<typeof generateOutlineAndCharactersFromConfirmedSevenQuestions>
  > | null
  const maxAttempts = 3

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const candidate = await generateOutlineAndCharactersFromConfirmedSevenQuestions({
      projectId: request.projectId,
      storyIntent: existingProject.storyIntent,
      outlineDraft: existingProject.outlineDraft,
      runtimeConfig
    })

    const anchors = resolveCharacterContractAnchors({
      storyIntent: candidate.storyIntent,
      outline: candidate.outlineDraft
    })
    const contractIssues = getCharacterBundleContractIssues({
      characters: candidate.characterDrafts,
      protagonist: anchors.protagonist,
      antagonist: anchors.antagonist
    })

    if (
      contractIssues.incompleteCharacters.length === 0 &&
      contractIssues.protagonistCovered &&
      contractIssues.antagonistCovered
    ) {
      result = candidate
      break
    }

    const issueSummary = contractIssues.incompleteCharacters
      .map(
        (item) =>
          `${item.name}{legacy:${item.missingLegacyFields.join('|') || '-'};v2:${item.missingV2Fields.join('|') || '-'}}`
      )
      .join(',')
    console.warn(
      `[OutlineCharacters] contract retry attempt=${attempt}/${maxAttempts} protagonistCovered=${contractIssues.protagonistCovered} antagonistCovered=${contractIssues.antagonistCovered} incomplete=[${issueSummary}]`
    )

    result = candidate
  }

  if (!result) {
    throw new Error('outline_character_generation_empty_result')
  }

  await projectRepository.saveOutlineDraft({
    userId: request.userId,
    projectId: request.projectId,
    outlineDraft: result.outlineDraft
  })

  await projectRepository.saveCharacterDrafts({
    userId: request.userId,
    projectId: request.projectId,
    characterDrafts: result.characterDrafts,
    activeCharacterBlocks: existingProject.activeCharacterBlocks ?? []
  })

  const project = await projectRepository.saveProjectMeta({
    userId: request.userId,
    projectId: request.projectId,
    stage: 'character',
    genre: result.outlineDraft.genre,
    storyIntent: result.storyIntent,
    entityStore: result.entityStore
  })

  if (!project) {
    throw new Error('project_not_found')
  }

  return {
    project,
    success: true,
    outlineGenerationError: result.outlineGenerationError
  }
}
