import test from 'node:test'
import assert from 'node:assert/strict'

import { deriveBlockedReasonFromIssue } from './stage-derivation.ts'

test('detailed outline anchor roster blocked reason points back to character stage', () => {
  const anchorRosterBlocked = deriveBlockedReasonFromIssue({
    code: 'detailed_outline_anchor_roster_missing',
    message: '详细大纲启动前，角色名册还没覆盖这些用户锚点。'
  })

  assert.equal(anchorRosterBlocked.suggestedStage, 'character')
})
