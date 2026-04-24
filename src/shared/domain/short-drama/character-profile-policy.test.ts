import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  CHARACTER_PROFILE_REQUIRED_FIELDS,
  CHARACTER_PROFILE_ANTI_PATTERNS,
  buildCharacterProfileInstruction,
  detectCharacterProfileAntiPatterns,
  getCharacterProfileFieldLabels,
  checkCharacterProfileCompleteness
} from './character-profile-policy.ts'

describe('character-profile-policy', () => {
  describe('CHARACTER_PROFILE_REQUIRED_FIELDS', () => {
    it('has exactly 5 fields', () => {
      assert.strictEqual(CHARACTER_PROFILE_REQUIRED_FIELDS.length, 5)
    })

    it('contains all five elements', () => {
      const ids = CHARACTER_PROFILE_REQUIRED_FIELDS.map((f) => f.id)
      assert.ok(ids.includes('appearance'))
      assert.ok(ids.includes('personality'))
      assert.ok(ids.includes('identity'))
      assert.ok(ids.includes('values'))
      assert.ok(ids.includes('plotFunction'))
    })

    it('each field has description and antiPattern', () => {
      for (const field of CHARACTER_PROFILE_REQUIRED_FIELDS) {
        assert.ok(field.description.length > 0, `${field.id} missing description`)
        assert.ok(field.antiPattern.length > 0, `${field.id} missing antiPattern`)
        assert.ok(field.coreQuestion.length > 0, `${field.id} missing coreQuestion`)
        assert.ok(field.goodExample.length > 0, `${field.id} missing goodExample`)
      }
    })
  })

  describe('CHARACTER_PROFILE_ANTI_PATTERNS', () => {
    it('has anti-patterns', () => {
      assert.ok(CHARACTER_PROFILE_ANTI_PATTERNS.length >= 4)
    })

    it('contains plot_summary_masquerade', () => {
      const pattern = CHARACTER_PROFILE_ANTI_PATTERNS.find(
        (p) => p.id === 'plot_summary_masquerade'
      )
      assert.ok(pattern)
      assert.ok(pattern!.detectableMarkers.includes('第'))
      assert.ok(pattern!.detectableMarkers.includes('集'))
    })

    it('contains tool_person', () => {
      const pattern = CHARACTER_PROFILE_ANTI_PATTERNS.find((p) => p.id === 'tool_person')
      assert.ok(pattern)
      assert.ok(pattern!.repairDirection.includes('自己的欲望'))
    })
  })

  describe('buildCharacterProfileInstruction', () => {
    it('generates instruction for protagonist', () => {
      const instruction = buildCharacterProfileInstruction({
        characterName: '林晚',
        roleLayer: 'core',
        isAntagonist: false
      })
      assert.ok(instruction.includes('林晚'))
      assert.ok(instruction.includes('五要素'))
      assert.ok(instruction.includes('外在形象'))
      assert.ok(instruction.includes('性格特征'))
      assert.ok(instruction.includes('身份处境'))
      assert.ok(instruction.includes('价值观'))
      assert.ok(instruction.includes('剧情功能'))
    })

    it('generates instruction for antagonist', () => {
      const instruction = buildCharacterProfileInstruction({
        characterName: '赵总',
        roleLayer: 'core',
        isAntagonist: true
      })
      assert.ok(instruction.includes('反派'))
      assert.ok(instruction.includes('赵总'))
    })

    it('includes known info when provided', () => {
      const instruction = buildCharacterProfileInstruction({
        characterName: '林晚',
        roleLayer: 'core',
        knownInfo: {
          appearance: '28岁，短发',
          values: '有仇必报'
        }
      })
      assert.ok(instruction.includes('28岁，短发'))
      assert.ok(instruction.includes('有仇必报'))
    })
  })

  describe('detectCharacterProfileAntiPatterns', () => {
    it('detects plot summary markers', () => {
      const text = '林晚在第三集发现了真相，接着她去找到了证据'
      const detected = detectCharacterProfileAntiPatterns(text)
      const ids = detected.map((d) => d.id)
      assert.ok(ids.includes('plot_summary_masquerade'))
    })

    it('detects tool person markers', () => {
      const text = '这个角色的功能是帮助主角找到线索，给主角提供信息'
      const detected = detectCharacterProfileAntiPatterns(text)
      const ids = detected.map((d) => d.id)
      assert.ok(ids.includes('tool_person'))
    })

    it('returns empty for clean text', () => {
      const text = '林晚，28岁，性格冷静，信奉有仇必报'
      const detected = detectCharacterProfileAntiPatterns(text)
      assert.strictEqual(detected.length, 0)
    })
  })

  describe('getCharacterProfileFieldLabels', () => {
    it('returns 5 labels', () => {
      const labels = getCharacterProfileFieldLabels()
      assert.strictEqual(labels.length, 5)
      assert.ok(labels.includes('外在形象'))
      assert.ok(labels.includes('剧情功能'))
    })
  })

  describe('checkCharacterProfileCompleteness', () => {
    it('detects missing fields', () => {
      const text = '外在形象：林晚28岁。性格特征：冷静。'
      const result = checkCharacterProfileCompleteness(text)
      const identityField = result.find((r) => r.fieldId === 'identity')
      const plotFunctionField = result.find((r) => r.fieldId === 'plotFunction')
      assert.strictEqual(identityField!.present, false)
      assert.strictEqual(plotFunctionField!.present, false)
    })

    it('detects present fields', () => {
      const text = '外在形象：林晚28岁。性格特征：冷静。身份处境：保安。价值观：有仇必报。剧情功能：推动主线。'
      const result = checkCharacterProfileCompleteness(text)
      assert.ok(result.every((r) => r.present))
    })
  })
})
