import { spawnSync } from 'node:child_process'
import { getRunnerTaxonomy } from './runner-taxonomy.mjs'
import { buildLayeredEvidenceMap, buildRunnerEvidenceMap } from './evidence-routing.mjs'

function runCommand(command, args) {
  const result = spawnSync(command, args, { stdio: 'pipe', encoding: 'utf8', shell: false })
  return {
    ok: result.status === 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    code: result.status ?? 1
  }
}

function parseJsonOutput(output) {
  const trimmed = output.trim()
  if (!trimmed) {
    return null
  }

  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

function parseKeyValueOutput(output) {
  const entries = {}
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  for (const line of lines) {
    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) continue
    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    entries[key] = value
  }

  return entries
}

function buildProbeVerdict() {
  const result = runCommand('node', ['tools/e2e/runners/official/electron_launch_smoke.mjs'])
  return {
    layer: 'probe',
    status: result.ok ? 'pass' : 'fail',
    command: 'node tools/e2e/runners/official/electron_launch_smoke.mjs',
    detail: result.ok
      ? 'Electron shell launch smoke passed.'
      : 'Electron shell launch smoke failed.',
    code: result.code
  }
}

function buildVisibleVerdict() {
  const result = runCommand('node', ['tools/e2e/runners/official/electron_p0_real_regression.mjs'])
  const output = `${result.stdout}\n${result.stderr}`
  const classificationMatch = output.match(/"classification"\s*:\s*"([^"]+)"/)
  const keyValueOutput = parseKeyValueOutput(output)
  const classification = classificationMatch?.[1] || keyValueOutput.classification || 'unknown'

  return {
    layer: 'visible',
    status: result.ok ? 'pass' : 'fail',
    command: 'node tools/e2e/runners/official/electron_p0_real_regression.mjs',
    detail: `P0 real regression completed with classification=${classification}.`,
    code: result.code,
    classification
  }
}

function buildFormalVerdict() {
  const result = runCommand('node', ['tools/e2e/runners/official/contract_guard_check.mjs'])
  return {
    layer: 'formal',
    status: result.ok ? 'pass' : 'fail',
    command: 'node tools/e2e/runners/official/contract_guard_check.mjs',
    detail: result.ok ? 'Formal contract guard passed.' : 'Formal contract guard failed.',
    code: result.code
  }
}

function buildQualityVerdict() {
  const result = runCommand('node', ['tools/e2e/runners/official/quality-gate.mjs'])
  const parsed = parseJsonOutput(result.stdout)
  const qualityRunner = getRunnerTaxonomy().find((runner) => runner.name === 'quality_gate')

  if (parsed && parsed.layer === 'quality') {
    return {
      ...parsed,
      command: qualityRunner?.command || 'node tools/e2e/runners/official/quality-gate.mjs',
      official: qualityRunner?.official === true && parsed.official === true
    }
  }

  return {
    layer: 'quality',
    status: 'fail',
    official: false,
    command: qualityRunner?.command || 'node tools/e2e/runners/official/quality-gate.mjs',
    detail: 'Quality gate did not return parseable verdict JSON.',
    code: result.code,
    checks: [],
    stdout: result.stdout,
    stderr: result.stderr
  }
}

function summarize(verdicts) {
  const quality = verdicts.find((item) => item.layer === 'quality')

  return {
    runners: getRunnerTaxonomy(),
    evidence: buildLayeredEvidenceMap(),
    runnerEvidence: buildRunnerEvidenceMap(),
    verdicts,
    overall: {
      probe: verdicts.find((item) => item.layer === 'probe')?.status || 'unknown',
      visible: verdicts.find((item) => item.layer === 'visible')?.status || 'unknown',
      formal: verdicts.find((item) => item.layer === 'formal')?.status || 'unknown',
      quality: quality?.status || 'unknown',
      authority: quality?.authority?.status || 'unknown'
    },
    invariant:
      'probe pass ≠ visible pass ≠ formal pass ≠ quality pass; quality is official only while authority:check remains green.'
  }
}

function main() {
  const verdicts = [
    buildProbeVerdict(),
    buildVisibleVerdict(),
    buildFormalVerdict(),
    buildQualityVerdict()
  ]
  console.log(JSON.stringify(summarize(verdicts), null, 2))

  const fatal = verdicts.some(
    (item) => ['probe', 'formal'].includes(item.layer) && item.status === 'fail'
  )
  if (fatal) {
    process.exitCode = 1
  }
}

main()
