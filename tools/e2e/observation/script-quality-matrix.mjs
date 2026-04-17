/**
 * tools/e2e/observation/script-quality-matrix.mjs
 *
 * P1 Script Quality Regression Matrix — 6 cases:
 *   FS-A  fresh_start baseline
 *   FS-B  fresh_start stress
 *   RS-A  resume baseline
 *   RS-B  resume stress
 *   RW-A  rewrite baseline
 *   RW-B  rewrite+repair stress
 *
 * Run:
 *   node tools/e2e/observation/script-quality-matrix.mjs           # all 6
 *   node tools/e2e/observation/script-quality-matrix.mjs --case=fs-a  # single
 *
 * Evidence per case → tools/e2e/out/sq-{caseId}-{ts}/
 */

import path from 'node:path'
import fs from 'node:fs/promises'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright'
import { prepareE2EOutDir } from '../utils/e2e-output.mjs'
import {
  readProjectStoreWithRetry,
  saveArtifact,
  judgeScript,
  summarizeOfficialQuality,
  buildCaseResult
} from '../seed-constructors/script-quality-shared.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const GENERATION_TIMEOUT_MS = 600_000
const PROJECT_WAIT_TIMEOUT_MS = 30_000

// ─── Case definitions ────────────────────────────────────────────────────────

const CASE_DEFS = {
  'fs-a': { path: 'fresh_start', sample: 'baseline', mode: 'fresh_start' },
  'fs-b': { path: 'fresh_start', sample: 'stress', mode: 'fresh_start' },
  'rs-a': { path: 'resume', sample: 'baseline', mode: 'resume' },
  'rs-b': { path: 'resume', sample: 'stress', mode: 'resume' },
  'rw-a': { path: 'rewrite', sample: 'baseline', mode: 'rewrite' },
  'rw-b': { path: 'rewrite', sample: 'stress', mode: 'rewrite' }
}

const SEED_FNS = {
  'fs-a': () =>
    import('../seed-constructors/sq-fs-a-baseline.mjs').then((m) => m.prepareSeed(REPO_ROOT)),
  'fs-b': () =>
    import('../seed-constructors/sq-fs-b-stress.mjs').then((m) => m.prepareSeed(REPO_ROOT)),
  'rs-a': () =>
    import('../seed-constructors/sq-rs-a-baseline.mjs').then((m) => m.prepareSeed(REPO_ROOT)),
  'rs-b': () =>
    import('../seed-constructors/sq-rs-b-stress.mjs').then((m) => m.prepareSeed(REPO_ROOT)),
  'rw-a': () =>
    import('../seed-constructors/sq-rw-a-baseline.mjs').then((m) => m.prepareSeed(REPO_ROOT)),
  'rw-b': () =>
    import('../seed-constructors/sq-rw-b-stress.mjs').then((m) => m.prepareSeed(REPO_ROOT))
}

const REPO_ROOT = path.resolve(__dirname, '..', '..')

// ─── Store helpers ───────────────────────────────────────────────────────────

async function resolveActualProjectFile(app) {
  const logs = []
  app.process().stdout?.on('data', (chunk) => {
    logs.push(String(chunk))
  })
  const startedAt = Date.now()
  while (Date.now() - startedAt < 10_000) {
    const m = logs.join('').match(/e2e_store_path:(.+?projects\.json)/)
    if (m?.[1]) return m[1].trim()
    await new Promise((r) => setTimeout(r, 100))
  }
  return null
}

async function loadProjectFromStore(userDataDir, projectId) {
  const candidates = [
    path.join(userDataDir, 'workspace', 'projects.json'),
    path.join(userDataDir, '..', 'workspace', 'projects.json')
  ]
  for (const fp of candidates) {
    try {
      const store = await readProjectStoreWithRetry(fp)
      const p = store.projects?.[projectId] || null
      if (p) return { file: fp, project: p }
    } catch {
      /* try next */
    }
  }
  return { file: candidates[0], project: null }
}

// ─── Wait helpers ───────────────────────────────────────────────────────────

