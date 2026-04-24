import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectStoryContinuityAgainstSnapshot } from './screenplay-continuity-audit.ts'
import type { StoryStateSnapshotDto } from '../../contracts/story-state'
import type { ScriptSegmentDto } from '../../contracts/workflow'

function makeSnapshot(overrides?: Partial<StoryStateSnapshotDto>): StoryStateSnapshotDto {
  return {
    projectId: 'proj-1',
    audienceLane: 'male',
    subgenre: '都市逆袭',
    currentEpisode: 3,
    totalEpisodes: 20,
    protagonistState: {
      statusSummary: '翻身逆袭',
      emotionalArc: '爽感'
    },
    antagonistState: {
      statusSummary: '打压张三',
      threatLevel: '高压',
      currentGoal: '打压张三'
    },
    relationshipState: {
      keyRelationship: '底层翻身',
      currentTension: '主角被陷害'
    },
    activeProps: [],
    unresolvedHooks: [],
    activeForeshadowing: [],
    continuityConstraints: [],
    previousEpisodeEnding: '张三发现关键证据',
    ...overrides
  }
}

function makeScene(screenplay: string): ScriptSegmentDto {
  return {
    sceneNo: 3,
    screenplay,
    action: '',
    dialogue: '',
    emotion: ''
  }
}

test('empty screenplay returns score 0', () => {
  const result = inspectStoryContinuityAgainstSnapshot({
    snapshot: makeSnapshot(),
    scene: makeScene('')
  })
  assert.equal(result.score, 0)
  assert.equal(result.issues.length, 1)
  assert.equal(result.issues[0].category, 'hard_constraint')
})

test('perfect continuity returns score 100', () => {
  const screenplay = `第3集
3-1 日 办公室
人物：张三，李四
△张三握紧拳头，决心翻身逆袭。
张三：我不会再忍下去了，心中怒火燃烧。
李四冷笑着逼近。
李四：你以为你能逃出我的手掌心？我今天就打压你到底。
△张三感受到高压威胁，但眼中闪过爽感。`

  const result = inspectStoryContinuityAgainstSnapshot({
    snapshot: makeSnapshot(),
    scene: makeScene(screenplay)
  })
  assert.equal(result.score, 100)
  assert.equal(result.issues.length, 0)
})

test('detects missing protagonist goal', () => {
  const screenplay = `第3集
3-1 日
人物：张三
△张三坐在椅子上发呆。`

  const result = inspectStoryContinuityAgainstSnapshot({
    snapshot: makeSnapshot({ protagonistState: { statusSummary: '寻找秘籍', emotionalArc: '迷茫' } }),
    scene: makeScene(screenplay)
  })

  const issue = result.issues.find((i) => i.detail.includes('主角状态'))
  assert.ok(issue)
  assert.equal(issue.category, 'character_state')
  assert.equal(issue.severity, 'medium')
})

test('detects missing antagonist goal', () => {
  const screenplay = `第3集
3-1 日
人物：张三
△张三独自练功。`

  const result = inspectStoryContinuityAgainstSnapshot({
    snapshot: makeSnapshot({
      antagonistState: { statusSummary: '夺取权力', threatLevel: '待补', currentGoal: '夺取权力' }
    }),
    scene: makeScene(screenplay)
  })

  const issue = result.issues.find((i) => i.detail.includes('反派目标'))
  assert.ok(issue)
  assert.equal(issue.category, 'character_state')
  assert.equal(issue.severity, 'medium')
})

test('detects prop continuity violation - missing prop', () => {
  const screenplay = `第3集
3-1 日
人物：张三
△张三走进房间。`

  const result = inspectStoryContinuityAgainstSnapshot({
    snapshot: makeSnapshot({
      activeProps: [{ name: 'U盘', status: 'held' }]
    }),
    scene: makeScene(screenplay)
  })

  const issue = result.issues.find((i) => i.category === 'prop_continuity')
  assert.ok(issue)
  assert.equal(issue.severity, 'high')
  assert.ok(issue.detail.includes('U盘'))
})

test('detects prop continuity violation - lost prop still used', () => {
  const screenplay = `第3集
3-1 日
人物：张三
△张三拿出U盘，插入电脑。`

  const result = inspectStoryContinuityAgainstSnapshot({
    snapshot: makeSnapshot({
      activeProps: [{ name: 'U盘', status: 'lost' }]
    }),
    scene: makeScene(screenplay)
  })

  const issue = result.issues.find((i) => i.category === 'prop_continuity')
  assert.ok(issue)
  assert.equal(issue.severity, 'high')
  assert.ok(issue.detail.includes('丢失'))
})

