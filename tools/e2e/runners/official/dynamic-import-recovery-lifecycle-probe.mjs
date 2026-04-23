import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { buildEvidencePath } from '../../utils/evidence-routing.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..', '..', '..', '..')

const probePath = __filename
const recoveryModulePath = path.join(
  repoRoot,
  'src',
  'renderer',
  'src',
  'app',
  'utils',
  'dynamic-import-recovery.ts'
)
const recoveryTestPath = path.join(
  repoRoot,
  'src',
  'renderer',
  'src',
  'app',
  'utils',
  'dynamic-import-recovery.test.ts'
)
const mainPath = path.join(repoRoot, 'src', 'renderer', 'src', 'main.tsx')
const appShellPath = path.join(repoRoot, 'src', 'renderer', 'src', 'app', 'shell', 'AppShell.tsx')
const stageViewportPath = path.join(
  repoRoot,
  'src',
  'renderer',
  'src',
  'app',
  'shell',
  'StageViewport.tsx'
)
const errorBoundaryPath = path.join(
  repoRoot,
  'src',
  'renderer',
  'src',
  'components',
  'ErrorBoundary.tsx'
)
const rendererRoot = path.join(repoRoot, 'src', 'renderer', 'src')

const command =
  'node --no-warnings tools/e2e/runners/official/dynamic-import-recovery-lifecycle-probe.mjs'
const reservedEvidencePath = buildEvidencePath('probe-dynamic-import-recovery-lifecycle')

function fail(detail, options = {}) {
  const error = new Error(detail)
  error.excerpts = options.excerpts ?? []
  error.sourceFiles = options.sourceFiles ?? []
  throw error
}

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/')
}

function buildLineSnippet(source, pattern, relativePath, context = 1) {
  const lines = source.split(/\r?\n/)
  const lineIndex = lines.findIndex((line) => pattern.test(line))
  if (lineIndex === -1) {
    return []
  }

  const start = Math.max(0, lineIndex - context)
  const end = Math.min(lines.length - 1, lineIndex + context)
  return lines.slice(start, end + 1).map((line, offset) => {
    return `${relativePath}:${start + offset + 1} ${line.trimEnd()}`
  })
}

function walkRendererSource(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkRendererSource(absolutePath))
      continue
    }

    if (!entry.isFile()) continue
    if (!/\.(ts|tsx)$/.test(entry.name)) continue
    if (/\.test\./.test(entry.name)) continue
    files.push(absolutePath)
  }

  return files
}

function findRendererHits(pattern) {
  return walkRendererSource(rendererRoot)
    .filter((filePath) => fs.readFileSync(filePath, 'utf8').match(pattern))
    .map((filePath) => toRepoRelative(filePath))
    .sort()
}

function buildCheck(name, run) {
  try {
    return {
      name,
      status: 'pass',
      ...run()
    }
  } catch (error) {
    return {
      name,
      status: 'fail',
      detail: error instanceof Error ? error.message : String(error),
      excerpts: Array.isArray(error?.excerpts) ? error.excerpts : [],
      sourceFiles: Array.isArray(error?.sourceFiles) ? error.sourceFiles : []
    }
  }
}

function runCommand(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
    stdio: 'pipe'
  })

  return {
    ok: result.status === 0,
    code: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  }
}

function summarizeOutput(stdout, stderr) {
  return `${stdout}\n${stderr}`
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
}

function buildLifecycleSourceTestCheck() {
  return buildCheck('lifecycle_source_tests_prove_suppression_and_rearm', () => {
    const result = runCommand(['--no-warnings', '--test', toRepoRelative(recoveryTestPath)])
    const lines = summarizeOutput(result.stdout, result.stderr)
    const requiredTestNames = [
      'attemptDynamicImportRecovery returns reloaded, suppressed, and ignored in the expected cases',
      'installDynamicImportRecoveryLifecycle does not clear the reload flag on startup or register any load-based rearm',
      'installDynamicImportRecoveryLifecycle suppresses repeated auto-reload until an explicit success ACK rearms it'
    ]
    const missingTestNames = requiredTestNames.filter(
      (testName) => !lines.some((line) => line.includes(testName))
    )

    if (!result.ok || missingTestNames.length > 0) {
      fail(
        'Source-level lifecycle tests did not prove reload suppression and explicit-success ACK rearm.',
        {
          sourceFiles: [toRepoRelative(recoveryTestPath), toRepoRelative(recoveryModulePath)],
          excerpts: lines
            .slice(-12)
            .concat(missingTestNames.map((testName) => `missing_test=${testName}`))
        }
      )
    }

    return {
      detail:
        'Source-level lifecycle tests passed for one-shot suppression, no startup/load-based rearm, and fresh recovery only after an explicit success ACK.',
      excerpts: lines.filter((line) => requiredTestNames.some((name) => line.includes(name))),
      sourceFiles: [toRepoRelative(recoveryTestPath), toRepoRelative(recoveryModulePath)]
    }
  })
}

