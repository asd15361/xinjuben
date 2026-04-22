import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import type { ProjectSnapshotDto } from '../../../../shared/contracts/project.ts'
import { migrateLegacyStoreIfNeeded } from './migrate-legacy-store.ts'
import { readProjectsIndex } from './read-index.ts'
import { readProjectShards } from './read-project-shards.ts'

function createLegacyProject(overrides: Partial<ProjectSnapshotDto> = {}): ProjectSnapshotDto {
  return {
    id: 'project_legacy_1',
    name: '旧项目',
    workflowType: 'ai_write',
    stage: 'script',
    genre: '悬疑',
    updatedAt: '2026-03-24T10:00:00.000Z',
    chatMessages: [
      { id: 'msg-1', role: 'user', content: 'hello', createdAt: '2026-03-24T09:00:00Z' } as never
    ],
    generationStatus: null,
    storyIntent: { title: '意图' } as never,
    entityStore: {
      characters: [],
      factions: [],
      locations: [],
      items: [],
      relations: []
    },
    outlineDraft: {
      title: '大纲',
      genre: '悬疑',
      summaryEpisodes: [{ episodeNo: 1, title: '第一集' }]
    } as never,
    characterDrafts: [{ id: 'c1', name: '角色A' } as never],
    activeCharacterBlocks: [{ characterId: 'c1', blockNo: 1 } as never],
    detailedOutlineSegments: [
      {
        act: 'A1',
        blockNo: 1,
        segmentNo: 1,
        startEpisode: 1,
        endEpisode: 1,
        title: '段落',
        content: '内容'
      } as never
    ],
    detailedOutlineBlocks: [{ blockNo: 1, episodeBeats: [{ beatNo: 1 }] } as never],
    scriptDraft: [{ sceneNo: 1, screenplay: '场景1', action: '', dialogue: '', emotion: '' }],
    scriptProgressBoard: null,
    scriptFailureResolution: null,
    scriptRuntimeFailureHistory: ['runtime_interrupted'],
    scriptStateLedger: null,
    visibleResult: { status: 'visible', payload: [{ sceneNo: 1, screenplay: '场景1' }] } as never,
    formalRelease: {
      status: 'blocked',
      blockedBy: [{ code: 'UNKNOWN_BLOCKED', label: 'blocked' }]
    } as never,
    ...overrides
  }
}

test('migrateLegacyStoreIfNeeded shards legacy store into index and project files while preserving legacy projects.json', async () => {
  const workspaceDir = await mkdtemp(join(tmpdir(), 'xinjuben-project-files-'))
  const legacyStorePath = join(workspaceDir, 'projects.json')
  const legacyProject = createLegacyProject()

  await writeFile(
    legacyStorePath,
    JSON.stringify({ projects: { [legacyProject.id]: legacyProject } }, null, 2),
    'utf8'
  )

  const didMigrate = await migrateLegacyStoreIfNeeded(workspaceDir)
  const index = await readProjectsIndex(workspaceDir)
  const metaRaw = await readFile(
    join(workspaceDir, 'projects', legacyProject.id, 'meta.json'),
    'utf8'
  )
  const charactersRaw = await readFile(
    join(workspaceDir, 'projects', legacyProject.id, 'characters.json'),
    'utf8'
  )
  const scriptRaw = await readFile(
    join(workspaceDir, 'projects', legacyProject.id, 'script.json'),
    'utf8'
  )
  const legacyRawAfter = await readFile(legacyStorePath, 'utf8')

  assert.equal(didMigrate, true)
  assert.equal(index.projects[legacyProject.id]?.name, '旧项目')
  assert.deepEqual(index.projects[legacyProject.id]?.counts, {
    chatMessages: 1,
    outlineEpisodes: 1,
    characters: 1,
    detailedOutlineBeats: 1,
    scriptSegments: 1
  })
  assert.equal(JSON.parse(metaRaw).name, '旧项目')
  assert.equal(Array.isArray(JSON.parse(charactersRaw).activeCharacterBlocks), false)
  assert.equal(JSON.parse(scriptRaw).scriptDraft.length, 1)
  assert.equal(JSON.parse(legacyRawAfter).projects[legacyProject.id].name, '旧项目')
})

test('readProjectShards reads only shards required for requested stage and defaults missing unrelated shards', async () => {
  const workspaceDir = await mkdtemp(join(tmpdir(), 'xinjuben-project-files-'))
  const projectId = 'project_selective_1'
  const projectDir = join(workspaceDir, 'projects', projectId)
  await mkdir(projectDir, { recursive: true })

  await writeFile(
    join(workspaceDir, 'projects-index.json'),
    JSON.stringify(
      {
        version: 1,
        projects: {
          [projectId]: {
            id: projectId,
            name: 'Selective',
            workflowType: 'ai_write',
            stage: 'chat',
            genre: '都市',
            updatedAt: '2026-03-24T10:00:00.000Z',
            counts: {
              chatMessages: 1,
              outlineEpisodes: 0,
              characters: 0,
              detailedOutlineBeats: 0,
              scriptSegments: 0
            }
          }
        }
      },
      null,
      2
    ),
    'utf8'
  )

  await writeFile(
    join(projectDir, 'meta.json'),
    JSON.stringify(
      {
        id: projectId,
        name: 'Selective',
        workflowType: 'ai_write',
        stage: 'chat',
        genre: '都市',
        updatedAt: '2026-03-24T10:00:00.000Z'
      },
      null,
      2
    ),
    'utf8'
  )
  await writeFile(
    join(projectDir, 'chat.json'),
    JSON.stringify(
      {
        chatMessages: [
          { id: 'msg-1', role: 'user', content: 'hi', createdAt: '2026-03-24T09:00:00Z' }
        ],
        storyIntent: null
      },
      null,
      2
    ),
    'utf8'
  )
  await writeFile(
    join(projectDir, 'generation.json'),
    JSON.stringify({ generationStatus: null }, null, 2),
    'utf8'
  )

  const project = await readProjectShards(workspaceDir, projectId, ['chat'])

  assert.equal(project?.id, projectId)
  assert.equal(project?.chatMessages.length, 1)
  assert.equal(project?.scriptDraft.length, 0)
  assert.equal(project?.outlineDraft, null)
})
