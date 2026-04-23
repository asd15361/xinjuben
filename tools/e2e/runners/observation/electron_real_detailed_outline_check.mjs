import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import { _electron as electron } from 'playwright'
import { prepareE2EOutDir } from '../../utils/e2e-output.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const REQUIRED_SEGMENT_RANGES = [
  [1, 7],
  [8, 14],
  [15, 22],
  [23, 30]
]

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

async function readProjectSnapshot(projectFile) {
  const data = await readJsonFile(projectFile)
  return Object.values(data.projects || {})[0] || null
}

async function waitForProject(projectFile, predicate, timeoutMs, label) {
  const startedAt = Date.now()
  let lastProject = null
  while (Date.now() - startedAt < timeoutMs) {
    lastProject = await readProjectSnapshot(projectFile).catch(() => null)
    if (lastProject && (await predicate(lastProject))) {
      return lastProject
    }
    await new Promise((resolve) => setTimeout(resolve, 1200))
  }
  throw new Error(
    `${label}_timeout:${timeoutMs}:${JSON.stringify({
      stage: lastProject?.stage || null,
      generationStatus: lastProject?.generationStatus || null,
      detailedOutlineSegments: lastProject?.detailedOutlineSegments?.length || 0,
      outlineCount: lastProject?.outlineDraft?.summaryEpisodes?.length || 0,
      characterCount: lastProject?.characterDrafts?.length || 0
    })}`
  )
}

function normalizeDetailedSegments(project) {
  return project?.detailedOutlineSegments || project?.detailedOutlineBlocks || []
}

function parseTargetEpisodes(project) {
  const directTarget = project?.targetEpisodes
  if (Number.isInteger(directTarget)) return directTarget

  const generationBriefText = project?.storyIntent?.generationBriefText || ''
  const storyIntentGenre = project?.storyIntent?.genre || ''
  const summary = project?.outlineDraft?.summary || ''
  const candidateText = [generationBriefText, storyIntentGenre, summary].join('\n')
  const match = candidateText.match(/(\d+)\s*集/)
  return match ? Number(match[1]) : null
}

function getDetailedOutlineMetrics(project) {
  const segments = normalizeDetailedSegments(project)
  const outlineEpisodes = project?.outlineDraft?.summaryEpisodes || []
  const targetEpisodes = parseTargetEpisodes(project)
  const detailedSegments = segments.length
  const episodeBeats = segments.flatMap((segment) => segment?.episodeBeats || [])
  const episodeNumbers = episodeBeats
    .map((beat) => beat?.episodeNo)
    .filter((episodeNo) => Number.isInteger(episodeNo))
  const uniqueEpisodeNumbers = [...new Set(episodeNumbers)].sort((a, b) => a - b)
  const expectedEpisodeNumbers = Array.from({ length: 30 }, (_, index) => index + 1)
  const hasFullEpisodeCoverage =
    uniqueEpisodeNumbers.length === expectedEpisodeNumbers.length &&
    uniqueEpisodeNumbers.every((episodeNo, index) => episodeNo === expectedEpisodeNumbers[index])

  const hasExactSegmentRanges =
    segments.length === REQUIRED_SEGMENT_RANGES.length &&
    REQUIRED_SEGMENT_RANGES.every(([startEpisode, endEpisode], index) => {
      const segment = segments[index]
      return segment?.startEpisode === startEpisode && segment?.endEpisode === endEpisode
    })

  const everyEpisodeSummaryFilled = episodeBeats.every(
    (beat) => typeof beat?.summary === 'string' && beat.summary.trim().length > 0
  )
  const everyEpisodeHasScenes = episodeBeats.every(
    (beat) => Array.isArray(beat?.sceneByScene) && beat.sceneByScene.length > 0
  )

  const postTenEpisodeBeats = episodeBeats.filter(
    (beat) => Number.isInteger(beat?.episodeNo) && beat.episodeNo >= 11 && beat.episodeNo <= 30
  )
  const postTenEpisodesSolid =
    postTenEpisodeBeats.length === 20 &&
    postTenEpisodeBeats.every(
      (beat) =>
        typeof beat?.summary === 'string' &&
        beat.summary.trim().length > 0 &&
        Array.isArray(beat?.sceneByScene) &&
        beat.sceneByScene.length > 0
    )

  return {
    targetEpisodes,
    outlineEpisodes: outlineEpisodes.length,
    detailedSegments,
    episodeBeatsCount: episodeBeats.length,
    uniqueEpisodeNumbers,
    hasFullEpisodeCoverage,
    everyEpisodeSummaryFilled,
    everyEpisodeHasScenes,
    hasExactSegmentRanges,
    postTenEpisodesSolid,
    segmentPreview: segments.slice(0, 4)
  }
}

