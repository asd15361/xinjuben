import path from 'node:path'
import fs from 'node:fs/promises'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright'
import { prepareE2EOutDir } from '../utils/e2e-output.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..')
const DEFAULT_SOURCE_WORKSPACE = path.join(
  process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming'),
  'xinjuben',
  'workspace'
)
const UI_TIMEOUT_MS = 30_000

function env(name, fallback = '') {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeForAttribute(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const dstPath = path.join(dst, entry.name)
    if (entry.isDirectory()) {
      await copyDir(srcPath, dstPath)
      continue
    }
    await fs.copyFile(srcPath, dstPath)
  }
}

async function readMaybeText(locator) {
  if ((await locator.count()) === 0) {
    return null
  }
  return normalizeText(await locator.first().innerText())
}

async function waitForRendererApi(page) {
  await page.waitForFunction(
    () => Boolean(window.api?.workspace?.listProjects) && Boolean(window.api?.workspace?.getProject),
    { timeout: UI_TIMEOUT_MS }
  )
}

async function findProjectCard(page, projectName, stage) {
  const searchInput = page.getByPlaceholder('搜索...')
  await searchInput.waitFor({ state: 'visible', timeout: UI_TIMEOUT_MS })
  await searchInput.fill(projectName)

  const card = page
    .getByRole('button')
    .filter({ hasText: projectName })
    .filter({ hasText: stage })
    .first()

  await card.waitFor({ state: 'visible', timeout: UI_TIMEOUT_MS })
  return card
}

async function ensureCharacterStage(page) {
  const characterHeading = page.getByRole('heading', { name: '人物小传' }).first()
  if (await characterHeading.isVisible().catch(() => false)) {
    return
  }

  const characterButton = page.getByRole('button').filter({ hasText: /人物小传/ }).first()
  await characterButton.waitFor({ state: 'visible', timeout: UI_TIMEOUT_MS })
  await characterButton.click()
}

async function collectExpectedSnapshot(page, projectId) {
  return page.evaluate(async (targetProjectId) => {
    const project = await window.api.workspace.getProject(targetProjectId)
    const slotCharacters = (project?.entityStore?.characters || [])
      .filter((character) => character.identityMode === 'slot')
      .map((character) => ({
        entityId: character.id,
        name: character.name,
        factionRole: character.factionRole || null,
        publicIdentity: character.publicIdentity || null,
        currentFunction: character.currentFunction || null,
        stance: character.stance || null,
        voiceStyle: character.voiceStyle || null,
        linkedFactionIds: character.linkedFactionIds || []
      }))
      .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'))

    return {
      id: project?.id || null,
      name: project?.name || null,
      stage: project?.stage || null,
      factionCount: project?.entityStore?.factions?.length || 0,
      slotCharacters
    }
  }, projectId)
}

async function collectUiSlotCard(page, entityId) {
  const escapedId = escapeForAttribute(entityId)
  const card = page.locator(`[data-testid="character-slot-light-card"][data-entity-id="${escapedId}"]`)
  await card.waitFor({ state: 'visible', timeout: UI_TIMEOUT_MS })

  return {
    entityId,
    name: await readMaybeText(card.locator('[data-testid="character-light-card-name"]')),
    slotBadge: await readMaybeText(card.locator('[data-testid="character-light-card-slot-badge"]')),
    factionRole: await readMaybeText(card.locator('[data-testid="character-light-card-faction-role"]')),
    currentFunction: await readMaybeText(
      card.locator('[data-testid="character-light-card-detail-current-function"]')
    ),
    publicIdentity: await readMaybeText(
      card.locator('[data-testid="character-light-card-detail-public-identity"]')
    ),
    stance: await readMaybeText(card.locator('[data-testid="character-light-card-detail-stance"]')),
    voiceStyle: await readMaybeText(
      card.locator('[data-testid="character-light-card-detail-voice-style"]')
    )
  }
}

