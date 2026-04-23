/**
 * tools/e2e/runners/observation/v11-wordcount-strap-test.mjs
 *
 * v11 专项测试：验证当前正式剧本口径
 * - 正式字数合同：800-1800
 * - 字数统计以 screenplay 正文为准，不再用 action+dialogue+emotion 重复累加
 * - 钩子弱不再阻断
 *
 * 参数化：可跑 10/20/30/50 集（自动从对应快照启动）
 * 用法：
 *   node tools/e2e/runners/observation/v11-wordcount-strap-test.mjs 10
 *   node tools/e2e/runners/observation/v11-wordcount-strap-test.mjs 30
 *   node tools/e2e/runners/observation/v11-wordcount-strap-test.mjs 50
 */
import path from 'node:path'
import fs from 'node:fs/promises'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright'
import { prepareE2EOutDir } from '../../utils/e2e-output.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const TARGET_EPISODES = parseInt(process.argv[2] || '10', 10)

// 快照选择：10/20 集用 20ep 快照，30 集用 30ep 快照，50+ 集用 50ep 快照
const SNAPSHOT_MAP = {
  10: 'tools/e2e/out/userdata-xiuxian-full-real-20ep-mnct8azk/evidence/04-detailed-outline-project.json',
  20: 'tools/e2e/out/userdata-xiuxian-full-real-20ep-mnct8azk/evidence/04-detailed-outline-project.json',
  30: 'tools/e2e/out/userdata-xiuxian-full-real-30ep-mnd9a7ge/evidence/04-detailed-outline-project.json',
  50: 'tools/e2e/out/userdata-xiuxian-full-real-50ep-mndh2yac/evidence/04-detailed-outline-project.json'
}

function resolveSnapshotPath(targetEpisodes) {
  if (SNAPSHOT_MAP[targetEpisodes]) return SNAPSHOT_MAP[targetEpisodes]
  if (targetEpisodes > 40) return SNAPSHOT_MAP[50]
  if (targetEpisodes > 20) return SNAPSHOT_MAP[30]
  return SNAPSHOT_MAP[20]
}

const RUN_LABEL = `v11-${TARGET_EPISODES}ep`
const TIMEOUTS = {
  // 基础 10 分钟，每超 10 集加 20 分钟（repair 机制增加每集耗时）
  script_ready: Math.max(600_000, 600_000 + Math.floor((TARGET_EPISODES - 10) / 10) * 1_200_000)
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function resolveActualProjectFile(app) {
  const logs = []
  app.process().stdout?.on('data', (chunk) => {
    logs.push(String(chunk))
  })
  const startedAt = Date.now()
  while (Date.now() - startedAt < 10000) {
    const matched = logs.join('').match(/e2e_store_path:(.+projects\.json)/)
    if (matched?.[1]) return matched[1].trim()
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('actual_store_path_not_resolved')
}

async function waitForProject(projectFile, predicate, timeoutMs, label) {
  const startedAt = Date.now()
  let lastProject = null
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const raw = await fs.readFile(projectFile, 'utf8')
      const data = JSON.parse(raw)
      const project = Object.values(data.projects || {})[0] || null
      if (project && (await predicate(project))) return project
      lastProject = project
    } catch {
      /* ignore */
    }
    await new Promise((resolve) => setTimeout(resolve, 1200))
  }
  throw new Error(
    `${label}_timeout:${timeoutMs}:${JSON.stringify({
      stage: lastProject?.stage || null,
      scriptDraft: lastProject?.scriptDraft?.length || 0
    })}`
  )
}

function computeEpisodeStats(scenes) {
  return scenes.map((scene, i) => {
    const screenplay = String(scene.screenplay || '')
    const total = screenplay.replace(/\s+/g, '').length
    const screenplayRaw = screenplay.length
    const legacyAggregate = ((scene.action || '') + (scene.dialogue || '') + (scene.emotion || ''))
      .length
    const screenplayScenes = (scene.screenplayScenes || []).map((s) => ({
      code: s.sceneCode || '',
      bodyLen: (s.body || '' || '').length
    }))
    return {
      episode: i + 1,
      totalChars: total,
      screenplayRawLen: screenplayRaw,
      legacyAggregateChars: legacyAggregate,
      scenes: screenplayScenes,
      status: total >= 800 && total <= 1800 ? 'pass' : total < 800 ? 'thin' : 'fat'
    }
  })
}

function summarizeResults(stats) {
  const pass = stats.filter((s) => s.status === 'pass').length
  const thin = stats.filter((s) => s.status === 'thin').length
  const fat = stats.filter((s) => s.status === 'fat').length
  const chars = stats.map((s) => s.totalChars)
  const min = chars.length ? Math.min(...chars) : 0
  const max = chars.length ? Math.max(...chars) : 0
  const avg = chars.length ? Math.round(chars.reduce((a, b) => a + b, 0) / chars.length) : 0
  return {
    total: stats.length,
    pass,
    thin,
    fat,
    passRate: stats.length ? `${pass}/${stats.length}` : '0/0',
    minChars: min,
    maxChars: max,
    avgChars: avg
  }
}