function checkDetailedOutlineQuality(project) {
  const metrics = getDetailedOutlineMetrics(project)

  return (
    metrics.targetEpisodes === 30 &&
    metrics.outlineEpisodes === 30 &&
    metrics.detailedSegments === 4 &&
    metrics.hasFullEpisodeCoverage &&
    metrics.everyEpisodeSummaryFilled &&
    metrics.everyEpisodeHasScenes &&
    metrics.hasExactSegmentRanges &&
    metrics.postTenEpisodesSolid
  )
}

function judgeDetailedOutline(project) {
  const metrics = getDetailedOutlineMetrics(project)
  const passed = checkDetailedOutlineQuality(project)

  return {
    quality: passed ? '好' : '弱',
    targetEpisodes: metrics.targetEpisodes,
    outlineEpisodes: metrics.outlineEpisodes,
    segmentCount: metrics.detailedSegments,
    detailedSegments: metrics.detailedSegments,
    totalLength: normalizeDetailedSegments(project)
      .map((item) => item?.content?.trim() || '')
      .join(' ').length,
    hasProgressionWords: /推进|代价|局势|冲突/.test(
      normalizeDetailedSegments(project)
        .map((item) => item?.content?.trim() || '')
        .join(' ')
    ),
    outlinePass: passed,
    outlineCoverageEpisodes: metrics.uniqueEpisodeNumbers.length,
    segmentPreview: metrics.segmentPreview
  }
}

async function loadDetailedOutlineProjectFromUserDataDir(userDataDir) {
  const projectFile = path.join(userDataDir, 'workspace', 'projects.json')
  const project = await readProjectSnapshot(projectFile)
  if (project) return project

  const workspaceProjectsDir = path.join(userDataDir, 'workspace', 'projects')
  const projectIds = await fs.readdir(workspaceProjectsDir)
  if (projectIds.length === 0) {
    throw new Error(`detailed_outline_project_missing:${userDataDir}`)
  }

  const detailedOutlineFile = path.join(
    workspaceProjectsDir,
    projectIds[0],
    'detailed-outline.json'
  )
  const outlineFile = path.join(workspaceProjectsDir, projectIds[0], 'outline.json')
  const storyIntentFile = path.join(workspaceProjectsDir, projectIds[0], 'visible.json')

  const [detailedOutline, outline, visible] = await Promise.all([
    readJsonFile(detailedOutlineFile),
    readJsonFile(outlineFile).catch(() => ({})),
    readJsonFile(storyIntentFile).catch(() => ({}))
  ])

  return {
    ...visible,
    outlineDraft: outline?.outlineDraft || outline,
    detailedOutlineSegments:
      detailedOutline?.detailedOutlineSegments || detailedOutline?.detailedOutlineBlocks || []
  }
}

function parseCliArgs(argv) {
  const checkIndex = argv.findIndex((item) => item === '-c' || item === '--check')
  const showIndex = argv.findIndex((item) => item === '-s' || item === '--show')

  return {
    checkPath: checkIndex >= 0 ? argv[checkIndex + 1] || null : null,
    showPath: showIndex >= 0 ? argv[showIndex + 1] || null : null
  }
}

async function runCheckMode(targetDir) {
  if (!targetDir) {
    throw new Error('missing_check_path')
  }

  const userDataDir = path.resolve(targetDir)
  const project = await loadDetailedOutlineProjectFromUserDataDir(userDataDir)
  const quality = judgeDetailedOutline(project)

  console.log(
    JSON.stringify(
      {
        quality: quality.quality,
        targetEpisodes: quality.targetEpisodes,
        outlineEpisodes: quality.outlineEpisodes,
        segmentCount: quality.segmentCount,
        totalLength: quality.totalLength,
        hasProgressionWords: quality.hasProgressionWords,
        segmentPreview: quality.segmentPreview
      },
      null,
      2
    )
  )

  if (!quality.outlinePass) {
    process.exitCode = 1
  }
}

async function runShowMode(targetDir) {
  if (!targetDir) {
    throw new Error('missing_show_path')
  }

  const userDataDir = path.resolve(targetDir)
  const project = await loadDetailedOutlineProjectFromUserDataDir(userDataDir)
  const quality = judgeDetailedOutline(project)

  console.log(
    JSON.stringify(
      {
        quality: quality.quality,
        targetEpisodes: quality.targetEpisodes,
        outlineEpisodes: quality.outlineEpisodes,
        segmentCount: quality.segmentCount,
        totalLength: quality.totalLength,
        hasProgressionWords: quality.hasProgressionWords,
        segmentPreview: quality.segmentPreview
      },
      null,
      2
    )
  )
}

