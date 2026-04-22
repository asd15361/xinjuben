import test from 'node:test'
import assert from 'node:assert/strict'
import { access, mkdtemp, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import type { ProjectSnapshotDto } from '../../../shared/contracts/project.ts'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto
} from '../../../shared/contracts/workflow.ts'
import { resolveDetailedOutlinePersistence } from './resolve-detailed-outline-persistence.ts'
import { readProjectShards } from './project-files/read-project-shards.ts'
import { upsertProjectsIndexEntry } from './project-files/write-index.ts'
import {
  buildShardPayloads,
  toProjectsIndexEntry,
  writeShard
} from './project-files/write-shard.ts'

function createCharacter(name: string): CharacterDraftDto {
  return {
    name,
    biography: `${name}的人物小传`,
    publicMask: '',
    hiddenPressure: '',
    fear: '',
    protectTarget: '',
    conflictTrigger: '',
    advantage: `${name}的优势`,
    weakness: `${name}的短板`,
    goal: `${name}的目标`,
    arc: `${name}的弧光`
  }
}

function createOutline(): OutlineDraftDto {
  return {
    title: '修仙传',
    genre: '玄幻修仙',
    theme: '守护所爱的代价',
    mainConflict: '黎明被李科逼到亮底',
    protagonist: '黎明',
    summary: '李科拿小柔逼黎明亮底。',
    summaryEpisodes: [{ episodeNo: 1, summary: '李科先拿小柔施压。' }],
    facts: [
      {
        id: 'fact-confirmed',
        label: '钥匙必须守住',
        description: '黎明必须守住钥匙。',
        linkedToPlot: true,
        linkedToTheme: true,
        authorityType: 'user_declared' as const,
        status: 'confirmed' as const,
        level: 'core' as const,
        declaredBy: 'user' as const,
        declaredStage: 'outline' as const,
        createdAt: '2026-03-27T00:00:00.000Z',
        updatedAt: '2026-03-27T00:00:00.000Z'
      },
      {
        id: 'fact-draft',
        label: '李科施压线',
        description: '李科持续施压。',
        linkedToPlot: true,
        linkedToTheme: false,
        authorityType: 'ai_suggested' as const,
        status: 'draft' as const,
        level: 'supporting' as const,
        declaredBy: 'system' as const,
        declaredStage: 'outline' as const,
        createdAt: '2026-03-27T00:00:00.000Z',
        updatedAt: '2026-03-27T00:00:00.000Z'
      }
    ]
  }
}

test('resolveDetailedOutlinePersistence keeps outline facts unchanged while persisting segments', () => {
  const outline = createOutline()
  const result = resolveDetailedOutlinePersistence({
    outlineDraft: outline,
    characterDrafts: [createCharacter('黎明'), createCharacter('李科')],
    activeCharacterBlocks: [
      {
        blockNo: 1,
        startEpisode: 1,
        endEpisode: 10,
        summary: '第一规划块',
        characterNames: ['黎明', '李科'],
        characters: [createCharacter('黎明'), createCharacter('李科')]
      }
    ],
    detailedOutlineSegments: [
      {
        act: 'opening',
        content: '李科先拿小柔逼黎明交出钥匙。',
        hookType: '入局钩子',
        episodeBeats: [
          {
            episodeNo: 1,
            summary: '李科先把压力压上来。',
            sceneByScene: [{ sceneNo: 1, setup: '李科拿小柔施压。' }]
          }
        ]
      }
    ],
    now: '2026-03-27T08:00:00.000Z'
  })

  assert.equal(result.stage, 'detailed_outline')
  assert.equal(result.updatedAt, '2026-03-27T08:00:00.000Z')
  assert.equal(result.detailedOutlineSegments.length, 1)
  assert.deepEqual(result.outlineDraft?.facts, outline.facts)
  assert.equal(result.outlineDraft?.facts.filter((fact) => fact.status === 'confirmed').length, 1)
})

test('resolveDetailedOutlinePersistence allows persisting detailed outline when confirmed facts are missing', () => {
  const outline = createOutline()
  outline.facts = outline.facts.filter((fact) => fact.status !== 'confirmed')

  const result = resolveDetailedOutlinePersistence({
    outlineDraft: outline,
    characterDrafts: [createCharacter('黎明'), createCharacter('李科')],
    activeCharacterBlocks: [],
    detailedOutlineSegments: [
      {
        act: 'opening',
        content: '李科先拿小柔逼黎明交出钥匙。',
        hookType: '入局钩子',
        episodeBeats: [
          {
            episodeNo: 1,
            summary: '李科先把压力压上来。',
            sceneByScene: [{ sceneNo: 1, setup: '李科拿小柔施压。' }]
          }
        ]
      }
    ]
  })

  assert.equal(result.stage, 'detailed_outline')
  assert.equal(
    result.outlineDraft?.facts.some((fact) => fact.status === 'confirmed'),
    false
  )
})

