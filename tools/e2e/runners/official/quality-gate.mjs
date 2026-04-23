import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { getRunnerByName } from '../../utils/runner-taxonomy.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..', '..', '..')

const QUALITY_COMMAND = 'node tools/e2e/runners/official/quality-gate.mjs'
const AUTHORITY_COMMAND = 'node tools/e2e/runners/official/quality-gate.mjs authority:check'
const SCREENPLAY_TEST_COMMAND =
  'node --test src/shared/domain/script/screenplay-quality.test.ts src/shared/domain/script/screenplay-format.test.ts src/shared/domain/script/screenplay-repair-guard.test.ts'

function readFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath))
}

function readPackageJson() {
  return JSON.parse(readFile('package.json'))
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'pipe',
    encoding: 'utf8',
    shell: false
  })

  return {
    ok: result.status === 0,
    code: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error?.message || ''
  }
}

function runNpmScript(scriptName) {
  if (process.platform === 'win32') {
    return runCommand('cmd.exe', ['/c', 'npm.cmd', 'run', scriptName])
  }

  return runCommand('npm', ['run', scriptName])
}

function summarizeOutput(stdout, stderr, error = '') {
  const combined = `${stdout}\n${stderr}\n${error}`
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)

  return {
    excerpt: combined.slice(-12),
    lineCount: combined.length
  }
}

