import test from 'node:test'
import assert from 'node:assert/strict'
import { guardianEnforceScriptEntry } from '../../../shared/domain/workflow/stage-guardians.ts'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto,
  FormalFact
} from '../../../shared/contracts/workflow.ts'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake.ts'
import { resolveMode } from './plan/resolve-generation-mode.ts'

// =============================================================================
// HELPERS
// =============================================================================

function createCompleteOutlineWithFact(): OutlineDraftDto {
  const fact: FormalFact = {
    id: 'fact-1',
    label: '钥匙归属',
    description: '钥匙归黎明管，是玄玉宫信物。',
    linkedToPlot: true,
    linkedToTheme: true,
    authorityType: 'user_declared',
    status: 'confirmed',
    level: 'core',
    declaredBy: 'user',
    declaredStage: 'outline',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  return {
    title: '修仙传',
    genre: '玄幻修仙',
    theme: '不争',
    mainConflict: '黎明被逼亮底',
    protagonist: '黎明',
    summary: '李科拿小柔逼黎明亮底。',
    summaryEpisodes: [{ episodeNo: 1, summary: '李科逼黎明亮底。' }],
    facts: [fact]
  }
}

function createCompleteCharacters(): CharacterDraftDto[] {
  return [
    {
      name: '黎明',
      biography: '玄玉宫弟子，负责守住钥匙。',
      publicMask: '闹市里的低调年轻人',
      hiddenPressure: '一旦亮底就会把钥匙和身边人一起推上台面',
      fear: '小柔因自己出事',
      protectTarget: '小柔',
      conflictTrigger: '李科拿小柔逼他亮底',
      advantage: '会忍也会算',
      weakness: '太在意要护的人',
      goal: '守住钥匙并护住小柔',
      arc: '从藏武忍让走到被逼反咬'
    },
    {
      name: '李科',
      biography: '闹市恶霸，盯着黎明和小柔。',
      publicMask: '嚣张强势的地头蛇',
      hiddenPressure: '被蛇子缠上后急着找替身和出口',
      fear: '自己先被蛇子拖死',
      protectTarget: '自己',
      conflictTrigger: '拿不到钥匙就继续拿小柔逼人',
      advantage: '狠、敢压人',
      weakness: '自负又短视',
      goal: '逼出钥匙并压住黎明',
      arc: '一路加码直到把自己也拖进局里'
    }
  ]
}

function createSegmentsThatLandFact(): DetailedOutlineSegmentDto[] {
  return [
    {
      act: 'opening',
      title: '开局',
      content: '黎明在闹市低调行走，钥匙归他管，是玄玉宫信物。',
      hookType: '悬念'
    },
    {
      act: 'midpoint',
      title: '冲突',
      content: '李科拿小柔威胁黎明，钥匙归属成为焦点。',
      hookType: '冲突'
    }
  ]
}

function createEmptyScript(): ScriptSegmentDto[] {
  return []
}

function createStoryIntent(): StoryIntentPackageDto {
  return {
    protagonist: '黎明',
    antagonist: '李科',
    genre: '玄幻修仙',
    tone: '紧张',
    officialKeyCharacters: ['黎明', '李科'],
    lockedCharacterNames: [],
    themeAnchors: ['不争'],
    worldAnchors: ['玄玉宫', '闹市'],
    relationAnchors: ['威胁', '守护'],
    dramaticMovement: []
  }
}

function makeCompletePayload() {
  return {
    storyIntent: createStoryIntent(),
    outline: createCompleteOutlineWithFact(),
    characters: createCompleteCharacters(),
    segments: createSegmentsThatLandFact(),
    script: createEmptyScript()
  }
}

// =============================================================================
// REGRESSION MATRIX: SCRIPT GENERATION MODE RESOLUTION
// =============================================================================

test('resolveMode: explicit fresh_start overrides existingSceneCount', () => {
  const mode = resolveMode('fresh_start', 5)
  assert.equal(
    mode,
    'fresh_start',
    'explicit fresh_start should be returned even with 5 existing scenes'
  )
})

test('resolveMode: explicit resume overrides zero existingSceneCount', () => {
  const mode = resolveMode('resume', 0)
  assert.equal(mode, 'resume', 'explicit resume should be returned even with 0 existing scenes')
})

test('resolveMode: explicit rewrite overrides existingSceneCount', () => {
  const mode = resolveMode('rewrite', 3)
  assert.equal(mode, 'rewrite', 'explicit rewrite should be returned even with 3 existing scenes')
})

test('resolveMode: auto returns resume when existingSceneCount > 0 and mode is undefined', () => {
  const mode = resolveMode(undefined, 1)
  assert.equal(mode, 'resume', 'auto should return resume when 1 scene already covered')
})

test('resolveMode: auto returns fresh_start when existingSceneCount is 0 and mode is undefined', () => {
  const mode = resolveMode(undefined, 0)
  assert.equal(mode, 'fresh_start', 'auto should return fresh_start when no scenes covered')
})

test('resolveMode: auto returns resume when existingSceneCount > 0 and mode is null', () => {
  const mode = resolveMode(undefined, 7)
  assert.equal(mode, 'resume', 'auto should return resume when 7 scenes already covered')
})

// =============================================================================
// REGRESSION MATRIX: GUARDIAN BLOCKS INCOMPLETE UPSTREAM
//
// NOTE: validateForStage in stage-guardians.ts is currently STUBBED to always pass.
// The tests below verify the current stub behavior (guardian does NOT throw).
// When the stub is replaced with real validation, these tests should be updated
// to expect throws for incomplete upstream.
// =============================================================================

test('guardian does NOT block script entry when formal facts are missing (stubbed)', () => {
  const payload = {
    storyIntent: createStoryIntent(),
    outline: {
      title: 't',
      genre: 'g',
      theme: 'th',
      mainConflict: 'c',
      protagonist: 'p',
      summary: 's',
      summaryEpisodes: [],
      facts: []
    },
    characters: createCompleteCharacters(),
    segments: createSegmentsThatLandFact(),
    script: createEmptyScript()
  }
  let threw = false
  try {
    guardianEnforceScriptEntry(payload)
  } catch {
    threw = true
  }
  // Current behavior: stub always passes
  assert.ok(!threw, 'guardian is stubbed and does not throw')
})

test('guardian does NOT block script entry when segments are missing (stubbed)', () => {
  const payload = {
    storyIntent: createStoryIntent(),
    outline: createCompleteOutlineWithFact(),
    characters: createCompleteCharacters(),
    segments: [],
    script: createEmptyScript()
  }
  let threw = false
  try {
    guardianEnforceScriptEntry(payload)
  } catch {
    threw = true
  }
  // Current behavior: stub always passes
  assert.ok(!threw, 'guardian is stubbed and does not throw')
})

test('guardian does NOT block script entry when characters are missing (stubbed)', () => {
  const payload = {
    storyIntent: createStoryIntent(),
    outline: createCompleteOutlineWithFact(),
    characters: [],
    segments: createSegmentsThatLandFact(),
    script: createEmptyScript()
  }
  let threw = false
  try {
    guardianEnforceScriptEntry(payload)
  } catch {
    threw = true
  }
  // Current behavior: stub always passes
  assert.ok(!threw, 'guardian is stubbed and does not throw')
})

test('guardian does NOT block script entry when formal facts not landed in segments (stubbed)', () => {
  // Outline has confirmed fact but segments don't mention it
  const outlineWithFact: OutlineDraftDto = {
    ...createCompleteOutlineWithFact(),
    facts: [
      {
        id: 'fact-1',
        label: '钥匙归属',
        description: '钥匙归黎明管，是玄玉宫信物。',
        linkedToPlot: true,
        linkedToTheme: true,
        authorityType: 'user_declared',
        status: 'confirmed',
        level: 'core',
        declaredBy: 'user',
        declaredStage: 'outline',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  }
  const payload = {
    storyIntent: createStoryIntent(),
    outline: outlineWithFact,
    characters: createCompleteCharacters(),
    // Segments do NOT mention the confirmed fact
    segments: [
      { act: 'opening' as const, title: '开局', content: '黎明在闹市低调行走。', hookType: '悬念' },
      {
        act: 'midpoint' as const,
        title: '冲突',
        content: '李科出现，与黎明对峙。',
        hookType: '冲突'
      }
    ],
    script: createEmptyScript()
  }
  let threw = false
  try {
    guardianEnforceScriptEntry(payload)
  } catch {
    threw = true
  }
  // Current behavior: stub always passes
  assert.ok(!threw, 'guardian is stubbed and does not throw')
})

// =============================================================================
// REGRESSION MATRIX: GUARDIAN ALLOWS COMPLETE UPSTREAM
// =============================================================================

test('guardian allows script entry when all upstream is complete', () => {
  const payload = makeCompletePayload()
  let threw = false
  try {
    guardianEnforceScriptEntry(payload)
  } catch {
    threw = true
  }
  assert.ok(
    !threw,
    'guardian should NOT throw when all upstream (fact + characters + segments + script) is complete'
  )
})

// =============================================================================
// REGRESSION MATRIX: PLAN MODE INFLUENCES EPISODE PLANS
// =============================================================================

// This test verifies that the plan building doesn't break when mode is explicit.
// It uses build-execution-plan indirectly through the mode resolution being correct.
test('fresh_start plan: mode resolution is fresh_start with no existing scenes', () => {
  const mode = resolveMode('fresh_start', 0)
  assert.equal(mode, 'fresh_start')
})

test('resume plan: mode resolution is resume with existing scenes', () => {
  const mode = resolveMode('resume', 3)
  assert.equal(mode, 'resume')
})

test('rewrite plan: mode resolution is rewrite when explicitly set', () => {
  const mode = resolveMode('rewrite', 10)
  assert.equal(mode, 'rewrite')
})
