import {
  hasValidApiKey,
  loadRuntimeProviderConfig
} from '../../infrastructure/runtime-env/provider-config'
import { ProjectRepository } from '../../infrastructure/pocketbase/project-repository'
import {
  generateOutlineAndCharactersFromConfirmedSevenQuestions,
  resolveReusableFactionMatrix
} from './generate-outline-and-characters-from-confirmed-seven-questions'
import {
  getCharacterBundleContractIssues,
  resolveCharacterContractAnchors
} from '@shared/domain/workflow/character-contract'
import type { ProjectSnapshotDto } from '@shared/contracts/project'
import { resolveProjectEpisodeCount } from '@shared/domain/workflow/episode-count'
import { attachStoryFoundationToIntent } from '@shared/domain/world-building/world-foundation'

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

  const result = await generateOutlineAndCharactersFromConfirmedSevenQuestions({
    projectId: request.projectId,
    storyIntent: existingProject.storyIntent,
    outlineDraft: existingProject.outlineDraft,
    runtimeConfig
  })

  const finalAnchors = resolveCharacterContractAnchors({
    storyIntent: result.storyIntent,
    outline: result.outlineDraft
  })
  const finalContractIssues = getCharacterBundleContractIssues({
    characters: result.characterDrafts,
    protagonist: finalAnchors.protagonist,
    antagonist: finalAnchors.antagonist
  })
  const issueSummary = finalContractIssues.incompleteCharacters
    .map(
      (item) =>
        `${item.name}{legacy:${item.missingLegacyFields.join('|') || '-'};v2:${item.missingV2Fields.join('|') || '-'}}`
    )
    .join(',')

  if (
    finalContractIssues.incompleteCharacters.length > 0 ||
    !finalContractIssues.protagonistCovered ||
    !finalContractIssues.antagonistCovered
  ) {
    console.warn(
      `[OutlineCharacters] contract failed protagonistCovered=${finalContractIssues.protagonistCovered} antagonistCovered=${finalContractIssues.antagonistCovered} incomplete=[${issueSummary}]`
    )
    throw new Error(
      `character_contract_incomplete:protagonist=${finalContractIssues.protagonistCovered ? 1 : 0}:antagonist=${finalContractIssues.antagonistCovered ? 1 : 0}:incomplete=${finalContractIssues.incompleteCharacters.length}`
    )
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

export async function generateCharactersForProject(
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

  const result = await generateOutlineAndCharactersFromConfirmedSevenQuestions({
    projectId: request.projectId,
    storyIntent: existingProject.storyIntent,
    outlineDraft: existingProject.outlineDraft,
    runtimeConfig,
    mode: 'characters_only'
  })

  const finalAnchors = resolveCharacterContractAnchors({
    storyIntent: result.storyIntent,
    outline: result.outlineDraft
  })
  const finalContractIssues = getCharacterBundleContractIssues({
    characters: result.characterDrafts,
    protagonist: finalAnchors.protagonist,
    antagonist: finalAnchors.antagonist
  })

  if (
    finalContractIssues.incompleteCharacters.length > 0 ||
    !finalContractIssues.protagonistCovered ||
    !finalContractIssues.antagonistCovered
  ) {
    throw new Error(
      `character_contract_incomplete:protagonist=${finalContractIssues.protagonistCovered ? 1 : 0}:antagonist=${finalContractIssues.antagonistCovered ? 1 : 0}:incomplete=${finalContractIssues.incompleteCharacters.length}`
    )
  }

  if (!existingProject.outlineDraft) {
    await projectRepository.saveOutlineDraft({
      userId: request.userId,
      projectId: request.projectId,
      outlineDraft: result.outlineDraft
    })
  }

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
    success: true
  }
}

export async function generateFactionsForProject(
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

  const { generateFactionMatrix } = await import('./faction-matrix-agent.js')
  const totalEpisodes = resolveProjectEpisodeCount({
    storyIntent: existingProject.storyIntent,
    outline: existingProject.outlineDraft,
    fallbackCount: 10
  })
  const factionMatrix = await generateFactionMatrix({
    storyIntent: existingProject.storyIntent,
    totalEpisodes,
    runtimeConfig
  })
  const storyIntent = attachStoryFoundationToIntent({
    storyIntent: existingProject.storyIntent,
    entityStore: existingProject.entityStore,
    characterDrafts: existingProject.characterDrafts ?? [],
    factionMatrix,
    totalEpisodes
  })

  const project = await projectRepository.saveProjectMeta({
    userId: request.userId,
    projectId: request.projectId,
    storyIntent,
    entityStore: existingProject.entityStore ?? undefined
  })

  if (!project) {
    throw new Error('project_not_found')
  }

  return {
    project,
    success: true
  }
}

export async function generateOutlineForProject(
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
  const storyIntent = existingProject.storyIntent
  if (!existingProject.characterDrafts?.length) {
    throw new Error('characters_missing: 请先生成并确认人物小传')
  }

  const result = await generateOutlineAndCharactersFromConfirmedSevenQuestions(
    {
      projectId: request.projectId,
      storyIntent,
      outlineDraft: existingProject.outlineDraft,
      runtimeConfig,
      mode: 'outline_only'
    },
    {
      generateCharacterProfiles: async () => ({
        characters: existingProject.characterDrafts ?? [],
        factionMatrix: resolveReusableFactionMatrix(storyIntent)
      })
    }
  )

  await projectRepository.saveOutlineDraft({
    userId: request.userId,
    projectId: request.projectId,
    outlineDraft: result.outlineDraft
  })

  const project = await projectRepository.saveProjectMeta({
    userId: request.userId,
    projectId: request.projectId,
    stage: 'outline',
    genre: result.outlineDraft.genre,
    storyIntent: result.storyIntent,
    entityStore: result.entityStore
  })

  if (!project) {
    throw new Error('project_not_found')
  }

  return {
    project,
    success: !result.outlineGenerationError,
    outlineGenerationError: result.outlineGenerationError
  }
}
