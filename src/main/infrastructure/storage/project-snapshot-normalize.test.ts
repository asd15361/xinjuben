import test from 'node:test'
import assert from 'node:assert/strict'

import type { ProjectSnapshotDto } from '../../../shared/contracts/project.ts'
import {
  createFormalReleasedState,
  createVisibleSuccessState
} from '../../../shared/contracts/visible-release-state.ts'
import { normalizeProjectSnapshot } from './project-snapshot-normalize.ts'

function createProject(): ProjectSnapshotDto {
  return {
    id: 'project-legacy',
    name: 'legacy',
    workflowType: 'ai_write',
    stage: 'character',
    genre: '玄幻',
    updatedAt: new Date().toISOString(),
    chatMessages: [],
    generationStatus: null,
    storyIntent: {
      titleHint: '修仙传',
      genre: '玄幻修仙｜热血升级',
      tone: '',
      audience: '',
      sellingPremise: '卖点',
      coreDislocation: '错位',
      emotionalPayoff: '情绪',
      protagonist: '黎明',
      antagonist: '李科',
      coreConflict: '主角在多重压力下完成反转成长',
      endingDirection: '开放结局',
      officialKeyCharacters: ['黎明', '黎明表面无武功'],
      lockedCharacterNames: ['黎明', '黎明表面无武功'],
      themeAnchors: ['主题锚点'],
      worldAnchors: ['世界锚点'],
      relationAnchors: ['关系锚点'],
      dramaticMovement: ['推进锚点'],
      shortDramaConstitution: {
        corePrinciple: '快节奏、强冲突、稳情绪',
        coreEmotion: '一路反咬的爽感',
        incitingIncident: {
          timingRequirement: '30 秒炸场',
          disruption: '李科先拿小柔逼黎明亮底',
          mainLine: '黎明必须先守人再反打'
        },
        protagonistArc: {
          flawBelief: '只要一直忍就能躲过去',
          growthMode: '每集被逼着改一次打法',
          payoff: '最后把旧账打回去'
        },
        povPolicy: {
          mode: 'single_protagonist',
          allowedAuxiliaryViewpoints: ['李科'],
          restriction: '默认单主角视角'
        },
        climaxPolicy: {
          episodeHookRule: '集尾留强钩子',
          finalePayoffRule: '结局总爆发',
          callbackRequirement: '回打开篇激励事件'
        }
      },
      manualRequirementNotes: '',
      freeChatFinalSummary: '黎明表面无武功，实则身怀武艺。',
      generationBriefText: '【关键角色】黎明、黎明表面无武功、被妖兽蛇子'
    },
    entityStore: {
      characters: [],
      factions: [],
      locations: [],
      items: [],
      relations: []
    },
    outlineDraft: {
      title: '修仙传',
      genre: '玄幻修仙｜热血升级',
      theme: '谦卦',
      protagonist: '黎明',
      mainConflict: '主角在多重压力下完成反转成长',
      summary: '第3集：被妖兽蛇子开始在王母宫露头。',
      summaryEpisodes: [
        {
          episodeNo: 3,
          summary: '第3集：被妖兽蛇子开始在王母宫露头。'
        }
      ],
      facts: [
        {
          id: 'fact-1',
          label: 'draft_李科施压线',
          description: '李科持续施压。',
          linkedToPlot: true,
          linkedToTheme: false,
          authorityType: 'ai_suggested',
          status: 'draft',
          level: 'core',
          declaredBy: 'system',
          declaredStage: 'outline',
          createdAt: '2026-03-25T00:00:00.000Z',
          updatedAt: '2026-03-25T00:00:00.000Z'
        }
      ]
    },
    characterDrafts: [
      {
        name: '黎明',
        biography: '玄玉宫弟子',
        publicMask: '低调',
        hiddenPressure: '被追杀',
        fear: '失去底牌',
        protectTarget: '小柔',
        conflictTrigger: '被逼亮底',
        advantage: '能忍',
        weakness: '太在意身边人',
        goal: '守住底牌',
        arc: '从隐忍到反击'
      },
      {
        name: '黎明表面无武功',
        biography: '这是旧污染名',
        publicMask: '污染口径',
        hiddenPressure: '污染口径',
        fear: '污染口径',
        protectTarget: '污染口径',
        conflictTrigger: '污染口径',
        advantage: '污染口径',
        weakness: '污染口径',
        goal: '污染口径',
        arc: '污染口径'
      }
    ],
    activeCharacterBlocks: [],
    detailedOutlineBlocks: [],
    detailedOutlineSegments: [],
    scriptDraft: [],
    scriptProgressBoard: null,
    scriptFailureResolution: null,
    scriptRuntimeFailureHistory: [],
    scriptStateLedger: null,
    visibleResult: createVisibleSuccessState([], 'visible'),
    formalRelease: createFormalReleasedState('released')
  }
}

test('normalizeProjectSnapshot preserves persisted story text and polluted names instead of rewriting them on read', () => {
  const normalized = normalizeProjectSnapshot(createProject())

  assert.match(normalized.storyIntent?.generationBriefText || '', /黎明表面无武功/)
  assert.match(normalized.storyIntent?.generationBriefText || '', /被妖兽蛇子/)
  assert.deepEqual(
    normalized.characterDrafts.map((character) => character.name),
    ['黎明', '黎明表面无武功']
  )
  assert.match(normalized.outlineDraft?.summary || '', /被妖兽蛇子/)
  assert.equal(
    normalized.storyIntent?.shortDramaConstitution?.corePrinciple,
    '快节奏、强冲突、稳情绪'
  )
})