test('resolveDetailedOutlinePersistence preserves 30-episode detailed outline across save and load cycle', async (t) => {
  const workspaceDir = await mkdtemp(join(tmpdir(), 'xinjuben-detailed-outline-30-'))
  const fixtureDir = join(
    process.cwd(),
    'tools',
    'e2e',
    'out',
    'userdata-xiuxian-full-real-30ep-mncz0qkz',
    'workspace',
    'projects',
    'project_mncz0sno'
  )

  const outlineFixturePath = join(fixtureDir, 'outline.json')
  const charactersFixturePath = join(fixtureDir, 'characters.json')
  const detailedOutlineFixturePath = join(fixtureDir, 'detailed-outline.json')

  const fixtureReady = await access(outlineFixturePath)
    .then(() => access(charactersFixturePath))
    .then(() => access(detailedOutlineFixturePath))
    .then(() => true)
    .catch(() => false)

  if (!fixtureReady) {
    t.skip('30 集详细大纲 fixture 不在本地，跳过这条历史回归。')
    return
  }

  const [outlineRaw, charactersRaw, detailedOutlineRaw] = await Promise.all([
    readFile(outlineFixturePath, 'utf8'),
    readFile(charactersFixturePath, 'utf8'),
    readFile(detailedOutlineFixturePath, 'utf8')
  ])

  const outlineFixture = JSON.parse(outlineRaw) as {
    outlineDraft: OutlineDraftDto
  }
  const charactersFixture = JSON.parse(charactersRaw) as {
    characterDrafts: CharacterDraftDto[]
  }
  const detailedOutlineFixture = JSON.parse(detailedOutlineRaw) as {
    detailedOutlineSegments: DetailedOutlineSegmentDto[]
  }

  const persisted = resolveDetailedOutlinePersistence({
    outlineDraft: outlineFixture.outlineDraft,
    characterDrafts: charactersFixture.characterDrafts,
    activeCharacterBlocks: [],
    detailedOutlineSegments: detailedOutlineFixture.detailedOutlineSegments,
    now: '2026-03-30T12:00:00.000Z'
  })

  const project: ProjectSnapshotDto = {
    id: 'project_regression_30_ep',
    name: '30集专项回归',
    workflowType: 'ai_write' as const,
    stage: persisted.stage,
    genre: persisted.outlineDraft?.genre ?? '',
    updatedAt: persisted.updatedAt,
    chatMessages: [],
    generationStatus: null,
    storyIntent: null,
    entityStore: {
      characters: [],
      factions: [],
      locations: [],
      items: [],
      relations: []
    },
    outlineDraft: persisted.outlineDraft ?? null,
    characterDrafts: charactersFixture.characterDrafts,
    activeCharacterBlocks: [],
    detailedOutlineSegments: persisted.detailedOutlineSegments,
    detailedOutlineBlocks: [],
    scriptDraft: [],
    scriptProgressBoard: null,
    scriptFailureResolution: null,
    scriptRuntimeFailureHistory: [],
    scriptStateLedger: null,
    visibleResult: {
      status: 'none',
      description: '未生成可见结果',
      payload: null,
      failureResolution: null,
      updatedAt: persisted.updatedAt
    },
    formalRelease: {
      status: 'blocked',
      description: '剧本尚未正式放行',
      blockedBy: [
        {
          code: 'UPSTREAM_INCOMPLETE',
          message: '详细大纲已保存，但剧本阶段尚未完成。',
          category: 'process'
        }
      ],
      evaluatedAt: persisted.updatedAt
    }
  }

  const payloads = buildShardPayloads(project)
  for (const shardName of Object.keys(payloads) as Array<keyof typeof payloads>) {
    await writeShard({
      workspaceDir,
      projectId: project.id,
      shardName,
      payload: payloads[shardName]
    })
  }
  await upsertProjectsIndexEntry(workspaceDir, toProjectsIndexEntry(project))

  const loaded = await readProjectShards(workspaceDir, project.id, ['all'])
  const loadedSegments = loaded?.detailedOutlineSegments ?? []
  const loadedEpisodeBeats = loadedSegments.flatMap((segment) => segment.episodeBeats ?? [])
  const loadedEpisodeNos = loadedEpisodeBeats.map((beat) => beat.episodeNo)
  const loadedActRanges = loadedSegments.map((segment) => [
    segment.startEpisode,
    segment.endEpisode
  ])
  const laterEpisodeBeats = loadedEpisodeBeats.filter((beat) => beat.episodeNo > 10)

  assert.ok(loaded)
  assert.equal(project.outlineDraft?.summaryEpisodes.length, 30)
  assert.equal(loaded?.outlineDraft?.summaryEpisodes.length, 30)
  assert.equal(loadedSegments.length, 4)
  assert.equal(loadedEpisodeBeats.length, 30)
  assert.deepEqual(
    loadedEpisodeNos,
    Array.from({ length: 30 }, (_, index) => index + 1)
  )
  assert.deepEqual(loadedActRanges, [
    [1, 7],
    [8, 14],
    [15, 22],
    [23, 30]
  ])
  assert.equal(laterEpisodeBeats.length, 20)
  assert.ok(
    laterEpisodeBeats.every(
      (beat) =>
        typeof beat.summary === 'string' &&
        beat.summary.trim().length > 0 &&
        Array.isArray(beat.sceneByScene) &&
        beat.sceneByScene.length > 0
    )
  )
})
