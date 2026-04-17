import path from 'node:path'
import fs from 'node:fs/promises'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright'
import { prepareE2EOutDir } from '../../utils/e2e-output.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const HARDCODE_SOURCE = path.join(
  __dirname,
  'out',
  'userdata-xiuxian-full-real-15ep-mne6476a',
  'evidence',
  '04-detailed-outline-project.json'
)

const TARGET_EPISODES = 15

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

async function main() {
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..')
  const mainEntry = path.join(repoRoot, 'out', 'main', 'index.js')

  // Load source snapshot
  let snapshot
  try {
    snapshot = await readJson(HARDCODE_SOURCE)
  } catch (err) {
    throw new Error(`failed_to_load_source_snapshot:${HARDCODE_SOURCE}:${err.message}`)
  }

  // Prepare fresh output dir
  const { userDataDir } = await prepareE2EOutDir(repoRoot, 'seeded-script-only', {
    keepLatestPerFamily: 20
  })

  // Replicate the full Electron userdata skeleton from the source run
  const sourceUserdataRoot = path.dirname(path.dirname(HARDCODE_SOURCE))
  await copyDir(sourceUserdataRoot, userDataDir)

  // Now overwrite projects.json with the seeded snapshot (preserving workspace structure)
  const workspaceDir = path.join(userDataDir, 'workspace')
  await fs.mkdir(workspaceDir, { recursive: true })

  // Build a projects store with just our seeded project
  const seededProjectId = snapshot.id
  const projectsStore = { projects: { [seededProjectId]: snapshot } }
  const projectsFile = path.join(workspaceDir, 'projects.json')
  await writeJson(projectsFile, projectsStore)

  // Also write per-project files so the app can find them
  const projectDir = path.join(workspaceDir, 'projects', seededProjectId)
  await fs.mkdir(projectDir, { recursive: true })
  await writeJson(path.join(projectDir, 'meta.json'), { id: seededProjectId, name: snapshot.name })

  // Inject into projects-index
  const indexFile = path.join(workspaceDir, 'projects-index.json')
  try {
    const index = await readJson(indexFile)
    if (!index.projects.includes(seededProjectId)) index.projects.push(seededProjectId)
    await writeJson(indexFile, index)
  } catch {
    await writeJson(indexFile, { projects: [seededProjectId] })
  }

  // Clear script-related fields on the snapshot so we start fresh
  snapshot.scriptDraft = []
  snapshot.generationStatus = null
  snapshot.scriptProgressBoard = null
  snapshot.scriptResumeResolution = null
  snapshot.scriptFailureResolution = null
  snapshot.scriptRuntimeFailureHistory = []
  snapshot.scriptStateLedger = null
  snapshot.stage = 'detailed_outline'
  snapshot.updatedAt = new Date().toISOString()

  // Overwrite the seeded project with cleaned state
  const updatedStore = { projects: { [seededProjectId]: snapshot } }
  await writeJson(projectsFile, updatedStore)

  const evidenceDir = path.join(userDataDir, 'evidence')
  await fs.mkdir(evidenceDir, { recursive: true })

  // Save seeded input snapshot
  await writeJson(path.join(evidenceDir, 'seeded-input.json'), snapshot)

  const app = await electron.launch({
    args: [mainEntry],
    env: { ...process.env, XINJUBEN_APP_MODE: 'e2e', E2E_USER_DATA_DIR: userDataDir }
  })

  try {
    const actualProjectFile = await resolveActualProjectFile(app)

    const page = await app.firstWindow()
    await page.waitForLoadState('domcontentloaded', { timeout: 20000 })
    await page.setViewportSize({ width: 1440, height: 960 })
    await page.waitForTimeout(1200)

    // Verify project is visible in renderer
    const projectReady = await page.evaluate(async (projectId) => {
      return await window.api.workspace.getProject(projectId)
    }, seededProjectId)
    if (!projectReady?.id) throw new Error(`project_not_ready_in_renderer:${seededProjectId}`)

    // Run buildScriptGenerationPlan + startScriptGeneration via evaluate
    const scriptResult = await page.evaluate(
      async ({ projectId, targetEpisodes }) => {
        const currentProject = await window.api.workspace.getProject(projectId)
        if (!currentProject) throw new Error('project_missing_before_script')

        const plan = await window.api.workflow.buildScriptGenerationPlan({
          plan: {
            mode: 'fresh_start',
            targetEpisodes,
            runtimeFailureHistory: []
          },
          storyIntent: currentProject.storyIntent,
          outline: currentProject.outlineDraft,
          characters: currentProject.characterDrafts,
          segments: currentProject.detailedOutlineSegments,
          script: currentProject.scriptDraft || []
        })

        if (!plan.ready) {
          return {
            ready: false,
            blockedBy: plan.blockedBy || [],
            contract: plan.contract || null,
            planErrors: plan.errors || null
          }
        }

        const result = await window.api.workflow.startScriptGeneration({
          projectId,
          plan,
          outlineTitle: currentProject.outlineDraft?.title || '',
          theme: currentProject.outlineDraft?.theme || '',
          mainConflict: currentProject.outlineDraft?.mainConflict || '',
          charactersSummary: (currentProject.characterDrafts || []).map(
            (c) => `${c.name}:${c.goal || c.protectTarget || c.fear || c.biography || ''}`
          ),
          storyIntent: currentProject.storyIntent,
          outline: currentProject.outlineDraft,
          characters: currentProject.characterDrafts,
          segments: currentProject.detailedOutlineSegments,
          existingScript: currentProject.scriptDraft || []
        })

        // Persist the generated scenes into the project store
        const nextScript = [
          ...(currentProject.scriptDraft || []),
          ...(result.generatedScenes || [])
        ]
        await window.api.workspace.saveScriptDraft({ projectId, scriptDraft: nextScript })

        // Persist runtime state
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
    )

    // Read back final project state from store
    const finalStore = await readJson(actualProjectFile)
    const finalProject = finalStore.projects?.[seededProjectId] || null

    await writeJson(path.join(evidenceDir, 'result-summary.json'), {
      scriptResult,
      projectId: seededProjectId,
      projectName: snapshot.name,
      userDataDir,
      targetEpisodes: TARGET_EPISODES,
      actualProjectFile,
      scriptCount: finalProject?.scriptDraft?.length || 0,
      generationStatus: finalProject?.generationStatus || null,
      scriptProgressBoard: finalProject?.scriptProgressBoard?.batchContext || null,
      scriptIssues: finalProject?.scriptStateLedger?.postflight?.issues || [],
      scriptPass: finalProject?.scriptStateLedger?.postflight?.pass ?? null,
      failure: finalProject?.scriptFailureResolution || null
    })

    if (finalProject) {
      await writeJson(path.join(evidenceDir, 'script-project.json'), finalProject)
    }

    console.log(
      JSON.stringify(
        {
          projectId: seededProjectId,
          projectName: snapshot.name,
          targetEpisodes: TARGET_EPISODES,
          scriptResult,
          scriptCount: finalProject?.scriptDraft?.length || 0,
          evidenceDir
        },
        null,
        2
      )
    )
  } finally {
    await app.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

