import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..', '..')

function runNodeScript(relativePath) {
  return spawnSync('node', [relativePath], {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false
  })
}

function parseJsonOutput(result) {
  const stdout = (result.stdout || '').trim()
  const stderr = (result.stderr || '').trim()
  const output = stdout || stderr || `${stdout}\n${stderr}`.trim()
  assert.notEqual(output, '', 'expected command to emit JSON output')
  return JSON.parse(output)
}

test('verify:quality emits a real structured verdict based on official non-E2E checks', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))
  assert.equal(
    packageJson.scripts['verify:quality'],
    'node tools/e2e/runners/official/quality-gate.mjs'
  )

  const result = runNodeScript('tools/e2e/runners/official/quality-gate.mjs')
  const verdict = parseJsonOutput(result)

  assert.equal(verdict.layer, 'quality')
  assert.notEqual(verdict.status, 'not_ready')
  assert.equal(Array.isArray(verdict.checks), true)
  assert.ok(verdict.checks.length > 0)
  assert.equal(typeof verdict.command, 'string')
  assert.ok(verdict.command.includes('tools/e2e'))
  assert.equal(
    verdict.checks.every((check) => typeof check.name === 'string'),
    true
  )
  assert.equal(
    verdict.checks.every((check) => ['pass', 'fail'].includes(check.status)),
    true
  )
})

test('foundation verdicts consumes the real quality verdict instead of hard-coded not_ready', () => {
  const result = runNodeScript('tools/e2e/utils/foundation-verdicts.mjs')
  const summary = parseJsonOutput(result)

  const quality = summary.verdicts.find((item) => item.layer === 'quality')
  assert.ok(quality)
  assert.notEqual(quality.status, 'not_ready')
  assert.equal(quality.command, 'node tools/e2e/runners/official/quality-gate.mjs')
  assert.equal(Array.isArray(quality.checks), true)
  assert.equal(summary.overall.quality, quality.status)
})
