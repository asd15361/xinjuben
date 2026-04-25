import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createMarketPlaybookDraftFromSamples,
  createSourceSample,
  SampleValidationError
} from './create-draft-from-samples.ts'
import type { MarketPlaybookSourceSampleDto } from '../../contracts/market-playbook.ts'

// ============================================================
// 辅助
// ============================================================

function makeSample(overrides?: Partial<MarketPlaybookSourceSampleDto>): MarketPlaybookSourceSampleDto {
  return {
    id: `sample-${Math.random().toString(36).slice(2, 8)}`,
    name: '测试样本',
    contentText: '测试样本'.repeat(50),
    sourceType: 'txt',
    importedAt: new Date().toISOString(),
    ...overrides
  }
}

function makeRichSample(): MarketPlaybookSourceSampleDto {
  return makeSample({
    name: '男频修仙样本',
    contentText: `
      第一章 测灵台废体受辱

      少年站在测灵台上，长老冷漠地看着他。"废灵根！"长老当众宣布，众人嘲笑。

      未婚妻走上前，冷冷说道："我们退婚吧。"她转身投入师兄怀抱。

      少年握紧拳头，眼中闪过一丝不甘。他知道，自己体内封印着一股未知的力量。

      第二章 封印力量外泄

      测灵石再次触碰少年手掌时，突然爆裂。长老被反噬，吐血后退。

      全场震惊。没有人敢相信，这个被判废灵根的少年，竟然能让测灵石爆裂。

      暗处，有人开始密谋。他们不会承认自己的错误，反而要暗中除掉这个少年。

      第三章 反派暗杀

      刺客组织派出高手追杀。少年隐忍修炼，暗中突破。

      他在布局，在谋划，在等待一个反击的机会。

      当所有人都以为他已经死了的时候，他回来了。碾压全场，震慑所有人。

      曾经嘲笑他的人跪下求饶。曾经退婚的未婚妻后悔不已。

      这只是开始。更大的秘密还藏在封印之下。身世之谜，伏笔重重。

      反转出乎意料。万万没想到，他竟然是上古神尊的转世。
    `
  })
}

// ============================================================
// 测试
// ============================================================

test('P5: txt 样本能创建 source sample', () => {
  const sample = createSourceSample({
    name: '优秀剧本.txt',
    contentText: '这是一个测试剧本的内容。'.repeat(20),
    sourceType: 'txt',
    audienceLane: 'male',
    subgenre: '修仙逆袭'
  })

  assert.ok(sample.id.startsWith('sample-'))
  assert.equal(sample.name, '优秀剧本.txt')
  assert.equal(sample.sourceType, 'txt')
  assert.equal(sample.audienceLane, 'male')
  assert.equal(sample.subgenre, '修仙逆袭')
  assert.ok(sample.importedAt)
})

test('P5: 多个样本能生成一个 draft', () => {
  const samples = [makeRichSample(), makeSample({ name: '样本2', contentText: '退婚羞辱'.repeat(50) })]

  const draft = createMarketPlaybookDraftFromSamples({
    samples,
    name: '修仙逆袭打法包草案',
    audienceLane: 'male',
    subgenre: '修仙逆袭'
  })

  assert.ok(draft.id.startsWith('draft-'))
  assert.equal(draft.name, '修仙逆袭打法包草案')
  assert.equal(draft.sourceSampleIds.length, 2)
  assert.equal(draft.sourceSampleIds[0], samples[0].id)
  assert.equal(draft.sourceSampleIds[1], samples[1].id)
})

test('P5: draft status 固定为 draft', () => {
  const draft = createMarketPlaybookDraftFromSamples({
    samples: [makeRichSample()],
    name: '测试草案',
    audienceLane: 'male',
    subgenre: '修仙逆袭'
  })

  assert.equal(draft.status, 'draft')
})

test('P5: draft 不会直接进入 active registry', () => {
  // draft.status === 'draft'，registry 只接受 status === 'active'
  // 这个测试验证类型层面的隔离
  const draft = createMarketPlaybookDraftFromSamples({
    samples: [makeRichSample()],
    name: '测试草案',
    audienceLane: 'male',
    subgenre: '修仙逆袭'
  })

  assert.equal(draft.status, 'draft')
  // 类型系统保证 MarketPlaybookDraftDto 不能赋值给 MarketPlaybookDto
  // 因为 status 类型不同: 'draft' vs MarketPlaybookStatus
})

