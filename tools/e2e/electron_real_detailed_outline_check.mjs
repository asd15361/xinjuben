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
    detailedOutlineSegments: lastProject?.detailedOutlineSegments?.length || 0,
    outlineCount: lastProject?.outlineDraft?.summaryEpisodes?.length || 0,
    characterCount: lastProject?.characterDrafts?.length || 0
  })}`);
}

function judgeDetailedOutline(project) {
  const segments = project?.detailedOutlineSegments || [];
  const filled = segments.filter((item) => item?.content?.trim());
  const joined = filled.map((item) => item.content.trim()).join(' ');
  const quality =
    filled.length >= 4 && /推进|代价|局势|冲突/.test(joined) && joined.length > 120
      ? '好'
      : filled.length >= 3
        ? '中'
        : '弱';

  return {
    quality,
    segmentCount: filled.length,
    totalLength: joined.length,
    hasProgressionWords: /推进|代价|局势|冲突/.test(joined)
  };
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const mainEntry = path.join(repoRoot, 'out', 'main', 'index.js');
  const { outDir, userDataDir } = await prepareE2EOutDir(repoRoot, 'real-detailed-outline-check');

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
    const projectName = `detailed-outline-${Date.now().toString(36)}`;
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
    await page.getByRole('button', { name: /确认：生成详细大纲/ }).click();
    await page.waitForTimeout(800);

    const startAt = Date.now();
    const generateDetailedOutlineButton = page.getByRole('button', { name: /生成这一版详细大纲|AI 帮我补这一版/ }).first();
    await generateDetailedOutlineButton.waitFor({ state: 'visible', timeout: 30_000 });
    await generateDetailedOutlineButton.click();

    const detailedProject = await waitForProject(
      projectFile,
      (project) => (project?.detailedOutlineSegments || []).filter((item) => item?.content?.trim()).length >= 4,
      360_000,
      'detailed_outline_ready'
    );

    const elapsedSeconds = Number(((Date.now() - startAt) / 1000).toFixed(1));
    const quality = judgeDetailedOutline(detailedProject);

    await page.screenshot({ path: path.join(outDir, 'real-detailed-outline-result.png'), fullPage: true });

    console.log(JSON.stringify({
      projectName,
      userDataDir,
      elapsedSeconds,
      quality: quality.quality,
      segmentCount: quality.segmentCount,
      totalLength: quality.totalLength,
      hasProgressionWords: quality.hasProgressionWords,
      segmentPreview: detailedProject?.detailedOutlineSegments?.slice(0, 4) || []
    }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
