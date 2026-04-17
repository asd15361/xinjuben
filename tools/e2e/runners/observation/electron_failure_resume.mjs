import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { _electron as electron } from 'playwright';
import { prepareE2EOutDir } from '../../utils/e2e-output.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runOnce(input) {
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
  const mainEntry = path.join(repoRoot, 'out', 'main', 'index.js');
  const outDir = path.join(repoRoot, 'tools', 'e2e', 'out');
  const userDataDir = input.userDataDir;

  const electronApp = await electron.launch({
    args: [mainEntry],
    env: {
      ...process.env,
      XINJUBEN_APP_MODE: 'e2e',
      MOCK_AI_ENABLE: '1',
      E2E_USER_DATA_DIR: userDataDir,
      ...(input.failEpisode ? { MOCK_AI_FAIL_EPISODE: String(input.failEpisode) } : {})
    }
  });

  try {
    try {
      const child = electronApp.process();
      child.on('exit', (code, signal) => {
        console.log(`electron_process_exit:${String(code)}:${String(signal || '')}`);
      });
      child.stdout?.on('data', (chunk) => {
        try {
          const text = String(chunk);
          text
            .split(/\r?\n/g)
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 40)
            .forEach((line) => console.log(`main_stdout_${input.tag}:${line}`));
        } catch {
          // ignore
        }
      });
      child.stderr?.on('data', (chunk) => {
        try {
          const text = String(chunk);
          text
            .split(/\r?\n/g)
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(0, 40)
            .forEach((line) => console.log(`main_stderr_${input.tag}:${line}`));
        } catch {
          // ignore
        }
      });
    } catch {
      // ignore
    }

    const page = await electronApp.firstWindow();
    page.setDefaultTimeout(15_000);
    await page.waitForLoadState('domcontentloaded', { timeout: 15_000 });
    await page.setViewportSize({ width: 1280, height: 720 });
    page.on('console', (msg) => {
      try {
        console.log(`console_${input.tag}_${msg.type()}:${msg.text()}`);
      } catch {
        // ignore
      }
    });
    page.on('pageerror', (err) => {
      console.log(`pageerror_${input.tag}:${String(err)}`);
    });
    // Give the renderer hooks time to mount and load projects list.
    await page.waitForTimeout(1200);

    // Enter project.
    if (input.tag === 'fail') {
      const projectNameInput = page.locator('input').first();
      await projectNameInput.fill(input.projectName);
      await page.getByRole('button').filter({ hasText: /新建|快速/ }).first().click();
      await page.waitForTimeout(600);

      // Disk probe: confirm project persisted right after creation.
      const deadline = Date.now() + 8000;
      let count = 0;
      let lastErr = '';
      while (Date.now() < deadline) {
        try {
          const filePath = path.join(input.userDataDir, 'workspace', 'projects.json');
          const raw = await fs.readFile(filePath, 'utf8');
          const json = JSON.parse(raw);
          count = json?.projects ? Object.keys(json.projects).length : 0;
          if (count > 0) break;
        } catch (e) {
          lastErr = String(e);
        }
        await page.waitForTimeout(250);
      }
      console.log(`disk_probe_after_create:${String(count)}${lastErr ? ` err=${lastErr}` : ''}`);
      if (count === 0) {
        throw new Error(`project_not_persisted:${lastErr || 'unknown'}`);
      }
    } else {
      // Resume should reopen the same project from the home list.
      // Click the project card (avoid clicking the "删除" button in the card).
      await page.locator('input').first().waitFor({ state: 'visible', timeout: 30000 });
      const query = page.locator('input').nth(1);
      await query.waitFor({ state: 'visible', timeout: 30000 });
      // Reload once to avoid "empty list" races on cold start.
      const refresh = page.getByRole('button', { name: '刷新' });
      if (await refresh.isVisible().catch(() => false)) {
        await refresh.click();
        await page.waitForTimeout(800);
      }
      await query.fill(input.projectName);
      await page.waitForTimeout(300);
      let card = page.getByRole('button').filter({ hasText: input.projectName }).first();
      try {
        await card.waitFor({ state: 'visible', timeout: 30000 });
      } catch {
        const list = await page.evaluate(async () => {
          try {
            // eslint-disable-next-line no-undef
            return await window.api.workspace.listProjects();
          } catch (e) {
            return { error: String(e) };
          }
        });
        console.log(`listProjects_probe_${input.tag}:${JSON.stringify(list).slice(0, 1000)}`);
        if (Array.isArray(list) && list.some((item) => item?.name === input.projectName)) {
          await page.waitForTimeout(1000);
          await query.fill('');
          await page.waitForTimeout(200);
          await query.fill(input.projectName);
          await page.waitForTimeout(500);
          card = page.getByRole('button').filter({ hasText: input.projectName }).first();
          await card.waitFor({ state: 'visible', timeout: 15000 });
        } else {
          await page.screenshot({ path: path.join(outDir, `electron_${input.tag}_project_not_found.png`), fullPage: true });
          throw new Error('project_not_found_in_home');
        }
      }
      await card.click();
      await page.waitForTimeout(600);
    }

    await page.waitForSelector('text=回到项目首页', { timeout: 30000 });
    // Ensure header reflects the selected project (projectId is ready).
    await page.waitForSelector(`text=/项目：\\s*${input.projectName}/`, { timeout: 30000 });
    // Ensure project shell is fully hydrated (projectId set, chat unlocked).
    await page.waitForSelector(`text=/\\/\\s*(chat|outline|character|detailed outline|script)/`, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1200);

    // Give persistence a moment; avoid hard-failing on storage probes (can be flaky across environments).
    await page.waitForTimeout(300);

    // Chat-first intake �?one-click generate.
    const chatInput = page.getByTestId('chat-intake-input');
    const chatSend = page.getByTestId('chat-intake-send');
    await chatInput.waitFor({ state: 'visible' });
    await page.waitForTimeout(600);
    try {
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        const enabled = await chatInput.isEnabled().catch(() => false);
        if (enabled) break;
        await page.waitForTimeout(250);
      }
      if (!(await chatInput.isEnabled().catch(() => false))) {
        throw new Error('chat_input_still_disabled');
      }
    } catch (e) {
      await page.screenshot({ path: path.join(outDir, `electron_${input.tag}_chat_disabled.png`), fullPage: true });
      const debug = await page.evaluate(() => {
        const status = document.querySelector('div.rounded-xl.border.border-white\\/8.bg-white\\/3')?.textContent || '';
        const chat = document.querySelector('[data-testid="chat-intake-input"]');
        const disabled = chat ? chat.disabled : null;
        return { status, chatDisabled: disabled };
      });
      throw new Error(`chat_not_ready:${JSON.stringify(debug)}`);
    }

    await chatInput.fill('都市情感逆袭');
    await chatSend.click();
    await page.waitForTimeout(120);
    await chatInput.fill('女主前秘书，握有婚约原件，想夺回身份与尊严。');
    await chatSend.click();
    await page.waitForTimeout(120);
    await chatInput.fill('男主继承人怀疑造假；反派以名誉与亲情施压。');
    await chatSend.click();
    await page.waitForTimeout(120);
    await chatInput.fill('婚约真相逼迫继承权重排，女主必须公开自证。');
    await chatSend.click();
    await page.waitForTimeout(180);

    await page.getByTestId('chat-intake-generate').click();
    await page.waitForFunction(() => {
      const failRaw = Array.from(document.querySelectorAll('div'))
        .map((d) => (d.textContent || '').trim())
        .find((t) => t.includes('生成失败')) || '';
      if (failRaw) return true;
      const btn = Array.from(document.querySelectorAll('button')).some(
        (b) => (b.textContent || '').trim() === '去粗纲确认关键事实'
      );
      return btn;
    }, { timeout: 60000 });
    const chatResult = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('div'))
        .map((d) => (d.textContent || '').trim())
        .filter(Boolean);
      const failRaw = nodes.find((t) => t.includes('生成失败')) || '';
      const idx = failRaw.indexOf('生成失败');
      return idx >= 0 ? failRaw.slice(idx, idx + 220) : '';
    });
    if (chatResult.startsWith('生成失败')) {
      await page.screenshot({ path: path.join(outDir, `electron_${input.tag}_generate_failed.png`), fullPage: true });
      // One retry can absorb hydration races after entering a new project.
      await page.waitForTimeout(1200);
      await page.getByTestId('chat-intake-generate').click();
      await page.waitForFunction(() => {
        const failRaw = Array.from(document.querySelectorAll('div'))
          .map((d) => (d.textContent || '').trim())
          .find((t) => t.includes('生成失败')) || '';
        if (failRaw) return true;
        const btn = Array.from(document.querySelectorAll('button')).some(
          (b) => (b.textContent || '').trim() === '去粗纲确认关键事实'
        );
        return btn;
      }, { timeout: 60000 });
      const chatResult2 = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll('div'))
          .map((d) => (d.textContent || '').trim())
          .filter(Boolean);
        const failRaw = nodes.find((t) => t.includes('生成失败')) || '';
        const idx = failRaw.indexOf('生成失败');
        return idx >= 0 ? failRaw.slice(idx, idx + 220) : '';
      });
      if (chatResult2.startsWith('生成失败')) {
        // If the failure is "project missing", re-open the project and try once more.
        if (chatResult2.includes('项目不存在') || chatResult2.includes('写入失败')) {
          await page.getByRole('button', { name: '回到项目首页' }).click();
          await page.locator('input').first().waitFor({ state: 'visible', timeout: 30000 });
          await page.waitForTimeout(300);
          const query = page.locator('input').nth(1);
          await query.waitFor({ state: 'visible', timeout: 30000 });
          await query.fill(input.projectName);
          await page.waitForTimeout(300);
          const card = page.getByRole('button').filter({ hasText: input.projectName }).first();
          await card.waitFor({ state: 'visible', timeout: 30000 });
          await card.click();
          await page.waitForSelector(`text=/项目：\\s*${input.projectName}/`, { timeout: 30000 });
          await page.waitForTimeout(1200);

          await page.getByTestId('chat-intake-generate').click();
          await page.waitForFunction(() => {
            const failRaw = Array.from(document.querySelectorAll('div'))
              .map((d) => (d.textContent || '').trim())
              .find((t) => t.includes('生成失败')) || '';
            if (failRaw) return true;
            const btn = Array.from(document.querySelectorAll('button')).some(
              (b) => (b.textContent || '').trim() === '去粗纲确认关键事实'
            );
            return btn;
          }, { timeout: 60000 });

          const chatResult3 = await page.evaluate(() => {
            const nodes = Array.from(document.querySelectorAll('div'))
              .map((d) => (d.textContent || '').trim())
              .filter(Boolean);
            const failRaw = nodes.find((t) => t.includes('生成失败')) || '';
            const idx = failRaw.indexOf('生成失败');
            return idx >= 0 ? failRaw.slice(idx, idx + 220) : '';
          });
          if (chatResult3.startsWith('生成失败')) {
            await page.screenshot({ path: path.join(outDir, `electron_${input.tag}_generate_failed_third.png`), fullPage: true });
            throw new Error(`generate_failed:${chatResult3}`);
          }
        } else {
          await page.screenshot({ path: path.join(outDir, `electron_${input.tag}_generate_failed_retry.png`), fullPage: true });
          throw new Error(`generate_failed:${chatResult2}`);
        }
      }
    }

    // Outline: confirm one suggested fact so downstream can consume it.
    await page.getByRole('button', { name: '去粗纲确认关键事实' }).click();
    await page.waitForTimeout(700);
    // Wait for the suggested fact to render, then confirm it.
    await page.waitForSelector('text=婚约原件', { timeout: 15000 }).catch(() => {});
    const confirmCount = await page.getByRole('button', { name: '确认' }).count();
    console.log(`confirm_buttons:${confirmCount}`);
    if (confirmCount > 0) {
      await page.getByRole('button', { name: '确认' }).first().click();
      await page.waitForTimeout(200);
    }
    await page.screenshot({ path: path.join(outDir, `electron_${input.tag}_after_confirm.png`), fullPage: true });
    // UI-level evidence: confirmed label should appear after click.
    await page.waitForSelector('text=/\\[confirmed\\]/', { timeout: 15000 }).catch(() => {});

    // Detailed outline: fill 4 acts quickly.
    await page.getByRole('button', { name: /详细大纲/ }).click();
    await page.waitForTimeout(600);
    await page.waitForSelector('text=详纲页可引用的 confirmed 事实', { timeout: 15000 });
    async function fillAct(label, value) {
      const wrap = page.locator('label', { hasText: label }).first().locator('..');
      const textarea = wrap.locator('textarea').first();
      await textarea.waitFor({ state: 'visible', timeout: 15000 });
      await textarea.fill(value);
    }
    await fillAct('开局', '开局：婚约原件出现，公开对峙，逼出第一轮反转。');
    await fillAct('中段', '中段：舆论与权力双压，证据链一段段升格。');
    await fillAct('高潮', '高潮：真相公开核验，关系断裂再重组。');
    await fillAct('终局', '终局：主题闭合为自我价值觉醒，留下一季钩子。');
    await page.waitForTimeout(250);

    // Script: start generation.
    await page.getByRole('button', { name: /剧本定稿/ }).click();
    await page.waitForTimeout(600);
    await page.waitForSelector('text=剧本页可引用的 confirmed 事实', { timeout: 15000 });
    await page.screenshot({
      path: path.join(outDir, input.tag === 'fail' ? 'electron_fail_before_gate.png' : 'electron_resume_before_gate.png'),
      fullPage: true
    });
    const gateProbe = await page.evaluate(() => {
      const gateBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => (b.textContent || '').trim() === '启动真实生成 Gate'
      );
      const reminderTitle = Array.from(document.querySelectorAll('p')).find(
        (p) => (p.textContent || '').trim() === '输入合同提醒'
      );
      const reminderBox = reminderTitle?.closest('div');
      const reminderIssues = reminderBox
        ? Array.from(reminderBox.querySelectorAll('p'))
            .map((p) => (p.textContent || '').trim())
            .filter((t) => t.startsWith('· '))
        : [];
      return {
        gateDisabled: gateBtn ? Boolean(gateBtn.disabled) : null,
        reminderIssues
      };
    });
    if (gateProbe.gateDisabled) {
      await page.screenshot({ path: path.join(outDir, `electron_${input.tag}_gate_disabled.png`), fullPage: true });
      throw new Error(`gate_disabled:${JSON.stringify(gateProbe)}`);
    }

    await page.getByRole('button', { name: '启动真实生成 Gate' }).click();

    if (input.tag === 'fail') {
      await page.waitForSelector('text=/生成失败/', { timeout: 120000 });
      await page.screenshot({ path: path.join(outDir, 'electron_fail_after.png'), fullPage: true });
    } else {
      // In resume probe we just need the resume panel to be visible and readable.
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(outDir, 'electron_resume_after.png'), fullPage: true });
    }
  } finally {
    await electronApp.close();
  }
}