function buildExplicitSuccessAckAuthorityCheck(
  recoverySource,
  appShellSource,
  stageViewportSource
) {
  return buildCheck('explicit_success_ack_is_the_only_rearm_path', () => {
    const recoveryUtilityPath = toRepoRelative(recoveryModulePath)
    const expectedAppShellPath = toRepoRelative(appShellPath)
    const expectedStageViewportPath = toRepoRelative(stageViewportPath)

    if (!recoverySource.includes('acknowledgeDynamicImportRecoverySuccess(')) {
      fail('dynamic-import-recovery.ts must keep an explicit success ACK rearm path.', {
        sourceFiles: [recoveryUtilityPath]
      })
    }

    if (recoverySource.includes("addEventListener('load'")) {
      fail('dynamic-import-recovery.ts must not rearm recovery from window load.', {
        sourceFiles: [recoveryUtilityPath]
      })
    }

    if (!appShellSource.includes('useDynamicImportRecoverySuccessAck(')) {
      fail('AppShell.tsx lost the success ACK hook for the home-shell lazy success path.', {
        sourceFiles: [expectedAppShellPath]
      })
    }

    if (!stageViewportSource.includes('useDynamicImportRecoverySuccessAck(')) {
      fail('StageViewport.tsx lost the success ACK hook for stage lazy success paths.', {
        sourceFiles: [expectedStageViewportPath]
      })
    }

    return {
      detail:
        'Recovery rearm stays fail-closed: no load-based rearm, only explicit success ACK from real lazy-success surfaces.',
      excerpts: [
        ...buildLineSnippet(
          recoverySource,
          /acknowledgeDynamicImportRecoverySuccess\(/,
          recoveryUtilityPath,
          2
        ),
        ...buildLineSnippet(
          appShellSource,
          /useDynamicImportRecoverySuccessAck\(/,
          expectedAppShellPath,
          2
        ),
        ...buildLineSnippet(
          stageViewportSource,
          /useDynamicImportRecoverySuccessAck\(/,
          expectedStageViewportPath,
          2
        )
      ],
      sourceFiles: [recoveryUtilityPath, expectedAppShellPath, expectedStageViewportPath]
    }
  })
}

function buildGlobalListenerAuthorityCheck(recoverySource, mainSource, errorBoundarySource) {
  return buildCheck('global_listener_is_only_automatic_recovery_authority', () => {
    const recoveryUtilityPath = toRepoRelative(recoveryModulePath)
    const expectedMainPath = toRepoRelative(mainPath)
    const expectedBoundaryPath = toRepoRelative(errorBoundaryPath)
    const errorListenerHits = findRendererHits(/addEventListener\('error'/)
    const rejectionListenerHits = findRendererHits(/addEventListener\('unhandledrejection'/)
    const installerCallHits = findRendererHits(/installDynamicImportRecoveryLifecycle\(\{/)
    const recoveryAttemptCount =
      recoverySource.match(/\battemptDynamicImportRecovery\s*\(/g)?.length ?? 0

    if (JSON.stringify(errorListenerHits) !== JSON.stringify([recoveryUtilityPath])) {
      fail('window.error listener registration escaped the recovery lifecycle utility.', {
        sourceFiles: errorListenerHits,
        excerpts: errorListenerHits
      })
    }

    if (JSON.stringify(rejectionListenerHits) !== JSON.stringify([recoveryUtilityPath])) {
      fail(
        'window.unhandledrejection listener registration escaped the recovery lifecycle utility.',
        {
          sourceFiles: rejectionListenerHits,
          excerpts: rejectionListenerHits
        }
      )
    }

    if (JSON.stringify(installerCallHits) !== JSON.stringify([expectedMainPath])) {
      fail(
        'main.tsx is no longer the sole non-test installer of the dynamic import recovery lifecycle.',
        {
          sourceFiles: installerCallHits,
          excerpts: installerCallHits
        }
      )
    }

    if (recoveryAttemptCount !== 3) {
      fail(
        'dynamic-import-recovery.ts should own the three attemptDynamicImportRecovery decision points.',
        {
          sourceFiles: [recoveryUtilityPath],
          excerpts: [`attemptDynamicImportRecovery count=${String(recoveryAttemptCount)}`]
        }
      )
    }

    if (
      errorBoundarySource.includes('installDynamicImportRecoveryLifecycle(') ||
      errorBoundarySource.includes('attemptDynamicImportRecovery(') ||
      errorBoundarySource.includes("addEventListener('error'") ||
      errorBoundarySource.includes("addEventListener('unhandledrejection'")
    ) {
      fail('ErrorBoundary.tsx must stay out of the automatic recovery authority chain.', {
        sourceFiles: [expectedBoundaryPath]
      })
    }

    return {
      detail:
        'Automatic recovery stays in the dedicated lifecycle utility, and main.tsx is the only non-test installer of that global listener chain.',
      excerpts: [
        ...buildLineSnippet(recoverySource, /addEventListener\('error'/, recoveryUtilityPath, 2),
        ...buildLineSnippet(
          recoverySource,
          /addEventListener\('unhandledrejection'/,
          recoveryUtilityPath,
          2
        ),
        ...buildLineSnippet(
          mainSource,
          /installDynamicImportRecoveryLifecycle\(\{/,
          expectedMainPath,
          3
        )
      ],
      sourceFiles: [recoveryUtilityPath, expectedMainPath]
    }
  })
}

function buildErrorBoundaryAuthorityCheck(errorBoundarySource) {
  return buildCheck('error_boundary_does_not_trigger_reload', () => {
    const expectedBoundaryPath = toRepoRelative(errorBoundaryPath)
    const lines = errorBoundarySource.split(/\r?\n/)
    const onClickLine = lines.findIndex((line) => line.includes('onClick={() => {'))
    const reloadLine = lines.findIndex((line) => line.includes('reloadCurrentRendererResources()'))
    const reloadCallCount = lines.filter((line) =>
      line.includes('reloadCurrentRendererResources()')
    ).length

    if (
      reloadCallCount !== 1 ||
      onClickLine === -1 ||
      reloadLine === -1 ||
      reloadLine <= onClickLine
    ) {
      fail('ErrorBoundary.tsx should only expose manual reload from its click handler.', {
        sourceFiles: [expectedBoundaryPath]
      })
    }

    if (!errorBoundarySource.includes('public static getDerivedStateFromError')) {
      fail('ErrorBoundary.tsx lost getDerivedStateFromError lifecycle handling.', {
        sourceFiles: [expectedBoundaryPath]
      })
    }

    if (!errorBoundarySource.includes('public componentDidCatch')) {
      fail('ErrorBoundary.tsx lost componentDidCatch lifecycle logging.', {
        sourceFiles: [expectedBoundaryPath]
      })
    }

    if (!errorBoundarySource.includes('onClick={() => {')) {
      fail('ErrorBoundary.tsx no longer gates stored recovery behind an explicit click.', {
        sourceFiles: [expectedBoundaryPath]
      })
    }

    return {
      detail:
        'ErrorBoundary stays passive during catch/render lifecycle work and only exposes a manual reload branch inside the retry click handler.',
      excerpts: [
        ...buildLineSnippet(
          errorBoundarySource,
          /public static getDerivedStateFromError/,
          expectedBoundaryPath,
          2
        ),
        ...buildLineSnippet(
          errorBoundarySource,
          /public componentDidCatch/,
          expectedBoundaryPath,
          2
        ),
        ...buildLineSnippet(errorBoundarySource, /onClick=\{\(\) => \{/, expectedBoundaryPath, 6)
      ],
      sourceFiles: [expectedBoundaryPath]
    }
  })
}

function main() {
  const recoverySource = fs.readFileSync(recoveryModulePath, 'utf8')
  const mainSource = fs.readFileSync(mainPath, 'utf8')
  const appShellSource = fs.readFileSync(appShellPath, 'utf8')
  const stageViewportSource = fs.readFileSync(stageViewportPath, 'utf8')
  const errorBoundarySource = fs.readFileSync(errorBoundaryPath, 'utf8')

  const checks = [
    buildLifecycleSourceTestCheck(),
    buildExplicitSuccessAckAuthorityCheck(recoverySource, appShellSource, stageViewportSource),
    buildGlobalListenerAuthorityCheck(recoverySource, mainSource, errorBoundarySource),
    buildErrorBoundaryAuthorityCheck(errorBoundarySource)
  ]
  const failedChecks = checks.filter((check) => check.status === 'fail')

  const verdict = {
    layer: 'probe',
    runner: 'dynamic_import_recovery_lifecycle_probe',
    status: failedChecks.length === 0 ? 'pass' : 'fail',
    command,
    reservedEvidencePath,
    detail:
      failedChecks.length === 0
        ? 'Dynamic import recovery lifecycle source probe passed.'
        : `Dynamic import recovery lifecycle source probe failed in ${failedChecks.map((check) => check.name).join(', ')}.`,
    sourceTruth: [
      toRepoRelative(probePath),
      toRepoRelative(recoveryTestPath),
      toRepoRelative(recoveryModulePath),
      toRepoRelative(mainPath),
      toRepoRelative(errorBoundaryPath)
    ],
    checks,
    invariant:
      'Persistent mismatch suppression, verified-success rearm, and recovery authority ownership are reported independently inside this probe.'
  }

  console.log(JSON.stringify(verdict, null, 2))

  if (failedChecks.length > 0) {
    process.exitCode = 1
  }
}

main()
