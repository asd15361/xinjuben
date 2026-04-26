import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import type { MarketProfileDto, Subgenre } from '../../contracts/project.ts'
import {
  ALL_GENERATION_STRATEGY_IDS,
  buildStrategyFactionMatrixPromptBlock,
  buildStrategyProtagonistFallback,
  detectStrategyContamination,
  getGenerationStrategyById,
  repairStrategyContaminationText,
  repairStrategyContaminationValue,
  resolveGenerationStrategy
} from './generation-strategy.ts'

function marketProfile(subgenre: Subgenre): MarketProfileDto {
  return {
    audienceLane: subgenre.startsWith('男频') ? 'male' : 'female',
    subgenre
  }
}

describe('generation-strategy', () => {
  it('resolves all built-in subgenres from marketProfile', () => {
    const cases: Array<[Subgenre, string]> = [
      ['男频都市逆袭', 'male_urban_counterattack'],
      ['男频玄幻修仙', 'male_xianxia'],
      ['男频历史军政', 'male_history_military'],
      ['女频霸总甜宠', 'female_ceo_romance'],
      ['女频古言宅斗', 'female_ancient_housefight'],
      ['女频现代逆袭', 'female_modern_counterattack']
    ]

    for (const [subgenre, expectedId] of cases) {
      const resolution = resolveGenerationStrategy({ marketProfile: marketProfile(subgenre) })

      assert.equal(resolution.strategy.id, expectedId)
      assert.equal(resolution.strategy.sourceSubgenre, subgenre)
      assert.equal(resolution.source, 'marketProfile')
      assert.deepEqual(resolution.warnings, [])
    }
  })

  it('keeps marketProfile as the primary truth even when fallback genre says xianxia', () => {
    const resolution = resolveGenerationStrategy({
      marketProfile: marketProfile('女频霸总甜宠'),
      genre: '玄幻修仙，魔尊血脉，宗门大比'
    })

    assert.equal(resolution.strategy.id, 'female_ceo_romance')
    assert.equal(resolution.source, 'marketProfile')
    assert.ok(resolution.strategy.forbiddenTerms.includes('宗门'))
    assert.ok(resolution.strategy.worldLexicon.roleTitles.includes('总裁'))
  })

  it('falls back to urban legal strategy for old projects without marketProfile', () => {
    const resolution = resolveGenerationStrategy({
      marketProfile: null,
      genre: '都市律师判案，律所合伙人和证据链反转'
    })

    assert.equal(resolution.strategy.id, 'urban_legal')
    assert.equal(resolution.strategy.sourceSubgenre, '都市律政')
    assert.equal(resolution.source, 'genreFallback')
    assert.ok(resolution.strategy.worldLexicon.roleTitles.includes('律师'))
    assert.ok(resolution.strategy.worldLexicon.conflictObjects.includes('证据链'))
    assert.ok(resolution.strategy.forbiddenTerms.includes('仙盟'))
  })

  it('falls back to xianxia strategy only when no marketProfile exists', () => {
    const resolution = resolveGenerationStrategy({
      genre: '玄幻修仙，主角隐藏魔尊血脉，被宗门长老压制'
    })

    assert.equal(resolution.strategy.id, 'male_xianxia')
    assert.equal(resolution.source, 'genreFallback')
    assert.ok(resolution.strategy.worldLexicon.roleTitles.includes('长老'))
    assert.ok(resolution.strategy.worldLexicon.conflictObjects.includes('血脉'))
  })

  it('prefers explicit genre fallback over noisy story text', () => {
    const resolution = resolveGenerationStrategy({
      genre: '男频玄幻修仙',
      storyIntentGenre: '这一版摘要里误混了律师、律所、证据链等旧文本'
    })

    assert.equal(resolution.strategy.id, 'male_xianxia')
    assert.equal(resolution.source, 'genreFallback')
    assert.equal(resolution.matchedBy, '男频玄幻修仙')
  })

  it('returns default strategy with warning when neither marketProfile nor genre can decide', () => {
    const resolution = resolveGenerationStrategy({ genre: '一个没有明确题材的短剧' })

    assert.equal(resolution.strategy.id, 'male_urban_counterattack')
    assert.equal(resolution.source, 'default')
    assert.ok(resolution.warnings.some((warning) => warning.includes('题材策略')))
  })

  it('detects off-topic strategy contamination terms', () => {
    const legal = getGenerationStrategyById('urban_legal')
    const issues = detectStrategyContamination(
      legal,
      '律师在法庭上提交证据链，但对方突然祭出宗门令牌和魔尊血脉。'
    )

    assert.deepEqual(
      issues.map((issue) => issue.term),
      ['宗门', '魔尊血脉']
    )
    assert.ok(issues.every((issue) => issue.severity === 'error'))
  })

  it('repairs off-topic strategy contamination terms with the selected strategy lexicon', () => {
    const strategy = getGenerationStrategyById('female_ceo_romance')
    const result = repairStrategyContaminationText(
      strategy,
      '她被宗门长老用魔尊血脉逼入仙盟审判。'
    )

    assert.equal(result.text, '她被集团总裁用契约逼入集团审判。')
    assert.deepEqual(
      result.replacements.map((item) => [item.term, item.replacement, item.count]),
      [
        ['魔尊血脉', '契约', 1],
        ['宗门', '集团', 1],
        ['仙盟', '集团', 1],
        ['长老', '总裁', 1]
      ]
    )
    assert.deepEqual(detectStrategyContamination(strategy, result.text), [])
  })

  it('repairs nested generated values without changing non-text fields', () => {
    const strategy = getGenerationStrategyById('urban_legal')
    const result = repairStrategyContaminationValue(strategy, {
      title: '宗门旧案',
      episodeNo: 3,
      scenes: [
        {
          setup: '律师追查仙盟留下的魔尊血脉线索。',
          keep: true
        }
      ]
    })

    assert.equal(result.value.title, '律所旧案')
    assert.equal(result.value.episodeNo, 3)
    assert.equal(result.value.scenes[0]?.setup, '律师追查律所留下的证据链线索。')
    assert.equal(result.value.scenes[0]?.keep, true)
    assert.deepEqual(
      result.replacements.map((item) => [item.term, item.replacement, item.count]),
      [
        ['宗门', '律所', 1],
        ['魔尊血脉', '证据链', 1],
        ['仙盟', '律所', 1]
      ]
    )
  })

  it('registers every strategy id without duplicates', () => {
    const unique = new Set(ALL_GENERATION_STRATEGY_IDS)

    assert.equal(unique.size, ALL_GENERATION_STRATEGY_IDS.length)
    assert.ok(ALL_GENERATION_STRATEGY_IDS.includes('male_xianxia'))
    assert.ok(ALL_GENERATION_STRATEGY_IDS.includes('urban_legal'))
  })

  it('renders hidden-bloodline xianxia faction rules only from strategy layer', () => {
    const strategy = getGenerationStrategyById('male_xianxia')
    const block = buildStrategyFactionMatrixPromptBlock(strategy, {
      genre: '男频玄幻修仙',
      sourceText: '废柴少年被封印魔尊血脉，母亲吊坠碎片觉醒。'
    })

    assert.match(block, /隐藏血脉修仙项目/)
    assert.match(block, /禁止把主角前期写成魔渊宗宗主/)
    assert.match(block, /真女主和反派大小姐必须分开/)
    assert.match(block, /禁止自动加入退婚/)
  })

  it('does not render xianxia hidden-bloodline rules for non-xianxia strategies', () => {
    const strategy = getGenerationStrategyById('urban_legal')
    const block = buildStrategyFactionMatrixPromptBlock(strategy, {
      genre: '都市律师判案',
      sourceText: '律师围绕证据链和庭审记录查明真相。'
    })

    assert.equal(block.includes('隐藏血脉修仙项目'), false)
    assert.match(block, /律所/)
    assert.match(block, /法院/)
  })

  it('builds xianxia protagonist fallback from strategy instead of global text', () => {
    const strategy = getGenerationStrategyById('male_xianxia')
    const fallback = buildStrategyProtagonistFallback(strategy, {
      name: '凌寒',
      coreItem: '母亲吊坠碎片',
      mainConflict: '凌寒被宗门和仙盟争夺魔尊血脉'
    })

    assert.match(fallback.biography, /凌寒/)
    assert.match(fallback.biography, /宗门/)
    assert.match(fallback.biography, /魔尊血脉/)
    assert.match(fallback.hiddenPressure, /仙盟/)
    assert.match(fallback.advantage, /魔尊血脉/)
  })

  it('builds urban legal protagonist fallback without xianxia terms', () => {
    const strategy = getGenerationStrategyById('urban_legal')
    const fallback = buildStrategyProtagonistFallback(strategy, {
      name: '许知行',
      coreItem: '监控录像',
      mainConflict: '许知行围绕证据链和对方律师庭审交锋'
    })
    const text = JSON.stringify(fallback)

    assert.match(fallback.biography, /许知行/)
    assert.match(fallback.biography, /证据链|案件/)
    assert.equal(text.includes('宗门'), false)
    assert.equal(text.includes('魔尊血脉'), false)
    assert.equal(text.includes('仙盟'), false)
  })
})