function compareSlotCard(expected, actual) {
  const failures = []

  if (normalizeText(actual.name) !== normalizeText(expected.name)) {
    failures.push(`name_mismatch:${expected.name}->${actual.name}`)
  }
  if (!actual.slotBadge?.includes('势力人物位')) {
    failures.push('slot_badge_missing')
  }
  if (expected.factionRole && normalizeText(actual.factionRole) !== normalizeText(expected.factionRole)) {
    failures.push(`faction_role_mismatch:${expected.factionRole}->${actual.factionRole}`)
  }
  if (
    expected.currentFunction &&
    !normalizeText(actual.currentFunction).includes(normalizeText(expected.currentFunction))
  ) {
    failures.push(`current_function_mismatch:${expected.currentFunction}->${actual.currentFunction}`)
  }
  if (
    expected.publicIdentity &&
    !normalizeText(actual.publicIdentity).includes(normalizeText(expected.publicIdentity))
  ) {
    failures.push(`public_identity_mismatch:${expected.publicIdentity}->${actual.publicIdentity}`)
  }
  if (expected.stance && !normalizeText(actual.stance).includes(normalizeText(expected.stance))) {
    failures.push(`stance_mismatch:${expected.stance}->${actual.stance}`)
  }
  if (expected.voiceStyle && !normalizeText(actual.voiceStyle).includes(normalizeText(expected.voiceStyle))) {
    failures.push(`voice_style_mismatch:${expected.voiceStyle}->${actual.voiceStyle}`)
  }

  return failures
}

async function main() {
  const sourceWorkspaceDir = env('E2E_SOURCE_WORKSPACE_DIR', DEFAULT_SOURCE_WORKSPACE)
  const targetProjectId = env('E2E_PROJECT_ID', 'project_mn1d9gkd')
  const targetProjectName = env('E2E_PROJECT_NAME', '修仙传')
  const targetStage = env('E2E_PROJECT_STAGE', 'character')
  const mainEntry = path.join(REPO_ROOT, 'out', 'main', 'index.js')

  await fs.access(mainEntry)
  await fs.access(sourceWorkspaceDir)

  const { outDir, userDataDir } = await prepareE2EOutDir(REPO_ROOT, 'character-slot-regression', {
    keepLatestPerFamily: 5
  })
  const targetWorkspaceDir = path.join(userDataDir, 'workspace')
  const runId = path.basename(userDataDir)
  const screenshotPath = path.join(outDir, `character-stage-slot-ui-${runId}.png`)
  const summaryPath = path.join(outDir, `character-stage-slot-ui-${runId}.json`)

  await copyDir(sourceWorkspaceDir, targetWorkspaceDir)

  const app = await electron.launch({
    args: [mainEntry],
    env: {
      ...process.env,
      XINJUBEN_APP_MODE: 'e2e',
      E2E_USER_DATA_DIR: userDataDir,
      E2E_CASE_ID: `character-slot-${Date.now().toString(36)}`
    }
  })

  try {
    const page = await app.firstWindow()
    page.setDefaultTimeout(UI_TIMEOUT_MS)
    await page.waitForLoadState('domcontentloaded', { timeout: UI_TIMEOUT_MS })
    await page.setViewportSize({ width: 1440, height: 960 })
    await waitForRendererApi(page)

    const expectedProject = await collectExpectedSnapshot(page, targetProjectId)
    if (!expectedProject?.id) {
      throw new Error(`project_not_found:${targetProjectId}`)
    }

    const projectCard = await findProjectCard(page, targetProjectName, targetStage)
    await projectCard.click()
    await page.waitForSelector(`text=/项目：\\s*${targetProjectName}/`, {
      timeout: UI_TIMEOUT_MS
    })
    await ensureCharacterStage(page)

    const slotCards = page.locator('[data-testid="character-slot-light-card"]')
    await slotCards.first().waitFor({ state: 'visible', timeout: UI_TIMEOUT_MS })

    const uiSlotCount = await slotCards.count()
    const uiCards = []
    const mismatches = []

    for (const expectedCard of expectedProject.slotCharacters) {
      const actualCard = await collectUiSlotCard(page, expectedCard.entityId)
      const failures = compareSlotCard(expectedCard, actualCard)
      uiCards.push(actualCard)
      if (failures.length > 0) {
        mismatches.push({ entityId: expectedCard.entityId, failures })
      }
    }

    await page.screenshot({ path: screenshotPath, fullPage: true })

    const summary = {
      pass:
        expectedProject.stage === targetStage &&
        expectedProject.slotCharacters.length > 0 &&
        expectedProject.slotCharacters.length === uiSlotCount &&
        mismatches.length === 0,
      sourceWorkspaceDir,
      userDataDir,
      projectId: expectedProject.id,
      projectName: expectedProject.name,
      projectStage: expectedProject.stage,
      targetStage,
      factionCount: expectedProject.factionCount,
      slotCount: expectedProject.slotCharacters.length,
      uiSlotCount,
      slots: uiCards,
      mismatches,
      screenshotPath
    }

    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8')
    console.log(JSON.stringify(summary, null, 2))

    if (!summary.pass) {
      throw new Error(`character_slot_regression_failed:${JSON.stringify(summary.mismatches)}`)
    }
  } finally {
    await app.close().catch(() => {})
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

