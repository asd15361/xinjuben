import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { _electron as electron } from 'playwright';
import { prepareE2EOutDir } from '../../utils/e2e-output.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readProjectSnapshot(projectFile) {
  const raw = await fs.readFile(projectFile, 'utf8');
  const data = JSON.parse(raw);
  return Object.values(data.projects || {})[0] || null;
}

async function waitForProject(projectFile, predicate, timeoutMs, label) {
  const startedAt = Date.now();
  let lastProject = null;
  while (Date.now() - startedAt < timeoutMs) {
    lastProject = await readProjectSnapshot(projectFile).catch(() => null);
    if (lastProject && (await predicate(lastProject))) return lastProject;
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  throw new Error(`${label}_timeout:${timeoutMs}:${JSON.stringify({
    stage: lastProject?.stage || null,
    generationStatus: lastProject?.generationStatus || null,
    scriptDraft: lastProject?.scriptDraft?.length || 0,
    detailedOutlineSegments: lastProject?.detailedOutlineSegments?.length || 0
  })}`);
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
  const mainEntry = path.join(repoRoot, 'out', 'main', 'index.js');
  const { outDir, userDataDir } = await prepareE2EOutDir(repoRoot, 'real-script-60-check');

  const app = await electron.launch({
    args: [mainEntry],
    env: { ...process.env,
      XINJUBEN_APP_MODE: 'e2e', E2E_USER_DATA_DIR: userDataDir }
  });

  try {
    const page = await app.firstWindow();
    page.setDefaultTimeout(20_000);
    await page.waitForLoadState('domcontentloaded', { timeout: 20_000 });
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.waitForTimeout(1500);

    const projectName = `script-60-${Date.now().toString(36)}`;
    await page.locator('input').first().fill(projectName);
    await page.getByRole('button').filter({ hasText: /新建|快速/ }).first().click();
    const projectCard = page.getByRole('button').filter({ hasText: projectName }).first();
    await projectCard.waitFor({ state: 'visible', timeout: 30000 });
    await projectCard.click();
    await page.waitForSelector(`text=/项目：\\s*${projectName}/`, { timeout: 30000 });

    const projectFile = path.join(userDataDir, 'workspace', 'projects.json');
    const chatInput = page.locator('textarea').first();
    const chatSend = page.getByRole('button', { name: '发送' });
    for (const text of [
      '古风悬疑成长，60集连续短剧',
      '少年守钥人被迫卷入镇上异变，必须在守约和救人之间做选择。',
      '反派恶霸盯上钥匙，小镇少女被当筹码，山中妖物异动越来越近。',
      '要求能撑 60 集，前中后段都要持续升级，不能中途塌掉。'
    ]) {
      await chatInput.fill(text);
      await chatSend.click();
      await page.waitForTimeout(220);
    }

    await page.getByRole('button', { name: /生成第一版粗纲和人物/ }).click();
    const outlineProject = await waitForProject(
      projectFile,
      (project) => Boolean(project?.outlineDraft?.summaryEpisodes?.filter((item) => item?.summary?.trim()).length && project?.characterDrafts?.filter((item) => item?.name?.trim()).length),
      240000,
      'outline_character_ready'
    );

    const firstFact = outlineProject.outlineDraft?.facts?.find((fact) => fact.status !== 'confirmed') || outlineProject.outlineDraft?.facts?.[0];
    if (!firstFact) throw new Error('formal_fact_missing_after_outline');
    if (firstFact.status !== 'confirmed') {
      await page.evaluate(async ({ projectId, factId }) => {
        await window.api.workflow.confirmFormalFact({ projectId, confirmation: { factId } });
      }, { projectId: outlineProject.id, factId: firstFact.id });
      await waitForProject(
        projectFile,
        (project) => Boolean(project?.outlineDraft?.facts?.some((fact) => fact.id === firstFact.id && fact.status === 'confirmed')),
        30000,
        'formal_fact_confirmed'
      );
    }

    await page.getByRole('button', { name: /粗略大纲/ }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button').filter({ hasText: /人物|小传/ }).first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button').filter({ hasText: /详细|大纲/ }).first().click();

    await waitForProject(
      projectFile,
      (project) => (project?.detailedOutlineSegments || []).filter((item) => item?.content?.trim()).length >= 4,
      360000,
      'detailed_outline_ready'
    );

    await page.getByRole('button').filter({ hasText: /剧本|定稿/ }).first().click();
    await page.waitForTimeout(1000);
    const currentProject = await readProjectSnapshot(projectFile);
    if (!currentProject) throw new Error('script_project_missing_before_plan');

    const startedAt = Date.now();
    const result = await page.evaluate(async (payload) => {
      const plan = await window.api.workflow.buildScriptGenerationPlan({
        plan: {
          mode: 'fresh_start',
          targetEpisodes: 60,
          runtimeFailureHistory: []
        },
        storyIntent: payload.storyIntent,
        outline: payload.outline,
        characters: payload.characters,
        segments: payload.segments,
        script: payload.script
      });

      if (!plan.ready) {
        return { ready: false, blockedBy: plan.blockedBy || [], plan };
      }

      const generation = await window.api.workflow.startScriptGeneration({
        plan,
        outlineTitle: payload.outline.title,
        theme: payload.outline.theme,
        mainConflict: payload.outline.mainConflict,
        charactersSummary: payload.characters.map((item) => `${item.name}:${item.goal || item.protectTarget || item.fear}`),
        storyIntent: payload.storyIntent,
        outline: payload.outline,
        characters: payload.characters,
        segments: payload.segments,
        existingScript: payload.script
      });

      const nextScript = [...payload.script, ...generation.generatedScenes];
      await window.api.workspace.saveScriptDraft({ projectId: payload.projectId, scriptDraft: nextScript });
      const nextResume = await window.api.workflow.resolveScriptGenerationResume({ board: generation.board });
      await window.api.workspace.saveScriptRuntimeState({
        projectId: payload.projectId,
        scriptProgressBoard: generation.board,
        scriptResumeResolution: nextResume,
        scriptFailureResolution: generation.failure,
        scriptStateLedger: generation.ledger
      });

      return {
        ready: true,
        plan: {
          targetEpisodes: plan.targetEpisodes,
          batchSize: plan.runtimeProfile.recommendedBatchSize,
          profileLabel: plan.runtimeProfile.profileLabel,
          reason: plan.runtimeProfile.reason
        },
        generation: {
          success: generation.success,
          generatedScenes: generation.generatedScenes.length,
          board: generation.board,
          failure: generation.failure,
          postflight: generation.postflight
        }
      };
    }, {
      projectId: currentProject.id,
      storyIntent: currentProject.storyIntent,
      outline: currentProject.outlineDraft,
      characters: currentProject.characterDrafts,
      segments: currentProject.detailedOutlineSegments,
      script: currentProject.scriptDraft || []
    });

    const elapsedSeconds = Number(((Date.now() - startedAt) / 1000).toFixed(1));
    const afterProject = await readProjectSnapshot(projectFile);
    await page.screenshot({ path: path.join(outDir, 'real-script-60-result.png'), fullPage: true });

    console.log(JSON.stringify({
      projectName,
      userDataDir,
      elapsedSeconds,
      ready: result.ready,
      blockedBy: result.blockedBy || [],
      targetEpisodes: result.plan?.targetEpisodes || null,
      batchSize: result.plan?.batchSize || null,
      profileLabel: result.plan?.profileLabel || null,
      profileReason: result.plan?.reason || null,
      generatedScenes: result.generation?.generatedScenes || 0,
      boardStatus: result.generation?.board?.batchContext?.status || null,
      boardWindow: result.generation?.board?.batchContext
        ? {
            startEpisode: result.generation.board.batchContext.startEpisode,
            endEpisode: result.generation.board.batchContext.endEpisode,
            batchSize: result.generation.board.batchContext.batchSize
          }
        : null,
      issueCount: result.generation?.postflight?.issues?.length || afterProject?.scriptStateLedger?.postflight?.issues?.length || 0,
      firstScene: afterProject?.scriptDraft?.[0] || null,
      postflightIssues: result.generation?.postflight?.issues || afterProject?.scriptStateLedger?.postflight?.issues || []
    }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


