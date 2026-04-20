import { hasValidApiKey, loadRuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import { ProjectRepository } from '../../infrastructure/pocketbase/project-repository'
import { generateDetailedOutlineFromContext, isDetailedOutlineModelResultComplete } from './generate-detailed-outline-support'
import { deriveOutlineEpisodeCount } from '@shared/domain/workflow/episode-count'
import { ensureOutlineEpisodeShape } from '@shared/domain/workflow/outline-episodes'
import type { ProjectSnapshotDto } from '@shared/contracts/project'
import type { DetailedOutlineSegmentDto } from '@shared/contracts/workflow'

export interface DetailedOutlineProjectRequest {
  userId: string
  projectId: string
}

export interface DetailedOutlineProjectResponse {
  project: ProjectSnapshotDto
  detailedOutlineSegments: DetailedOutlineSegmentDto[]
  success: boolean
}

const projectRepository = new ProjectRepository()

export async function generateDetailedOutlineForProject(
  request: DetailedOutlineProjectRequest
): Promise<DetailedOutlineProjectResponse> {
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

  if (!existingProject.outlineDraft) {
    throw new Error('outline_draft_missing')
  }

  if (!existingProject.characterDrafts || existingProject.characterDrafts.length === 0) {
    throw new Error('character_drafts_missing')
  }

  const totalEpisodes = deriveOutlineEpisodeCount(existingProject.outlineDraft)
  if (totalEpisodes <= 0) {
    throw new Error('outline_episode_count_zero')
  }

  const detailedOutlineResult = await generateDetailedOutlineFromContext({
    outline: existingProject.outlineDraft,
    characters: existingProject.characterDrafts,
    entityStore: existingProject.entityStore,
    storyIntent: existingProject.storyIntent,
    runtimeConfig
  })

  // FAIL-CLOSED: Validate episode coverage before save
  if (!isDetailedOutlineModelResultComplete(detailedOutlineResult.segments, totalEpisodes)) {
    const actualBeats = detailedOutlineResult.segments.reduce(
      (sum, seg) => sum + (seg.episodeBeats?.length ?? 0),
      0
    )
    throw new Error(
      `detailed_outline_episode_count_short:expected=${totalEpisodes},actual=${actualBeats}`
    )
  }

  if (detailedOutlineResult.segments.length === 0) {
    throw new Error('detailed_outline_empty_segments')
  }

  const project = await projectRepository.saveDetailedOutline({
    userId: request.userId,
    projectId: request.projectId,
    detailedOutlineBlocks: [{
      blockNo: 1,
      startEpisode: 1,
      endEpisode: detailedOutlineResult.segments.reduce(
        (max, seg) => Math.max(max, seg.endEpisode || 0), 0
      )
    }],
    detailedOutlineSegments: detailedOutlineResult.segments
  })

  if (!project) {
    throw new Error('detailed_outline_save_failed')
  }

  return {
    project,
    detailedOutlineSegments: detailedOutlineResult.segments,
    success: true
  }
}