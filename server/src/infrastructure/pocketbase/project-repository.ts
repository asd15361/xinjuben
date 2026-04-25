import type PocketBase from 'pocketbase'
import type {
  CreateProjectInputDto,
  MarketProfileDto,
  ProjectSnapshotDto,
  ProjectSummaryDto
} from '@shared/contracts/project'
import type { MarketPlaybookSelectionDto } from '@shared/contracts/market-playbook'
import type { StoryIntentPackageDto } from '@shared/contracts/intake'
import type { ProjectEntityStoreDto } from '@shared/contracts/entities'
import type { ChatMessageDto } from '@shared/contracts/chat'
import type {
  OutlineDraftDto,
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  DetailedOutlineBlockDto,
  CharacterBlockDto,
  ScriptSegmentDto,
  SevenQuestionsSessionDto
} from '@shared/contracts/workflow'
import type { ProjectGenerationStatusDto } from '@shared/contracts/generation'
import type { ScriptStateLedgerDto } from '@shared/contracts/script-ledger'
import type {
  ScriptGenerationFailureResolutionDto,
  ScriptGenerationProgressBoardDto
} from '@shared/contracts/script-generation'
import type {
  FormalReleaseState,
  VisibleResultState
} from '@shared/contracts/visible-release-state'
import {
  guardianEnforceCharacterSave,
  guardianEnforceDetailedOutlineSave,
  guardianEnforceOutlineSave
} from '@shared/domain/workflow/stage-guardians'
import { resolveMarketPlaybookSelection } from '@shared/domain/market-playbook/market-playbook-registry'
import { authenticateAdmin, pb, TABLES } from './client'
import { MarketPlaybookRepository } from './market-playbook-repository'
import {
  mapProjectSnapshot,
  mapProjectSummary,
  type ProjectRecordShape
} from './project-snapshot-mapper'

type PbRecord = {
  id: string
  created: string
  updated: string
  [key: string]: unknown
}

export class ProjectRepositoryConcurrencyError extends Error {
  constructor(message = 'project_repository_version_conflict') {
    super(message)
    this.name = 'ProjectRepositoryConcurrencyError'
  }
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value)
}

function toProjectRecordShape(record: PbRecord): ProjectRecordShape {
  return {
    id: record.id,
    name: String(record.name || ''),
    workflowType: (record.workflowType as ProjectRecordShape['workflowType']) || 'ai_write',
    stage: (record.stage as ProjectSnapshotDto['stage']) || 'chat',
    genre: String(record.genre || ''),
    updated: String(record.updated || new Date().toISOString()),
    generationStatusJson: record.generationStatusJson as string | null | undefined,
    storyIntentJson: record.storyIntentJson as string | null | undefined,
    entityStoreJson: record.entityStoreJson as string | null | undefined,
    visibleResultJson: record.visibleResultJson as string | null | undefined,
    formalReleaseJson: record.formalReleaseJson as string | null | undefined,
    marketProfileJson: record.marketProfileJson as string | null | undefined,
    marketPlaybookSelectionJson: record.marketPlaybookSelectionJson as string | null | undefined
  }
}

async function getSingleByProject(
  pocketbase: PocketBase,
  collection: string,
  projectId: string
): Promise<PbRecord | null> {
  const result = await pocketbase.collection(collection).getList<PbRecord>(1, 1, {
    filter: `project="${projectId}"`,
    requestKey: null
  })
  return result.items[0] ?? null
}