test('normalizeProjectSnapshot ignores persisted activeCharacterBlocks and re-derives from outline plus characters', () => {
  const project = createProject()
  project.characterDrafts = [
    {
      name: '黎明',
      biography: '玄玉宫弟子',
      publicMask: '低调',
      hiddenPressure: '被追杀',
      fear: '失去底牌',
      protectTarget: '小柔',
      conflictTrigger: '被逼亮底',
      advantage: '能忍',
      weakness: '太在意身边人',
      goal: '守住底牌',
      arc: '从隐忍到反击'
    }
  ]
  project.activeCharacterBlocks = [
    {
      blockNo: 1,
      startEpisode: 1,
      endEpisode: 10,
      summary: '第8集：李诚阳和被妖兽蛇子背后的旧真相被进一步掀开。',
      characterNames: ['黎明', '李诚阳', '被妖兽蛇子'],
      characters: [
        {
          name: '李诚阳',
          biography: '师父',
          publicMask: '表面镇定',
          hiddenPressure: '旧规矩',
          fear: '局势失控',
          protectTarget: '玄玉宫',
          conflictTrigger: '钥匙失守',
          advantage: '规则杠杆',
          weakness: '旧规矩会反噬',
          goal: '守住规则',
          arc: '从藏手到出手'
        }
      ]
    }
  ]

  const normalized = normalizeProjectSnapshot(project)

  assert.deepEqual(
    normalized.characterDrafts.map((character) => character.name),
    ['黎明']
  )
  assert.deepEqual(normalized.activeCharacterBlocks[0]?.characterNames, ['黎明'])
  assert.equal(normalized.activeCharacterBlocks[0]?.characters[0]?.name, '黎明')
})

test('normalizeProjectSnapshot keeps outline episodes and facts as persisted while still deriving system stage', () => {
  const project = createProject()
  project.stage = 'outline'
  project.detailedOutlineSegments = [
    {
      act: 'opening',
      hookType: '入局钩子',
      content: '李科先拿小柔逼黎明交出密库钥匙。'
    }
  ]

  const normalized = normalizeProjectSnapshot(project)

  assert.equal(normalized.stage, 'detailed_outline')
  assert.equal(normalized.outlineDraft?.summaryEpisodes.length, 1)
  assert.equal(normalized.outlineDraft?.summaryEpisodes[0]?.episodeNo, 3)
  assert.equal(
    normalized.outlineDraft?.facts.filter((fact) => fact.status === 'confirmed').length,
    0
  )
})

test('normalizeProjectSnapshot backfills legacy entityStore from confirmed generation brief when store is empty', () => {
  const project = createProject()
  project.storyIntent = {
    ...project.storyIntent!,
    generationBriefText: `
【项目】修仙传｜30集
【世界观与故事背景】修仙宗门与凡俗势力并行的等级世界。玄玉宫等七座道观共同镇守妖兽蛇子。
【主角】黎明
【对手】李科
【关键角色】黎明、李科、小柔、李诚阳
【角色卡】
- 黎明：玄玉宫弟子，隐于闹市守护钥匙。
- 李诚阳：玄玉宫道长，镇守山中。
- 李科：凡俗恶霸，持续施压。
`
  }
  project.entityStore = {
    characters: [],
    factions: [],
    locations: [],
    items: [],
    relations: []
  }

  const normalized = normalizeProjectSnapshot(project)

  assert.ok(normalized.entityStore.characters.some((character) => character.name === '黎明'))
  assert.ok(normalized.entityStore.factions.some((faction) => faction.name === '玄玉宫'))
  const xuanYuGong = normalized.entityStore.factions.find((faction) => faction.name === '玄玉宫')
  const liMing = normalized.entityStore.characters.find((character) => character.name === '黎明')
  const liChengYang = normalized.entityStore.characters.find(
    (character) => character.name === '李诚阳'
  )

  assert.ok(xuanYuGong)
  assert.ok(liMing)
  assert.ok(liChengYang)
  assert.deepEqual(xuanYuGong.memberCharacterIds.sort(), [liChengYang.id, liMing.id].sort())
  const slotCharacters = normalized.entityStore.characters.filter(
    (character) => character.identityMode === 'slot'
  )
  assert.ok(slotCharacters.length >= 3)
  assert.ok(slotCharacters.some((character) => character.factionRole === '执事位'))
  assert.ok(slotCharacters.every((character) => character.linkedFactionIds.includes(xuanYuGong.id)))
})

test('normalizeProjectSnapshot preserves episode control cards inside detailed outline beats', () => {
  const project = createProject()
  project.detailedOutlineSegments = [
    {
      act: 'opening',
      hookType: '入局钩子',
      content: '开局先把黎明拖进局里。',
      episodeBeats: [
        {
          episodeNo: 1,
          summary: '第1集先炸场并立主线。',
          sceneByScene: [
            { sceneNo: 1, setup: '李科先拿小柔逼黎明亮底。', tension: '黎明当场被逼表态。' }
          ],
          episodeControlCard: {
            episodeMission: '第1集先炸场并立主线。',
            openingBomb: '李科先拿小柔逼黎明亮底。',
            conflictUpgrade: '黎明当场被逼表态。',
            arcBeat: '黎明开始被迫改打法。',
            emotionBeat: '稳住一路反咬的爽感。',
            hookLanding: '李科继续加码追压。',
            povConstraint: '默认单主角视角',
            forbiddenDrift: ['不要铺垫日常再起事', '']
          }
        }
      ]
    }
  ]

  const normalized = normalizeProjectSnapshot(project)
  const controlCard = normalized.detailedOutlineSegments[0]?.episodeBeats?.[0]?.episodeControlCard

  assert.equal(controlCard?.episodeMission, '第1集先炸场并立主线。')
  assert.deepEqual(controlCard?.forbiddenDrift, ['不要铺垫日常再起事'])
})
