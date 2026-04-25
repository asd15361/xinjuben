import type { ProjectSummaryDto } from '../../../../../shared/contracts/project.ts'

const PROJECT_SUMMARY_CACHE_PREFIX = 'xinjuben_project_summaries:'

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function getCacheKey(userId: string): string {
  return `${PROJECT_SUMMARY_CACHE_PREFIX}${userId}`
}

function isProjectSummaryList(value: unknown): value is ProjectSummaryDto[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof (item as ProjectSummaryDto).id === 'string' &&
        typeof (item as ProjectSummaryDto).name === 'string' &&
        typeof (item as ProjectSummaryDto).stage === 'string' &&
        typeof (item as ProjectSummaryDto).updatedAt === 'string'
    )
  )
}

export function readCachedProjectSummaries(userId: string): ProjectSummaryDto[] {
  if (!userId) return []
  const storage = getStorage()
  if (!storage) return []

  try {
    const raw = storage.getItem(getCacheKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return isProjectSummaryList(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeCachedProjectSummaries(
  userId: string,
  projects: ProjectSummaryDto[]
): void {
  if (!userId) return
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(getCacheKey(userId), JSON.stringify(projects))
  } catch {
    // Cache writes are best effort; project list still comes from the server.
  }
}
