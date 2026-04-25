import { dirname } from 'path'

import type { ProjectSnapshotDto } from '../../../shared/contracts/project.ts'
import { getStorePath } from './project-store-core.ts'
import { removeProjectsIndexEntry, upsertProjectsIndexEntry } from './project-files/write-index.ts'
import {
  buildShardPayloads,
  getAllShardNames,
  removeProjectDirectory,
  writeShard
} from './project-files/write-shard.ts'

function getWorkspaceDir(): string {
  return dirname(getStorePath())
}

export async function mirrorProjectSnapshot(project: ProjectSnapshotDto): Promise<void> {
  const workspaceDir = getWorkspaceDir()
  const payloads = buildShardPayloads(project)

  for (const shardName of getAllShardNames()) {
    await writeShard({
      workspaceDir,
      projectId: project.id,
      shardName,
      payload: payloads[shardName]
    })
  }

  await upsertProjectsIndexEntry(workspaceDir, {
    id: project.id,
    name: project.name,
    workflowType: project.workflowType,
    stage: project.stage,
    genre: project.genre,
    marketProfile: project.marketProfile ?? null,
    marketPlaybookSelection: project.marketPlaybookSelection ?? null,
    updatedAt: project.updatedAt,
    counts: {
      chatMessages: Array.isArray(project.chatMessages) ? project.chatMessages.length : 0,
      outlineEpisodes: Array.isArray(project.outlineDraft?.summaryEpisodes)
        ? project.outlineDraft.summaryEpisodes.length
        : 0,
      characters: Array.isArray(project.characterDrafts) ? project.characterDrafts.length : 0,
      detailedOutlineBeats: Array.isArray(project.detailedOutlineSegments)
        ? project.detailedOutlineSegments.reduce(
            (total, segment) =>
              total + (Array.isArray(segment.episodeBeats) ? segment.episodeBeats.length : 0),
            0
          )
        : 0,
      scriptSegments: Array.isArray(project.scriptDraft) ? project.scriptDraft.length : 0
    }
  })
}

export async function mirrorProjectDeletion(projectId: string): Promise<void> {
  const workspaceDir = getWorkspaceDir()
  await removeProjectDirectory(workspaceDir, projectId)
  await removeProjectsIndexEntry(workspaceDir, projectId)
}
