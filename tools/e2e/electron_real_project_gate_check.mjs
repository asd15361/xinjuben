import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { _electron as electron } from 'playwright';
import { prepareE2EOutDir } from './e2e-output.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_NAME = process.env.E2E_PROJECT_NAME || '���ɴ�������֤-583876';
const SOURCE_USER_DATA_DIR = process.env.E2E_SOURCE_USER_DATA_DIR || 'userdata-script-real-run-fix2';

async function readProjectSnapshot(userDataDir) {
  const filePath = path.join(userDataDir, 'workspace', 'projects.json');
  const raw = await fs.readFile(filePath, 'utf8');
  const data = JSON.parse(raw);
  return Object.values(data.projects || {}).find((project) => project.name === PROJECT_NAME) ?? null;
}

async function waitForProjectGeneration(userDataDir, timeoutMs) {
  const startedAt = Date.now();
  const initialProject = await readProjectSnapshot(userDataDir).catch(() => null);
  const initialSceneCount = initialProject?.scriptDraft?.length ?? 0;

  while (Date.now() - startedAt < timeoutMs) {
    const project = await readProjectSnapshot(userDataDir).catch(() => null);
    const nextSceneCount = project?.scriptDraft?.length ?? 0;
    const failureMessage = project?.scriptFailureResolution?.errorMessage || '';
    if (nextSceneCount > initialSceneCount && !project?.generationStatus) {
      return {
        kind: 'generated',
        project
      };
    }

    if (
      nextSceneCount === initialSceneCount &&
      !project?.generationStatus &&
      failureMessage.includes('duplicate_scene_detected:')
    ) {
      return {
        kind: 'duplicate_blocked',
        project
      };
    }

    if (
      !project?.generationStatus &&
      project?.scriptFailureResolution &&
      !failureMessage.includes('duplicate_scene_detected:')
    ) {
      return project;
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  throw new Error(`generation_timeout:${timeoutMs}:initialSceneCount=${initialSceneCount}`);
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const mainEntry = path.join(repoRoot, 'out', 'main', 'index.js');
  const { outDir, userDataDir } = await prepareE2EOutDir(repoRoot, 'real-verify');
  const sourceDir = path.join(outDir, SOURCE_USER_DATA_DIR);
  await fs.cp(sourceDir, userDataDir, { recursive: true });

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

    const refresh = page.getByRole('button', { name: /刷新|同步/ });
    if (await refresh.isVisible().catch(() => false)) {
      await refresh.click();
      await page.waitForTimeout(800);
    }

    const query = page.getByPlaceholder(/搜索项目…|搜索\.\.\.|搜索…|搜索/);
    await query.waitFor({ state: 'visible', timeout: 30_000 });
    await query.fill(PROJECT_NAME);
    await page.waitForTimeout(500);

    let card = page.getByRole('button').filter({ hasText: PROJECT_NAME }).first();
    await card.waitFor({ state: 'visible', timeout: 30_000 });
    await card.click();

    await page.waitForSelector(`text=/项目：\\s*${PROJECT_NAME}/`, { timeout: 30_000 });
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /剧本定稿/ }).click();
    await page.getByRole('button', { name: /一键执笔生成|启动真实生成 Gate/ }).waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(outDir, 'real_project_before_gate.png'),
      fullPage: true
    });

    const before = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('body *'))
        .map((node) => (node.textContent || '').trim())
        .filter(Boolean);
      const buttons = Array.from(document.querySelectorAll('button')).map((button) => ({
        text: (button.textContent || '').trim(),
        disabled: Boolean(button.disabled)
      }));
      return {
        generateDisabled:
          buttons.find((item) => item.text === 'һ��ִ������' || item.text === '������ʵ���� Gate')?.disabled ?? null,
        sceneListLine: texts.find((text) => text.includes('��¼��') && text.includes('������')) || '',
        runMessage: texts.find((text) => text.includes('第一批次') || text.includes('生成失败')) || '',
        pageTitle: texts.find((text) => text.includes('剧本定稿')) || ''
      };
    });

    console.log(`before:${JSON.stringify(before)}`);
    const isAlreadyGenerating = /正在生成剧本|第一批次/.test(
      `${before.runMessage || ''} ${before.pageTitle || ''}`.trim()
    );
    const projectSnapshot = await readProjectSnapshot(userDataDir);

    if (!projectSnapshot) {
      throw new Error(`project_not_found:${PROJECT_NAME}`);
    }

    if (!before.generateDisabled) {
      await page.getByRole('button', { name: /一键执笔生成|启动真实生成 Gate/ }).click();
    } else if (!isAlreadyGenerating) {
      const directResult = await page.evaluate(async (payload) => {
        const plan = await window.api.workflow.buildScriptGenerationPlan({
          plan: {
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

        if (result.success) {
          const nextScript = [...payload.script, ...result.generatedScenes];
          await window.api.workspace.saveScriptDraft({
            projectId: payload.projectId,
            scriptDraft: nextScript
          });
        }
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
      }, {
        projectId: projectSnapshot.id,
        storyIntent: projectSnapshot.storyIntent,
        outline: projectSnapshot.outlineDraft,
        characters: projectSnapshot.characterDrafts,
        segments: projectSnapshot.detailedOutlineSegments,
        script: projectSnapshot.scriptDraft || []
      });

      if (!directResult.ready) {
        throw new Error(`generate_disabled:${JSON.stringify(before)} blockedBy:${JSON.stringify(directResult.blockedBy)}`);
      }
    }

    const generationOutcome = await waitForProjectGeneration(userDataDir, 240_000);
    const nextProjectSnapshot = generationOutcome.project || generationOutcome;
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: path.join(outDir, 'real_project_after_gate.png'),
      fullPage: true
    });

    const after = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('body *'))
        .map((node) => (node.textContent || '').trim())
        .filter(Boolean);
      const pickText = (keyword) => texts.find((text) => text.includes(keyword)) || '';
      const actionArea = texts.filter(
        (text) =>
          text.includes('黎明') ||
          text.includes('李科') ||
          text.includes('小柔') ||
          text.includes('钥匙') ||
          text.includes('师父')
      );
      return {
        runMessage: pickText('第一批次完成') || pickText('生成失败'),
        sceneListLine: texts.find((text) => text.includes('��¼��') && text.includes('������')) || '',
        sceneNavigatorLine: texts.find((text) => text.includes('场景导航')) || '',
        sceneEvidence: actionArea.slice(0, 12)
      };
    });

    console.log(`after:${JSON.stringify(after)}`);
    console.log(
      `project:${JSON.stringify({
        resultKind: generationOutcome.kind || 'unknown',
        scriptDraftLength: nextProjectSnapshot.scriptDraft?.length ?? 0,
        latestScene: nextProjectSnapshot.scriptDraft?.[(nextProjectSnapshot.scriptDraft?.length ?? 1) - 1] ?? null,
        generationStatus: nextProjectSnapshot.generationStatus ?? null,
        scriptFailureResolution: nextProjectSnapshot.scriptFailureResolution ?? null,
        preflightIssues: nextProjectSnapshot.scriptStateLedger?.preflight?.issues ?? [],
        memoryEchoes: nextProjectSnapshot.scriptStateLedger?.storyMomentum?.memoryEchoes ?? []
      })}`
    );
    console.log(`userDataDir:${userDataDir}`);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