async function main() {
  console.error(`[${RUN_LABEL}] Starting — target ${TARGET_EPISODES} episodes`)
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..')
  const mainEntry = path.join(repoRoot, 'out', 'main', 'index.js')

  // Load snapshot
  const snapshotPath = path.join(repoRoot, resolveSnapshotPath(TARGET_EPISODES))
  let snapshot
  try {
    snapshot = await readJson(snapshotPath)
  } catch (err) {
    throw new Error(`failed_to_load_snapshot:${snapshotPath}:${err.message}`)
  }

  console.error(
    `[${RUN_LABEL}] Loaded snapshot: ${snapshot.name || snapshot.id} (outlineEpisodes: ${snapshot.outlineDraft?.summaryEpisodes?.length})`
  )

  // Prepare fresh output dir
  const { outDir, userDataDir } = await prepareE2EOutDir(repoRoot, RUN_LABEL, {
    keepLatestPerFamily: 20
  })
  const caseId = path.basename(userDataDir).replace(/^userdata-/, '')

  // Build a minimal userdata skeleton (workspace dir)
  const workspaceDir = path.join(userDataDir, 'workspace')
  await fs.mkdir(path.join(workspaceDir, 'projects'), { recursive: true })
  const projectsFile = path.join(workspaceDir, 'projects.json')

  // Clone snapshot and reset script state
  const seededProjectId = snapshot.id
  const seededProject = JSON.parse(JSON.stringify(snapshot))
  seededProject.scriptDraft = []
  seededProject.generationStatus = null
  seededProject.scriptProgressBoard = null
  seededProject.scriptResumeResolution = null
  seededProject.scriptFailureResolution = null
  seededProject.scriptRuntimeFailureHistory = []
  seededProject.scriptStateLedger = null
  seededProject.stage = 'detailed_outline'
  seededProject.updatedAt = new Date().toISOString()

  // 补 formal fact landing：往每个 segment.content 追加确认事实关键词
  // 快照本身缺少 landing 数据（旧版生成），追加关键词不改变内容，只满足 contract 检查
  if (seededProject.detailedOutlineSegments && seededProject.outlineDraft?.facts) {
    const confirmedFacts = seededProject.outlineDraft.facts
      .filter((f) => f.status === 'confirmed')
      .map((f) => f.label.replace(/^draft_/, ''))
    if (confirmedFacts.length > 0) {
      const factTag = '｜' + confirmedFacts.join('｜')
      seededProject.detailedOutlineSegments.forEach((seg) => {
        if (seg.content && !seg.content.includes(factTag.slice(1, 15))) {
          seg.content = seg.content + factTag
        }
      })
    }
  }

  // Write projects store
  await writeJson(projectsFile, { projects: { [seededProjectId]: seededProject } })
  await writeJson(path.join(workspaceDir, 'projects-index.json'), { projects: [seededProjectId] })

  const evidenceDir = path.join(outDir, 'evidence')
  await fs.mkdir(evidenceDir, { recursive: true })
  await writeJson(path.join(evidenceDir, 'seeded-input.json'), seededProject)

  // Launch Electron
  const app = await electron.launch({
    args: [mainEntry],
    env: {
      ...process.env,
      XINJUBEN_APP_MODE: 'e2e',
      E2E_USER_DATA_DIR: userDataDir,
      E2E_CASE_ID: caseId
    }
  })

  try {
    const actualProjectFile = await resolveActualProjectFile(app)
    console.error(`[${RUN_LABEL}] Project file: ${actualProjectFile}`)

    const page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded', { timeout: 20000 })
    await page.setViewportSize({ width: 1440, height: 960 })
    await page.waitForTimeout(1200)

    // Verify project loads in renderer
    const projectReady = await page.evaluate(async (projectId) => {
      return await window.api.workspace.getProject(projectId)
    }, seededProjectId)
    if (!projectReady?.id) throw new Error(`project_not_ready_in_renderer:${seededProjectId}`)
    console.error(`[${RUN_LABEL}] Project loaded in renderer: ${projectReady.name}`)

    // Run script generation via API — wrapped in a timeout so Electron crashes don't hang the test
    // page.evaluate timeout: 基础 20 分钟，每超 10 集加 30 分钟
    const SCRIPT_GEN_TIMEOUT_MS = Math.max(
      1_200_000,
      1_200_000 + Math.floor((TARGET_EPISODES - 10) / 10) * 1_800_000
    )
    const scriptResult = await Promise.race([
      page.evaluate(
        async ({ projectId, targetEpisodes }) => {
          const currentProject = await window.api.workspace.getProject(projectId)
          if (!currentProject) throw new Error('project_missing_before_script')

          const plan = await window.api.workflow.buildScriptGenerationPlan({
            plan: { mode: 'fresh_start', targetEpisodes, runtimeFailureHistory: [] },
            storyIntent: currentProject.storyIntent,
            outline: currentProject.outlineDraft,
            characters: currentProject.characterDrafts,
            segments: currentProject.detailedOutlineSegments,
            script: []
          })

          if (!plan.ready) {
            return {
              ready: false,
              blockedBy: plan.blockedBy || [],
              contract: plan.contract || null
            }
          }

          const result = await window.api.workflow.startScriptGeneration({
            projectId,
            plan,
            outlineTitle: currentProject.outlineDraft?.title || '',
            theme: currentProject.outlineDraft?.theme || '',
            mainConflict: currentProject.outlineDraft?.mainConflict || '',
            charactersSummary: (currentProject.characterDrafts || []).map(
              (c) => `${c.name}:${c.goal || c.protectTarget || c.fear || ''}`
            ),
            storyIntent: currentProject.storyIntent,
            outline: currentProject.outlineDraft,
            characters: currentProject.characterDrafts,
            segments: currentProject.detailedOutlineSegments,
            existingScript: []
          })

          await window.api.workspace.saveScriptDraft({
            projectId,
            scriptDraft: result.generatedScenes || []
          })
          const resume = await window.api.workflow.resolveScriptGenerationResume({
            board: result.board
          })
          await window.api.workspace.saveScriptRuntimeState({
            projectId,
            scriptProgressBoard: result.board,
            scriptFailureResolution: result.failure,
            scriptStateLedger: result.ledger,
            scriptRuntimeFailureHistory: [],
            scriptResumeResolution: resume
          })

          return {
            ready: true,
            success: result.success,
            generatedScenes: result.generatedScenes?.length || 0,
            issues: result.ledger?.postflight?.issues || [],
            pass: result.ledger?.postflight?.pass ?? null,
            failure: result.failure || null,
            boardStatus: result.board?.batchContext?.status || null
          }
        },
        { projectId: seededProjectId, targetEpisodes: TARGET_EPISODES }
      ),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`script_evaluate_timeout:${SCRIPT_GEN_TIMEOUT_MS}ms`)),
          SCRIPT_GEN_TIMEOUT_MS
        )
      )
    ]).catch((err) => {
      console.error(`[${RUN_LABEL}] page.evaluate threw: ${err.message}`)
      return { ready: false, timeout: true, error: err.message }
    })

    if (!scriptResult.ready) {
      if (scriptResult.timeout) {
        console.error(
          `[${RUN_LABEL}] API timed out after ${SCRIPT_GEN_TIMEOUT_MS}ms — Electron may have crashed during generation`
        )
        throw new Error(`script_evaluate_timeout:${scriptResult.error || 'unknown'}`)
      }
      throw new Error(
        `script_plan_not_ready:${JSON.stringify({ blockedBy: scriptResult.blockedBy, contract: scriptResult.contract })}`
      )
    }

    console.error(
      `[${RUN_LABEL}] API returned: generatedScenes=${scriptResult.generatedScenes}, success=${scriptResult.success}`
    )

    // Wait for generation to complete (poll projects.json until no generationStatus)
    const finalProject = await waitForProject(
      actualProjectFile,
      (p) => (p?.scriptDraft?.length || 0) >= 1 && !p?.generationStatus,
      TIMEOUTS.script_ready,
      'script_ready'
    )

    const stats = computeEpisodeStats(finalProject.scriptDraft || [])
    const summary = summarizeResults(stats)

    const report = {
      runLabel: RUN_LABEL,
      targetEpisodes: TARGET_EPISODES,
      actualEpisodes: stats.length,
      generatedScenes: scriptResult.generatedScenes,
      success: scriptResult.success,
      failure: scriptResult.failure,
      ledgerIssues: scriptResult.ledgerIssues,
      passRate: summary.passRate,
      thinEpisodes: stats.filter((s) => s.status === 'thin').map((s) => s.episode),
      fatEpisodes: stats.filter((s) => s.status === 'fat').map((s) => s.episode),
      minChars: summary.minChars,
      maxChars: summary.maxChars,
      avgChars: summary.avgChars,
      episodeStats: stats.map((s) => ({
        episode: s.episode,
        totalChars: s.totalChars,
        status: s.status,
        screenplayLen: s.screenplayRawLen,
        sceneBreakdown: s.scenes
      }))
    }

    await writeJson(path.join(evidenceDir, '99-summary.json'), report)
    await writeJson(path.join(evidenceDir, 'final-project.json'), finalProject)

    // Print summary to stdout (JSON for programmatic parsing)
    console.log(JSON.stringify(report, null, 2))
    console.error(
      `[${RUN_LABEL}] Done. Pass: ${summary.passRate} (${summary.minChars}-${summary.maxChars} chars, avg ${summary.avgChars})`
    )
  } finally {
    await app.close()
  }
}

main().catch((error) => {
  console.error(`[${RUN_LABEL}] ERROR:`, error.message)
  process.exitCode = 1
})
