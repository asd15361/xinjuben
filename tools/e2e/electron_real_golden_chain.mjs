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
    facts: lastProject?.outlineDraft?.facts || [],
    detailedOutlineSegments: lastProject?.detailedOutlineSegments?.length || 0,
    scriptDraft: lastProject?.scriptDraft?.length || 0
  })}`);
}

async function waitForScriptStart(projectFile, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const project = await readProjectSnapshot(projectFile).catch(() => null);
    if (project?.generationStatus?.task === 'script') {
      return project;
    }
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  return null;
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const mainEntry = path.join(repoRoot, 'out', 'main', 'index.js');
  const { outDir, userDataDir } = await prepareE2EOutDir(repoRoot, 'real-chain');

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

    const homeInput = page.locator('input').first();
    if (!(await homeInput.isVisible().catch(() => false))) {
      const backHome = page.getByRole('button', { name: '回到项目首页' });
      if (await backHome.isVisible().catch(() => false)) {
        await backHome.click();
        await page.waitForTimeout(1200);
      }
    }

    const projectNameInput = page.locator('input').first();
    await projectNameInput.waitFor({ state: 'visible', timeout: 30_000 });
    const createButton =
      (await page.getByRole('button').filter({ hasText: /新建|快速/ }).count()) > 0
        ? page.getByRole('button').filter({ hasText: /新建|快速/ }).first()
        : page.getByRole('button').first();
    const projectName = `real-chain-${Date.now().toString(36)}`;
    await projectNameInput.fill(projectName);
    await createButton.click();
    const projectCard = page.getByRole('button').filter({ hasText: projectName }).first();
    await projectCard.waitFor({ state: 'visible', timeout: 30_000 });
    await projectCard.click();
    await page.waitForSelector(`text=/项目：\\s*${projectName}/`, { timeout: 30_000 });
    await page.waitForTimeout(1000);
    const projectFile = path.join(userDataDir, 'workspace', 'projects.json');

    const chatInput = page.locator('textarea, input').first();
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
      await page.waitForTimeout(180);
    }

    await page.getByRole('button', { name: '生成第一版粗纲和人物', exact: true }).click();
    const outlineProject = await waitForProject(
      projectFile,
      (project) => Boolean(project?.outlineDraft?.summaryEpisodes?.length && project?.characterDrafts?.length),
      240_000,
      'outline_ready'
    );

    const failText = await page.evaluate(() =>
      Array.from(document.querySelectorAll('div'))
        .map((d) => (d.textContent || '').trim())
        .find((t) => t.includes('生成失败')) || ''
    );
    if (failText) throw new Error(failText);

    const projectId = outlineProject.id;
    const firstFact =
      outlineProject.outlineDraft?.facts?.find((fact) => fact.status !== 'confirmed') ||
      outlineProject.outlineDraft?.facts?.[0];
    if (!firstFact) {
      throw new Error('formal_fact_missing_after_outline');
    }

    if (firstFact.status !== 'confirmed') {
      await page.evaluate(
        async ({ projectId: currentProjectId, factId }) => {
          await window.api.workflow.confirmFormalFact({
            projectId: currentProjectId,
            confirmation: { factId }
          });
        },
        { projectId, factId: firstFact.id }
      );

      await waitForProject(
        projectFile,
        (project) => Boolean(project?.outlineDraft?.facts?.some((fact) => fact.id === firstFact.id && fact.status === 'confirmed')),
        30_000,
        'formal_fact_confirmed'
      );

      const backHome = page.getByRole('button', { name: '回到项目首页' });
      await backHome.waitFor({ state: 'visible', timeout: 30_000 });
      await backHome.click();
      await page.waitForTimeout(1200);
      await page.getByRole('button').filter({ hasText: projectName }).first().click();
      await page.waitForSelector(`text=/项目：\\s*${projectName}/`, { timeout: 30_000 });
      await page.waitForTimeout(1000);
    }

    await page.getByRole('button', { name: /粗略大纲/ }).click();
    await page.waitForTimeout(600);
    await page.getByRole('button').filter({ hasText: /人物|小传/ }).first().click();
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: /确认：生成详细大纲/ }).click();
    await page.waitForTimeout(800);
    const generateDetailedOutlineButton = page.getByRole('button', { name: /生成这一版详细大纲|AI 帮我补这一版/ }).first();
    await generateDetailedOutlineButton.waitFor({ state: 'visible', timeout: 30_000 });
    await generateDetailedOutlineButton.click();

    await waitForProject(
      projectFile,
      (project) => (project?.detailedOutlineSegments || []).filter((item) => item?.content?.trim()).length >= 2,
      360_000,
      'detailed_outline_ready'
    );

    await page.getByRole('button', { name: /详细大纲/ }).first().click();
    await page.waitForTimeout(1000);

    async function tryFillAct(index, value) {
      const textarea = page.locator('textarea').nth(index);
      await textarea.waitFor({ state: 'visible', timeout: 15_000 });
      const enabled = await textarea.isEnabled().catch(() => false);
      if (!enabled) return false;
      await textarea.fill(value);
      return true;
    }

    const factAnchor = firstFact.label.replace(/^draft_/, '');
    await tryFillAct(0, `开局：${factAnchor}先压下来，反派恶霸拿小镇少女逼少年守钥人交出密库钥匙，上一场的威胁直接变成这一场的行动。`);
    await tryFillAct(1, `中段：反派恶霸继续加码，密库钥匙与山中妖物异动开始并线，少年守钥人每次反制都留下新的后果和新的误解。`);
    await tryFillAct(2, '高潮：小镇少女与密库钥匙背后的旧真相被掀开，反派恶霸把前面积累的债一次性压上来，逼少年守钥人正面亮底。');
    await tryFillAct(3, '终局：少年守钥人把守约与救人的冲突一起推到台前，当前危机收口，但新的锁孔与新的代价继续承接到下一轮。');
    await page.waitForTimeout(400);

    await page.getByRole('button', { name: /剧本定稿/ }).first().click();
    await page.waitForTimeout(1000);
    await page.getByRole('heading', { name: /剧本定稿/ }).waitFor({ state: 'visible', timeout: 30_000 });
    const scriptProject = await readProjectSnapshot(projectFile);
    const scriptGenerateButton = page.getByRole('button', { name: /一键执笔生成|现在开始写剧本|启动真实生成 Gate/ }).first();
    await scriptGenerateButton.waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForFunction(
      () => {
        const target = Array.from(document.querySelectorAll('button')).find((node) =>
          /(一键执笔生成|现在开始写剧本|启动真实生成 Gate)/.test((node.textContent || '').trim())
        );
        return Boolean(target && !(target).disabled);
      },
      { timeout: 30_000 }
    ).catch(() => null);
    const scriptButtonEnabled = await scriptGenerateButton.isEnabled().catch(() => false);

    if (scriptButtonEnabled) {
      await scriptGenerateButton.click();
      const started = await waitForScriptStart(projectFile, 15_000);
      if (!started?.generationStatus || started.generationStatus.task !== 'script') {
        throw new Error('script_generation_not_started_by_ui_click');
      }
    } else {
      const directResult = await page.evaluate(async (payload) => {
        const nextGenerationStatus = {
          task: 'script',
          stage: 'script',
          title: '正在生成剧本',
          detail: '我在根据详细大纲，把这一轮场景往前写出来。',
          startedAt: Date.now(),
          estimatedSeconds: 110,
          scope: 'project'
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
            return {
              ready: false,
              blockedBy: plan.blockedBy || [],
              contract: {
                ready: plan.contract?.ready ?? false,
                missingFormalFactLandings: plan.contract?.missingFormalFactLandings || [],
                missingAnchorNames: plan.contract?.missingAnchorNames || [],
                heroineAnchorCovered: plan.contract?.heroineAnchorCovered ?? false
              }
            };
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
        projectId: scriptProject.id,
        storyIntent: scriptProject.storyIntent,
        outline: scriptProject.outlineDraft,
        characters: scriptProject.characterDrafts,
        segments: scriptProject.detailedOutlineSegments,
        script: scriptProject.scriptDraft || []
      });

      if (!directResult.ready) {
        throw new Error(
          `script_plan_not_ready:${JSON.stringify({
            blockedBy: directResult.blockedBy || [],
            contract: directResult.contract || null
          })}`
        );
      }
    }

    const project = await waitForProject(
      projectFile,
      (currentProject) => (currentProject?.scriptDraft?.length || 0) >= 1 && !currentProject?.generationStatus,
      300_000,
      'script_ready'
    );
    console.log(
      JSON.stringify(
        {
          userDataDir,
          projectName: project?.name || '',
          sceneCount: project?.scriptDraft?.length || 0,
          firstScene: project?.scriptDraft?.[0] || null,
          secondScene: project?.scriptDraft?.[1] || null,
          issues: project?.scriptStateLedger?.postflight?.issues || [],
          userDataDir
        },
        null,
        2
      )
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});



