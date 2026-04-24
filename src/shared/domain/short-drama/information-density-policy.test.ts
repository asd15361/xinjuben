import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  INFORMATION_DENSITY_RULES,
  INFORMATION_DENSITY_CHECKPOINTS,
  buildInformationDensityInstruction,
  getRepairHintByRuleId,
  getAllRepairHints,
  detectExpositionLines,
  checkSceneInformationDensity
} from './information-density-policy.ts'

describe('information-density-policy', () => {
  describe('INFORMATION_DENSITY_RULES', () => {
    it('has exactly 4 rules', () => {
      assert.strictEqual(INFORMATION_DENSITY_RULES.length, 4)
    })

    it('each rule has repairHint', () => {
      for (const rule of INFORMATION_DENSITY_RULES) {
        assert.ok(rule.repairHint.length > 10, `${rule.id} repairHint too short`)
        assert.ok(rule.goodExample.length > 10, `${rule.id} goodExample too short`)
        assert.ok(rule.badExample.length > 10, `${rule.id} badExample too short`)
      }
    })

    it('contains all four techniques', () => {
      const ids = INFORMATION_DENSITY_RULES.map((r) => r.id)
      assert.ok(ids.includes('conflict_over_exposition'))
      assert.ok(ids.includes('prop_as_carrier'))
      assert.ok(ids.includes('subtext_over_statement'))
      assert.ok(ids.includes('action_emotion_binding'))
    })
  })

  describe('INFORMATION_DENSITY_CHECKPOINTS', () => {
    it('has 4 checkpoints', () => {
      assert.strictEqual(INFORMATION_DENSITY_CHECKPOINTS.length, 4)
    })

    it('each checkpoint has minimum count of 1', () => {
      for (const cp of INFORMATION_DENSITY_CHECKPOINTS) {
        assert.strictEqual(cp.minimumCount, 1)
      }
    })
  })

  describe('buildInformationDensityInstruction', () => {
    it('generates instruction with episode and scene count', () => {
      const instruction = buildInformationDensityInstruction({
        episodeNo: 5,
        sceneCount: 3
      })
      assert.ok(instruction.includes('第5集'))
      assert.ok(instruction.includes('3场'))
      assert.ok(instruction.includes('冲突载体'))
      assert.ok(instruction.includes('道具载体'))
    })

    it('includes target word count when provided', () => {
      const instruction = buildInformationDensityInstruction({
        episodeNo: 1,
        sceneCount: 2,
        targetWordCount: 1200
      })
      assert.ok(instruction.includes('1200字'))
    })
  })

  describe('getRepairHintByRuleId', () => {
    it('returns repair hint for valid rule', () => {
      const hint = getRepairHintByRuleId('conflict_over_exposition')
      assert.ok(hint.includes('删掉'))
    })

    it('throws for unknown rule', () => {
      assert.throws(() => {
        getRepairHintByRuleId('unknown_rule')
      }, /Unknown information density rule/)
    })
  })

  describe('getAllRepairHints', () => {
    it('returns all repair hints as record', () => {
      const hints = getAllRepairHints()
      assert.ok(Object.keys(hints).length >= 4)
      assert.ok(hints['conflict_over_exposition'].length > 0)
      assert.ok(hints['prop_as_carrier'].length > 0)
    })
  })

  describe('detectExpositionLines', () => {
    it('detects exposition patterns', () => {
      const text = '张三：我曾经是集团千金。\n李四：你要知道，事情是这样的。\n△王五走过来'
      const lines = detectExpositionLines(text)
      assert.ok(lines.length >= 2)
      assert.ok(lines.some((l) => l.includes('我曾经是')))
    })

    it('ignores action lines', () => {
      const text = '△王五走过来\n△他曾经在这里工作'
      const lines = detectExpositionLines(text)
      assert.strictEqual(lines.length, 0)
    })
  })

  describe('checkSceneInformationDensity', () => {
    it('passes for dense scene', () => {
      const scene = '△林晚攥紧拳头，眼神冰冷\n林晚：\n你也配？\n△她从包里掉出半张照片'
      const results = checkSceneInformationDensity(scene)
      assert.ok(results.every((r) => r.passed), `Failed: ${results.filter((r) => !r.passed).map((r) => r.label).join(', ')}`)
    })

    it('fails for sparse scene', () => {
      const scene = '林晚：\n你好。\n张三：\n你好。'
      const results = checkSceneInformationDensity(scene)
      assert.ok(results.some((r) => !r.passed))
    })

    it('returns all 4 checkpoints', () => {
      const results = checkSceneInformationDensity('test')
      assert.strictEqual(results.length, 4)
    })
  })
})