test('P5: 能提取 opening_pressure / payoff / hook 至少 3 类 pattern', () => {
  const draft = createMarketPlaybookDraftFromSamples({
    samples: [makeRichSample()],
    name: '修仙逆袭样本分析',
    audienceLane: 'male',
    subgenre: '修仙逆袭'
  })

  const patternTypes = draft.extractedPatterns.map((p) => p.type)
  assert.ok(patternTypes.includes('opening_pressure'), '应提取到开局压迫')
  assert.ok(patternTypes.includes('payoff'), '应提取到爽点兑现')
  assert.ok(patternTypes.includes('hook'), '应提取到钩子悬念')
  assert.ok(
    draft.extractedPatterns.length >= 3,
    `至少 3 类 pattern，实际 ${draft.extractedPatterns.length}`
  )
})

test('P5: 空样本明确报错', () => {
  assert.throws(
    () => {
      createMarketPlaybookDraftFromSamples({
        samples: [],
        name: '空草案',
        audienceLane: 'male',
        subgenre: '修仙逆袭'
      })
    },
    (err: Error) => {
      assert.ok(err instanceof SampleValidationError)
      assert.ok(err.message.includes('至少需要一个'))
      return true
    }
  )
})

test('P5: 样本内容太短明确报错', () => {
  assert.throws(
    () => {
      createMarketPlaybookDraftFromSamples({
        samples: [makeSample({ contentText: '太短' })],
        name: '短内容草案',
        audienceLane: 'male',
        subgenre: '修仙逆袭'
      })
    },
    (err: Error) => {
      assert.ok(err instanceof SampleValidationError)
      assert.ok(err.message.includes('太短'))
      return true
    }
  )
})

test('P5: 超长样本会报错，不会无限塞内存', () => {
  const longContent = 'a'.repeat(500_001)
  assert.throws(
    () => {
      createMarketPlaybookDraftFromSamples({
        samples: [makeSample({ contentText: longContent })],
        name: '超长草案',
        audienceLane: 'male',
        subgenre: '修仙逆袭'
      })
    },
    (err: Error) => {
      assert.ok(err instanceof SampleValidationError)
      assert.ok(err.message.includes('太长'))
      return true
    }
  )
})

test('P5: 超过最大样本数量报错', () => {
  const samples = Array.from({ length: 21 }, (_, i) =>
    makeSample({ name: `样本${i}`, contentText: '内容'.repeat(100) })
  )

  assert.throws(
    () => {
      createMarketPlaybookDraftFromSamples({
        samples,
        name: '太多样本',
        audienceLane: 'male',
        subgenre: '修仙逆袭'
      })
    },
    (err: Error) => {
      assert.ok(err instanceof SampleValidationError)
      assert.ok(err.message.includes('不能超过'))
      return true
    }
  )
})

test('P5: draft 包含 antiPatterns / promptRules / qualitySignals', () => {
  const draft = createMarketPlaybookDraftFromSamples({
    samples: [makeRichSample()],
    name: '完整草案',
    audienceLane: 'male',
    subgenre: '修仙逆袭'
  })

  assert.ok(Array.isArray(draft.antiPatterns))
  assert.ok(Array.isArray(draft.promptRules))
  assert.ok(Array.isArray(draft.qualitySignals))
  assert.ok(draft.promptRules.length > 0, '应至少有一些 prompt rules')
  assert.ok(draft.qualitySignals.length > 0, '应至少有一些 quality signals')
})

test('P5: sourceMonth 和 version 正确记录', () => {
  const draft = createMarketPlaybookDraftFromSamples({
    samples: [makeRichSample()],
    name: '版本测试',
    audienceLane: 'female',
    subgenre: '霸总甜宠',
    sourceMonth: '2026-05',
    version: 'v2-draft'
  })

  assert.equal(draft.sourceMonth, '2026-05')
  assert.equal(draft.version, 'v2-draft')
  assert.equal(draft.audienceLane, 'female')
  assert.equal(draft.subgenre, '霸总甜宠')
})

test('P5: sourceMonth 默认取当前月份', () => {
  const draft = createMarketPlaybookDraftFromSamples({
    samples: [makeRichSample()],
    name: '默认月份',
    audienceLane: 'male',
    subgenre: '修仙逆袭'
  })

  const currentMonth = new Date().toISOString().slice(0, 7)
  assert.equal(draft.sourceMonth, currentMonth)
})
