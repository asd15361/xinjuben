import { describe, it } from 'node:test'
import assert from 'node:assert'
import { finalizeScriptPostflight } from './finalize-script-postflight'
import type { StartScriptGenerationInputDto } from '@shared/contracts/script-generation'
import type { CharacterDraftDto, OutlineDraftDto, ScriptSegmentDto } from '@shared/contracts/workflow'

function makeInput(): StartScriptGenerationInputDto {
  const outline: OutlineDraftDto = {
    title: '契约婚姻',
    genre: '女频霸总甜宠',
    theme: '女性成长',
    mainConflict: '女主在集团和豪门压力中夺回选择权',
    protagonist: '苏晚',
    summary: '苏晚与顾沉在契约婚姻里从互相试探到共同反击。',
    summaryEpisodes: [],
    facts: []
  }

  return {
    plan: {
      mode: 'fresh_start',
      ready: true,
      blockedBy: [],
      contract: {
        ready: true,
        targetEpisodes: 20,
        structuralActs: [],
        missingActs: [],
        confirmedFormalFacts: [],
        missingFormalFactLandings: [],
        storyContract: {},
        userAnchorLedger: {},
        missingAnchorNames: [],
        heroineAnchorCovered: true
      },
      targetEpisodes: 20,
      existingSceneCount: 0,
      recommendedPrimaryLane: 'deepseek',
      recommendedFallbackLane: 'deepseek',
      runtimeProfile: {
        contextPressureScore: 0,
        shouldCompactContextFirst: false,
        maxStoryIntentChars: 1000,
        maxCharacterChars: 1000,
        maxSegmentChars: 1000,
        recommendedBatchSize: 5,
        profileLabel: 'test',
        reason: 'test'
      },
      episodePlans: []
    },
    outlineTitle: outline.title,
    theme: outline.theme,
    mainConflict: outline.mainConflict,
    charactersSummary: [],
    storyIntent: {
      protagonist: '苏晚',
      antagonist: '豪门长辈',
      officialKeyCharacters: [],
      lockedCharacterNames: [],
      themeAnchors: [],
      worldAnchors: [],
      relationAnchors: [],
      dramaticMovement: [],
      marketProfile: {
        audienceLane: 'female',
        subgenre: '女频霸总甜宠'
      }
    },
    outline,
    characters: [],
    existingScript: []
  }
}

function makeScene(screenplay: string): ScriptSegmentDto {
  return {
    sceneNo: 1,
    screenplay,
    action: screenplay,
    dialogue: screenplay,
    emotion: ''
  }
}

describe('finalizeScriptPostflight', () => {
  it('reports generation strategy contamination in generated screenplay text', () => {
    const input = makeInput()
    const result = finalizeScriptPostflight({
      generationInput: input,
      outline: input.outline,
      characters: input.characters as CharacterDraftDto[],
      existingScript: [],
      generatedScenes: [
        makeScene(
          '第1集\n场1 集团会议室\n人物：苏晚、顾沉\n△苏晚刚拿出契约，窗外却传来宗门审判的钟声，仙盟使者逼她交出魔尊血脉。'
        )
      ]
    })

    const contaminationIssues = result.postflight.issues.filter(
      (issue) => issue.code === 'generation_strategy_contamination'
    )
    assert.ok(contaminationIssues.length >= 3)
    assert.ok(contaminationIssues.some((issue) => issue.detail.includes('女频霸总甜宠')))
    assert.equal(result.postflight.pass, false)
  })
})
