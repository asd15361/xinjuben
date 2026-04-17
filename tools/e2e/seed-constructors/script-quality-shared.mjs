import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { inspectScreenplayQualityBatch } from '../../../src/shared/domain/script/screenplay-quality.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const FIXTURE_TIMESTAMP = '2026-03-27T00:00:00.000Z'

// ─────────────────────────────────────────────
// Store I/O helpers
// ─────────────────────────────────────────────

export async function readProjectStoreWithRetry(projectFile, retries = 10) {
  let lastError = null
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const raw = await fs.readFile(projectFile, 'utf8')
      return JSON.parse(raw)
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)))
    }
  }
  throw lastError || new Error(`read_store_failed:${projectFile}`)
}

export async function waitForProject(projectFile, predicate, timeoutMs, label) {
  const startedAt = Date.now()
  let lastProject = null
  while (Date.now() - startedAt < timeoutMs) {
    lastProject = await readProjectStoreWithRetry(projectFile).catch(() => null)
    if (lastProject && (await predicate(lastProject))) {
      return lastProject
    }
    await new Promise((resolve) => setTimeout(resolve, 1200))
  }
  const snapshot = {
    stage: lastProject?.stage || null,
    generationStatus: lastProject?.generationStatus || null,
    scriptDraft: lastProject?.scriptDraft?.length || 0,
    issues: lastProject?.scriptStateLedger?.postflight?.issues || [],
    detailedOutlineSegments: lastProject?.detailedOutlineSegments?.length || 0
  }
  throw new Error(`${label}_timeout:${timeoutMs}:${JSON.stringify(snapshot)}`)
}

export async function saveArtifact(outDir, name, data) {
  const filePath = path.join(outDir, `${name}.json`)
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
  return filePath
}

// ─────────────────────────────────────────────
// Seed preparation
// ─────────────────────────────────────────────

export async function prepareSeedOutDir(repoRoot, caseId) {
  const { prepareE2EOutDir } = await import('../e2e-output.mjs')
  // repoRoot must be project root (D:\project\xinjuben), not tools/ subdirectory
  const { outDir, userDataDir } = await prepareE2EOutDir(repoRoot, `sq-${caseId}`, {
    keepLatestPerFamily: 12
  })
  const workspaceDir = path.join(userDataDir, 'workspace')
  await fs.mkdir(workspaceDir, { recursive: true })
  return { outDir, userDataDir, workspaceDir }
}

export async function writeSeedProject(userDataDir, project) {
  const workspaceDir = path.join(userDataDir, 'workspace')
  await fs.mkdir(workspaceDir, { recursive: true })
  const storePath = path.join(workspaceDir, 'projects.json')
  await fs.writeFile(
    storePath,
    JSON.stringify({ projects: { [project.id]: project } }, null, 2),
    'utf8'
  )
  return { storePath, projectId: project.id, projectName: project.name }
}

// ─────────────────────────────────────────────
// Quality judgment
// ─────────────────────────────────────────────

export function judgeScript(project) {
  const scene = project?.scriptDraft?.[0] || null
  const issues = project?.scriptStateLedger?.postflight?.issues || []
  const text = [scene?.action || '', scene?.dialogue || '', scene?.emotion || ''].join(' ')
  const quality =
    scene &&
    issues.length === 0 &&
    /逼|压|代价|钩|下一|立刻|马上|今晚|日落|带走|撞门|抓走/.test(text) &&
    text.length > 300
      ? '好'
      : scene && text.length > 180
        ? '中'
        : '弱'

  return {
    quality,
    issueCount: issues.length,
    totalLength: text.length,
    hasStrongHook: /下一|立刻|马上|今晚|日落|带走|撞门|抓走/.test(text),
    hasPressure: /逼|压|代价/.test(text),
    firstScene: scene
      ? {
          sceneNo: scene.sceneNo,
          actionLength: (scene.action || '').length,
          dialogueLength: (scene.dialogue || '').length,
          emotionLength: (scene.emotion || '').length,
          hasAction: Boolean(scene.action?.trim()),
          hasDialogue: Boolean(scene.dialogue?.trim()),
          hasEmotion: Boolean(scene.emotion?.trim())
        }
      : null
  }
}

