import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright'

import { prepareE2EOutDir } from '../../utils/e2e-output.mjs'
import { readSeedProject } from './seeds/p0-real-regression-v1/index.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function nowTag() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : ''
}

function resolveTargetEpisodes() {
  const rawArg = process.argv.find((item) => item.startsWith('--episodes=')) || ''
  const value = Number(rawArg.split('=')[1] || process.env.E2E_TARGET_EPISODES || 10)
  if (!Number.isFinite(value) || value < 1) return 10
  return Math.floor(value)
}

function rewriteEpisodeCountText(text, targetEpisodes) {
  if (typeof text !== 'string' || !text.trim()) return text
  return text
    .replace(/([｜|])10集/g, `$1${targetEpisodes}集`)
    .replace(/为10集([^\n。；，]*)/g, `为${targetEpisodes}集$1`)
    .replace(/项目《修仙传》为10集/g, `项目《修仙传》为${targetEpisodes}集`)
    .replace(/【项目】([^｜|\n]+)[｜|]10集/g, `【项目】$1｜${targetEpisodes}集`)
}

function retargetStoryIntentEpisodes(storyIntent, targetEpisodes) {
  if (!storyIntent || targetEpisodes === 10) return storyIntent
  const next = { ...storyIntent }
  for (const key of Object.keys(next)) {
    if (typeof next[key] === 'string') {
      next[key] = rewriteEpisodeCountText(next[key], targetEpisodes)
    }
  }
  return next
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function writeText(filePath, value) {
  await fs.writeFile(filePath, `${value.replace(/\r\n/g, '\n')}\n`, 'utf8')
}

function renderOutlineMarkdown(project) {
  const outline = project?.outlineDraft || null
  const episodes = outline?.summaryEpisodes || []
  const facts = outline?.facts || []
  return [
    `# ${project?.name || '未命名项目'}｜剧本骨架`,
    '',
    `- 题材：${outline?.genre || project?.genre || '未填'}`,
    `- 主角：${outline?.protagonist || '未填'}`,
    `- 主题：${outline?.theme || '未填'}`,
    `- 主线冲突：${outline?.mainConflict || '未填'}`,
    '',
    '## 总述',
    '',
    normalizeText(outline?.summary) || '无',
    '',
    '## 逐集粗纲',
    '',
    ...episodes.flatMap((episode) => [
      `### 第 ${episode.episodeNo} 集`,
      '',
      normalizeText(episode.summary) || '无',
      ''
    ]),
    '## 关键设定',
    '',
    ...(facts.length > 0
      ? facts.map(
          (fact, index) =>
            `${index + 1}. [${fact.status === 'confirmed' ? '已确认' : '待确认'}] ${fact.label}：${fact.description}`
        )
      : ['无'])
  ].join('\n')
}

function renderCharacterMarkdown(project) {
  const characters = project?.characterDrafts || []
  return [
    `# ${project?.name || '未命名项目'}｜人物小传`,
    '',
    `- 角色数量：${characters.length}`,
    '',
    ...characters.flatMap((character, index) => [
      `## ${index + 1}. ${character.name || `角色${index + 1}`}`,
      '',
      `- 小传：${character.biography || '未填'}`,
      `- 表面：${character.publicMask || '未填'}`,
      `- 暗里卡着：${character.hiddenPressure || '未填'}`,
      `- 最怕失去：${character.fear || '未填'}`,
      `- 最想守：${character.protectTarget || '未填'}`,
      `- 一碰就炸：${character.conflictTrigger || '未填'}`,
      `- 优势：${character.advantage || '未填'}`,
      `- 短板：${character.weakness || '未填'}`,
      `- 目标：${character.goal || '未填'}`,
      `- 弧光：${character.arc || '未填'}`,
      ''
    ])
  ].join('\n')
}

function renderDetailedOutlineMarkdown(project) {
  const segments = project?.detailedOutlineSegments || []
  return [
    `# ${project?.name || '未命名项目'}｜详细大纲`,
    '',
    `- 段数：${segments.length}`,
    '',
    ...segments.flatMap((segment, index) => [
      `## ${index + 1}. ${segment.act}`,
      '',
      `- 钩子类型：${segment.hookType || '未填'}`,
      '',
      normalizeText(segment.content) || '无',
      '',
      ...(segment.episodeBeats || []).flatMap((beat) => [
        `### 第 ${beat.episodeNo} 集`,
        '',
        normalizeText(beat.summary) || '无',
        '',
        ...(beat.sceneByScene || []).flatMap((scene) => [
          `- 场 ${scene.sceneNo || 1}｜地点：${scene.location || '未填'}｜时间：${scene.timeOfDay || '未填'}`,
          `  - 起手：${scene.setup || '未填'}`,
          `  - 拉扯：${scene.tension || '未填'}`,
          `  - 尾钩：${scene.hookEnd || '未填'}`
        ]),
        ''
      ])
    ])
  ].join('\n')
}

function renderScriptMarkdown(project) {
  const scenes = [...(project?.scriptDraft || [])].sort(
    (a, b) => (a.sceneNo || 0) - (b.sceneNo || 0)
  )
  return [
    `# ${project?.name || '未命名项目'}｜剧本`,
    '',
    `- 已生成集数：${scenes.length}`,
    '',
    ...scenes.flatMap((scene) => [
      `## 第 ${scene.sceneNo} 集`,
      '',
      '```text',
      normalizeText(scene.screenplay) ||
        [normalizeText(scene.action), normalizeText(scene.dialogue), normalizeText(scene.emotion)]
          .filter(Boolean)
          .join('\n\n'),
      '```',
      ''
    ])
  ].join('\n')
}

async function readProjectFromStore(userDataDir, projectId) {
  const storePath = path.join(userDataDir, 'workspace', 'projects.json')
  const raw = await fs.readFile(storePath, 'utf8')
  const parsed = JSON.parse(raw)
  return parsed?.projects?.[projectId] || null
}

async function copyIfExists(sourcePath, targetPath) {
  try {
    await fs.copyFile(sourcePath, targetPath)
    return true
  } catch {
    return false
  }
}

async function main() {
  const targetEpisodes = resolveTargetEpisodes()
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..')
  const mainEntry = path.join(repoRoot, 'out', 'main', 'index.js')
  const outFamily =
    targetEpisodes === 10 ? 'xiuxian-full-real' : `xiuxian-full-real-${targetEpisodes}ep`
  const { userDataDir } = await prepareE2EOutDir(repoRoot, outFamily, {
    keepLatestPerFamily: 8,
    keepLatestFiles: 40
  })
  const evidenceDir = path.join(userDataDir, 'evidence')
  await fs.mkdir(evidenceDir, { recursive: true })

  const seedProject = await readSeedProject()
  const retargetedStoryIntent = retargetStoryIntentEpisodes(seedProject.storyIntent, targetEpisodes)
  const transcript = [
    retargetedStoryIntent?.generationBriefText || '',
    retargetedStoryIntent?.freeChatFinalSummary || ''
  ]
    .filter(Boolean)
    .join('\n\n')
  const confirmedStoryIntent = {
    ...retargetedStoryIntent,
    confirmedChatTranscript: transcript
  }

  await writeJson(path.join(evidenceDir, '00-seed-project.json'), seedProject)
  await writeText(path.join(evidenceDir, '00-user-input.txt'), transcript)

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
    await page.waitForLoadState('domcontentloaded', { timeout: 20000 })
    await page.setViewportSize({ width: 1440, height: 960 })
    await page.waitForTimeout(1500)

    const bootstrap = await page.evaluate(
      async ({ name, genre, storyIntent }) => {
        const created = await window.api.workspace.createProject({
          name,
          workflowType: 'ai_write',
          genre
        })
        const projectId = created.project.id
        const saved = await window.api.workspace.saveStoryIntent({
          projectId,
          storyIntent
        })
        return {
          projectId,
          projectName: created.project.name,
          storyIntentSaved: Boolean(saved?.storyIntent?.generationBriefText)
        }
      },
      {
        name: `修仙传真实全链验收-${targetEpisodes}集-${nowTag()}`,
        genre: seedProject.genre || seedProject.storyIntent?.genre || '玄幻修仙',
        storyIntent: confirmedStoryIntent
      }
    )

    const projectId = bootstrap.projectId
    await writeJson(path.join(evidenceDir, '01-bootstrap.json'), bootstrap)

    const sevenQuestionsDraft = await page.evaluate(
      async ({ projectId }) => {
        const result = await window.api.workspace.generateSevenQuestionsDraft({ projectId })
        return {
          projectPresent: Boolean(result.project),
          hasSevenQuestions: Boolean(result.sevenQuestions),
          blockCount: result.sevenQuestions?.blocks?.length || 0,
          sevenQuestions: result.sevenQuestions || null
        }
      },
      { projectId }
    )
    await writeJson(path.join(evidenceDir, '02-seven-questions-draft.json'), sevenQuestionsDraft)

    const confirmedSevenQuestions = await page.evaluate(
      async ({ projectId, sevenQuestions }) => {
        const result = await window.api.workspace.saveConfirmedSevenQuestions({
          projectId,
          sevenQuestions
        })
        return {
          projectPresent: Boolean(result.project),
          outlineBlocks: result.outlineDraft?.outlineBlocks?.length || 0,
          sevenQuestionsConfirmed:
            (result.outlineDraft?.outlineBlocks || []).every((block) =>
              Boolean(block.sevenQuestions)
            ) || false
        }
      },
      {
        projectId,
        sevenQuestions: sevenQuestionsDraft.sevenQuestions
      }
    )
    await writeJson(
      path.join(evidenceDir, '03-seven-questions-confirmed.json'),
      confirmedSevenQuestions
    )

    const outlineResult = await page.evaluate(
      async ({ projectId }) => {
        const result =
          await window.api.workspace.generateOutlineAndCharactersFromConfirmedSevenQuestions({
            projectId
          })
        return {
          outlineEpisodes: result.outlineDraft?.summaryEpisodes?.length || 0,
          characters: result.characterDrafts?.length || 0,
          title: result.outlineDraft?.title || '',
          protagonist: result.outlineDraft?.protagonist || ''
        }
      },
      { projectId }
    )

    let project = await readProjectFromStore(userDataDir, projectId)
    await writeJson(path.join(evidenceDir, '04-outline-result.json'), outlineResult)
    await writeJson(path.join(evidenceDir, '04-outline-project.json'), project)
    await writeText(path.join(evidenceDir, '04-outline.md'), renderOutlineMarkdown(project))
    await writeText(path.join(evidenceDir, '05-characters.md'), renderCharacterMarkdown(project))

    const factIds = (project?.outlineDraft?.facts || [])
      .filter((fact) => fact.status !== 'confirmed')
      .map((fact) => fact.id)
    await writeJson(path.join(evidenceDir, '06-outline-fact-status.json'), {
      totalFacts: project?.outlineDraft?.facts?.length || 0,
      unconfirmedFacts: factIds.length,
      confirmedFacts: (project?.outlineDraft?.facts || []).filter(
        (fact) => fact.status === 'confirmed'
      ).length
    })
    if (factIds.length > 0) {
      await page.evaluate(
        async ({ projectId, factIds }) => {
          for (const factId of factIds) {
            await window.api.workflow.confirmFormalFact({
              projectId,
              confirmation: { factId }
            })
          }
        },
        { projectId, factIds }
      )
    }

    const detailedResult = await page.evaluate(
      async ({ projectId }) => {
        const result = await window.api.workspace.generateDetailedOutline({ projectId })
        return {
          source: result.source,
          segments: result.detailedOutlineSegments?.length || 0,
          beats: (result.detailedOutlineSegments || []).reduce(
            (total, segment) => total + (segment.episodeBeats?.length || 0),
            0
          )
        }
      },
      { projectId }
    )

    project = await readProjectFromStore(userDataDir, projectId)
    await writeJson(path.join(evidenceDir, '07-detailed-outline-result.json'), detailedResult)
    await writeJson(path.join(evidenceDir, '07-detailed-outline-project.json'), project)
    await writeText(
      path.join(evidenceDir, '07-detailed-outline.md'),
      renderDetailedOutlineMarkdown(project)
    )

    const scriptRun = await page.evaluate(
      async ({ projectId, targetEpisodes }) => {
        const currentProject = await window.api.workspace.getProject(projectId)
        if (!currentProject) {
          throw new Error('project_missing_before_script')
        }

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
            contract: plan.contract || null
          }
        }

        const result = await window.api.workflow.startScriptGeneration({
          projectId,
          plan,
          outlineTitle: currentProject.outlineDraft.title,
          theme: currentProject.outlineDraft.theme,
          mainConflict: currentProject.outlineDraft.mainConflict,
          charactersSummary: currentProject.characterDrafts.map(
            (item) =>
              `${item.name}:${item.goal || item.protectTarget || item.fear || item.biography || ''}`
          ),
          storyIntent: currentProject.storyIntent,
          outline: currentProject.outlineDraft,
          characters: currentProject.characterDrafts,
          segments: currentProject.detailedOutlineSegments,
          existingScript: currentProject.scriptDraft || []
        })

        const nextScript = [...(currentProject.scriptDraft || []), ...result.generatedScenes]
        await window.api.workspace.saveScriptDraft({
          projectId,
          scriptDraft: nextScript
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
          generatedScenes: result.generatedScenes.length,
          issues: result.ledger?.postflight?.issues || [],
          pass: result.ledger?.postflight?.pass ?? null,
          failure: result.failure || null
        }
      },
      { projectId, targetEpisodes }
    )

    project = await readProjectFromStore(userDataDir, projectId)
    await writeJson(path.join(evidenceDir, '08-script-result.json'), scriptRun)
    await writeJson(path.join(evidenceDir, '08-script-project.json'), project)
    await writeText(path.join(evidenceDir, '08-script.md'), renderScriptMarkdown(project))
    await page.screenshot({ path: path.join(evidenceDir, '09-final-window.png'), fullPage: true })

    const runtimeLogPath = path.join(userDataDir, 'runtime-diagnostics.log')
    await copyIfExists(runtimeLogPath, path.join(evidenceDir, '09-runtime-diagnostics.log'))

    const summary = {
      projectId,
      projectName: bootstrap.projectName,
      userDataDir,
      evidenceDir,
      targetEpisodes,
      outlineEpisodes: project?.outlineDraft?.summaryEpisodes?.length || 0,
      characterCount: project?.characterDrafts?.length || 0,
      detailedSegments: project?.detailedOutlineSegments?.length || 0,
      scriptEpisodes: project?.scriptDraft?.length || 0,
      scriptIssues: project?.scriptStateLedger?.postflight?.issues || [],
      scriptPass: project?.scriptStateLedger?.postflight?.pass ?? null
    }
    await writeJson(path.join(evidenceDir, '99-summary.json'), summary)
    console.log(JSON.stringify(summary, null, 2))
  } finally {
    await app.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