async function waitForProjectReady(page, timeoutMs) {
  const found = await page
    .waitForFunction(
      async () => {
        try {
          const list = await window.api.workspace.listProjects()
          return Array.isArray(list) && list.length > 0 ? list : 'loading'
        } catch {
          return 'loading'
        }
      },
      { timeout: timeoutMs }
    )
    .then((el) => el.evaluate((list) => list))
    .catch(() => null)
  return found
}

// ─── Core chain: plan → start → save ──────────────────────────────────────

async function runScriptChain(page, projectId, projectData, caseDef, caseOutDir, userDataDir) {
  const { mode } = caseDef
  const script = projectData.scriptDraft || []
  const runtimeHistory = projectData.scriptRuntimeFailureHistory || []

  // Step 1: Build plan
  let plan
  try {
    plan = await page.evaluate(
      async (payload) => {
        return await window.api.workflow.buildScriptGenerationPlan({
          plan: {
            mode: payload.mode,
            targetEpisodes: 10,
            runtimeFailureHistory: payload.runtimeHistory
          },
          storyIntent: payload.storyIntent,
          outline: payload.outline,
          characters: payload.characters,
          segments: payload.segments,
          script: payload.script
        })
      },
      {
        mode,
        storyIntent: projectData.storyIntent,
        outline: projectData.outlineDraft,
        characters: projectData.characterDrafts,
        segments: projectData.detailedOutlineSegments,
        script,
        runtimeHistory
      }
    )
  } catch (err) {
    return {
      planError: String(err),
      plan: null,
      startResult: null,
      genSuccess: false,
      draft: null,
      runtime: null
    }
  }
  await saveArtifact(caseOutDir, 'plan-snapshot', plan || {})

  if (!plan?.ready) {
    return {
      plan,
      planError: null,
      startResult: null,
      genSuccess: false,
      draft: null,
      runtime: null
    }
  }

  // Step 2: Start generation
  let startResult
  try {
    startResult = await page.evaluate(
      async (payload) => {
        return await window.api.workflow.startScriptGeneration({
          plan: payload.plan,
          outlineTitle: payload.outline.title,
          theme: payload.outline.theme,
          mainConflict: payload.outline.mainConflict,
          charactersSummary: payload.characters.map(
            (c) => `${c.name}:${c.goal || c.protectTarget || c.fear || ''}`
          ),
          storyIntent: payload.storyIntent,
          outline: payload.outline,
          characters: payload.characters,
          segments: payload.segments,
          existingScript: payload.script
        })
      },
      {
        plan,
        outline: projectData.outlineDraft,
        characters: projectData.characterDrafts,
        segments: projectData.detailedOutlineSegments,
        script,
        storyIntent: projectData.storyIntent
      }
    )
  } catch (err) {
    return {
      plan,
      planError: null,
      startResultError: String(err),
      startResult: null,
      genSuccess: false,
      draft: null,
      runtime: null
    }
  }
  await saveArtifact(caseOutDir, 'start-result', startResult || {})

  // Step 3: saveScriptDraft
  const newScenes = startResult.generatedScenes || []
  let finalScript
  if (mode === 'rewrite') {
    const limit = plan.targetEpisodes || 10
    const base = script.filter((s) => (s.episodeNo || s.sceneNo || 0) > limit)
    // new scenes replace episodes 1..limit; overflow (ep>limit) goes after
    finalScript = [...newScenes, ...base]
  } else {
    finalScript = [...script, ...newScenes]
  }

  try {
    await page.evaluate(
      async (payload) => {
        await window.api.workspace.saveScriptDraft({
          projectId: payload.projectId,
          scriptDraft: payload.scriptDraft
        })
      },
      { projectId, scriptDraft: finalScript }
    )
  } catch (err) {
    return {
      plan,
      startResult,
      genSuccess: false,
      draftError: String(err),
      draft: null,
      runtime: null
    }
  }

  await new Promise((r) => setTimeout(r, 3000))
  const draft = await loadProjectFromStore(userDataDir, projectId)
    .then(({ project }) => project)
    .catch(() => null)
  await saveArtifact(caseOutDir, 'after-saveDraft-snapshot', draft || {})

  // Step 4: saveScriptRuntimeState
  try {
    await page.evaluate(
      async (payload) => {
        await window.api.workspace.saveScriptRuntimeState({
          projectId: payload.projectId,
          scriptProgressBoard: payload.board,
          scriptFailureResolution: payload.failure,
          scriptStateLedger: payload.ledger
        })
      },
      {
        projectId,
        board: startResult.board || null,
        failure: startResult.failure || null,
        ledger: startResult.ledger || null
      }
    )
  } catch (err) {
    return {
      plan,
      startResult,
      genSuccess: startResult.success,
      draft,
      runtimeError: String(err),
      runtime: null
    }
  }

  await new Promise((r) => setTimeout(r, 3000))
  const runtime = await loadProjectFromStore(userDataDir, projectId)
    .then(({ project }) => project)
    .catch(() => null)
  await saveArtifact(caseOutDir, 'after-saveRuntime-snapshot', runtime || {})

  return { plan, startResult, genSuccess: Boolean(startResult?.success), draft, runtime }
}

