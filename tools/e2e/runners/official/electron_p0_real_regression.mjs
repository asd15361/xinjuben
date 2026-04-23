import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { _electron as electron } from 'playwright'
import { prepareE2EOutDir } from '../../utils/e2e-output.mjs'
import {
  P0_REAL_REGRESSION_PROJECT_NAME,
  P0_REAL_REGRESSION_SEED_VERSION
} from '../../seed-constructors/p0-real-regression-v1.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function readProjectSnapshot(userDataDir) {
  const filePath = path.join(userDataDir, 'workspace', 'projects.json')
  const raw = await fs.readFile(filePath, 'utf8')
  const data = JSON.parse(raw)
  return (
    Object.values(data.projects || {}).find(
      (project) => project.name === P0_REAL_REGRESSION_PROJECT_NAME
    ) ?? null
  )
}

async function copySeedIntoUserData(repoRoot, userDataDir) {
  const seedDir = path.join(repoRoot, 'tools', 'e2e', 'seeds', P0_REAL_REGRESSION_SEED_VERSION)
  await fs.cp(seedDir, userDataDir, { recursive: true })
  return seedDir
}

function printResult(result) {
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string') {
      console.log(`${key}=${value}`)
      continue
    }
    console.log(`${key}=${JSON.stringify(value)}`)
  }
}

async function evaluateGate(page, projectSnapshot) {
  return page.evaluate(
    async (payload) => {
      const plan = await window.api.workflow.buildScriptGenerationPlan({
        plan: {
          mode: 'fresh_start',
          targetEpisodes: 10,
          runtimeFailureHistory: []
        },
        storyIntent: payload.storyIntent,
        outline: payload.outline,
        characters: payload.characters,
        segments: payload.segments,
        script: payload.script
      })

      const visibleButtons = Array.from(document.querySelectorAll('button'))
        .map((button) => ({
          text: (button.textContent || '').trim(),
          disabled: Boolean(button.disabled)
        }))
        .filter((button) => /(一键执笔生成|现在开始写剧本)/.test(button.text))

      return {
        plan,
        visibleButtons,
        anyButtonEnabled: visibleButtons.some((button) => !button.disabled)
      }
    },
    {
      storyIntent: projectSnapshot.storyIntent,
      outline: projectSnapshot.outlineDraft,
      characters: projectSnapshot.characterDrafts,
      segments: projectSnapshot.detailedOutlineSegments,
      script: projectSnapshot.scriptDraft || []
    }
  )
}

export async function runVisibleP0Regression() {
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..')
  const mainEntry = path.join(repoRoot, 'out', 'main', 'index.js')
  const { outDir, userDataDir } = await prepareE2EOutDir(repoRoot, 'visible-p0-real-regression')
  const seedDir = await copySeedIntoUserData(repoRoot, userDataDir)
  const projectSnapshot = await readProjectSnapshot(userDataDir)

  if (!projectSnapshot) {
    throw new Error(`seed_project_missing:${P0_REAL_REGRESSION_PROJECT_NAME}`)
  }

  const app = await electron.launch({
    args: [mainEntry],
    env: {
      ...process.env,
      XINJUBEN_APP_MODE: 'e2e',
      E2E_USER_DATA_DIR: userDataDir
    }
  })

  try {
    const page = await app.firstWindow()
    page.setDefaultTimeout(20_000)
    await page.waitForLoadState('domcontentloaded', { timeout: 20_000 })
    await page.setViewportSize({ width: 1440, height: 960 })
    await page.waitForTimeout(1500)

    const backHome = page.getByRole('button', { name: /回到项目首页/ })
    if (await backHome.isVisible().catch(() => false)) {
      await backHome.click()
      await page.waitForTimeout(1200)
    }

    const refresh = page.getByRole('button', { name: /刷新|同步/ })
    if (await refresh.isVisible().catch(() => false)) {
      await refresh.click()
      await page.waitForTimeout(800)
    }

    const projectCard = page
      .getByRole('button')
      .filter({ hasText: P0_REAL_REGRESSION_PROJECT_NAME })
      .first()
    await projectCard.waitFor({ state: 'visible', timeout: 30_000 })
    await projectCard.click()

    await page.waitForSelector(
      `text=/项目：\\s*${escapeRegExp(P0_REAL_REGRESSION_PROJECT_NAME)}/`,
      { timeout: 30_000 }
    )
    await page.waitForTimeout(1000)

    await page.getByRole('button', { name: /剧本定稿/ }).click()
    await page
      .getByRole('heading', { name: '剧本定稿', exact: true })
      .waitFor({ state: 'visible', timeout: 30_000 })
    await page
      .getByRole('button', { name: /一键执笔生成|现在开始写剧本/ })
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 })

    const gateCheck = await evaluateGate(page, projectSnapshot)
    if (gateCheck.plan.ready) {
      await page
        .waitForFunction(
          () =>
            Array.from(document.querySelectorAll('button')).some(
              (button) =>
                /(一键执笔生成|现在开始写剧本)/.test((button.textContent || '').trim()) &&
                !button.disabled
            ),
          { timeout: 10_000 }
        )
        .catch(() => null)
    }

    const finalGateCheck = await evaluateGate(page, projectSnapshot)
    const screenshotPath = path.join(outDir, 'visible-p0-real-regression-script-stage.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })

    const baseResult = {
      runner: 'electron_p0_real_regression',
      seed_version: P0_REAL_REGRESSION_SEED_VERSION,
      seed_dir: seedDir,
      user_data_dir: userDataDir,
      screenshot: screenshotPath,
      project_name: P0_REAL_REGRESSION_PROJECT_NAME,
      button_state: finalGateCheck.visibleButtons,
      blocked_by: finalGateCheck.plan.blockedBy || [],
      contract: finalGateCheck.plan.contract || null
    }

    if (!finalGateCheck.plan.ready) {
      printResult({
        classification: 'seed_failure',
        error: 'seed_contract_not_ready',
        ...baseResult
      })
      process.exitCode = 1
      return
    }

    if (!finalGateCheck.anyButtonEnabled) {
      printResult({
        classification: 'product_failure',
        error: 'p0_start_button_disabled',
        ...baseResult
      })
      process.exitCode = 1
      return
    }

    printResult({
      classification: 'pass',
      error: '',
      ...baseResult
    })
  } finally {
    await app.close()
  }
}

export async function main() {
  await runVisibleP0Regression()
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
