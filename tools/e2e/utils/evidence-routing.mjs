import path from 'node:path'
import { getRunnerTaxonomy } from './runner-taxonomy.mjs'

export const EVIDENCE_ROOT = '.sisyphus/evidence'

export function buildEvidencePath(key, extension = 'json') {
  return path.join(EVIDENCE_ROOT, `${key}.${extension}`)
}

export function buildLayeredEvidenceMap() {
  return {
    probe: buildEvidencePath('probe-electron-launch-smoke'),
    visible: buildEvidencePath('visible-p0-real-regression'),
    formal: buildEvidencePath('formal-contract-guard'),
    quality: buildEvidencePath('quality-non-e2e-gate')
  }
}

export function buildRunnerEvidenceMap() {
  return Object.fromEntries(
    getRunnerTaxonomy().map((runner) => [runner.name, buildEvidencePath(runner.evidenceKey)])
  )
}