// ─── Main case runner ───────────────────────────────────────────────────────

async function runCase(caseId, provider = 'mock') {
  const caseDef = CASE_DEFS[caseId]
  if (!caseDef) throw new Error(`unknown_case:${caseId}`)

  console.error(`[${caseId}] Preparing seed...`)
  const seed = await SEED_FNS[caseId]()
  const { outDir, userDataDir, projectId, projectName } = seed

  const mainEntry = path.join(REPO_ROOT, 'out', 'main', 'index.js')
  const launchEnv = {
    ...process.env,
    XINJUBEN_APP_MODE: 'e2e',
    E2E_USER_DATA_DIR: userDataDir,
    E2E_CASE_ID: `${caseId}-${Date.now().toString(36)}`
  }
  if (provider === 'mock') {
    launchEnv.MOCK_AI_ENABLE = '1'
  }
  console.error(
    `[${caseId}] Launching Electron (userDataDir=${path.basename(userDataDir)}, provider=${provider})...`
  )

  const app = await electron.launch({
    args: [mainEntry],
    env: launchEnv
  })

  let cleanup = true
  try {
    const page = await app.firstWindow()
    page.setDefaultTimeout(20_000)
    await page.waitForLoadState('domcontentloaded', { timeout: 20_000 })
    await page.setViewportSize({ width: 1440, height: 960 })
    await new Promise((r) => setTimeout(r, 2000))

    // Try to find project via API first
    const actualProjectFile = await resolveActualProjectFile(app)
    const storePath = actualProjectFile || path.join(userDataDir, 'workspace', 'projects.json')

    // Check if project exists via API
    let project = null
    try {
      project = await page
        .evaluate(async (id) => {
          return await window.api.workspace.getProject(id)
        }, projectId)
        .catch(() => null)
    } catch {
      /* ignore */
    }

    // If not found by ID, try finding by name in project list
    if (!project?.id) {
      const list = await page
        .evaluate(() => {
          try {
            return window.api.workspace.listProjects()
          } catch {
            return []
          }
        })
        .catch(() => [])
      project = (list || []).find((p) => p?.name === projectName) || null
    }

    if (!project?.id) {
      // Project not found — take screenshot and report
      await page.screenshot({
        path: path.join(outDir, `error-${caseId}-not-found.png`),
        fullPage: true
      })
      const list = await page
        .evaluate(() => {
          try {
            return window.api.workspace.listProjects()
          } catch {
            return []
          }
        })
        .catch(() => [])
      throw new Error(`project_not_found:${projectName}:${JSON.stringify(list.slice(0, 5))}`)
    }

    console.error(`[${caseId}] Project found (id=${project.id}), navigating to script stage...`)

    // Open project via home card
    const backBtn = page.getByRole('button', { name: '回到项目首页' })
    if (await backBtn.isVisible().catch(() => false)) {
      await backBtn.click()
      await new Promise((r) => setTimeout(r, 800))
    }

    const card = page.getByRole('button').filter({ hasText: projectName }).first()
    await card.waitFor({ state: 'visible', timeout: PROJECT_WAIT_TIMEOUT_MS })
    await card.click()
    await page.waitForSelector(`text=/项目：\\s*${projectName}/`, {
      timeout: PROJECT_WAIT_TIMEOUT_MS
    })
    await new Promise((r) => setTimeout(r, 1000))

    // Navigate to script stage
    const scriptTab = page
      .getByRole('button')
      .filter({ hasText: /剧本草稿/ })
      .first()
    if (await scriptTab.isVisible().catch(() => false)) {
      await scriptTab.click()
      await new Promise((r) => setTimeout(r, 800))
    }

    // Wait for script stage
    await page
      .waitForFunction(
        () => {
          const t = document.body.innerText || ''
          return t.includes('这一页只做一件事') || t.includes('生成剧本') || t.includes('剧本草稿')
        },
        { timeout: PROJECT_WAIT_TIMEOUT_MS }
      )
      .catch(() => {})

    // Snapshot before generation
    const beforeSnap = await loadProjectFromStore(userDataDir, projectId)
      .then(({ project: p }) => p)
      .catch(() => null)
    await saveArtifact(outDir, 'before-snapshot', beforeSnap || {})

    // Run plan → start → save chain
    console.error(`[${caseId}] Running script chain (mode=${caseDef.mode})...`)
    const chain = await runScriptChain(
      page,
      projectId,
      beforeSnap || {},
      caseDef,
      outDir,
      userDataDir
    )

    // With MOCK_AI_ENABLE=1, generation is synchronous. Give it 20s to flush to disk,
    // then read the final state. Also poll for script count increase as a signal.
    console.error(`[${caseId}] Waiting for generation to complete (mock mode)...`)
    const baselineScriptCount = (beforeSnap?.scriptDraft || []).length
    let finalProject = null
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((r) => setTimeout(r, 2000))
      const snap = await loadProjectFromStore(userDataDir, projectId)
        .then(({ project: p }) => p)
        .catch(() => null)
      const currentCount = (snap?.scriptDraft || []).length
      const genStatus = snap?.generationStatus?.task || 'none'
      const scriptsIncreased = currentCount > baselineScriptCount
      console.error(
        `[${caseId}] Poll ${attempt}: genStatus=${genStatus}, scripts=${currentCount} (baseline=${baselineScriptCount})`
      )
      if (snap && (scriptsIncreased || !snap.generationStatus || attempt >= 10)) {
        finalProject = snap
        break
      }
    }

    if (!finalProject) {
      finalProject = await loadProjectFromStore(userDataDir, projectId)
        .then(({ project: p }) => p)
        .catch(() => null)
    }

    // Screenshot
    await page.screenshot({ path: path.join(outDir, 'screenshot.png'), fullPage: true })

    // Postflight summary
    const judge = judgeScript(finalProject || {})
    const officialQuality = summarizeOfficialQuality(finalProject || {})
    const postflightSummary = {
      issues: finalProject?.scriptStateLedger?.postflight?.issues || [],
      officialQuality,
      judge,
      scriptCount: (finalProject?.scriptDraft || []).length,
      overflowCount: (finalProject?.scriptDraft || []).filter(
        (s) => (s.episodeNo || s.sceneNo || 0) > 10
      ).length,
      board: finalProject?.scriptProgressBoard?.batchContext || null
    }
    await saveArtifact(outDir, 'postflight-summary', postflightSummary)

    // Build case result from unified helper
    const caseResult = {
      ...buildCaseResult(
        caseId,
        caseDef.path,
        caseDef.sample,
        {
          plan: chain.plan || null,
          afterSaveScriptDraft: Boolean(chain.draft),
          afterSaveRuntimeState: Boolean(chain.runtime),
          repairAttempted: Boolean(
            postflightSummary.issues.some((i) => i.type === 'repair' || i.layer === 'repair')
          )
        },
        judge,
        { success: chain.genSuccess },
        finalProject || {}
      ),
      provider,
      postflight: postflightSummary,
      plan: chain.plan || null,
      startResult: chain.startResult || null,
      error:
        chain.planError || chain.startResultError || chain.draftError || chain.runtimeError || null
    }

    await saveArtifact(outDir, 'case-result', caseResult)
    console.error(
      `[${caseId}] Done — verdict=${caseResult.quality_verdict} official=${caseResult.officialQuality.pass} weakEpisodes=${caseResult.weak_episode_count} issues=${caseResult.issue_count} failure=${caseResult.failure_layer}`
    )
    return caseResult
  } catch (err) {
    cleanup = false
    try {
      await page.screenshot({ path: path.join(outDir, `error-${caseId}.png`), fullPage: true })
    } catch {
      /* ignore */
    }
    return {
      case_id: caseId,
      provider,
      path: caseDef.path,
      sample_type: caseDef.sample,
      plan_ready: false,
      blockedBy: -1,
      generation_success: false,
      script_saved: false,
      runtime_saved: false,
      issue_count: -1,
      weak_episode_count: -1,
      quality_verdict: 'FAIL',
      officialQuality: null,
      judge: null,
      repair_applied: false,
      failure_layer: 'runner_error',
      error: String(err.message || err)
    }
  } finally {
    if (cleanup) await app.close().catch(() => {})
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const caseArg = process.argv.find((a) => a.startsWith('--case='))
  const providerArg = process.argv.find((a) => a.startsWith('--provider='))
  const provider = providerArg ? providerArg.split('=')[1] : 'mock'
  const targets = caseArg
    ? [caseArg.split('=')[1]]
    : ['fs-a', 'rs-a', 'rw-a', 'fs-b', 'rs-b', 'rw-b']

  // Verify build
  const mainEntry = path.join(REPO_ROOT, 'out', 'main', 'index.js')
  try {
    await fs.access(mainEntry)
  } catch {
    console.error(`ERROR: Build not found. Run "npm run build" first.`)
    process.exitCode = 1
    return
  }

  console.error(`P1 Script Quality Matrix — cases: ${targets.join(', ')} [provider=${provider}]`)

  const results = []
  for (const caseId of targets) {
    try {
      const r = await runCase(caseId, provider)
      results.push(r)
    } catch (err) {
      console.error(`[${caseId}] CRASH: ${err.message}`)
      results.push({
        case_id: caseId,
        provider,
        path: CASE_DEFS[caseId]?.path || '?',
        sample_type: CASE_DEFS[caseId]?.sample || '?',
        plan_ready: false,
        blockedBy: -1,
        generation_success: false,
        script_saved: false,
        runtime_saved: false,
        issue_count: -1,
        weak_episode_count: -1,
        quality_verdict: 'FAIL',
        officialQuality: null,
        judge: null,
        repair_applied: false,
        failure_layer: 'runner_crash',
        error: String(err.message || err)
      })
    }
  }

  // Matrix output
  const passed = results.filter((r) => r.quality_verdict === 'PASS').length
  const total = results.length
  const failed = total - passed

  const hdr = [
    'case_id',
    'provider',
    'path',
    'sample',
    'plan',
    'gen',
    'saved',
    'runtime',
    'issues',
    'weakEpisodes',
    'verdict',
    'failure'
  ].join(' | ')
  const lines = results.map((r) =>
    [
      r.case_id,
      r.provider,
      r.path,
      r.sample_type,
      r.plan_ready ? '✅' : '❌',
      r.generation_success ? '✅' : '❌',
      r.script_saved ? '✅' : '❌',
      r.runtime_saved ? '✅' : '❌',
      r.issue_count >= 0 ? r.issue_count : '?',
      r.weak_episode_count >= 0 ? r.weak_episode_count : '?',
      r.quality_verdict,
      r.failure_layer
    ].join(' | ')
  )

  process.stdout.write('\n' + '═'.repeat(120) + '\n')
  process.stdout.write(`P1 SCRIPT QUALITY MATRIX  [provider=${provider}]\n`)
  process.stdout.write('═'.repeat(120) + '\n')
  process.stdout.write(hdr + '\n')
  process.stdout.write('─'.repeat(120) + '\n')
  lines.forEach((l) => process.stdout.write(l + '\n'))
  process.stdout.write('═'.repeat(120) + '\n')
  process.stdout.write(`Total: ${total} | Passed: ${passed} | Failed: ${failed}\n`)

  const { outDir } = await prepareE2EOutDir(REPO_ROOT, `sq-${provider}-matrix`, {
    keepLatestPerFamily: 3
  })
  await saveArtifact(outDir, 'matrix-result', {
    timestamp: new Date().toISOString(),
    provider,
    total,
    passed,
    failed,
    results
  })
  process.stdout.write(`Matrix: ${path.join(outDir, 'matrix-result.json')}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})