async function upsertVersionedByProject(input: {
  pocketbase: PocketBase
  collection: string
  userId: string
  projectId: string
  payload: Record<string, unknown>
  expectedVersion?: number | null
}): Promise<PbRecord> {
  const current = await getSingleByProject(input.pocketbase, input.collection, input.projectId)
  const currentVersion = Number(current?.version || 0)
  const expectedVersion = input.expectedVersion ?? currentVersion

  if (current && currentVersion !== expectedVersion) {
    throw new ProjectRepositoryConcurrencyError(
      `${input.collection}_version_conflict:expected=${expectedVersion}:actual=${currentVersion}`
    )
  }

  const nextVersion = currentVersion + 1
  const data = {
    user: input.userId,
    project: input.projectId,
    ...input.payload,
    version: nextVersion
  }

  if (!current) {
    try {
      return input.pocketbase.collection(input.collection).create<PbRecord>(data)
    } catch (createError: unknown) {
      const errorInfo = extractPocketBaseErrorDetails(createError, input.payload)
      console.error(`[ProjectRepository] Create failed for ${input.collection}: ${errorInfo}`)
      throw new Error(`pocketbase_create_failed:${input.collection}:${errorInfo}`)
    }
  }

  try {
    return input.pocketbase.collection(input.collection).update<PbRecord>(current.id, data)
  } catch (updateError: unknown) {
    const errorInfo = extractPocketBaseErrorDetails(updateError, input.payload)
    console.error(`[ProjectRepository] Update failed for ${input.collection}: ${errorInfo}`)
    throw new Error(`pocketbase_update_failed:${input.collection}:${errorInfo}`)
  }
}

function extractPocketBaseErrorDetails(error: unknown, payload: Record<string, unknown>): string {
  function valueLength(value: unknown): number {
    if (typeof value === 'string') return value.length
    try {
      return JSON.stringify(value).length
    } catch {
      return 0
    }
  }

  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>
    const response = err.response as Record<string, unknown> | undefined
    const errorData = err.data as Record<string, unknown> | undefined
    const responseData = response?.data as Record<string, unknown> | undefined
    const data =
      (errorData?.data as Record<string, unknown> | undefined) ||
      errorData ||
      (responseData?.data as Record<string, unknown> | undefined) ||
      responseData
    if (data) {
      const fieldErrors: string[] = []
      for (const [fieldName, fieldError] of Object.entries(data)) {
        if (fieldError && typeof fieldError === 'object') {
          const fe = fieldError as Record<string, unknown>
          const code = fe.code || 'unknown'
          const message = fe.message || ''
          fieldErrors.push(`${fieldName}:${code}:${message}`)
        }
      }
      if (fieldErrors.length > 0) {
        const payloadSizes = Object.entries(payload)
          .map(([k, v]) => `${k}.len=${valueLength(v)}`)
          .join(',')
        return `fields=[${fieldErrors.join(';')}] payload_sizes={${payloadSizes}}`
      }
    }
    const message =
      (typeof response?.message === 'string' && response.message) ||
      (err instanceof Error ? err.message : '')
    const status = response?.status ? `status=${response.status}:` : ''
    return message ? `${status}${message}` : String(error)
  }
  return String(error)
}

export class ProjectRepository {
  private readonly marketPlaybookRepository: MarketPlaybookRepository

  constructor(private readonly pocketbase: PocketBase = pb) {
    this.marketPlaybookRepository = new MarketPlaybookRepository(pocketbase)
  }

  async ensureAdminReady(): Promise<void> {
    await authenticateAdmin()
  }

  async listProjects(userId: string): Promise<ProjectSummaryDto[]> {
    await this.ensureAdminReady()
    const result = await this.pocketbase.collection(TABLES.projects).getList<PbRecord>(1, 1000, {
      filter: `user="${userId}"`,
      requestKey: null
    })
    return result.items.map((record) => mapProjectSummary(toProjectRecordShape(record)))
  }

  async createProject(userId: string, input: CreateProjectInputDto): Promise<ProjectSnapshotDto> {
    await this.ensureAdminReady()
    const now = new Date().toISOString()

    // P4: 创建项目时自动选择打法包并锁定
    const resolved = resolveMarketPlaybookSelection({
      audienceLane: input.marketProfile.audienceLane,
      subgenre: input.marketProfile.subgenre,
      customPlaybooks: await this.marketPlaybookRepository.listActivePlaybooks(userId)
    })

    if (resolved.selection?.selectedPlaybookId) {
      console.log(
        `[market_playbook_locked] projectId=pending playbookId=${resolved.selection.selectedPlaybookId} version=${resolved.selection.selectedVersion ?? '?'} sourceMonth=${resolved.selection.selectedSourceMonth ?? '?'} reason=${resolved.reason}`
      )
    }

    const created = await this.pocketbase.collection(TABLES.projects).create<PbRecord>({
      user: userId,
      name: input.name.trim(),
      workflowType: input.workflowType,
      stage: 'chat',
      genre: input.genre?.trim() || '',
      marketProfileJson: stringifyJson(input.marketProfile),
      marketPlaybookSelectionJson: stringifyJson(resolved.selection),
      generationStatusJson: stringifyJson(null),
      storyIntentJson: stringifyJson(null),
      entityStoreJson: stringifyJson({
        characters: [],
        factions: [],
        locations: [],
        items: [],
        relations: []
      }),
      visibleResultJson: stringifyJson({
        status: 'pending',
        description: '当前还没有可见结果。',
        payload: null,
        failureResolution: null,
        updatedAt: now
      } satisfies VisibleResultState),
      formalReleaseJson: stringifyJson({
        status: 'blocked',
        description: '当前还没有正式放行结果。',
        blockedBy: [
          { code: 'UNKNOWN_BLOCKED', message: '当前还没有正式放行结果。', category: 'process' }
        ],
        evaluatedAt: now
      } satisfies FormalReleaseState),
      projectVersion: 1
    })

    return mapProjectSnapshot(toProjectRecordShape(created), {})
  }