test('prop present in screenplay is ok', () => {
  const screenplay = `第3集
3-1 日
人物：张三，李四
△张三握紧U盘，决心翻身逆袭。
李四：我要打压你。
△张三想起被跟踪的事。`

  const result = inspectStoryContinuityAgainstSnapshot({
    snapshot: makeSnapshot({
      activeProps: [{ name: 'U盘', status: 'held' }],
      unresolvedHooks: ['张三被跟踪']
    }),
    scene: makeScene(screenplay)
  })

  const issue = result.issues.find((i) => i.category === 'prop_continuity')
  assert.equal(issue, undefined)
  // 不追求完美 100 分，只要道具连续性没问题即可
  assert.ok(result.score >= 80)
})

test('detects hook not continued', () => {
  const screenplay = `第3集
3-1 日
人物：张三
△张三开始新的一天。`

  const result = inspectStoryContinuityAgainstSnapshot({
    snapshot: makeSnapshot({
      unresolvedHooks: ['张三被神秘人跟踪']
    }),
    scene: makeScene(screenplay)
  })

  const issue = result.issues.find((i) => i.category === 'hook_continuation')
  assert.ok(issue)
  assert.equal(issue.severity, 'high')
  assert.ok(issue.detail.includes('跟踪'))
})

test('hook continued when keywords appear', () => {
  const screenplay = `第3集
3-1 日
人物：张三，李四
△张三发现那个神秘人还在跟踪自己，怒火中烧。
李四冷笑：你以为能逃出我的手掌心？我高压封锁。`

  const result = inspectStoryContinuityAgainstSnapshot({
    snapshot: makeSnapshot({
      unresolvedHooks: ['张三被神秘人跟踪']
    }),
    scene: makeScene(screenplay)
  })

  const issue = result.issues.find((i) => i.category === 'hook_continuation')
  assert.equal(issue, undefined)
  // 不追求完美 100 分，只要钩子接续没问题即可
  assert.ok(result.score >= 80)
})

test('detects villain progression mismatch', () => {
  const screenplay = `第3集
3-1 日
人物：张三，李四
△李四温柔地对张三笑。
李四：今天天气真好。`

  const result = inspectStoryContinuityAgainstSnapshot({
    snapshot: makeSnapshot({
      antagonistState: { statusSummary: '打压', threatLevel: '高压', currentGoal: '打压' }
    }),
    scene: makeScene(screenplay)
  })

  const issue = result.issues.find((i) => i.category === 'villain_progression')
  assert.ok(issue)
  assert.equal(issue.severity, 'medium')
})

test('detects hard constraint violation', () => {
  const screenplay = `第3集
3-1 日
人物：王五
△王五醒来，开始说话。`

  const result = inspectStoryContinuityAgainstSnapshot({
    snapshot: makeSnapshot({
      continuityConstraints: ['王五已死']
    }),
    scene: makeScene(screenplay)
  })

  const issue = result.issues.find((i) => i.category === 'hard_constraint')
  assert.ok(issue)
  assert.equal(issue.severity, 'high')
  assert.ok(issue.detail.includes('王五'))
})

test('no hard constraint violation when subject absent', () => {
  const screenplay = `第3集
3-1 日
人物：张三
△张三独自行动。`

  const result = inspectStoryContinuityAgainstSnapshot({
    snapshot: makeSnapshot({
      continuityConstraints: ['王五已死']
    }),
    scene: makeScene(screenplay)
  })

  const issue = result.issues.find((i) => i.category === 'hard_constraint')
  assert.equal(issue, undefined)
})

test('category summary counts issues correctly', () => {
  const screenplay = `第3集
3-1 日
人物：张三
△张三走进房间。`

  const result = inspectStoryContinuityAgainstSnapshot({
    snapshot: makeSnapshot({
      activeProps: [{ name: 'U盘', status: 'held' }],
      unresolvedHooks: ['上一集钩子']
    }),
    scene: makeScene(screenplay)
  })

  assert.ok(result.categorySummary['prop_continuity'])
  assert.equal(result.categorySummary['prop_continuity'].count, 1)
  assert.ok(result.categorySummary['hook_continuation'])
  assert.equal(result.categorySummary['hook_continuation'].count, 1)
})

test('score is capped at 0 even with many issues', () => {
  const screenplay = `第3集
3-1 日
人物：张三
△张三走进房间。`

  const result = inspectStoryContinuityAgainstSnapshot({
    snapshot: makeSnapshot({
      activeProps: [
        { name: 'U盘', status: 'held' },
        { name: '钥匙', status: 'held' },
        { name: '信', status: 'held' }
      ],
      unresolvedHooks: ['钩子1', '钩子2', '钩子3', '钩子4', '钩子5'],
      continuityConstraints: ['约束1', '约束2', '约束3']
    }),
    scene: makeScene(screenplay)
  })

  assert.equal(result.score, 0)
  assert.ok(result.issues.length >= 5)
})
