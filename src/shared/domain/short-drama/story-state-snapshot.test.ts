import test from 'node:test'
import assert from 'node:assert/strict'
import { buildStoryStateSnapshot, buildStoryStateSnapshotPromptBlock } from './story-state-snapshot.ts'
import type { CharacterDraftDto, OutlineDraftDto, ScriptSegmentDto } from '../../contracts/workflow'
import type { StoryIntentPackageDto } from '../../contracts/intake'
import type { ScriptStateLedgerDto } from '../../contracts/script-ledger'

const mockOutline: OutlineDraftDto = {
  title: '测试短剧',
  genre: '都市',
  theme: '逆袭',
  mainConflict: '主角被陷害',
  protagonist: '张三',
  summary: '',
  summaryEpisodes: [],
  facts: []
}

const mockCharacters: CharacterDraftDto[] = [
  {
    name: '张三',
    biography: '普通上班族',
    publicMask: '老实人',
    hiddenPressure: '被裁员',
    fear: '失去尊严',
    protectTarget: '家人',
    conflictTrigger: '被逼到绝路',
    advantage: '聪明',
    weakness: '心软',
    goal: '翻身逆袭',
    arc: '从懦夫到强者'
  },
  {
    name: '李四',
    biography: '公司副总',
    publicMask: '笑面虎',
    hiddenPressure: '怕丢掉位置',
    fear: '真相暴露',
    protectTarget: '自己的地位',
    conflictTrigger: '利益受损',
    advantage: '有权有势',
    weakness: '贪婪',
    goal: '打压张三',
    arc: '从高位跌落'
  }
]

const mockStoryIntent: StoryIntentPackageDto = {
  themeAnchors: ['逆袭'],
  coreConflict: '主角被陷害',
  protagonist: '张三',
  antagonist: '李四',
  emotionalPayoff: '爽感',
  coreDislocation: '底层翻身',
  officialKeyCharacters: ['张三', '李四'],
  lockedCharacterNames: [],
  worldAnchors: [],
  relationAnchors: [],
  dramaticMovement: [],
  marketProfile: {
    audienceLane: 'male',
    subgenre: '男频都市逆袭'
  }
}

const mockLedger: ScriptStateLedgerDto = {
  semanticHash: 'abc',
  sceneCount: 2,
  latestHook: '张三被开除',
  recentSceneNos: [1, 2],
  unresolvedSignals: [],
  characters: [],
  factState: { theme: '逆袭', mainConflict: '被陷害', confirmedFormalFacts: [], protectedFacts: [], lastUpdatedAt: '' },
  anchorState: { requiredAnchorNames: [], missingAnchorNames: [], heroineRequired: false, heroineHint: '', heroineCovered: false },
  openHooks: [],
  storyMomentum: {
    previousCliffhanger: '张三发现关键证据',
    nextRequiredBridge: '证据被抢走',
    activeConflictLine: '张三vs李四',
    pendingCost: '失去工作',
    memoryEchoes: [],
    hardAnchors: []
  },
  knowledgeBoundaries: {
    perspectiveCharacter: '张三',
    publicFacts: ['张三被裁员', '李四是真凶'],
    hiddenFacts: [],
    forbiddenOmniscienceRules: []
  },
  eventLog: [],
  preflight: { issues: [], assertionBlock: '' }
}

test('buildStoryStateSnapshot builds basic snapshot', () => {
  const snapshot = buildStoryStateSnapshot({
    projectId: 'proj-1',
    outlineTitle: '测试短剧',
    theme: '逆袭',
    mainConflict: '主角被陷害',
    storyIntent: mockStoryIntent,
    outline: mockOutline,
    characters: mockCharacters,
    episodeNo: 3,
    targetEpisodes: 20,
    ledger: mockLedger
  })

  assert.equal(snapshot.projectId, 'proj-1')
  assert.equal(snapshot.audienceLane, 'male')
  assert.equal(snapshot.subgenre, '男频都市逆袭')
  assert.equal(snapshot.currentEpisode, 3)
  assert.equal(snapshot.totalEpisodes, 20)
  assert.equal(snapshot.protagonistState.statusSummary, '翻身逆袭')
  assert.equal(snapshot.protagonistState.emotionalArc, '爽感')
  assert.equal(snapshot.antagonistState.statusSummary, '打压张三')
  assert.equal(snapshot.antagonistState.currentGoal, '打压张三')
  assert.equal(snapshot.relationshipState.keyRelationship, '底层翻身')
  assert.equal(snapshot.relationshipState.currentTension, '主角被陷害')
  assert.equal(snapshot.previousEpisodeEnding, '无（本集为第1集或上一集成稿未生成）')
})

