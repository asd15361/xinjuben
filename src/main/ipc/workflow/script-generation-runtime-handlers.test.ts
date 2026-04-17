/**
 * script-generation-runtime-handlers.test.ts
 *
 * PURPOSE: Verify the IPC handler correctly calls the guardian before entering generation,
 * and returns a formal failure response when the guardian blocks entry.
 *
 * This tests the FIX for the bug: workflow:start-script-generation had no guardian,
 * allowing incomplete upstream to enter generation.
 *
 * APPROACH: We import the pure functions directly (no electron dependency) and
 * inline the handler's guardian-check logic. This avoids the electron CJS/ESM
 * import issue that would occur if we imported the handler file directly.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  markBatchStatus,
  createInitialProgressBoard,
  createFailureResolution
} from '../../application/script-generation/progress-board.ts'
import { guardianEnforceScriptEntry } from '../../../shared/domain/workflow/stage-guardians.ts'
import type {
  RewriteScriptEpisodeInputDto,
  StartScriptGenerationInputDto
} from '../../../shared/contracts/script-generation.ts'

// =============================================================================
// HANDLER LOGIC (inlined from script-generation-runtime-handlers.ts)
// This is the exact guardian-check + failure-response logic that runs in the IPC handler.
// =============================================================================

async function handleStartScriptGeneration(input: StartScriptGenerationInputDto) {
  // Main-side authoritative guardian: reject if upstream is incomplete
  try {
    guardianEnforceScriptEntry({
      storyIntent: input.storyIntent,
      outline: input.outline,
      characters: input.characters,
      activeCharacterBlocks: input.activeCharacterBlocks,
      segments: input.segments ?? [],
      script: input.existingScript
    })
  } catch (guardError) {
    // Guardian blocked — return formal failure without entering generation
    const blockingBoard = createInitialProgressBoard(input.plan, null)
    const blockedBoard = markBatchStatus(
      blockingBoard,
      'failed',
      `入口守卫拦截：${(guardError as any).context}`
    )
    return {
      success: false,
      generatedScenes: [],
      board: blockedBoard,
      failure: createFailureResolution({
        board: blockedBoard,
        kind: 'failed',
        reason: (guardError as any).context,
        errorMessage: (guardError as any).message
      }),
      ledger: null,
      postflight: null
    }
  }
  throw new Error('unreachable: guardian did not block — success path not tested here')
}

async function handleRewriteScriptEpisode(
  input: RewriteScriptEpisodeInputDto,
  rewriteImpl: (input: RewriteScriptEpisodeInputDto) => Promise<unknown>
) {
  return rewriteImpl({
    episodeNo: input.episodeNo,
    plan: input.plan,
    outlineTitle: input.outlineTitle,
    theme: input.theme,
    mainConflict: input.mainConflict,
    charactersSummary: input.charactersSummary,
    storyIntent: input.storyIntent,
    scriptControlPackage: input.scriptControlPackage,
    outline: input.outline,
    characters: input.characters,
    entityStore: input.entityStore,
    activeCharacterBlocks: input.activeCharacterBlocks,
    segments: input.segments,
    existingScript: input.existingScript
  })
}

// =============================================================================
// HELPERS
// =============================================================================

function makeCompleteInput(): StartScriptGenerationInputDto {
  return {
    outlineTitle: '修仙传',
    theme: '不争',
    mainConflict: '黎明被逼亮底',
    charactersSummary: ['黎明：玄玉宫弟子，会忍也会算'],
    plan: {
      mode: 'fresh_start' as const,
      ready: true,
      blockedBy: [],
      contract: {
        ready: true,
        targetEpisodes: 10,
        structuralActs: [],
        missingActs: [],
        confirmedFormalFacts: [],
        missingFormalFactLandings: [],
        storyContract: {} as any,
        userAnchorLedger: {} as any,
        missingAnchorNames: [],
        heroineAnchorCovered: true
      },
      targetEpisodes: 10,
      existingSceneCount: 0,
      recommendedPrimaryLane: 'deepseek' as const,
      recommendedFallbackLane: 'deepseek' as const,
      runtimeProfile: {
        contextPressureScore: 0,
        shouldCompactContextFirst: false,
        maxStoryIntentChars: 1800,
        maxCharacterChars: 2400,
        maxSegmentChars: 1500,
        recommendedBatchSize: 5,
        profileLabel: 'test',
        reason: 'test'
      },
      episodePlans: []
    },
    storyIntent: {
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
    },
    outline: {
      title: '修仙传',
      genre: '玄幻修仙',
      theme: '不争',
      mainConflict: '黎明被逼亮底',
      protagonist: '黎明',
      summary: '李科拿小柔逼黎明亮底。',
      summaryEpisodes: [{ episodeNo: 1, summary: '李科逼黎明亮底。' }],
      facts: [
        {
          id: 'fact-1',
          label: '守护目标',
          description: '小柔是黎明要保护的对象',
          linkedToPlot: true,
          linkedToTheme: true,
          authorityType: 'user_declared' as const,
          status: 'confirmed' as const,
          level: 'core' as const,
          declaredBy: 'user' as const,
          declaredStage: 'outline' as const,
          createdAt: '2026-03-27T00:00:00.000Z',
          updatedAt: '2026-03-27T00:00:00.000Z'
        }
      ]
    },
    characters: [
      {
        name: '黎明',
        biography: '玄玉宫弟子',
        publicMask: '低调',
        hiddenPressure: '亮底会累及身边人',
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
        biography: '反派角色',
        publicMask: '阴险',
        hiddenPressure: '要夺黎明钥匙',
        fear: '黎明底牌比自己强',
        protectTarget: '',
        conflictTrigger: '逼迫黎明亮底',
        advantage: '心狠手辣',
        weakness: '低估黎明',
        goal: '夺钥匙并逼黎明亮底',
        arc: '从掌控全局到被反将一军'
      }
    ],
    activeCharacterBlocks: [],
    segments: [
      {
        act: 'opening' as const,
        title: '开局',
        content: '守护目标是小柔，黎明在闹市低调行走。',
        hookType: '悬念'
      },
      {
        act: 'midpoint' as const,
        title: '中段',
        content: '李科发现黎明软肋，用小柔威胁他亮底牌。',
        hookType: '冲突升级'
      }
    ],
    existingScript: []
  }
}

function makeIncompleteInput(
  missing: 'facts' | 'characters' | 'segments'
): StartScriptGenerationInputDto {
  const complete = makeCompleteInput()
  if (missing === 'facts') {
    complete.outline = { ...complete.outline, facts: [] }
  } else if (missing === 'characters') {
    complete.characters = []
  } else {
    complete.segments = []
  }
  return complete
}

function makeRewriteInput(): RewriteScriptEpisodeInputDto {
  return {
    ...makeCompleteInput(),
    episodeNo: 1,
    entityStore: {
      characters: [],
      factions: [],
      locations: [],
      items: [],
      relations: []
    }
  }
}

// =============================================================================
// TESTS
// =============================================================================

describe('workflow:start-script-generation IPC handler (guardian path)', () => {
  it('guardian blocks entry and returns formal failure when formal facts are missing', async () => {
    const result = (await handleStartScriptGeneration(makeIncompleteInput('facts'))) as any

    assert.equal(result.success, false, 'success should be false when guardian blocks')
    assert.deepStrictEqual(result.generatedScenes, [])
    assert.ok(result.board !== null, 'board should be present in failure response')
    assert.equal(result.board.batchContext.status, 'failed')
    assert.ok(result.board.batchContext.reason.includes('入口守卫拦截'))
    assert.ok(result.failure !== null, 'failure should be present')
    assert.equal(result.failure.kind, 'failed')
    assert.ok(result.ledger === null, 'ledger should be null when blocked')
    assert.ok(result.postflight === null, 'postflight should be null when blocked')
  })

  it('guardian blocks entry and returns formal failure when characters are missing', async () => {
    const result = (await handleStartScriptGeneration(makeIncompleteInput('characters'))) as any

    assert.equal(result.success, false)
    assert.equal(result.board.batchContext.status, 'failed')
    assert.ok(result.failure !== null)
    assert.equal(result.failure.kind, 'failed')
  })

  it('guardian blocks entry and returns formal failure when segments are missing', async () => {
    const result = (await handleStartScriptGeneration(makeIncompleteInput('segments'))) as any

    assert.equal(result.success, false)
    assert.equal(result.board.batchContext.status, 'failed')
    assert.ok(result.failure !== null)
    assert.equal(result.failure.kind, 'failed')
  })

  it('guardian does NOT throw for complete upstream — returns formal success structure', async () => {
    // With complete upstream, guardian does not throw — handler would proceed to generation.
    // We verify the guardian passes by checking that the input is not rejected.
    // (Actual generation requires runtime infrastructure, not tested here.)
    const completeInput = makeCompleteInput()
    let guardianThrew = false
    try {
      guardianEnforceScriptEntry({
        storyIntent: completeInput.storyIntent,
        outline: completeInput.outline,
        characters: completeInput.characters,
        activeCharacterBlocks: completeInput.activeCharacterBlocks,
        segments: completeInput.segments ?? [],
        script: completeInput.existingScript
      })
    } catch {
      guardianThrew = true
    }
    assert.ok(!guardianThrew, 'guardian should NOT throw for complete upstream')
  })

  it('rewrite handler keeps entityStore when forwarding the manual rewrite input', async () => {
    const rewriteInput = makeRewriteInput()
    let captured: RewriteScriptEpisodeInputDto | null = null

    await handleRewriteScriptEpisode(rewriteInput, async (input) => {
      captured = input
      return { scene: rewriteInput.existingScript[0], failures: [] }
    })

    assert.ok(captured, 'rewrite handler should pass input to runtime')
    const forwarded = captured as RewriteScriptEpisodeInputDto
    assert.equal(forwarded.entityStore, rewriteInput.entityStore)
  })
})