async function main() {
  const { checkPath, showPath } = parseCliArgs(process.argv.slice(2))

  if (checkPath) {
    await runCheckMode(checkPath)
    return
  }

  if (showPath) {
    await runShowMode(showPath)
    return
  }

  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..')
  const mainEntry = path.join(repoRoot, 'out', 'main', 'index.js')
  const { outDir, userDataDir } = await prepareE2EOutDir(repoRoot, 'real-detailed-outline-check')

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

    const projectNameInput = page.locator('input').first()
    await projectNameInput.waitFor({ state: 'visible', timeout: 30_000 })
    const createButton = page
      .getByRole('button')
      .filter({ hasText: /新建|快速/ })
      .first()
    const projectName = `detailed-outline-${Date.now().toString(36)}`
    await projectNameInput.fill(projectName)
    await createButton.click()
    const projectCard = page.getByRole('button').filter({ hasText: projectName }).first()
    await projectCard.waitFor({ state: 'visible', timeout: 30_000 })
    await projectCard.click()
    await page.waitForSelector(`text=/项目：\\s*${projectName}/`, { timeout: 30_000 })
    await page.waitForTimeout(1000)

    const projectFile = path.join(userDataDir, 'workspace', 'projects.json')
    const chatInput = page.locator('textarea').first()
    const chatSend = page.getByRole('button', { name: '发送' })
    await chatInput.waitFor({ state: 'visible' })
    await page.waitForTimeout(600)

    for (const text of [
      '古风悬疑成长',
      '少年守钥人被迫卷入镇上异变，必须在守约和救人之间做选择。',
      '反派恶霸盯上钥匙，小镇少女被当筹码，山中妖物异动越来越近。',
      '真相要一层层逼出来，每一场都要接前一场的后果往下推。'
    ]) {
      await chatInput.fill(text)
      await chatSend.click()
      await page.waitForTimeout(200)
    }

    const generateButton = page.getByRole('button', { name: /生成第一版粗纲和人物/ })
    await generateButton.waitFor({ state: 'visible', timeout: 30_000 })
    await generateButton.click()

    const outlineProject = await waitForProject(
      projectFile,
      (project) =>
        Boolean(
          project?.outlineDraft?.summaryEpisodes?.filter((item) => item?.summary?.trim()).length &&
          project?.characterDrafts?.filter((item) => item?.name?.trim()).length
        ),
      240_000,
      'outline_character_ready'
    )

    const firstFact =
      outlineProject.outlineDraft?.facts?.find((fact) => fact.status !== 'confirmed') ||
      outlineProject.outlineDraft?.facts?.[0]
    if (!firstFact) throw new Error('formal_fact_missing_after_outline')

    if (firstFact.status !== 'confirmed') {
      await page.evaluate(
        async ({ projectId, factId }) => {
          await window.api.workflow.confirmFormalFact({
            projectId,
            confirmation: { factId }
          })
        },
        { projectId: outlineProject.id, factId: firstFact.id }
      )

      await waitForProject(
        projectFile,
        (project) =>
          Boolean(
            project?.outlineDraft?.facts?.some(
              (fact) => fact.id === firstFact.id && fact.status === 'confirmed'
            )
          ),
        30_000,
        'formal_fact_confirmed'
      )
    }

    await page.getByRole('button', { name: /粗略大纲/ }).click()
    await page.waitForTimeout(600)
    await page
      .getByRole('button')
      .filter({ hasText: /人物|小传/ })
      .first()
      .click()
    await page.waitForTimeout(600)
    await page.getByRole('button', { name: /确认：生成详细大纲/ }).click()
    await page.waitForTimeout(800)

    const startAt = Date.now()
    const generateDetailedOutlineButton = page
      .getByRole('button', { name: /生成这一版详细大纲|AI 帮我补这一版/ })
      .first()
    await generateDetailedOutlineButton.waitFor({ state: 'visible', timeout: 30_000 })
    await generateDetailedOutlineButton.click()

    const detailedProject = await waitForProject(
      projectFile,
      (project) => checkDetailedOutlineQuality(project),
      360_000,
      'detailed_outline_ready'
    )

    const elapsedSeconds = Number(((Date.now() - startAt) / 1000).toFixed(1))
    const quality = judgeDetailedOutline(detailedProject)

    await page.screenshot({
      path: path.join(outDir, 'real-detailed-outline-result.png'),
      fullPage: true
    })

    console.log(
      JSON.stringify(
        {
          projectName,
          userDataDir,
          elapsedSeconds,
          quality: quality.quality,
          segmentCount: quality.segmentCount,
          totalLength: quality.totalLength,
          hasProgressionWords: quality.hasProgressionWords,
          segmentPreview: quality.segmentPreview
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
