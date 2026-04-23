import path from 'node:path'
import fs from 'node:fs/promises'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright'
import { prepareE2EOutDir } from '../../utils/e2e-output.mjs'

const SCRIPT_STAGE_TAB_PATTERN = /剧本草稿/
const SCRIPT_STAGE_BUTTON_PATTERN = /一键执笔生成|继续生成|现在开始写剧本|生成剧本/

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

function attachStoreTraceBuffer(app) {
  const logs = []
  app.process().stdout?.on('data', (chunk) => {
    const text = String(chunk)
    if (text.includes('e2e_store_op:') || text.includes('e2e_store_write:')) {
      logs.push(text.trim())
    }
  })
  return () => logs.slice(-20)
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..')
  const mainEntry = path.join(repoRoot, 'out', 'main', 'index.js')
  const sourceUserdata = path.join(repoRoot, requireEnv('E2E_SEEDED_RESUME_SOURCE_USERDATA'))
  const targetProjectName = env('E2E_SEEDED_PROJECT_NAME', 'script-60-full-mmynnwd5')
  const expectedScriptCount = Number.parseInt(env('E2E_EXPECT_SCRIPT_COUNT', '20'), 10)
  const timeoutMs = Number.parseInt(env('E2E_SEEDED_TIMEOUT_MS', '900000'), 10)
  await fs.access(sourceUserdata)
  const { userDataDir } = await prepareE2EOutDir(repoRoot, 'seeded-resume-regression', {
    keepLatestPerFamily: 20
  })

  await copyDir(sourceUserdata, userDataDir)
  const fallbackProjectFile = path.join(userDataDir, 'workspace', 'projects.json')
  const initialStore = await readProjectStoreWithRetry(fallbackProjectFile)
  const beforeProject = Object.values(initialStore.projects || {}).find(
    (project) => project?.name === targetProjectName
  )
  if (!beforeProject?.id) throw new Error(`seeded_resume_project_not_found:${targetProjectName}`)
  const targetProjectId = beforeProject.id

  const app = await electron.launch({
    args: [mainEntry],
    env: { ...process.env, XINJUBEN_APP_MODE: 'e2e', E2E_USER_DATA_DIR: userDataDir }
  })

  try {
    const getStoreTrace = attachStoreTraceBuffer(app)
    const actualProjectFile = await resolveActualProjectFile(app)
    const usedFallback = actualProjectFile === fallbackProjectFile
    const afterSeedWriteSnapshot =
      (await readProjectStoreWithRetry(actualProjectFile)).projects?.[targetProjectId] || null

    const page = await app.firstWindow()
    page.setDefaultTimeout(20000)
    await page.waitForLoadState('domcontentloaded', { timeout: 20000 })
    await page.setViewportSize({ width: 1440, height: 960 })
    await page.waitForTimeout(1200)

    const projectReady = await page.evaluate(async (projectId) => {
      return await window.api.workspace.getProject(projectId)
    }, targetProjectId)
    if (!projectReady?.id) {
      throw new Error(`seeded_resume_project_not_ready_in_renderer:${targetProjectId}`)
    }

    const backHome = page.getByRole('button', { name: '回到项目首页' })
    if (await backHome.isVisible().catch(() => false)) {
      await backHome.click()
      await page.waitForTimeout(1000)
    }

    const card = page.getByRole('button').filter({ hasText: targetProjectName }).first()
    await card.waitFor({ state: 'visible', timeout: 30000 })
    await card.click()
    await page.waitForSelector(`text=/项目：\\s*${targetProjectName}/`, { timeout: 30000 })
    await page.waitForTimeout(800)

    const openedProject = await page.evaluate(async (projectId) => {
      return await window.api.workspace.getProject(projectId)
    }, targetProjectId)
    if (!openedProject?.id || openedProject.id !== targetProjectId) {
      throw new Error(`seeded_resume_open_mismatch:${targetProjectId}`)
    }

    await page.getByRole('button').filter({ hasText: SCRIPT_STAGE_TAB_PATTERN }).first().click()
    await page.waitForFunction(
      () => {
        const text = document.body.innerText || ''
        return text.includes('这一页只做一件事：把详细大纲真正写成剧本草稿。')
      },
      undefined,
      { timeout: 30000 }
    )

    const button = page.getByRole('button', { name: SCRIPT_STAGE_BUTTON_PATTERN }).first()
    await button.waitFor({ state: 'visible', timeout: 30000 })
    const enabled = await button.isEnabled().catch(() => false)
    if (!enabled) throw new Error('seeded_resume_button_disabled')
    await button.click()

    const startedAt = Date.now()
    let started = false
    const baselineScriptCount = beforeProject?.scriptDraft?.length || 0
    while (Date.now() - startedAt < 120000) {
      const currentStore = await readProjectStoreWithRetry(actualProjectFile)
      const currentProject = currentStore.projects?.[targetProjectId] || null
      const currentScriptCount = currentProject?.scriptDraft?.length || 0
      if (
        currentProject?.generationStatus?.task === 'script' ||
        currentProject?.scriptProgressBoard?.batchContext?.status === 'running' ||
        currentScriptCount > baselineScriptCount
      ) {
        started = true
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    if (!started) {
      throw new Error(
        `seeded_resume_never_started:${JSON.stringify({
          fallbackProjectFile,
          actualProjectFile,
          usedFallback,
          storeTrace: getStoreTrace(),
          afterSeedWrite: afterSeedWriteSnapshot
            ? {
                id: afterSeedWriteSnapshot.id,
                scriptCount: afterSeedWriteSnapshot.scriptDraft?.length || 0,
                generationStatus: afterSeedWriteSnapshot.generationStatus || null
              }
            : null
        })}`
      )
    }

    const afterProjectReadySnapshot =
      (await readProjectStoreWithRetry(actualProjectFile)).projects?.[targetProjectId] || null

    const runStartedAt = Date.now()
    let lastProject = null
    while (Date.now() - runStartedAt < timeoutMs) {
      const currentStore = await readProjectStoreWithRetry(actualProjectFile)
      const currentProject = currentStore.projects?.[targetProjectId] || null
      lastProject = currentProject
      if (!currentProject) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        continue
      }
      if (!currentProject.generationStatus) {
        const beforeResumeEpisode = beforeProject?.scriptResumeResolution?.resumeEpisode || null
        const afterBoardResumeEpisode =
          currentProject?.scriptProgressBoard?.batchContext?.resumeFromEpisode || null
        const resumeSemanticsConsumed = Boolean(
          beforeProject?.scriptResumeResolution?.canResume &&
          beforeResumeEpisode !== null &&
          (currentProject?.scriptDraft?.length || 0) >= expectedScriptCount &&
          afterBoardResumeEpisode !== null &&
          afterBoardResumeEpisode >= beforeResumeEpisode
        )
        console.log(
          JSON.stringify(
            {
              fallbackProjectFile,
              actualProjectFile,
              usedFallback,
              storeTrace: getStoreTrace(),
              snapshots: {
                afterSeedWrite: afterSeedWriteSnapshot
                  ? {
                      id: afterSeedWriteSnapshot.id,
                      scriptCount: afterSeedWriteSnapshot.scriptDraft?.length || 0,
                      generationStatus: afterSeedWriteSnapshot.generationStatus || null
                    }
                  : null,
                afterProjectReady: afterProjectReadySnapshot
                  ? {
                      id: afterProjectReadySnapshot.id,
                      scriptCount: afterProjectReadySnapshot.scriptDraft?.length || 0,
                      generationStatus: afterProjectReadySnapshot.generationStatus || null
                    }
                  : null,
                afterClick: currentProject
                  ? {
                      id: currentProject.id,
                      scriptCount: currentProject.scriptDraft?.length || 0,
                      generationStatus: currentProject.generationStatus || null,
                      board: currentProject.scriptProgressBoard?.batchContext || null
                    }
                  : null
              },
              before: {
                scriptCount: beforeProject?.scriptDraft?.length || 0,
                failure: beforeProject?.scriptFailureResolution || null,
                resume: beforeProject?.scriptResumeResolution || null,
                board: beforeProject?.scriptProgressBoard?.batchContext || null
              },
              after: {
                scriptCount: currentProject?.scriptDraft?.length || 0,
                failure: currentProject?.scriptFailureResolution || null,
                resume: currentProject?.scriptResumeResolution || null,
                board: currentProject?.scriptProgressBoard?.batchContext || null,
                generationStatus: currentProject?.generationStatus || null
              },
              resumed: resumeSemanticsConsumed,
              resumeSemantics: {
                beforeResumeEpisode,
                afterBoardResumeEpisode,
                expectedScriptCount,
                actualScriptCount: currentProject?.scriptDraft?.length || 0
              }
            },
            null,
            2
          )
        )
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    throw new Error(
      `seeded_resume_timeout:${JSON.stringify({
        fallbackProjectFile,
        actualProjectFile,
        usedFallback,
        storeTrace: getStoreTrace(),
        snapshots: {
          afterSeedWrite: afterSeedWriteSnapshot
            ? {
                id: afterSeedWriteSnapshot.id,
                scriptCount: afterSeedWriteSnapshot.scriptDraft?.length || 0,
                generationStatus: afterSeedWriteSnapshot.generationStatus || null
              }
            : null,
          afterProjectReady: afterProjectReadySnapshot
            ? {
                id: afterProjectReadySnapshot.id,
                scriptCount: afterProjectReadySnapshot.scriptDraft?.length || 0,
                generationStatus: afterProjectReadySnapshot.generationStatus || null
              }
            : null,
          afterClick: lastProject
            ? {
                id: lastProject.id,
                scriptCount: lastProject.scriptDraft?.length || 0,
                generationStatus: lastProject.generationStatus || null,
                board: lastProject.scriptProgressBoard?.batchContext || null
              }
            : null
        },
        scriptCount: lastProject?.scriptDraft?.length || 0,
        generationStatus: lastProject?.generationStatus || null,
        failure: lastProject?.scriptFailureResolution || null,
        resume: lastProject?.scriptResumeResolution || null
      })}`
    )
  } finally {
    await app.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
