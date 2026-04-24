import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  SCREENPLAY_FORMAT_RULES,
  SCREENPLAY_FORMAT_ANTI_PATTERNS,
  buildScreenplayFormatInstruction,
  detectFormatIssues,
  getFormatRepairHintByAntiPatternId,
  isSceneHeadingValid,
  hasQuotedDialogue
} from './screenplay-format-policy.ts'

describe('screenplay-format-policy', () => {
  describe('SCREENPLAY_FORMAT_RULES', () => {
    it('has at least 8 rules', () => {
      assert.ok(SCREENPLAY_FORMAT_RULES.length >= 8)
    })

    it('each rule has repairHint', () => {
      for (const rule of SCREENPLAY_FORMAT_RULES) {
        assert.ok(rule.repairHint.length > 5, `${rule.id} repairHint too short`)
      }
    })

    it('contains no_quotes_for_dialogue', () => {
      const rule = SCREENPLAY_FORMAT_RULES.find((r) => r.id === 'no_quotes_for_dialogue')
      assert.ok(rule)
      assert.ok(rule!.wrongExample.includes('"'))
      assert.ok(!rule!.correctExample.includes('"'))
    })

    it('contains scene_heading_clear', () => {
      const rule = SCREENPLAY_FORMAT_RULES.find((r) => r.id === 'scene_heading_clear')
      assert.ok(rule)
      assert.ok(rule!.correctExample.includes('1-1'))
    })

    it('contains no_director_camera', () => {
      const rule = SCREENPLAY_FORMAT_RULES.find((r) => r.id === 'no_director_camera')
      assert.ok(rule)
      assert.ok(rule!.detectableMarkers?.length > 0 || rule!.wrongExample.includes('特写'))
    })
  })

  describe('SCREENPLAY_FORMAT_ANTI_PATTERNS', () => {
    it('has anti-patterns with detectable markers', () => {
      assert.ok(SCREENPLAY_FORMAT_ANTI_PATTERNS.length >= 4)
    })

    it('contains quoted_dialogue anti-pattern', () => {
      const pattern = SCREENPLAY_FORMAT_ANTI_PATTERNS.find((p) => p.id === 'quoted_dialogue')
      assert.ok(pattern)
      assert.ok(pattern!.detectableMarkers.some((m) => m === '"' || m === '"'))
    })

    it('contains camera_directions anti-pattern', () => {
      const pattern = SCREENPLAY_FORMAT_ANTI_PATTERNS.find((p) => p.id === 'camera_directions')
      assert.ok(pattern)
      assert.ok(pattern!.detectableMarkers.includes('特写'))
    })
  })

  describe('buildScreenplayFormatInstruction', () => {
    it('generates instruction with episode and scene count', () => {
      const instruction = buildScreenplayFormatInstruction({
        episodeNo: 3,
        sceneCount: 4
      })
      assert.ok(instruction.includes('第3集'))
      assert.ok(instruction.includes('4场'))
      assert.ok(instruction.includes('对话不用双引号'))
    })
  })

  describe('detectFormatIssues', () => {
    it('detects quoted dialogue', () => {
      const text = '林晚：\n"你也配？"\n张三：\n"我不服。"'
      const issues = detectFormatIssues(text)
      const quotedIssue = issues.find((i) => i.antiPatternId === 'quoted_dialogue')
      assert.ok(quotedIssue)
      assert.ok(quotedIssue!.occurrences.length >= 1)
    })

    it('detects camera directions', () => {
      const text = '特写：镜头缓缓推进，对准林晚的脸'
      const issues = detectFormatIssues(text)
      const cameraIssue = issues.find((i) => i.antiPatternId === 'camera_directions')
      assert.ok(cameraIssue)
    })

    it('returns empty for clean text', () => {
      const text = '1-1 林家客厅 日内\n△林晚走进来\n林晚：\n你也配？'
      const issues = detectFormatIssues(text)
      assert.strictEqual(issues.length, 0)
    })
  })

  describe('getFormatRepairHintByAntiPatternId', () => {
    it('returns hint for valid anti-pattern', () => {
      const hint = getFormatRepairHintByAntiPatternId('quoted_dialogue')
      assert.ok(hint.includes('删除'))
    })

    it('throws for unknown anti-pattern', () => {
      assert.throws(() => {
        getFormatRepairHintByAntiPatternId('unknown')
      }, /Unknown format anti-pattern/)
    })
  })

  describe('isSceneHeadingValid', () => {
    it('returns true for valid heading', () => {
      assert.strictEqual(isSceneHeadingValid('1-1 林家客厅 日内'), true)
      assert.strictEqual(isSceneHeadingValid('12-3 总裁办公室 夜内'), true)
    })

    it('returns false for invalid heading', () => {
      assert.strictEqual(isSceneHeadingValid('林家客厅'), false)
      assert.strictEqual(isSceneHeadingValid('第一集 客厅'), false)
      assert.strictEqual(isSceneHeadingValid(''), false)
    })
  })

  describe('hasQuotedDialogue', () => {
    it('returns true for quoted line', () => {
      assert.strictEqual(hasQuotedDialogue('林晚："你也配？"'), true)
    })

    it('returns false for unquoted line', () => {
      assert.strictEqual(hasQuotedDialogue('林晚：\n你也配？'), false)
    })

    it('returns false for action line', () => {
      assert.strictEqual(hasQuotedDialogue('△林晚走进来'), false)
    })
  })
})