export function summarizeOfficialQuality(project) {
  const report = inspectScreenplayQualityBatch(project?.scriptDraft || [])

  return {
    pass: report.pass,
    episodeCount: report.episodeCount,
    passedEpisodes: report.passedEpisodes,
    averageCharCount: report.averageCharCount,
    weakEpisodeCount: report.weakEpisodes.length,
    weakEpisodes: report.weakEpisodes.map((episode) => ({
      sceneNo: episode.sceneNo,
      charCount: episode.charCount,
      sceneCount: episode.sceneCount,
      rosterCount: episode.rosterCount,
      actionCount: episode.actionCount,
      dialogueCount: episode.dialogueCount,
      hookLine: episode.hookLine,
      problems: [...episode.problems]
    }))
  }
}

// ─────────────────────────────────────────────
// Plan snapshot extraction
// ─────────────────────────────────────────────

export function extractPlanEvidence(project) {
  return {
    stage: project?.stage || null,
    generationStatus: project?.generationStatus || null,
    scriptProgressBoard: project?.scriptProgressBoard || null,
    scriptFailureResolution: project?.scriptFailureResolution || null,
    scriptStateLedger: project?.scriptStateLedger || null,
    scriptDraftCount: (project?.scriptDraft || []).length,
    episodeStatuses: project?.scriptProgressBoard?.episodeStatuses || []
  }
}

// ─────────────────────────────────────────────
// Case result builder
// ─────────────────────────────────────────────

export function buildCaseResult(
  caseId,
  path,
  sampleType,
  evidence,
  judge,
  generationResult,
  finalProject = null
) {
  const planReady = Boolean(evidence?.plan?.ready)
  const blockedBy = evidence?.plan?.blockedBy || []
  const generationSuccess = Boolean(generationResult?.success)
  const scriptSaved = Boolean(evidence?.afterSaveScriptDraft)
  const runtimeSaved = Boolean(evidence?.afterSaveRuntimeState)
  const issueCount = judge?.issueCount ?? -1
  const officialQuality = summarizeOfficialQuality(finalProject)
  const qualityVerdict =
    !planReady || blockedBy.length > 0 || !generationSuccess || !scriptSaved || !runtimeSaved
      ? 'FAIL'
      : officialQuality.pass
        ? 'PASS'
        : 'FAIL'

  let failureLayer = 'none'
  if (qualityVerdict === 'FAIL') {
    if (!planReady || blockedBy.length > 0) failureLayer = 'prompt'
    else if (!generationSuccess) failureLayer = 'batch'
    else if (!scriptSaved || !runtimeSaved) failureLayer = 'save_chain'
    else failureLayer = 'postflight'
  }

  return {
    case_id: caseId,
    path,
    sample_type: sampleType,
    plan_ready: planReady,
    blockedBy: blockedBy.length,
    generation_success: generationSuccess,
    script_saved: scriptSaved,
    runtime_saved: runtimeSaved,
    issue_count: issueCount,
    weak_episode_count: officialQuality.weakEpisodeCount,
    quality_verdict: qualityVerdict,
    repair_applied: Boolean(evidence?.repairAttempted),
    failure_layer: failureLayer,
    officialQuality,
    judge: judge || null,
    generationResult: generationResult || null,
    planEvidence: evidence?.plan || null,
    snapshots: {
      beforeSeed: evidence?.beforeSeed || null,
      afterPlan: evidence?.afterPlan || null,
      afterSaveScriptDraft: evidence?.afterSaveScriptDraft || null,
      afterSaveRuntimeState: evidence?.afterSaveRuntimeState || null
    }
  }
}
