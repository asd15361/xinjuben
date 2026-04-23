import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import { _electron as electron } from 'playwright'
import { prepareE2EOutDir } from '../../utils/e2e-output.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..')
  const mainEntry = path.join(repoRoot, 'out', 'main', 'index.js')

  const { outDir, userDataDir } = await prepareE2EOutDir(repoRoot, 'mock-chain')

  console.log(`launch_electron:${mainEntry}`)
  const electronApp = await electron.launch({
    args: [mainEntry],
    env: {
      ...process.env,
      XINJUBEN_APP_MODE: 'e2e',
      MOCK_AI_ENABLE: '1',
      E2E_USER_DATA_DIR: userDataDir
    }
  })

  console.log('electron_launched')
  try {
    try {
      const child = electronApp.process()
      child.stdout?.on('data', (chunk) => {
        const text = String(chunk)
        text
          .split(/\\r?\\n/g)
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 40)
          .forEach((line) => console.log(`main_stdout:${line}`))
      })
      child.stderr?.on('data', (chunk) => {
        const text = String(chunk)
        text
          .split(/\\r?\\n/g)
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 40)
          .forEach((line) => console.log(`main_stderr:${line}`))
      })
    } catch {
      // ignore
    }

    const page = await electronApp.firstWindow()
    console.log('first_window_ready')
    page.setDefaultTimeout(15_000)
    page.setDefaultNavigationTimeout(30_000)

    await page.waitForLoadState('domcontentloaded', { timeout: 15_000 })
    console.log('domcontentloaded')
    try {
      await page.waitForLoadState('networkidle', { timeout: 10_000 })
    } catch {
      // Network may stay busy due to devtools/polling; don't block smoke test.
    }
    console.log('initial_load_done')

    await page.setViewportSize({ width: 1280, height: 720 })
    await page.screenshot({ path: path.join(outDir, 'electron_home.png'), fullPage: true })

    page.on('console', (msg) => {
      try {
        console.log(`console_${msg.type()}:${msg.text()}`)
      } catch {
        // ignore
      }
    })
    page.on('pageerror', (err) => {
      console.log(`pageerror:${String(err)}`)
    })

    // Home: create + enter project
    const projectNameInput = page.getByPlaceholder(/������Ŀ��|����Ŀ����/)
    await projectNameInput.fill('E2E样本项目')
    console.log(`projectNameInput_value:${await projectNameInput.inputValue()}`)
    await page.getByRole('button', { name: /�½�������/ }).click()
    // Wait until we really enter the project shell and disk persistence catches up.
    await page.waitForSelector('text=回到项目首页', { timeout: 30000 })
    await page.waitForTimeout(800)
    let projectPersisted = false
    let lastPersistError = ''
    const persistDeadline = Date.now() + 8000
    while (Date.now() < persistDeadline) {
      try {
        const filePath = path.join(userDataDir, 'workspace', 'projects.json')
        const raw = await fs.readFile(filePath, 'utf8')
        const json = JSON.parse(raw)
        const count = json?.projects ? Object.keys(json.projects).length : 0
        console.log(`disk_probe_after_create:${String(count)}`)
        if (count > 0) {
          projectPersisted = true
          break
        }
      } catch (e) {
        lastPersistError = String(e)
      }
      await page.waitForTimeout(250)
    }
    if (!projectPersisted) {
      console.log(`disk_probe_after_create_error:${lastPersistError || 'project_not_persisted'}`)
    }
    await page.screenshot({
      path: path.join(outDir, 'electron_after_create_project.png'),
      fullPage: true
    })

    const debug = await page.evaluate(() => {
      const status =
        document.querySelector('div.rounded-xl.border.border-white\\/8.bg-white\\/3')
          ?.textContent || ''
      const chat = document.querySelector('[data-testid="chat-intake-input"]')
      const disabled = chat ? chat.disabled : null
      const projectButtons = Array.from(document.querySelectorAll('button'))
        .map((b) => (b.textContent || '').trim())
        .filter(
          (t) => t.includes('E2E') || t.includes('Recent Projects') || t.includes('未选择项目')
        )
        .slice(0, 20)
      return { status, chatDisabled: disabled, projectButtons }
    })
    console.log(`debug_after_create:${JSON.stringify(debug)}`)

    // Chat-first intake: answer a few prompts then one-click generate
    const chatInput = page.getByTestId('chat-intake-input')
    const chatSend = page.getByTestId('chat-intake-send')
    await chatInput.waitFor({ state: 'visible' })
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="chat-intake-input"]')
      return Boolean(el && !el.disabled)
    })

    await chatInput.fill('都市情感逆袭')
    await chatSend.click()
    await page.waitForTimeout(150)
    await chatInput.fill('Ů��ǰ���飬���л�Լԭ�����������������ϡ�')
    await chatSend.click()
    await page.waitForTimeout(150)
    await chatInput.fill('�����̳��˻�����٣�����������������ʩѹ��')
    await chatSend.click()
    await page.waitForTimeout(150)
    await chatInput.fill('��Լ������ȼ̳�Ȩ���ţ�Ů�����빫����֤��')
    await chatSend.click()
    await page.waitForTimeout(200)

    // Chat UI: GPT-style. Click the explicit "confirm generate" action.
    async function triggerGenerateWithRecovery() {
      await page.getByTestId('chat-intake-generate').click()
      await page.waitForFunction(
        () => {
          const fail = Array.from(document.querySelectorAll('div'))
            .map((d) => (d.textContent || '').trim())
            .some((t) => t.startsWith('����ʧ��') || t.includes('����ʧ��'))
          if (fail) return true
          const btn = Array.from(document.querySelectorAll('button')).some(
            (b) => (b.textContent || '').trim() === 'ȥ�ָ�ȷ�Ϲؼ���ʵ'
          )
          return btn
        },
        { timeout: 60000 }
      )

      const postGenerate = await page.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll('div'))
          .map((d) => (d.textContent || '').trim())
          .filter(Boolean)
        const failRaw = nodes.find((t) => t.includes('����ʧ��')) || ''
        const failIdx = failRaw.indexOf('����ʧ��')
        const fail = failIdx >= 0 ? failRaw.slice(failIdx, failIdx + 220) : ''
        const status = nodes.find((t) => t.includes('��ǰ״̬')) || ''
        const hasOutlineBtn = Array.from(document.querySelectorAll('button')).some(
          (b) => (b.textContent || '').trim() === 'ȥ�ָ�ȷ�Ϲؼ���ʵ'
        )
        return { fail: fail.slice(0, 200), status: status.slice(0, 200), hasOutlineBtn }
      })
      console.log(`post_generate_probe:${JSON.stringify(postGenerate)}`)
      return postGenerate
    }

    let postGenerate = await triggerGenerateWithRecovery()
    if (postGenerate.fail && !postGenerate.hasOutlineBtn) {
      if (postGenerate.fail.includes('��Ŀ������') || postGenerate.fail.includes('д��ʧ��')) {
        await page.waitForTimeout(1200)
        postGenerate = await triggerGenerateWithRecovery()
      }
      if (postGenerate.fail && !postGenerate.hasOutlineBtn) {
        await page.screenshot({
          path: path.join(outDir, 'electron_after_chat_generate_failed.png'),
          fullPage: true
        })
        throw new Error(`generate_failed:${postGenerate.fail}`)
      }
    }
    const chatResult = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('div'))
        .map((d) => (d.textContent || '').trim())
        .filter(Boolean)
      const hit = nodes.find((t) => t.includes('�����ɴָ�������ݸ�') || t.startsWith('����ʧ��')) || ''
      return hit.slice(0, 200)
    })
    if (chatResult.startsWith('����ʧ��')) {
      await page.screenshot({
        path: path.join(outDir, 'electron_after_chat_generate_failed.png'),
        fullPage: true
      })
      throw new Error(`generate_failed:${chatResult}`)
    }
    await page.screenshot({
      path: path.join(outDir, 'electron_after_chat_generate.png'),
      fullPage: true
    })

    // Outline: confirm one suggested fact (draft -> confirmed) so downstream can consume it
    await page.getByRole('button', { name: 'ȥ�ָ�ȷ�Ϲؼ���ʵ' }).click()
    await page
      .getByRole('heading', { name: '粗纲设计' })
      .waitFor({ timeout: 15000 })
      .catch(() => {})
    await page.waitForTimeout(600)
    await page.waitForSelector('text=婚约原件', { timeout: 15000 }).catch(() => {})
    await page.screenshot({
      path: path.join(outDir, 'electron_outline_after_generate.png'),
      fullPage: true
    })
    const confirmCount = await page.getByRole('button', { name: '确认' }).count()
    console.log(`confirm_buttons:${confirmCount}`)
    if (confirmCount > 0) {
      await page.getByRole('button', { name: '确认' }).first().click()
    } else {
      console.log('no_confirm_button_found')
    }
    await page.waitForTimeout(300)
    await page.screenshot({
      path: path.join(outDir, 'electron_formal_fact_confirmed.png'),
      fullPage: true
    })

    // Character: verify generated drafts exist (no need to add manually for smoke)
    await page.getByRole('button', { name: /人物小传/ }).click()
    await page.waitForTimeout(400)
    await page.waitForSelector('text=��ȷ����ʵê��', { timeout: 15000 })
    await page.waitForSelector('text=����ҳ�����õ� confirmed ��ʵ', { timeout: 15000 })
    await page.screenshot({
      path: path.join(outDir, 'electron_character_stage.png'),
      fullPage: true
    })

    // Detailed outline: fill enough segments
    const detailedBtn = page.getByRole('button', { name: /详细大纲/ })
    await detailedBtn.waitFor({ state: 'visible', timeout: 15000 })
    const detailedDisabled = await detailedBtn.isDisabled().catch(() => null)
    console.log(`detailed_outline_button_disabled:${String(detailedDisabled)}`)
    await detailedBtn.click()
    await page.waitForTimeout(600)
    await page.screenshot({
      path: path.join(outDir, 'electron_after_click_detailed_outline.png'),
      fullPage: true
    })
    const headings = await page.evaluate(() =>
      Array.from(document.querySelectorAll('h2'))
        .map((h) => (h.textContent || '').trim())
        .filter(Boolean)
    )
    console.log(`visible_h2_after_click_detailed_outline:${JSON.stringify(headings)}`)
    await page.getByRole('heading', { name: '详细大纲' }).waitFor({ timeout: 30000 })
    await page.waitForSelector('text=���ҳ�����õ� confirmed ��ʵ', { timeout: 15000 })
    await page.screenshot({
      path: path.join(outDir, 'electron_detailed_outline_before_fill.png'),
      fullPage: true
    })

    async function fillAct(label, value) {
      const wrap = page.locator('label', { hasText: label }).first().locator('..')
      const textarea = wrap.locator('textarea').first()
      await textarea.waitFor({ state: 'visible', timeout: 15000 })
      await textarea.fill(value)
    }

    await fillAct('����', '���֣���Լԭ�����֣��������ϣ�����ʩѹ��Ů��������һ֤�ݡ�')
    await fillAct('�ж�', '�жΣ�ÿ10��һ�γ�ͻ��ֵ����ϵ�ܸ���������ʵ������')
    await fillAct('�߳�', '�߳����������๫��������������ת�������Ƹ����ۡ�')
    await fillAct('�վ�', '�վ֣�����������ɣ���Լԭ����ê������պ�Ϊ���Ҽ�ֵ���ѣ�������һ�����ܡ�')
    await page.waitForTimeout(300)

    // Script: start generation and (optional) auto repair
    await page.getByRole('button', { name: /剧本定稿/ }).click()
    await page.waitForTimeout(700)
    await page.waitForSelector('text=�籾ҳ�����õ� confirmed ��ʵ', { timeout: 15000 })
    await page.screenshot({
      path: path.join(outDir, 'electron_script_before_gate.png'),
      fullPage: true
    })

    const gateProbe = await page.evaluate(() => {
      const gateBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => (b.textContent || '').trim() === '启动真实生成 Gate'
      )
      const runMessage = gateBtn?.parentElement?.querySelector('p')?.textContent?.trim() || ''

      const reminderTitle = Array.from(document.querySelectorAll('p')).find(
        (p) => (p.textContent || '').trim() === '输入合同提醒'
      )
      const reminderBox = reminderTitle?.closest('div')
      const reminderIssues = reminderBox
        ? Array.from(reminderBox.querySelectorAll('p'))
            .map((p) => (p.textContent || '').trim())
            .filter((t) => t.startsWith('· '))
        : []

      const planTitle = Array.from(document.querySelectorAll('p')).find(
        (p) => (p.textContent || '').trim() === '执行计划'
      )
      const planBox = planTitle?.closest('div')
      const planText = planBox ? (planBox.textContent || '').trim().slice(0, 1200) : ''

      return {
        gateDisabled: gateBtn ? Boolean(gateBtn.disabled) : null,
        runMessage,
        reminderIssues,
        planText
      }
    })
    console.log(`gate_probe:${JSON.stringify(gateProbe)}`)

    // If the gate is still disabled, fail fast with evidence instead of timing out on click.
    if (gateProbe.gateDisabled) {
      throw new Error(`gate_disabled:${JSON.stringify(gateProbe)}`)
    }

    await page.getByRole('button', { name: '启动真实生成 Gate' }).click()
    // Wait for either success or failure message from the runtime.
    await page.waitForSelector('text=/第一批次完成|生成失败/', { timeout: 120000 })
    await page.waitForSelector('text=/��¼�� \\d+ ������/', { timeout: 120000 })
    await page.screenshot({
      path: path.join(outDir, 'electron_script_after_generation.png'),
      fullPage: true
    })

    const repairButton = page.getByRole('button', { name: '执行自动修补' })
    if (await repairButton.isVisible().catch(() => false)) {
      await repairButton.click()
      await page.waitForSelector('text=/��ִ���Զ������޲�/', { timeout: 120000 })
    }

    await page.screenshot({ path: path.join(outDir, 'electron_script_after.png'), fullPage: true })
  } finally {
    await electronApp.close()
    console.log('electron_closed')
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