  async getProject(userId: string, projectId: string): Promise<ProjectSnapshotDto | null> {
    await this.ensureAdminReady()
    const projectList = await this.pocketbase.collection(TABLES.projects).getList<PbRecord>(1, 1, {
      filter: `id="${projectId}" && user="${userId}"`,
      requestKey: null
    })
    const projectRecord = projectList.items[0]
    if (!projectRecord) return null

    const [chat, outline, characters, detailedOutline, script] = await Promise.all([
      getSingleByProject(this.pocketbase, TABLES.projectChats, projectId),
      getSingleByProject(this.pocketbase, TABLES.projectOutlines, projectId),
      getSingleByProject(this.pocketbase, TABLES.projectCharacters, projectId),
      getSingleByProject(this.pocketbase, TABLES.projectDetailedOutlines, projectId),
      getSingleByProject(this.pocketbase, TABLES.projectScripts, projectId)
    ])

    return mapProjectSnapshot(toProjectRecordShape(projectRecord), {
      chat: chat
        ? { messagesJson: chat.messagesJson as string | ChatMessageDto[] | null }
        : undefined,
      outline: outline ? { outlineDraftJson: outline.outlineDraftJson as string } : undefined,
      characters: characters
        ? {
            characterDraftsJson: characters.characterDraftsJson as string,
            activeCharacterBlocksJson: characters.activeCharacterBlocksJson as string
          }
        : undefined,
      detailedOutline: detailedOutline
        ? {
            detailedOutlineBlocksJson: detailedOutline.detailedOutlineBlocksJson as string,
            detailedOutlineSegmentsJson: detailedOutline.detailedOutlineSegmentsJson as string
          }
        : undefined,
      script: script
        ? {
            scriptDraftJson: script.scriptDraftJson as string,
            scriptProgressBoardJson: script.scriptProgressBoardJson as string | null,
            scriptFailureResolutionJson: script.scriptFailureResolutionJson as string | null,
            scriptRuntimeFailureHistoryJson: script.scriptRuntimeFailureHistoryJson as
              | string
              | null,
            scriptStateLedgerJson: script.scriptStateLedgerJson as string | null
          }
        : undefined
    })
  }

  async deleteProject(userId: string, projectId: string): Promise<boolean> {
    await this.ensureAdminReady()
    const project = await this.getProjectRecordById(userId, projectId)
    if (!project) return false
    await this.pocketbase.collection(TABLES.projects).delete(project.id)
    return true
  }

