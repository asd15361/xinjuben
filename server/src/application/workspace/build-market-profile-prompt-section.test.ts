import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  buildMarketProfilePromptSection,
  type MarketProfileStage
} from './build-market-profile-prompt-section'
import type { MarketProfileDto } from '@shared/contracts/project'

function makeMarketProfile(overrides?: Partial<MarketProfileDto>): MarketProfileDto {
  return {
    audienceLane: 'male',
    subgenre: '男频都市逆袭',
    ...overrides
  }
}

describe('build-market-profile-prompt-section', () => {
  describe('marketProfile is null/undefined', () => {
    const stages: MarketProfileStage[] = [
      'roughOutline',
      'characters',
      'detailedOutline',
      'episodeControl'
    ]

    for (const stage of stages) {
      it(`returns empty string for ${stage} when marketProfile is null`, () => {
        const result = buildMarketProfilePromptSection({ marketProfile: null, stage })
        assert.strictEqual(result, '')
      })

      it(`returns empty string for ${stage} when marketProfile is undefined`, () => {
        const result = buildMarketProfilePromptSection({ marketProfile: undefined, stage })
        assert.strictEqual(result, '')
      })
    }
  })

  describe('roughOutline stage', () => {
    it('includes male lane rules for 男频都市逆袭', () => {
      const result = buildMarketProfilePromptSection({
        marketProfile: makeMarketProfile(),
        stage: 'roughOutline'
      })
      assert.ok(result.includes('男频'))
      assert.ok(result.includes('逆袭链'))
      assert.ok(result.includes('升级链'))
      assert.ok(result.includes('底牌链'))
      assert.ok(result.includes('反派层级'))
      assert.ok(result.includes('男频都市逆袭'))
    })

    it('includes female lane rules for 女频霸总甜宠', () => {
      const result = buildMarketProfilePromptSection({
        marketProfile: makeMarketProfile({
          audienceLane: 'female',
          subgenre: '女频霸总甜宠'
        }),
        stage: 'roughOutline'
      })
      assert.ok(result.includes('女频'))
      assert.ok(result.includes('情绪代入'))
      assert.ok(result.includes('关系拉扯'))
      assert.ok(result.includes('权力借用'))
      assert.ok(result.includes('高权力者撑腰'))
      assert.ok(result.includes('女频霸总甜宠'))
    })

    it('includes core audience and emotional payoffs', () => {
      const result = buildMarketProfilePromptSection({
        marketProfile: makeMarketProfile(),
        stage: 'roughOutline'
      })
      assert.ok(result.includes('核心观众'))
      assert.ok(result.includes('核心爽点'))
      assert.ok(result.includes('主要冲突类型'))
      assert.ok(result.includes('必须避免'))
    })

    it('throws for unknown subgenre', () => {
      assert.throws(() => {
        buildMarketProfilePromptSection({
          marketProfile: makeMarketProfile({ subgenre: '未知垂类' as never }),
          stage: 'roughOutline'
        })
      }, /Unknown subgenre/)
    })
  })

  describe('characters stage', () => {
    it('includes male character focus for 男频玄幻修仙', () => {
      const result = buildMarketProfilePromptSection({
        marketProfile: makeMarketProfile({
          subgenre: '男频玄幻修仙'
        }),
        stage: 'characters'
      })
      assert.ok(result.includes('男频'))
      assert.ok(result.includes('谁压主角'))
      assert.ok(result.includes('谁提供升级资源'))
      assert.ok(result.includes('谁见证打脸'))
      assert.ok(result.includes('谁是下一层级反派'))
    })

    it('includes female character focus for 女频古言宅斗', () => {
      const result = buildMarketProfilePromptSection({
        marketProfile: makeMarketProfile({
          audienceLane: 'female',
          subgenre: '女频古言宅斗'
        }),
        stage: 'characters'
      })
      assert.ok(result.includes('女频'))
      assert.ok(result.includes('谁掌握权力'))
      assert.ok(result.includes('谁借用权力'))
      assert.ok(result.includes('谁制造情绪压迫'))
      assert.ok(result.includes('谁提供情绪补偿'))
    })

    it('includes five-element requirements and anti-patterns', () => {
      const result = buildMarketProfilePromptSection({
        marketProfile: makeMarketProfile(),
        stage: 'characters'
      })
      assert.ok(result.includes('五要素'))
      assert.ok(result.includes('外在形象'))
      assert.ok(result.includes('性格特征'))
      assert.ok(result.includes('身份处境'))
      assert.ok(result.includes('价值观'))
      assert.ok(result.includes('剧情功能'))
      assert.ok(result.includes('禁止把人物小传写成剧情梗概'))
      assert.ok(result.includes('反模式'))
    })
  })

  describe('detailedOutline stage', () => {
    it('includes information density four techniques', () => {
      const result = buildMarketProfilePromptSection({
        marketProfile: makeMarketProfile(),
        stage: 'detailedOutline'
      })
      assert.ok(result.includes('信息密度'))
      assert.ok(result.includes('冲突载体'))
      assert.ok(result.includes('道具载体'))
      assert.ok(result.includes('潜台词'))
      assert.ok(result.includes('动作情绪节拍'))
    })

    it('includes male extra requirements for 男频历史军政', () => {
      const result = buildMarketProfilePromptSection({
        marketProfile: makeMarketProfile({
          subgenre: '男频历史军政'
        }),
        stage: 'detailedOutline'
      })
      assert.ok(result.includes('男频详纲额外要求'))
      assert.ok(result.includes('身份/地位/战力反转'))
      assert.ok(result.includes('显性增长'))
    })

    it('includes female extra requirements for 女频现代逆袭', () => {
      const result = buildMarketProfilePromptSection({
        marketProfile: makeMarketProfile({
          audienceLane: 'female',
          subgenre: '女频现代逆袭'
        }),
        stage: 'detailedOutline'
      })
      assert.ok(result.includes('女频详纲额外要求'))
      assert.ok(result.includes('情绪高潮'))
      assert.ok(result.includes('推拉'))
    })
  })

  describe('episodeControl stage', () => {
    it('includes male control card beats for 男频都市逆袭', () => {
      const result = buildMarketProfilePromptSection({
        marketProfile: makeMarketProfile(),
        stage: 'episodeControl'
      })
      assert.ok(result.includes('男频控制卡重点'))
      assert.ok(result.includes('statusReversalBeat'))
      assert.ok(result.includes('powerProgressionBeat'))
      assert.ok(result.includes('goldenFingerBeat'))
      assert.ok(result.includes('villainLevelUp'))
    })

    it('includes female control card beats for 女频霸总甜宠', () => {
      const result = buildMarketProfilePromptSection({
        marketProfile: makeMarketProfile({
          audienceLane: 'female',
          subgenre: '女频霸总甜宠'
        }),
        stage: 'episodeControl'
      })
      assert.ok(result.includes('女频控制卡重点'))
      assert.ok(result.includes('powerBorrowingBeat'))
      assert.ok(result.includes('relationshipTensionBeat'))
      assert.ok(result.includes('emotionalIdentificationBeat'))
      assert.ok(result.includes('supportingPowerReveal'))
    })

    it('includes avoid rules and payoff beats', () => {
      const result = buildMarketProfilePromptSection({
        marketProfile: makeMarketProfile(),
        stage: 'episodeControl'
      })
      assert.ok(result.includes('核心爽点'))
      assert.ok(result.includes('常见 payoff 节拍'))
      assert.ok(result.includes('必须避免'))
    })
  })

  describe('all 6 subgenres', () => {
    const subgenres = [
      '男频都市逆袭',
      '男频玄幻修仙',
      '男频历史军政',
      '女频霸总甜宠',
      '女频古言宅斗',
      '女频现代逆袭'
    ] as const

    for (const subgenre of subgenres) {
      it(`produces non-empty output for ${subgenre}`, () => {
        const lane = subgenre.startsWith('男') ? 'male' : 'female'
        const result = buildMarketProfilePromptSection({
          marketProfile: makeMarketProfile({ audienceLane: lane as 'male' | 'female', subgenre }),
          stage: 'roughOutline'
        })
        assert.ok(result.length > 50)
        assert.ok(result.includes(subgenre))
      })
    }
  })

  describe('scriptGeneration stage', () => {
    it('returns empty string when marketProfile is null', () => {
      const result = buildMarketProfilePromptSection({ marketProfile: null, stage: 'scriptGeneration' })
      assert.strictEqual(result, '')
    })

    it('includes male lane script execution rules for 男频都市逆袭', () => {
      const result = buildMarketProfilePromptSection({
        marketProfile: makeMarketProfile(),
        stage: 'scriptGeneration'
      })
      assert.ok(result.includes('男频'))
      assert.ok(result.includes('剧本市场定位执行规则'))
      assert.ok(result.includes('逆袭链执行'))
      assert.ok(result.includes('升级链执行'))
      assert.ok(result.includes('底牌链执行'))
      assert.ok(result.includes('反派层级执行'))
      assert.ok(result.includes('爽点三步执行'))
    })

    it('includes female lane script execution rules for 女频霸总甜宠', () => {
      const result = buildMarketProfilePromptSection({
        marketProfile: makeMarketProfile({
          audienceLane: 'female',
          subgenre: '女频霸总甜宠'
        }),
        stage: 'scriptGeneration'
      })
      assert.ok(result.includes('女频'))
      assert.ok(result.includes('剧本市场定位执行规则'))
      assert.ok(result.includes('情绪代入执行'))
      assert.ok(result.includes('关系拉扯执行'))
      assert.ok(result.includes('权力借用执行'))
      assert.ok(result.includes('高权力者撑腰执行'))
      assert.ok(result.includes('女主成长执行'))
    })

    it('includes information density four techniques for script execution', () => {
      const result = buildMarketProfilePromptSection({
        marketProfile: makeMarketProfile(),
        stage: 'scriptGeneration'
      })
      assert.ok(result.includes('信息密度四要素'))
      assert.ok(result.includes('冲突载体'))
      assert.ok(result.includes('道具载体'))
      assert.ok(result.includes('潜台词'))
      assert.ok(result.includes('动作情绪节拍'))
    })

    it('includes character five elements for script execution', () => {
      const result = buildMarketProfilePromptSection({
        marketProfile: makeMarketProfile(),
        stage: 'scriptGeneration'
      })
      assert.ok(result.includes('人物五要素'))
      assert.ok(result.includes('外在形象'))
      assert.ok(result.includes('性格特征'))
      assert.ok(result.includes('身份处境'))
      assert.ok(result.includes('价值观'))
      assert.ok(result.includes('剧情功能'))
    })

    it('includes avoid rules and subgenre info', () => {
      const result = buildMarketProfilePromptSection({
        marketProfile: makeMarketProfile(),
        stage: 'scriptGeneration'
      })
      assert.ok(result.includes('必须避免'))
      assert.ok(result.includes('男频都市逆袭'))
      assert.ok(result.includes('核心爽点'))
    })
  })
})
