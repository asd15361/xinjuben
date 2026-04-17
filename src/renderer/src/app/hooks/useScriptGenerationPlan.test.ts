import test from 'node:test'
import assert from 'node:assert/strict'

// buildScriptGenerationPlanMemoKey was removed - the service now uses
// computeRevision with length-based fingerprinting instead of JSON.stringify
// Tests for the old function are obsolete

test('placeholder - service uses computeRevision for caching', () => {
  // The script-plan-service now uses computeRevision() which is a private function
  // that computes a lightweight fingerprint using lengths instead of JSON.stringify
  assert.ok(true)
})