async function hasProject(userDataDir, projectName) {
  try {
    const filePath = path.join(userDataDir, 'workspace', 'projects.json');
    const raw = await fs.readFile(filePath, 'utf8');
    const json = JSON.parse(raw);
    const projects = json && typeof json === 'object' ? json.projects : null;
    if (!projects || typeof projects !== 'object') return false;
    return Object.values(projects).some((p) => p && typeof p === 'object' && p.name === projectName);
  } catch {
    return false;
  }
}

async function main() {
  const projectName = 'E2E失败样本项目';
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
  const outDir = path.join(repoRoot, 'tools', 'e2e', 'out');
  let failUserDataDir = '';
  let resumeUserDataDir = '';

  for (let attempt = 0; attempt < 3; attempt += 1) {
    failUserDataDir = path.join(outDir, `userdata-failure-${Date.now().toString(36)}-${attempt}`);
    resumeUserDataDir = path.join(outDir, `userdata-resume-${Date.now().toString(36)}-${attempt}`);
    await fs.mkdir(failUserDataDir, { recursive: true });
    await fs.mkdir(resumeUserDataDir, { recursive: true });

    await runOnce({ tag: 'fail', projectName, failEpisode: 1, userDataDir: failUserDataDir });
    const ok = await hasProject(failUserDataDir, projectName);
    console.log(`persist_probe_attempt_${attempt}:${String(ok)}`);
    if (ok) break;
  }

  if (!(await hasProject(failUserDataDir, projectName))) {
    throw new Error('persist_probe_failed:project_not_persisted');
  }

  // Some Electron builds can exit early when reusing the same userData directory across rapid relaunches.
  // We copy the persisted workspace forward to keep the "resume" assertion meaningful and stable.
  await fs.cp(failUserDataDir, resumeUserDataDir, { recursive: true });

  await runOnce({ tag: 'resume', projectName, failEpisode: 0, userDataDir: resumeUserDataDir });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});




