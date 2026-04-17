export const RUNNER_TAXONOMY = [
  {
    name: 'electron_launch_smoke',
    path: 'tools/e2e/runners/official/electron_launch_smoke.mjs',
    layer: 'probe',
    official: true,
    command: 'node tools/e2e/runners/official/electron_launch_smoke.mjs',
    evidenceKey: 'probe-electron-launch-smoke',
    notes: 'Electron shell launch smoke only; not product acceptance.'
  },
  {
    name: 'dynamic_import_recovery_lifecycle_probe',
    path: 'tools/e2e/runners/official/dynamic-import-recovery-lifecycle-probe.mjs',
    layer: 'probe',
    official: true,
    command: 'node tools/e2e/runners/official/dynamic-import-recovery-lifecycle-probe.mjs',
    evidenceKey: 'probe-dynamic-import-recovery-lifecycle',
    notes:
      'Source-level lifecycle probe for dynamic import recovery suppression, rearm, and recovery authority ownership.'
  },
  {
    name: 'electron_p0_real_regression',
    path: 'tools/e2e/runners/official/electron_p0_real_regression.mjs',
    layer: 'visible',
    official: true,
    command: 'node tools/e2e/runners/official/electron_p0_real_regression.mjs',
    evidenceKey: 'visible-p0-real-regression',
    notes:
      'Real UI path for visible result and failure classification; not formal or quality release by itself.'
  },
  {
    name: 'contract_guard_check',
    path: 'tools/e2e/runners/official/contract_guard_check.mjs',
    layer: 'formal',
    official: true,
    command: 'node tools/e2e/runners/official/contract_guard_check.mjs',
    evidenceKey: 'formal-contract-guard',
    notes: 'Static formal contract gate; required for formal release layer.'
  },
  {
    name: 'authority:check',
    path: 'tools/e2e/runners/official/quality-gate.mjs',
    layer: 'quality',
    official: true,
    command: 'node tools/e2e/runners/official/quality-gate.mjs authority:check',
    dependsOn: [],
    evidenceKey: 'quality-authority-check',
    notes:
      'Foundation contract check for the official quality gate. It keeps package scripts, taxonomy, and source authority anchors aligned. README and archived docs are no longer part of the authority chain.'
  },
  {
    name: 'quality_gate',
    path: 'tools/e2e/runners/official/quality-gate.mjs',
    layer: 'quality',
    official: true,
    command: 'node tools/e2e/runners/official/quality-gate.mjs',
    dependsOn: ['authority:check'],
    evidenceKey: 'quality-non-e2e-gate',
    notes:
      'Official non-E2E quality gate built from trusted structural checks and machine-readable verdict JSON. Depends on authority:check passing first.'
  }
]

export function getRunnerTaxonomy() {
  return RUNNER_TAXONOMY
}

export function getRunnerByLayer(layer) {
  return RUNNER_TAXONOMY.filter((runner) => runner.layer === layer)
}

export function getRunnerByName(name) {
  return RUNNER_TAXONOMY.find((runner) => runner.name === name)
}