function parseJsonOutput(stdout) {
  const trimmed = (stdout || '').trim()
  if (!trimmed) {
    return null
  }

  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

function buildCheck(name, pass, detail, extra = {}) {
  return {
    name,
    status: pass ? 'pass' : 'fail',
    detail,
    ...extra
  }
}

function buildAuthorityVerdict() {
  const packageJson = readPackageJson()
  const qualityRunner = getRunnerByName('quality_gate')
  const authorityRunner = getRunnerByName('authority:check')
  const authorityPolicyText = fileExists('src/shared/domain/formal-fact/authority-policy.ts')
    ? readFile('src/shared/domain/formal-fact/authority-policy.ts')
    : ''

  const checks = [
    buildCheck(
      'verify:quality script',
      packageJson.scripts?.['verify:quality'] === QUALITY_COMMAND,
      packageJson.scripts?.['verify:quality'] === QUALITY_COMMAND
        ? 'package.json points verify:quality at the official quality gate entrypoint.'
        : `expected package.json scripts.verify:quality = "${QUALITY_COMMAND}".`,
      {
        command: 'npm run verify:quality',
        actual: packageJson.scripts?.['verify:quality'] || null,
        expected: QUALITY_COMMAND
      }
    ),
    buildCheck(
      'authority:check script',
      packageJson.scripts?.['authority:check'] === AUTHORITY_COMMAND,
      packageJson.scripts?.['authority:check'] === AUTHORITY_COMMAND
        ? 'package.json exposes authority:check as a real runnable command.'
        : `expected package.json scripts.authority:check = "${AUTHORITY_COMMAND}".`,
      {
        command: 'npm run authority:check',
        actual: packageJson.scripts?.['authority:check'] || null,
        expected: AUTHORITY_COMMAND
      }
    ),
    buildCheck(
      'runner taxonomy quality_gate',
      Boolean(
        qualityRunner &&
        qualityRunner.official === true &&
        qualityRunner.command === QUALITY_COMMAND &&
        Array.isArray(qualityRunner.dependsOn) &&
        qualityRunner.dependsOn.includes('authority:check')
      ),
      qualityRunner
        ? 'runner-taxonomy declares quality_gate as the official quality entrypoint and pins its dependency on authority:check.'
        : 'runner-taxonomy is missing the quality_gate runner.'
    ),
    buildCheck(
      'runner taxonomy authority:check',
      Boolean(
        authorityRunner &&
        authorityRunner.official === true &&
        authorityRunner.command === AUTHORITY_COMMAND
      ),
      authorityRunner
        ? 'runner-taxonomy declares authority:check as the quality foundation dependency.'
        : 'runner-taxonomy is missing the authority:check runner.'
    ),
    buildCheck(
      'formal authority policy',
      authorityPolicyText.includes("return stage === 'outline' && actor === 'user'") &&
        authorityPolicyText.includes(
          "fact.status === 'confirmed' && fact.declaredStage === 'outline'"
        ),
      authorityPolicyText.includes("return stage === 'outline' && actor === 'user'") &&
        authorityPolicyText.includes(
          "fact.status === 'confirmed' && fact.declaredStage === 'outline'"
        )
        ? 'code-level authority policy points formal fact ownership to the outline/user contract.'
        : 'formal authority policy is missing the outline/user ownership contract.'
    )
  ]

  const failedChecks = checks.filter((check) => check.status === 'fail')

  return {
    layer: 'authority',
    status: failedChecks.length === 0 ? 'pass' : 'fail',
    command: AUTHORITY_COMMAND,
    detail:
      failedChecks.length === 0
        ? 'Authority contract for the official quality gate is complete.'
        : `Authority contract failed in ${failedChecks.map((check) => check.name).join(', ')}.`,
    code: failedChecks.length === 0 ? 0 : 1,
    checks,
    invariant:
      'authority:check keeps quality official by aligning package scripts, taxonomy, and source authority anchors. README and archived docs are no longer part of the authority chain.'
  }
}

function buildProcessCheck(name, command, result, detailBuilder) {
  const summary = summarizeOutput(result.stdout, result.stderr, result.error)
  return {
    name,
    status: result.ok ? 'pass' : 'fail',
    command,
    code: result.code,
    detail: detailBuilder(result.ok, result.error),
    outputExcerpt: summary.excerpt,
    outputLineCount: summary.lineCount
  }
}

function buildAuthorityProcessCheck() {
  const result = runCommand('node', [
    'tools/e2e/runners/official/quality-gate.mjs',
    'authority:check'
  ])
  const parsed = parseJsonOutput(result.stdout)
  const summary = summarizeOutput(result.stdout, result.stderr, result.error)
  const pass = result.ok && parsed?.status === 'pass'

  return {
    name: 'authority',
    status: pass ? 'pass' : 'fail',
    command: AUTHORITY_COMMAND,
    code: result.code,
    detail: pass
      ? 'authority:check passed and kept the quality layer official.'
      : parsed?.detail ||
        result.error ||
        'authority:check failed or did not return structured JSON.',
    outputExcerpt: summary.excerpt,
    outputLineCount: summary.lineCount,
    authorityStatus: parsed?.status || 'fail',
    authorityVerdict: parsed
  }
}

function buildQualityVerdict() {
  const checks = [
    buildProcessCheck('typecheck', 'npm run typecheck', runNpmScript('typecheck'), (ok, error) =>
      ok ? 'typecheck passed.' : `typecheck failed${error ? `: ${error}` : '.'}`
    ),
    buildAuthorityProcessCheck(),
    buildProcessCheck(
      'screenplay-quality-tests',
      SCREENPLAY_TEST_COMMAND,
      runCommand('node', [
        '--test',
        'src/shared/domain/script/screenplay-quality.test.ts',
        'src/shared/domain/script/screenplay-format.test.ts',
        'src/shared/domain/script/screenplay-repair-guard.test.ts'
      ]),
      (ok, error) =>
        ok
          ? 'screenplay quality domain tests passed.'
          : `screenplay quality domain tests failed${error ? `: ${error}` : '.'}`
    )
  ]

  const failedChecks = checks.filter((check) => check.status === 'fail')
  const authorityVerdict =
    checks.find((check) => check.name === 'authority')?.authorityVerdict || null

  return {
    layer: 'quality',
    official: authorityVerdict?.status === 'pass',
    status: failedChecks.length === 0 ? 'pass' : 'fail',
    command: QUALITY_COMMAND,
    detail:
      failedChecks.length === 0
        ? 'Official non-E2E quality gate passed on the current trusted base.'
        : `Official non-E2E quality gate failed in ${failedChecks.map((check) => check.name).join(', ')}.`,
    code: failedChecks.length === 0 ? 0 : 1,
    checks,
    dependsOn: ['authority:check'],
    authority: authorityVerdict
      ? {
          status: authorityVerdict.status,
          command: authorityVerdict.command,
          detail: authorityVerdict.detail
        }
      : {
          status: 'fail',
          command: AUTHORITY_COMMAND,
          detail: 'authority:check did not return structured JSON.'
        },
    trustedBase: ['typecheck', 'authority:check', 'screenplay quality domain tests'],
    invariant:
      'quality is the official non-E2E structural gate and fails closed when authority:check is missing or broken.'
  }
}

function main() {
  const mode = process.argv[2] || 'quality_gate'
  const verdict = mode === 'authority:check' ? buildAuthorityVerdict() : buildQualityVerdict()
  console.log(JSON.stringify(verdict, null, 2))

  if (verdict.status === 'fail') {
    process.exitCode = 1
  }
}

main()