test('buildStoryStateSnapshot resolves previous episode ending from existingScript', () => {
  const existingScript: ScriptSegmentDto[] = [
    { sceneNo: 2, screenplay: '第2集\n2-1 日\n人物：张三，李四\n△张三发现证据。\n张三：找到了。\n李四：不可能。', action: '', dialogue: '', emotion: '' }
  ]

  const snapshot = buildStoryStateSnapshot({
    projectId: 'proj-1',
    outlineTitle: '测试短剧',
    outline: mockOutline,
    characters: mockCharacters,
    episodeNo: 3,
    targetEpisodes: 20,
    existingScript
  })

  assert.ok(snapshot.previousEpisodeEnding.includes('不可能'))
})

test('buildStoryStateSnapshot limits hooks to max 5', () => {
  const ledgerWithManyHooks: ScriptStateLedgerDto = {
    ...mockLedger,
    storyMomentum: {
      ...mockLedger.storyMomentum,
      previousCliffhanger: 'hook1'
    }
  }

  const snapshot = buildStoryStateSnapshot({
    projectId: 'proj-1',
    outlineTitle: '测试短剧',
    outline: mockOutline,
    characters: mockCharacters,
    episodeNo: 3,
    targetEpisodes: 20,
    ledger: ledgerWithManyHooks,
    scriptControlPackage: {
      shortDramaConstitution: null,
      episodeControlPlans: [
        {
          episodeNo: 3,
          episodeControlCard: {
            episodeMission: '',
            openingBomb: '',
            conflictUpgrade: '',
            arcBeat: '',
            emotionBeat: '',
            hookLanding: '',
            povConstraint: '',
            forbiddenDrift: [],
            retentionCliffhanger: '留客钩子',
            twistPoint: '反转点',
            signatureLineSeed: '金句种子'
          }
        }
      ]
    }
  })

  assert.ok(snapshot.unresolvedHooks.length <= 5)
  assert.ok(snapshot.activeForeshadowing.length <= 5)
})

test('buildStoryStateSnapshotPromptBlock renders all sections', () => {
  const snapshot = buildStoryStateSnapshot({
    projectId: 'proj-1',
    outlineTitle: '测试短剧',
    storyIntent: mockStoryIntent,
    outline: mockOutline,
    characters: mockCharacters,
    episodeNo: 3,
    targetEpisodes: 20,
    ledger: mockLedger,
    scriptControlPackage: {
      shortDramaConstitution: null,
      episodeControlPlans: [
        {
          episodeNo: 3,
          episodeControlCard: {
            episodeMission: '',
            openingBomb: '',
            conflictUpgrade: '',
            arcBeat: '',
            emotionBeat: '',
            hookLanding: '',
            povConstraint: '',
            forbiddenDrift: [],
            requiredProp: 'U盘',
            villainPressure: '高压',
            twistPoint: '关键反转',
            signatureLineSeed: '金句种子'
          }
        }
      ]
    }
  })

  const block = buildStoryStateSnapshotPromptBlock(snapshot)

  assert.ok(block.includes('【故事状态快照】'))
  assert.ok(block.includes('proj-1'))
  assert.ok(block.includes('male'))
  assert.ok(block.includes('第 3 集 / 共 20 集'))
  assert.ok(block.includes('【主角状态】'))
  assert.ok(block.includes('【反派状态】'))
  assert.ok(block.includes('【关系张力】'))
  assert.ok(block.includes('【当前道具】'))
  assert.ok(block.includes('U盘'))
  assert.ok(block.includes('【未兑现钩子】'))
  assert.ok(block.includes('【活跃伏笔】'))
  assert.ok(block.includes('【连续性约束】'))
  assert.ok(block.includes('【上一集落点】'))
})

test('buildStoryStateSnapshot handles missing optional fields gracefully', () => {
  const snapshot = buildStoryStateSnapshot({
    projectId: '',
    outlineTitle: '',
    outline: mockOutline,
    characters: [],
    episodeNo: 1,
    targetEpisodes: 10
  })

  assert.equal(snapshot.projectId, 'unknown')
  assert.equal(snapshot.audienceLane, 'unknown')
  assert.equal(snapshot.subgenre, 'unknown')
  assert.equal(snapshot.protagonistState.statusSummary, '待补')
  assert.equal(snapshot.antagonistState.statusSummary, '待补')
  assert.deepEqual(snapshot.activeProps, [])
  assert.deepEqual(snapshot.unresolvedHooks, [])
  assert.deepEqual(snapshot.activeForeshadowing, [])
  assert.deepEqual(snapshot.continuityConstraints, [])
})
