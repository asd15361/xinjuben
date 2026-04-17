import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSceneProgressionDirectives } from './build-scene-progression-directives.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build minimal ScriptSegmentDto with episodeNo (added at runtime)
// ─────────────────────────────────────────────────────────────────────────────

function makeScene(
  episodeNo: number,
  action = `action ep${episodeNo}`
): { sceneNo: number; episodeNo: number; action: string; dialogue: string; emotion: string } {
  return {
    sceneNo: episodeNo,
    episodeNo,
    action,
    dialogue: `dialogue ${episodeNo}`,
    emotion: `emotion ${episodeNo}`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test: rewrite + overflow — must use episodeNo-1/-2, not array tail
// ─────────────────────────────────────────────────────────────────────────────

test('buildSceneProgressionDirectives: rewrite+overflow ignores episodes beyond target', () => {
  // Simulate rw-b seed: 10 valid episodes + 2 overflow
  const existingScript = [
    ...Array.from({ length: 10 }, (_, i) => makeScene(i + 1)),
    // overflow episodes (episodeNo > 10)
    makeScene(11, '林守钥走了一段路'),
    makeScene(12, '有人来了')
  ]

  // For episode 10, the directives should reference episodes 9 and 8,
  // NOT episodes 11 and 12 (the overflow tail)
  const directives = buildSceneProgressionDirectives({
    existingScript,
    episodeNo: 10,
    targetEpisodes: 10
  })

  const joined = directives.join(' ')

  // Must reference the correct previous episodes (9 and 8), not overflow (11 and 12)
  assert.match(joined, /action ep9/, 'should reference episode 9')
  assert.match(joined, /action ep8/, 'should reference episode 8')
  // Must NOT use overflow episodes as context
  assert.doesNotMatch(
    joined,
    /林守钥走了一段路/,
    'must not use overflow episode 11 as previous scene'
  )
  assert.doesNotMatch(
    joined,
    /有人来了/,
    'must not use overflow episode 12 as previous-previous scene'
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// Test: normal resume — uses episodeNo-1/-2 from existingScript
// ─────────────────────────────────────────────────────────────────────────────

test('buildSceneProgressionDirectives: resume uses episodeNo-1/-2 correctly', () => {
  const existingScript = [makeScene(1), makeScene(2, '上一场动作'), makeScene(3, '当前集')]

  const directives = buildSceneProgressionDirectives({
    existingScript,
    episodeNo: 3,
    targetEpisodes: 5
  })

  const joined = directives.join(' ')

  assert.match(joined, /上一场动作/, 'latestSummary should be episode 2')
  assert.match(joined, /action ep1/, 'previousSummary should be episode 1')
  assert.match(joined, /如果上一场核心压法已经是绑人、刀抵喉、当众逼交钥匙/, 'must guard against repeating hostage pressure loops')
  assert.match(joined, /如果上一场已经在合议、押送、对质或问责里落锤/, 'must force tribunal scenes to hand off to off-site action')
  assert.match(joined, /如果上一场刚是执事、长老、公审或合议落锤，本场第一句不准再由他们开口/, 'must force private action to open after institutional beats')
  assert.match(joined, /如果本场是包扎、换药、躲藏、歇脚或潭边喘口气，也必须顺手推进账册、钥匙、碎片、追兵、换路或伤势代价之一/, 'must prevent healing/rest scenes from turning into theme explanation scenes')
})

// ─────────────────────────────────────────────────────────────────────────────
// Test: episodeNo 1 returns empty (no previous scene)
// ─────────────────────────────────────────────────────────────────────────────

test('buildSceneProgressionDirectives: episode 1 returns empty array', () => {
  const result = buildSceneProgressionDirectives({
    existingScript: [makeScene(1)],
    episodeNo: 1,
    targetEpisodes: 10
  })
  assert.equal(result.length, 0)
})

// ─────────────────────────────────────────────────────────────────────────────
// Test: missing previous episode — falls back to "待补"
// ─────────────────────────────────────────────────────────────────────────────

test('buildSceneProgressionDirectives: missing episodeNo-1 falls back to 待补', () => {
  const existingScript = [makeScene(3)] // only episode 3 exists

  const directives = buildSceneProgressionDirectives({
    existingScript,
    episodeNo: 3,
    targetEpisodes: 10
  })

  const joined = directives.join(' ')
  assert.match(joined, /上一场待补/, 'should fall back to 待补 when episode 2 not found')
})

// ─────────────────────────────────────────────────────────────────────────────
// Test: batch rolling — ep2 in current batch sees ep1 from generatedScenes (not stale existingScript)
// ─────────────────────────────────────────────────────────────────────────────

test('buildSceneProgressionDirectives: batch rolling — ep2 uses ep1 from generatedScenes', () => {
  // existingScript has old ep1 "旧版第1集动作"
  // generatedScenes has fresh ep1 "新版第1集动作" (just generated in this batch)
  // ep2 must use the NEW ep1, not the stale one from existingScript
  const existingScript = [makeScene(1, '旧版第1集动作')]
  const generatedScenes = [makeScene(1, '新版第1集动作')]

  const directives = buildSceneProgressionDirectives({
    existingScript,
    episodeNo: 2,
    targetEpisodes: 10,
    generatedScenes
  })

  const joined = directives.join(' ')

  // Must use the fresh episode 1 from generatedScenes
  assert.match(
    joined,
    /新版第1集动作/,
    'latestSummary must be episode 1 from generatedScenes (newest)'
  )
  // Must NOT use the stale episode 1 from existingScript
  assert.doesNotMatch(joined, /旧版第1集动作/, 'must NOT use stale episode 1 from existingScript')
})

// ─────────────────────────────────────────────────────────────────────────────
// Test: rewrite — old ep1 + new ep1 coexist, ep2 must use new ep1
// ─────────────────────────────────────────────────────────────────────────────

test('buildSceneProgressionDirectives: rewrite — prefers generated new ep1 over existing old ep1', () => {
  // In rewrite mode, existingScript may have old ep1 AND new ep1 simultaneously.
  // generatedScenes carries the NEW version; existingScript still has the old one.
  // When ep2 asks for "previous episode", it must get the NEW ep1, not the old.
  const existingScript = [
    makeScene(1, '旧版第1集'),
    makeScene(1, '新版第1集'), // duplicate episodeNo — this is the rewritten one
    makeScene(2, '第2集')
  ]
  const generatedScenes = [makeScene(1, '新版第1集')]

  const directives = buildSceneProgressionDirectives({
    existingScript,
    episodeNo: 2,
    targetEpisodes: 10,
    generatedScenes
  })

  const joined = directives.join(' ')

  // Must prefer the newest ep1 (from generatedScenes)
  assert.match(joined, /新版第1集/, 'latestSummary must be the new ep1 from generatedScenes')
  assert.doesNotMatch(
    joined,
    /旧版第1集/,
    'must NOT use old ep1 when new ep1 exists in generatedScenes'
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// Test: cross-batch rewrite — existingScript has [旧1,旧2,旧3, 新1,新2,新3]
// Episode 4 in second batch (generatedScenes=[]) must resolve to 新3/新2, not 旧3/旧2
// ─────────────────────────────────────────────────────────────────────────────

test('buildSceneProgressionDirectives: cross-batch rewrite uses newest episode version', () => {
  // First batch produced new ep1-3; second batch starts with existingScript containing
  // all 6 episodes (old first, then new from first batch).
  // When generating ep4, generatedScenes is empty (not in batch yet),
  // so resolution must fall back to existingScript and find the LAST occurrence
  // of each episodeNo — i.e. the new versions, not the old.
  const existingScript = [
    makeScene(1, '旧版第1集'),
    makeScene(2, '旧版第2集'),
    makeScene(3, '旧版第3集'),
    makeScene(1, '新版第1集'),
    makeScene(2, '新版第2集'),
    makeScene(3, '新版第3集')
  ]

  const directives = buildSceneProgressionDirectives({
    existingScript,
    episodeNo: 4,
    targetEpisodes: 10,
    generatedScenes: [] // second batch, no new episodes yet
  })

  const joined = directives.join(' ')

  // Must use the newest versions from the accumulated existingScript
  assert.match(joined, /新版第3集/, 'latestSummary must be 新版第3集 (newest ep3)')
  assert.match(joined, /新版第2集/, 'previousSummary must be 新版第2集 (newest ep2)')
  assert.doesNotMatch(joined, /旧版第3集/, 'must NOT use 旧版第3集')
  assert.doesNotMatch(joined, /旧版第2集/, 'must NOT use 旧版第2集')
})

test('buildSceneProgressionDirectives: production shape falls back to sceneNo when episodeNo is absent', () => {
  const existingScript = [
    {
      sceneNo: 1,
      screenplay: '第1集\n1-1 夜｜地点：旧屋\n人物：甲\n△第1集动作',
      action: '旧 action 1',
      dialogue: '旧 dialogue 1',
      emotion: '旧 emotion 1'
    },
    {
      sceneNo: 2,
      screenplay: '第2集\n2-1 夜｜地点：旧屋\n人物：乙\n△第2集动作',
      action: '旧 action 2',
      dialogue: '旧 dialogue 2',
      emotion: '旧 emotion 2'
    }
  ]

  const directives = buildSceneProgressionDirectives({
    existingScript,
    episodeNo: 3,
    targetEpisodes: 10
  })

  const joined = directives.join(' ')
  assert.match(joined, /第2集动作/, 'latestSummary must resolve episode 2 via sceneNo fallback')
  assert.match(joined, /第1集动作/, 'previousSummary must resolve episode 1 via sceneNo fallback')
  assert.doesNotMatch(joined, /上一场待补/, 'production-shape scenes should no longer lose continuity')
})

test('buildSceneProgressionDirectives: prefers screenplay summary over polluted A/D/E fields', () => {
  const existingScript = [
    {
      sceneNo: 1,
      screenplay: '第1集\n1-1 夜｜地点：旧屋\n人物：甲\n△真实可拍动作：钥匙掉进灰里。',
      action: 'Action: 待补',
      dialogue: 'Dialogue: 模板对白',
      emotion: 'Emotion: 待补'
    }
  ]

  const directives = buildSceneProgressionDirectives({
    existingScript,
    episodeNo: 2,
    targetEpisodes: 10
  })

  const joined = directives.join(' ')
  assert.match(joined, /真实可拍动作：钥匙掉进灰里/, 'must use screenplay-first summary')
  assert.doesNotMatch(joined, /模板对白/, 'must not feed polluted A/D/E residue back into continuity block')
})

test('buildSceneProgressionDirectives: clips prior screenplay instead of pasting whole episode', () => {
  const longLine = '△黎明带伤追查副本，撞开柴门后按住信使追问。'
  const existingScript = [
    {
      sceneNo: 18,
      screenplay: ['第18集', ...Array.from({ length: 18 }, () => longLine)].join('\n'),
      action: '旧 action',
      dialogue: '旧 dialogue',
      emotion: '旧 emotion'
    }
  ]

  const directives = buildSceneProgressionDirectives({
    existingScript,
    episodeNo: 19,
    targetEpisodes: 20
  })

  const latestLine = directives.find((line) => line.startsWith('上一场刚发生的戏：')) || ''
  assert.ok(latestLine.length < 240, 'previous-scene carryover should stay compact')
  assert.match(latestLine, /黎明带伤追查副本/, 'should retain the prior-scene gist')
})
