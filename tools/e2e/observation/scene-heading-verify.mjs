/**
 * Minimal runner for scene heading verification.
 * Bypasses UI automation and calls workflow API directly via page.evaluate.
 * Produces: raw output evidence files for each generated episode.
 *
 * Usage:
 *   node tools/e2e/observation/scene-heading-verify.mjs \
 *     E2E_CASE_ID=verify-rw-a \
 *     E2E_SEEDED_SOURCE_USERDATA=tools/e2e/out/userdata-sq-rw-a-mnakpg3w \
 *     E2E_SEEDED_PROJECT_NAME="RW-A基线-mnakpg3x" \
 *     E2E_SEEDED_SLICE=10 \
 *     E2E_GEN_BATCH=2
 *
 * Output:
 *   tools/e2e/out/evidence-verify-rw-a/ep{N}-evidence.json
 *   tools/e2e/out/postflight-summary.json (if postflight runs)
 */

import path from 'node:path'
import fs from 'node:fs/promises'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright'
import { prepareE2EOutDir } from '../utils/e2e-output.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function env(name, fallback = '') {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function requireEnv(name) {
  const value = env(name)
  if (!value) throw new Error(`missing_required_env:${name}`)
  return value
}

async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const dstPath = path.join(dst, entry.name)
    if (entry.isDirectory()) await copyDir(srcPath, dstPath)
    else await fs.copyFile(srcPath, dstPath)
  }
}