  async saveProjectMeta(input: {
    userId: string
    projectId: string
    stage?: ProjectSnapshotDto['stage']
    genre?: string
    marketProfile?: MarketProfileDto | null
    marketPlaybookSelection?: MarketPlaybookSelectionDto | null
    storyIntent?: StoryIntentPackageDto | null
    entityStore?: ProjectEntityStoreDto
    generationStatus?: ProjectGenerationStatusDto | null
    visibleResult?: VisibleResultState
    formalRelease?: FormalReleaseState
    expectedProjectVersion?: number | null
  }): Promise<ProjectSnapshotDto | null> {
    await this.ensureAdminReady()
    const project = await this.getProjectRecordById(input.userId, input.projectId)
    if (!project) return null

    const currentVersion = Number(project.projectVersion || 0)
    const expectedVersion = input.expectedProjectVersion ?? currentVersion
    if (currentVersion !== expectedVersion) {
      throw new ProjectRepositoryConcurrencyError(
        `projects_version_conflict:expected=${expectedVersion}:actual=${currentVersion}`
      )
    }

    const payload = {
      stage: input.stage ?? project.stage,
      genre: input.genre ?? project.genre ?? '',
      marketProfileJson:
        input.marketProfile === undefined
          ? project.marketProfileJson
          : stringifyJson(input.marketProfile),
      marketPlaybookSelectionJson:
        input.marketPlaybookSelection === undefined
          ? project.marketPlaybookSelectionJson
          : stringifyJson(input.marketPlaybookSelection),
      storyIntentJson:
        input.storyIntent === undefined
          ? project.storyIntentJson
          : stringifyJson(input.storyIntent),
      entityStoreJson:
        input.entityStore === undefined
          ? project.entityStoreJson
          : stringifyJson(input.entityStore),
      generationStatusJson:
        input.generationStatus === undefined
          ? project.generationStatusJson
          : stringifyJson(input.generationStatus),
      visibleResultJson:
        input.visibleResult === undefined
          ? project.visibleResultJson
          : stringifyJson(input.visibleResult),
      formalReleaseJson:
        input.formalRelease === undefined
          ? project.formalReleaseJson
          : stringifyJson(input.formalRelease),
      projectVersion: currentVersion + 1
    }

    try {
      await this.pocketbase.collection(TABLES.projects).update(project.id, payload)
    } catch (updateError: unknown) {
      const errorInfo = extractPocketBaseErrorDetails(updateError, payload)
      console.error(`[ProjectRepository] Update failed for ${TABLES.projects}: ${errorInfo}`)
      throw new Error(`pocketbase_update_failed:${TABLES.projects}:${errorInfo}`)
    }

    return this.getProject(input.userId, input.projectId)
  }

  async saveChatMessages(input: {
    userId: string
    projectId: string
    chatMessages: ChatMessageDto[]
    expectedVersion?: number | null
  }): Promise<ProjectSnapshotDto | null> {
    await this.ensureAdminReady()
    await upsertVersionedByProject({
      pocketbase: this.pocketbase,
      collection: TABLES.projectChats,
      userId: input.userId,
      projectId: input.projectId,
      payload: { messagesJson: stringifyJson(input.chatMessages) },
      expectedVersion: input.expectedVersion
    })
    return this.getProject(input.userId, input.projectId)
  }

  async saveOutlineDraft(input: {
    userId: string
    projectId: string
    outlineDraft: OutlineDraftDto
    expectedVersion?: number | null
  }): Promise<ProjectSnapshotDto | null> {
    await this.ensureAdminReady()
    guardianEnforceOutlineSave(input.outlineDraft)
    await upsertVersionedByProject({
      pocketbase: this.pocketbase,
      collection: TABLES.projectOutlines,
      userId: input.userId,
      projectId: input.projectId,
      payload: { outlineDraftJson: stringifyJson(input.outlineDraft) },
      expectedVersion: input.expectedVersion
    })
    return this.getProject(input.userId, input.projectId)
  }

  async saveSevenQuestionsSession(input: {
    userId: string
    projectId: string
    session: SevenQuestionsSessionDto | null
  }): Promise<ProjectSnapshotDto | null> {
    await this.ensureAdminReady()
    const existing = await this.getProject(input.userId, input.projectId)
    if (!existing) return null

    const baseOutline = existing.outlineDraft ?? {
      title: existing.name ?? '',
      genre: '',
      theme: '',
      mainConflict: '',
      protagonist: '',
      summary: '',
      summaryEpisodes: [],
      facts: []
    }

    const nextOutline: OutlineDraftDto = {
      ...baseOutline,
      sevenQuestionsSession: input.session ?? undefined
    }

    await upsertVersionedByProject({
      pocketbase: this.pocketbase,
      collection: TABLES.projectOutlines,
      userId: input.userId,
      projectId: input.projectId,
      payload: { outlineDraftJson: stringifyJson(nextOutline) }
    })
    return this.getProject(input.userId, input.projectId)
  }

