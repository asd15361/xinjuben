import { describe, it } from 'node:test'
import assert from 'node:assert'
import { createScriptGenerationPrompt } from './create-script-generation-prompt'
import type { StartScriptGenerationInputDto } from '@shared/contracts/script-generation'
import type { OutlineDraftDto } from '@shared/contracts/workflow'
import type { MarketProfileDto } from '@shared/contracts/project'

function makeMinimalInput(overrides?: {
  marketProfile?: MarketProfileDto | null
}): StartScriptGenerationInputDto {
  return {
    plan: {
      mode: 'fresh_start',
      ready: true,
      blockedBy: [],
      contract: {
        ready: true,
        targetEpisodes: 10,
        structuralActs: [],
        missingActs: [],
        confirmedFormalFacts: [],
        missingFormalFactLandings: [],
        storyContract: {},
        userAnchorLedger: {},
        missingAnchorNames: [],
        heroineAnchorCovered: false
      },
      targetEpisodes: 10,
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
    outlineTitle: '测试剧',
    theme: '测试主题',
    mainConflict: '测试冲突',
    charactersSummary: [],
    storyIntent: overrides?.marketProfile
      ? {
          officialKeyCharacters: [],
          lockedCharacterNames: [],
          themeAnchors: [],
          worldAnchors: [],
          relationAnchors: [],
          dramaticMovement: [],
          marketProfile: overrides.marketProfile
        }
      : null,
    outline: {
      title: '测试剧',
      genre: '都市',
      theme: '测试主题',
      mainConflict: '测试冲突',
      protagonist: '主角',
      summary: '测试摘要',
      summaryEpisodes: [],
      facts: []
    } as OutlineDraftDto,
    characters: [],
    existingScript: []
  }
}

describe('create-script-generation-prompt', () => {
  it('includes market profile section for male lane', () => {
    const input = makeMinimalInput({
      marketProfile: {
        audienceLane: 'male',
        subgenre: '男频都市逆袭'
      }
    })
    const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 1)
    assert.ok(prompt.includes('剧本市场定位执行规则'))
    assert.ok(prompt.includes('男频'))
    assert.ok(prompt.includes('男频都市逆袭'))
    assert.ok(prompt.includes('逆袭链执行'))
    assert.ok(prompt.includes('升级链执行'))
    assert.ok(prompt.includes('信息密度四要素'))
    assert.ok(prompt.includes('人物五要素'))
  })

  it('includes market profile section for female lane', () => {
    const input = makeMinimalInput({
      marketProfile: {
        audienceLane: 'female',
        subgenre: '女频霸总甜宠'
      }
    })
    const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 1)
    assert.ok(prompt.includes('剧本市场定位执行规则'))
    assert.ok(prompt.includes('女频'))
    assert.ok(prompt.includes('女频霸总甜宠'))
    assert.ok(prompt.includes('情绪代入执行'))
    assert.ok(prompt.includes('关系拉扯执行'))
    assert.ok(prompt.includes('信息密度四要素'))
    assert.ok(prompt.includes('人物五要素'))
  })

  it('does not include market profile section when storyIntent is null', () => {
    const input = makeMinimalInput()
    const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 1)
    assert.ok(!prompt.includes('剧本市场定位执行规则'))
  })

  it('places market profile section before viral execution lines', () => {
    const input = makeMinimalInput({
      marketProfile: {
        audienceLane: 'male',
        subgenre: '男频都市逆袭'
      }
    })
    const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 1)
    const marketIndex = prompt.indexOf('剧本市场定位执行规则')
    const viralIndex = prompt.indexOf('爽感执行指令')
    assert.ok(marketIndex > 0)
    assert.ok(viralIndex > 0)
    assert.ok(marketIndex < viralIndex, 'market profile should appear before viral execution lines')
  })

  it('does not leak cultivation-specific final-run rules into female CEO prompts', () => {
    const input = makeMinimalInput({
      marketProfile: {
        audienceLane: 'female',
        subgenre: '女频霸总甜宠'
      }
    })
    const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 1)

    assert.match(prompt, /女频霸总甜宠|集团|总裁|契约/)
    assert.equal(
      /宗门|仙盟|魔尊血脉|长老|法阵|妖兽|山门|修炼|悟道|封印|血契|碎钥匙/u.test(
        prompt
      ),
      false
    )
  })
})