async function readProjectStoreWithRetry(projectFile, retries = 10) {
  let lastError = null
  for (let attempt = 0; attempt < retries; attempt += 1) {
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

async function main() {
  const repoRoot = path.resolve(__dirname, '..', '..')
  const mainEntry = path.join(repoRoot, 'out', 'main', 'index.js')
  const caseId = requireEnv('E2E_CASE_ID')
  const sourceUserdata = path.join(repoRoot, requireEnv('E2E_SEEDED_SOURCE_USERDATA'))
  const targetProjectName = env('E2E_SEEDED_PROJECT_NAME', 'script-60-full-mmynnwd5')
  const targetScriptSlice = Number.parseInt(env('E2E_SEEDED_SLICE', '10'), 10)
  const genBatchSize = Number.parseInt(env('E2E_GEN_BATCH', '2'), 10)
  const timeoutMs = Number.parseInt(env('E2E_TIMEOUT_MS', '600000'), 10)

  console.log(`[scene-heading-verify] caseId=${caseId}`)
  console.log(
    `[scene-heading-verify] project=${targetProjectName} slice=${targetScriptSlice} batch=${genBatchSize}`
  )

  await fs.access(sourceUserdata)
  const { userDataDir } = await prepareE2EOutDir(repoRoot, `evidence-${caseId}`, {
    keepLatestPerFamily: 5
  })

  await copyDir(sourceUserdata, userDataDir)
  const fallbackProjectFile = path.join(userDataDir, 'workspace', 'projects.json')
  const store = await readProjectStoreWithRetry(fallbackProjectFile)
  const target = Object.values(store.projects || {}).find(
    (project) => project.name === targetProjectName
  )
  if (!target) throw new Error(`seeded_project_not_found:${targetProjectName}`)
  const targetProjectId = target.id

  // Reset generation state — keep existing episodes 1..slice, null out generation
  target.scriptDraft = (target.scriptDraft || []).slice(0, targetScriptSlice)
  target.generationStatus = null
  target.scriptProgressBoard = null
  target.scriptResumeResolution = null
  target.scriptFailureResolution = null
  target.scriptRuntimeFailureHistory = []
  target.scriptStateLedger = null
  target.updatedAt = new Date().toISOString()
  await fs.writeFile(fallbackProjectFile, JSON.stringify(store, null, 2), 'utf8')

  const app = await electron.launch({
    args: [mainEntry],
    env: {
      ...process.env,
      XINJUBEN_APP_MODE: 'e2e',
      E2E_USER_DATA_DIR: userDataDir,
      E2E_CASE_ID: caseId // triggers evidence writing in main process
    }
  })

  try {
    // Resolve actual store path from app logs
    const logs = []
    app.process().stdout?.on('data', (chunk) => {
      logs.push(String(chunk))
    })
    const startedAt = Date.now()
    let actualProjectFile = null
    while (Date.now() - startedAt < 10000) {
      const found = logs.join('').match(/e2e_store_path:(.+projects\.json)/)
      if (found?.[1]) {
        actualProjectFile = found[1].trim()
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    if (!actualProjectFile) throw new Error('actual_store_path_not_resolved')

    const page = await app.firstWindow()
    page.setDefaultTimeout(30000)
    await page.waitForLoadState('domcontentloaded', { timeout: 20000 })
    await page.setViewportSize({ width: 1440, height: 960 })
    await page.waitForTimeout(2000)

    // Verify renderer API is available
    const apiAvailable = await page.evaluate(
      () => typeof window.api !== 'undefined' && typeof window.api.workflow !== 'undefined'
    )
    if (!apiAvailable) throw new Error('renderer_api_not_available')
    console.log('[scene-heading-verify] renderer API available')

    // Load project via API
    const project = await page.evaluate(async (projectId) => {
      return await window.api.workspace.getProject(projectId)
    }, targetProjectId)
    if (!project?.id) throw new Error(`project_not_ready:${targetProjectId}`)
    console.log(`[scene-heading-verify] project loaded: ${project.name} id=${project.id}`)

    // Map seed field names to API contract field names
    // Seed uses: outlineDraft, characterDrafts, detailedOutlineSegments
    // API expects: outline, characters, segments
    const apiProject = {
      ...project,
      outline: project.outlineDraft || project.outline,
      characters: project.characterDrafts || project.characters || [],
      segments: (project.detailedOutlineSegments || project.segments || []).map((seg) => ({
        ...seg
        // episodeBeats may have sceneByScene — keep it intact for prompt
      }))
    }
    console.log(
      `[scene-heading-verify] mapped: outline.facts=${apiProject.outline?.facts?.length} characters=${apiProject.characters?.length} segments=${apiProject.segments?.length}`
    )

    // Determine the correct plan mode based on existing script state
    // fresh_start: no existing script episodes
    // resume: has existing script episodes, generating next batch
    const existingCount = apiProject.scriptDraft?.length || 0
    const planMode = existingCount === 0 ? 'fresh_start' : 'resume'

    const targetEpisodes = apiProject.scriptDraft?.length || 10

    // Try buildScriptGenerationPlan with proper field mapping
    // If it succeeds, use the real plan; if it fails, fall back to inline plan
    let plan = null
    try {
      plan = await page.evaluate(
        async (proj) => {
          return await window.api.workflow.buildScriptGenerationPlan({
            plan: { mode: proj._mode, targetEpisodes: proj._target },
            storyIntent: proj.storyIntent || null,
            outline: proj.outline,
            characters: proj.characters || [],
            segments: proj.segments || [],
            script: proj.scriptDraft || []
          })
        },
        { ...apiProject, _mode: planMode, _target: targetEpisodes }
      )
      console.log(
        `[scene-heading-verify] buildScriptGenerationPlan succeeded: mode=${plan.mode} targetEpisodes=${plan.targetEpisodes} runtimeProfile=${plan.runtimeProfile?.profileLabel}`
      )
    } catch (planError) {
      console.log(
        `[scene-heading-verify] buildScriptGenerationPlan failed: ${planError.message} — falling back to inline plan`
      )
      const segmentText = (apiProject.segments || []).map((s) => s.content).join('\n')
      const contextPressureScore = Math.min(10, Math.floor(segmentText.length / 900))
      const shouldCompact = contextPressureScore >= 6
      plan = {
        mode: planMode,
        ready: true,
        blockedBy: [],
        contract: { factualAnchors: [], userAnchorLedger: null },
        targetEpisodes,
        existingSceneCount: existingCount,
        recommendedPrimaryLane: 'deepseek',
        recommendedFallbackLane: 'deepseek',
        runtimeProfile: {
          contextPressureScore,
          shouldCompactContextFirst: shouldCompact,
          maxStoryIntentChars: 1200,
          maxCharacterChars: 2400,
          maxSegmentChars: 3600,
          recommendedBatchSize: 5,
          profileLabel: shouldCompact ? 'compact' : 'full',
          reason: 'inline-fallback'
        }
      }
    }
    console.log(
      `[scene-heading-verify] plan: mode=${plan.mode} compact=${plan.runtimeProfile?.shouldCompactContextFirst} pressure=${plan.runtimeProfile?.contextPressureScore}`
    )

    // Start generation — directly call the workflow API, bypassing UI
    console.log('[scene-heading-verify] starting script generation...')
    const result = await page.evaluate(
      async (proj) => {
        return await window.api.workflow.startScriptGeneration({
          projectId: proj.id,
          plan: proj._plan,
          outlineTitle: proj.outline?.title || proj.outlineDraft?.title || '未命名项目',
          theme: proj.outline?.theme || proj.outlineDraft?.theme || '待补主题',
          mainConflict:
            proj.outline?.mainConflict || proj.outlineDraft?.mainConflict || '待补主线冲突',
          charactersSummary: (proj.characters || [])
            .map((c) => c.name || c.biography || '')
            .filter(Boolean),
          storyIntent: proj.storyIntent || null,
          outline: proj.outline,
          characters: proj.characters || [],
          activeCharacterBlocks: [],
          segments: proj.segments || [],
          existingScript: proj.scriptDraft || []
        })
      },
      { ...apiProject, _plan: plan }
    )

    console.log(
      `[scene-heading-verify] generation result: success=${result.success} generatedScenes=${result.generatedScenes?.length} boardStatus=${result.board?.currentBatchContext?.status}`
    )

    if (!result.success) {
      console.error('[scene-heading-verify] generation failed:', result.failure?.reason)
    }

    // Read evidence files
    const evidenceDir = path.join(repoRoot, 'tools', 'e2e', 'out', `evidence-${caseId}`)
    const evidenceFiles = (await fs.readdir(evidenceDir)).filter((f) =>
      f.endsWith('-evidence.json')
    )
    console.log(`[scene-heading-verify] evidence files written: ${evidenceFiles.length}`)
    for (const file of evidenceFiles.sort()) {
      const content = await fs.readFile(path.join(evidenceDir, file), 'utf8')
      const evidence = JSON.parse(content)
      console.log(`\n=== ${file} ===`)
      console.log(
        `  rawTextLength: ${evidence.rawTextLength}${evidence.truncated ? ' (TRUNCATED — headings may be incomplete)' : ''}`
      )
      console.log(`  rawText preview (first 200): ${(evidence.rawText || '').substring(0, 200)}`)
      console.log(`  parsed.sceneNo: ${evidence.parsed?.sceneNo}`)
      // Note: parsed.sceneCount reflects FULL generation output (not truncated), but screenplayScenes count
      // in the quality gate comes from the stored screenplay, which is rebuilt from A/D/E sections and may differ.
      // Use postflight-summary.sceneCount as authoritative.
      console.log(
        `  parsed.sceneCount: ${evidence.parsed?.screenplayScenes?.length} (see postflight for quality gate result)`
      )
      // Count scene headings in raw text
      const headingMatches = (evidence.rawText || '').match(
        /\d+-\d+[\s　]+[日夜晨午暮黄昏夜半凌晨]/g
      )
      console.log(`  scene headings in rawText: ${headingMatches?.length || 0}`)
      if (headingMatches) console.log(`    headings: ${headingMatches.join(', ')}`)
    }

    // Read postflight if exists
    const postflightPath = path.join(repoRoot, 'tools', 'e2e', 'out', 'postflight-summary.json')
    if (
      await fs
        .access(postflightPath)
        .then(() => true)
        .catch(() => false)
    ) {
      const postflight = JSON.parse(await fs.readFile(postflightPath, 'utf8'))
      console.log(`\n=== postflight-summary ===`)
      console.log(`  pass: ${postflight.officialQuality?.pass}`)
      console.log(
        `  weakEpisodeCount: ${postflight.officialQuality?.weakEpisodeCount}/${postflight.officialQuality?.episodeCount}`
      )
      if (postflight.officialQuality?.weakEpisodes) {
        for (const ep of postflight.officialQuality.weakEpisodes.slice(0, 3)) {
          console.log(
            `    ep${ep.sceneNo}: sceneCount=${ep.sceneCount} problems=${ep.problems.join(', ')}`
          )
        }
      }
    }

    console.log('\n[scene-heading-verify] DONE')
  } finally {
    await app.close()
  }
}

main().catch((e) => {
  console.error('[scene-heading-verify] ERROR:', e.message)
  process.exitCode = 1
})
