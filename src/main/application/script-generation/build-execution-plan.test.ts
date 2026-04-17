import test from 'node:test'
import assert from 'node:assert/strict'
import { buildScriptGenerationExecutionPlan } from './build-execution-plan.ts'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto,
  FormalFact
} from '../../../shared/contracts/workflow.ts'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake.ts'

function createMinimalOutline(): OutlineDraftDto {
  return {
    title: '修仙传',
    genre: '玄幻修仙',
    theme: '不争',
    mainConflict: '黎明被逼亮底',
    protagonist: '黎明',
    summary: '李科拿小柔逼黎明亮底。',
    summaryEpisodes: [{ episodeNo: 1, summary: '李科逼黎明亮底。' }],
    facts: []
  }
}

function createOutlineWithConfirmedFact(): OutlineDraftDto {
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
    ...createMinimalOutline(),
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

function createSegmentsWithContent(): DetailedOutlineSegmentDto[] {
  return [
    {
      act: 'opening',
      title: '开局',
      content: '黎明在闹市低调行走，钥匙归他管。',
      hookType: '悬念',
      episodeBeats: [
        {
          episodeNo: 1,
          summary: '李科堵门逼黎明亮底。',
          sceneByScene: [
            {
              sceneNo: 1,
              location: '旧屋',
              timeOfDay: '夜',
              setup: '李科堵门。',
              tension: '黎明被逼亮底。',
              hookEnd: '门闩当场断裂。'
            }
          ],
          episodeControlCard: {
            episodeMission: '第1集必须先炸场。',
            openingBomb: '开场先把李科堵门甩脸上。',
            conflictUpgrade: '把小柔威胁压进门口。',
            arcBeat: '黎明先忍再反咬。',
            emotionBeat: '爽感持续兑现',
            hookLanding: '门闩断裂后局面翻面。',
            povConstraint: '单主角视角。',
            forbiddenDrift: ['不要解释世界观']
          }
        }
      ]
    },
    {
      act: 'midpoint',
      title: '冲突',
      content: '李科拿小柔威胁黎明，钥匙归属成焦点。',
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
    dramaticMovement: [],
    shortDramaConstitution: {
      corePrinciple: '快节奏、强冲突、稳情绪',
      coreEmotion: '爽感持续兑现',
      incitingIncident: {
        timingRequirement: '30 秒炸场，最晚不超过第 1 集结尾',
        disruption: '李科堵门逼黎明亮底。',
        mainLine: '黎明必须当场反咬。'
      },
      protagonistArc: {
        flawBelief: '一直忍就能护住人。',
        growthMode: '被逼后改成抢先反咬。',
        payoff: '把压迫打回去。'
      },
      povPolicy: {
        mode: 'single_protagonist',
        allowedAuxiliaryViewpoints: ['李科'],
        restriction: '默认单主角视角。'
      },
      climaxPolicy: {
        episodeHookRule: '集尾必须留强钩子。',
        finalePayoffRule: '结局总爆发。',
        callbackRequirement: '回打开篇堵门。'
      }
    }
  }
}

// =============================================================================
// TESTS: buildScriptGenerationExecutionPlan ready/blockedBy semantics
// =============================================================================

test('plan returns ready:false and blockedBy when segments are missing', () => {
  const context = {
    storyIntent: createStoryIntent(),
    outline: createOutlineWithConfirmedFact(),
    characters: createCompleteCharacters(),
    segments: [],
    script: createEmptyScript()
  }

  const plan = buildScriptGenerationExecutionPlan(context)

  assert.equal(plan.ready, false, 'plan should NOT be ready when segments are missing')
  const codes = plan.blockedBy.map((i) => i.code)
  assert.ok(
    codes.includes('script_segment_missing'),
    `blockedBy should include script_segment_missing, got: ${codes.join(', ')}`
  )
})

test('plan returns ready:false and blockedBy when formal facts are missing', () => {
  const context = {
    storyIntent: createStoryIntent(),
    outline: createMinimalOutline(), // no confirmed facts
    characters: createCompleteCharacters(),
    segments: createSegmentsWithContent(),
    script: createEmptyScript()
  }

  const plan = buildScriptGenerationExecutionPlan(context)

  assert.equal(plan.ready, false, 'plan should NOT be ready when formal facts are missing')
  const codes = plan.blockedBy.map((i) => i.code)
  assert.ok(
    codes.includes('script_formal_fact_missing'),
    `blockedBy should include script_formal_fact_missing, got: ${codes.join(', ')}`
  )
})

test('plan returns ready:false and blockedBy when characters are missing', () => {
  const context = {
    storyIntent: createStoryIntent(),
    outline: createOutlineWithConfirmedFact(),
    characters: [], // no characters
    segments: createSegmentsWithContent(),
    script: createEmptyScript()
  }

  const plan = buildScriptGenerationExecutionPlan(context)

  assert.equal(plan.ready, false, 'plan should NOT be ready when characters are missing')
  const codes = plan.blockedBy.map((i) => i.code)
  assert.ok(
    codes.includes('script_character_missing'),
    `blockedBy should include script_character_missing, got: ${codes.join(', ')}`
  )
})

test('plan returns ready:false when formal facts not landed in segments', () => {
  // Outline has confirmed fact about "钥匙归属" but segments don't mention it
  const outlineWithUnlandedFact: OutlineDraftDto = {
    ...createOutlineWithConfirmedFact(),
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
  const context = {
    storyIntent: createStoryIntent(),
    outline: outlineWithUnlandedFact,
    characters: createCompleteCharacters(),
    // Segments don't mention "钥匙归属"
    segments: [
      {
        act: 'opening' as const,
        title: '开局',
        content: '黎明在闹市低调行走。',
        hookType: '悬念'
      },
      {
        act: 'midpoint' as const,
        title: '冲突',
        content: '李科出现，与黎明对峙。',
        hookType: '冲突'
      }
    ],
    script: createEmptyScript()
  }

  const plan = buildScriptGenerationExecutionPlan(context)

  assert.equal(
    plan.ready,
    false,
    'plan should NOT be ready when formal facts are not landed in segments'
  )
  const codes = plan.blockedBy.map((i) => i.code)
  assert.ok(
    codes.includes('script_formal_fact_segment_missing'),
    `blockedBy should include script_formal_fact_segment_missing, got: ${codes.join(', ')}`
  )
})

test('plan returns ready:true and empty blockedBy when all upstream is complete', () => {
  // Create segments that land the formal fact "钥匙归属"
  const outlineWithFact = createOutlineWithConfirmedFact()
  const context = {
    storyIntent: createStoryIntent(),
    outline: outlineWithFact,
    characters: createCompleteCharacters(),
    // Segments mention the confirmed fact "钥匙归属"
    segments: [
      {
        act: 'opening' as const,
        title: '开局',
        content: '黎明在闹市低调行走，钥匙归他管，是玄玉宫信物。',
        hookType: '悬念'
      },
      {
        act: 'midpoint' as const,
        title: '冲突',
        content: '李科拿小柔威胁黎明，钥匙归属成为焦点。',
        hookType: '冲突'
      }
    ],
    script: createEmptyScript()
  }

  const plan = buildScriptGenerationExecutionPlan(context)

  assert.equal(plan.ready, true, 'plan should be ready when all upstream is complete')
  assert.deepEqual(plan.blockedBy, [], 'blockedBy should be empty when ready')
})

test('plan carries explicit script control package for runtime consumption', () => {
  const context = {
    storyIntent: createStoryIntent(),
    outline: createOutlineWithConfirmedFact(),
    characters: createCompleteCharacters(),
    segments: createSegmentsWithContent(),
    script: createEmptyScript()
  }

  const plan = buildScriptGenerationExecutionPlan(context)

  assert.equal(
    plan.scriptControlPackage?.shortDramaConstitution?.corePrinciple,
    '快节奏、强冲突、稳情绪'
  )
  assert.equal(plan.scriptControlPackage?.episodeControlPlans[0]?.episodeNo, 1)
  assert.equal(
    plan.scriptControlPackage?.episodeControlPlans[0]?.episodeControlCard?.episodeMission,
    '第1集必须先炸场。'
  )
})

test('blockedBy contains multiple issue codes when multiple upstream problems exist', () => {
  // Missing both segments AND characters
  const context = {
    storyIntent: createStoryIntent(),
    outline: createMinimalOutline(), // no confirmed facts
    characters: [], // no characters
    segments: [], // no segments
    script: createEmptyScript()
  }

  const plan = buildScriptGenerationExecutionPlan(context)

  assert.equal(plan.ready, false)
  const codes = plan.blockedBy.map((i) => i.code)
  // Should collect multiple distinct issues
  assert.ok(codes.length >= 3, `should have at least 3 issues, got: ${codes.length}`)
  assert.ok(codes.includes('script_segment_missing'))
  assert.ok(codes.includes('script_character_missing'))
  assert.ok(codes.includes('script_formal_fact_missing'))
})
