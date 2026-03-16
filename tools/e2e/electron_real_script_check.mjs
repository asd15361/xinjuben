import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { _electron as electron } from 'playwright';
import { prepareE2EOutDir } from './e2e-output.mjs';

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
    if (lastProject && (await predicate(lastProject))) {
      return lastProject;
    }
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  throw new Error(`${label}_timeout:${timeoutMs}:${JSON.stringify({
    stage: lastProject?.stage || null,
    generationStatus: lastProject?.generationStatus || null,
    scriptDraft: lastProject?.scriptDraft?.length || 0,
    issues: lastProject?.scriptStateLedger?.postflight?.issues || [],
    detailedOutlineSegments: lastProject?.detailedOutlineSegments?.length || 0
  })}`);
}

function judgeScript(project) {
  const scene = project?.scriptDraft?.[0] || null;
  const issues = project?.scriptStateLedger?.postflight?.issues || [];
  const text = [scene?.action || '', scene?.dialogue || '', scene?.emotion || ''].join(' ');
  const quality =
    scene &&
    issues.length === 0 &&
    /逼|压|代价|钩|下一|立刻|马上|今晚|日落|带走|撞门|抓走/.test(text) &&
    text.length > 300
      ? '好'
      : scene && text.length > 180
        ? '中'
        : '弱';

  return {
    quality,
    issueCount: issues.length,
    totalLength: text.length,
    hasStrongHook: /下一|立刻|马上|今晚|日落|带走|撞门|抓走/.test(text),
    hasPressure: /逼|压|代价/.test(text)
  };
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const mainEntry = path.join(repoRoot, 'out', 'main', 'index.js');
  const { outDir, userDataDir } = await prepareE2EOutDir(repoRoot, 'real-script-check');

  const app = await electron.launch({
    args: [mainEntry],
    env: {
      ...process.env,
      E2E_USER_DATA_DIR: userDataDir
    }
  });

  try {
    const page = await app.firstWindow();
    page.setDefaultTimeout(20_000);
    await page.waitForLoadState('domcontentloaded', { timeout: 20_000 });
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.waitForTimeout(1500);

    const projectNameInput = page.locator('input').first();
    await projectNameInput.waitFor({ state: 'visible', timeout: 30_000 });
    const createButton = page.getByRole('button').filter({ hasText: /新建|快速/ }).first();
    const projectName = `script-check-${Date.now().toString(36)}`;
    await projectNameInput.fill(projectName);
    await createButton.click();
    const projectCard = page.getByRole('button').filter({ hasText: projectName }).first();
    await projectCard.waitFor({ state: 'visible', timeout: 30_000 });
    await projectCard.click();
    await page.waitForSelector(`text=/项目：\\s*${projectName}/`, { timeout: 30_000 });
    await page.waitForTimeout(1000);

    const projectFile = path.join(userDataDir, 'workspace', 'projects.json');
    const chatInput = page.locator('textarea').first();
    const chatSend = page.getByRole('button', { name: '发送' });
    await chatInput.waitFor({ state: 'visible' });
    await page.waitForTimeout(600);

    for (const text of [
      '古风悬疑成长',
      '少年守钥人被迫卷入镇上异变，必须在守约和救人之间做选择。',
      '反派恶霸盯上钥匙，小镇少女被当筹码，山中妖物异动越来越近。',
      '真相要一层层逼出来，每一场都要接前一场的后果往下推。'
    ]) {
      await chatInput.fill(text);
      await chatSend.click();
      await page.waitForTimeout(200);
    }

    const generateButton = page.getByRole('button', { name: /生成第一版粗纲和人物/ });
    await generateButton.waitFor({ state: 'visible', timeout: 30_000 });
    await generateButton.click();

    const outlineProject = await waitForProject(
      projectFile,
      (project) => Boolean(project?.outlineDraft?.summaryEpisodes?.filter((item) => item?.summary?.trim()).length && project?.characterDrafts?.filter((item) => item?.name?.trim()).length),
      240_000,
      'outline_character_ready'
    );

    const firstFact =
      outlineProject.outlineDraft?.facts?.find((fact) => fact.status !== 'confirmed') ||
      outlineProject.outlineDraft?.facts?.[0];
    if (!firstFact) throw new Error('formal_fact_missing_after_outline');

    if (firstFact.status !== 'confirmed') {
      await page.evaluate(
        async ({ projectId, factId }) => {
          await window.api.workflow.confirmFormalFact({
            projectId,
            confirmation: { factId }
          });
        },
        { projectId: outlineProject.id, factId: firstFact.id }
      );

      await waitForProject(
        projectFile,
        (project) => Boolean(project?.outlineDraft?.facts?.some((fact) => fact.id === firstFact.id && fact.status === 'confirmed')),
        30_000,
        'formal_fact_confirmed'
      );
    }

    await page.getByRole('button', { name: /粗略大纲/ }).click();
    await page.waitForTimeout(600);
    await page.getByRole('button').filter({ hasText: /人物|小传/ }).first().click();
    await page.waitForTimeout(600);
    await page.getByRole('button').filter({ hasText: /详细|大纲/ }).first().click();

    await waitForProject(
      projectFile,
      (project) => (project?.detailedOutlineSegments || []).filter((item) => item?.content?.trim()).length >= 4,
      360_000,
      'detailed_outline_ready'
    );

    const startAt = Date.now();
    await page.getByRole('button').filter({ hasText: /剧本|定稿/ }).first().click();
    await page.waitForTimeout(1200);

    const scriptGenerateButton = page.getByRole('button', { name: /一键执笔生成|启动真实生成 Gate/ }).first();
    const canClick = await scriptGenerateButton.isEnabled().catch(() => false);
    if (canClick) {
      await scriptGenerateButton.click();
    } else {
      const currentProject = await readProjectSnapshot(projectFile);
      if (!currentProject) throw new Error('script_project_missing_before_direct_start');

      const directResult = await page.evaluate(async (payload) => {
        const nextGenerationStatus = {
          task: 'script',
          stage: 'script',
          title: '正在生成剧本',
          detail: '我在根据详细大纲，把这一轮场景往前写出来。',
          startedAt: Date.now(),
          estimatedSeconds: 110,
          scope: 'project',
          autoChain: true,
          nextTask: null
        };

        await window.api.workspace.saveGenerationStatus({
          projectId: payload.projectId,
          generationStatus: nextGenerationStatus
        });

        try {
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
          });

          if (!plan.ready) {
            return { ready: false, blockedBy: plan.blockedBy || [] };
          }

          const result = await window.api.workflow.startScriptGeneration({
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

          const nextScript = [...payload.script, ...result.generatedScenes];
          await window.api.workspace.saveScriptDraft({
            projectId: payload.projectId,
            scriptDraft: nextScript
          });

          const nextResume = await window.api.workflow.resolveScriptGenerationResume({ board: result.board });
          await window.api.workspace.saveScriptRuntimeState({
            projectId: payload.projectId,
            scriptProgressBoard: result.board,
            scriptResumeResolution: nextResume,
            scriptFailureResolution: result.failure,
            scriptStateLedger: result.ledger
          });

          return {
            ready: true,
            success: result.success,
            generatedScenes: result.generatedScenes.length,
            failure: result.failure || null
          };
        } finally {
          await window.api.workspace.saveGenerationStatus({
            projectId: payload.projectId,
            generationStatus: null
          });
        }
      }, {
        projectId: currentProject.id,
        storyIntent: currentProject.storyIntent,
        outline: currentProject.outlineDraft,
        characters: currentProject.characterDrafts,
        segments: currentProject.detailedOutlineSegments,
        script: currentProject.scriptDraft || []
      });

      if (!directResult.ready) {
        throw new Error(`script_plan_not_ready:${JSON.stringify(directResult.blockedBy || [])}`);
      }
    }

    const scriptProject = await waitForProject(
      projectFile,
      (project) => (project?.scriptDraft?.length || 0) >= 1 && !project?.generationStatus,
      420_000,
      'script_ready'
    );

    const elapsedSeconds = Number(((Date.now() - startAt) / 1000).toFixed(1));
    const quality = judgeScript(scriptProject);

    await page.screenshot({ path: path.join(outDir, 'real-script-result.png'), fullPage: true });

    console.log(JSON.stringify({
      projectName,
      userDataDir,
      elapsedSeconds,
      quality: quality.quality,
      issueCount: quality.issueCount,
      totalLength: quality.totalLength,
      hasStrongHook: quality.hasStrongHook,
      hasPressure: quality.hasPressure,
      firstScene: scriptProject?.scriptDraft?.[0] || null,
      issues: scriptProject?.scriptStateLedger?.postflight?.issues || []
    }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