  async saveCharacterDrafts(input: {
    userId: string
    projectId: string
    characterDrafts: CharacterDraftDto[]
    activeCharacterBlocks?: CharacterBlockDto[]
    expectedVersion?: number | null
  }): Promise<ProjectSnapshotDto | null> {
    await this.ensureAdminReady()
    const project = await this.getProject(input.userId, input.projectId)
    if (!project?.outlineDraft) {
      return null
    }
    guardianEnforceCharacterSave({
      storyIntent: project.storyIntent,
      outline: project.outlineDraft,
      characters: input.characterDrafts,
      activeCharacterBlocks: input.activeCharacterBlocks
    })
    await upsertVersionedByProject({
      pocketbase: this.pocketbase,
      collection: TABLES.projectCharacters,
      userId: input.userId,
      projectId: input.projectId,
      payload: {
        characterDraftsJson: stringifyJson(input.characterDrafts),
        activeCharacterBlocksJson:
          input.activeCharacterBlocks && input.activeCharacterBlocks.length > 0
            ? stringifyJson(input.activeCharacterBlocks)
            : null
      },
      expectedVersion: input.expectedVersion
    })
    return this.getProject(input.userId, input.projectId)
  }

  async saveDetailedOutline(input: {
    userId: string
    projectId: string
    detailedOutlineBlocks: DetailedOutlineBlockDto[]
    detailedOutlineSegments: DetailedOutlineSegmentDto[]
    expectedVersion?: number | null
  }): Promise<ProjectSnapshotDto | null> {
    await this.ensureAdminReady()
    const project = await this.getProject(input.userId, input.projectId)
    if (!project?.outlineDraft) {
      return null
    }
    guardianEnforceDetailedOutlineSave({
      storyIntent: project.storyIntent,
      outline: project.outlineDraft,
      characters: project.characterDrafts ?? [],
      detailedOutlineSegments: input.detailedOutlineSegments,
      activeCharacterBlocks: project.activeCharacterBlocks
    })
    await upsertVersionedByProject({
      pocketbase: this.pocketbase,
      collection: TABLES.projectDetailedOutlines,
      userId: input.userId,
      projectId: input.projectId,
      payload: {
        detailedOutlineBlocksJson: stringifyJson(input.detailedOutlineBlocks),
        detailedOutlineSegmentsJson: stringifyJson(input.detailedOutlineSegments)
      },
      expectedVersion: input.expectedVersion
    })
    console.log(
      '[ProjectRepository] Detailed outline saved successfully for project:',
      input.projectId
    )
    return this.getProject(input.userId, input.projectId)
  }

  async saveScriptState(input: {
    userId: string
    projectId: string
    scriptDraft: ScriptSegmentDto[]
    scriptProgressBoard?: ScriptGenerationProgressBoardDto | null
    scriptFailureResolution?: ScriptGenerationFailureResolutionDto | null
    scriptRuntimeFailureHistory?: string[]
    scriptStateLedger?: ScriptStateLedgerDto | null
    expectedVersion?: number | null
  }): Promise<ProjectSnapshotDto | null> {
    await this.ensureAdminReady()
    await upsertVersionedByProject({
      pocketbase: this.pocketbase,
      collection: TABLES.projectScripts,
      userId: input.userId,
      projectId: input.projectId,
      payload: {
        scriptDraftJson: stringifyJson(input.scriptDraft),
        scriptProgressBoardJson: input.scriptProgressBoard
          ? stringifyJson(input.scriptProgressBoard)
          : null,
        scriptFailureResolutionJson: input.scriptFailureResolution
          ? stringifyJson(input.scriptFailureResolution)
          : null,
        scriptRuntimeFailureHistoryJson: stringifyJson(input.scriptRuntimeFailureHistory ?? []),
        scriptStateLedgerJson: input.scriptStateLedger
          ? stringifyJson(input.scriptStateLedger)
          : null
      },
      expectedVersion: input.expectedVersion
    })
    return this.getProject(input.userId, input.projectId)
  }

  private async getProjectRecordById(userId: string, projectId: string): Promise<PbRecord | null> {
    const result = await this.pocketbase.collection(TABLES.projects).getList<PbRecord>(1, 1, {
      filter: `id="${projectId}" && user="${userId}"`,
      requestKey: null
    })
    return result.items[0] ?? null
  }
}
