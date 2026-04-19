import path from 'node:path'
import process from 'node:process'
import fs from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright'
import { prepareE2EOutDir } from '../utils/e2e-output.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ACCOUNT_EMAIL = 'stage6-072025@example.com'
const ACCOUNT_PASSWORD = 'Stage6User123!'
const PROJECT_NAME = '守钥人'
const EXPECTED_CREDITS_BEFORE = 97
const EXPECTED_CREDITS_AFTER = 94
const EXPECTED_TOTAL_CHARACTER_COUNT = 22

async function killProcessOnPort(port) {
  if (process.platform !== 'win32') {
    return
  }

  const killer = spawn('powershell.exe', [
    '-NoProfile',
    '-Command',
    `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }`
  ], { stdio: 'ignore' })

  await new Promise((resolve) => {
    killer.once('exit', () => resolve())
    killer.once('error', () => resolve())
  })
}

function parseCredits(text) {
  const match = text.match(/(\d+)\s*积分/)
  return match ? Number(match[1]) : null
}

async function waitForServer(url, timeoutMs) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        const payload = await res.json()
        if (payload?.status === 'ok') {
          return
        }
      }
    } catch {
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error('server_not_ready')
}

async function loginForToken() {
  const res = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ACCOUNT_EMAIL,
      password: ACCOUNT_PASSWORD
    })
  })

  if (!res.ok) {
    throw new Error(`login_failed:${res.status}`)
  }

  const payload = await res.json()
  if (!payload?.token) {
    throw new Error('login_token_missing')
  }
  return payload.token
}

async function readCredits(page) {
  const badgeText = await page.locator('text=/\\d+\\s*积分/').first().innerText()
  return parseCredits(badgeText)
}

async function captureFailure(page, outDir, error) {
  if (!page) return
  try {
    await page.screenshot({
      path: path.join(outDir, 'failure.png'),
      fullPage: true
    })
    const text = await page.evaluate(() => document.body.innerText || '')
    await fs.writeFile(path.join(outDir, 'failure.txt'), `${String(error)}\n\n${text}\n`, 'utf8')
  } catch {
  }
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..', '..', '..')
  const serverRoot = path.join(repoRoot, 'server')
  const mainEntry = path.join(repoRoot, 'out', 'main', 'index.js')
  const { outDir, userDataDir } = await prepareE2EOutDir(repoRoot, 'ui-outline-character-http')

  await killProcessOnPort(3001)

  const serverStdout = path.join(outDir, 'server.stdout.log')
  const serverStderr = path.join(outDir, 'server.stderr.log')
  const resultFile = path.join(outDir, 'ui-outline-character-http-result.json')

  const server = spawn(
    process.execPath,
    [
      '--require',
      path.join(serverRoot, 'node_modules', 'tsx', 'dist', 'preflight.cjs'),
      '--import',
      `file:///${path.join(serverRoot, 'node_modules', 'tsx', 'dist', 'loader.mjs').replace(/\\/g, '/')}`,
      'src/index.ts'
    ],
    {
      cwd: serverRoot,
      env: {
        ...process.env
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  )

  const stdoutHandle = await fs.open(serverStdout, 'w')
  const stderrHandle = await fs.open(serverStderr, 'w')
  server.stdout.on('data', async (chunk) => {
    await stdoutHandle.write(chunk)
  })
  server.stderr.on('data', async (chunk) => {
    await stderrHandle.write(chunk)
  })

  let app
  let page
  try {
    await waitForServer('http://localhost:3001/health', 30000)
    const token = await loginForToken()

    app = await electron.launch({
      args: [mainEntry],
      env: {
        ...process.env,
        XINJUBEN_APP_MODE: 'e2e',
        E2E_USER_DATA_DIR: userDataDir
      }
    })

    page = await app.firstWindow()
    page.setDefaultTimeout(30000)
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 })
    await page.setViewportSize({ width: 1440, height: 960 })
    await page.waitForTimeout(2000)

    await page.evaluate((value) => localStorage.setItem('xinjuben_token', value), token)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('text=/\\d+\\s*积分/', { timeout: 30000 })

    const creditsBefore = await readCredits(page)
    if (creditsBefore !== EXPECTED_CREDITS_BEFORE) {
      throw new Error(`unexpected_credits_before:${creditsBefore}`)
    }

    await page.screenshot({
      path: path.join(outDir, '01-home-after-auth.png'),
      fullPage: true
    })

    await page.getByPlaceholder('搜索...').fill(PROJECT_NAME)
    await page.waitForTimeout(1000)
    await page.getByRole('button').filter({ hasText: PROJECT_NAME }).first().click()
    await page.waitForSelector(`text=项目：${PROJECT_NAME}`, { timeout: 30000 })
    await page.waitForTimeout(1500)

    await page.screenshot({
      path: path.join(outDir, '02-project-opened.png'),
      fullPage: true
    })

    const startedAt = Date.now()
    await page.getByRole('button', { name: /重新生成粗纲和人物|生成粗纲和人物/ }).click()

    await page.waitForFunction(
      ({ expected }) => {
        const text = document.body.innerText || ''
        const match = text.match(/(\d+)\s*积分/)
        return Number(match?.[1] || 0) === expected
      },
      { expected: EXPECTED_CREDITS_AFTER },
      { timeout: 780000 }
    )

    const creditsAfter = await readCredits(page)
    if (creditsAfter !== EXPECTED_CREDITS_AFTER) {
      throw new Error(`unexpected_credits_after:${creditsAfter}`)
    }

    await page.waitForTimeout(1500)
    await page.screenshot({
      path: path.join(outDir, '03-outline-after-generation.png'),
      fullPage: true
    })

    await page.getByRole('button', { name: '确认：进入人物小传' }).click()
    await page.waitForSelector('text=完整人物小传', { timeout: 30000 })
    await page.waitForTimeout(2000)

    const characterPageText = await page.evaluate(() => document.body.innerText || '')
    const fullProfileCount = Number(characterPageText.match(/完整人物小传\s+(\d+)/)?.[1] || 0)
    const lightCardCount = Number(characterPageText.match(/轻量人物卡\s+(\d+)/)?.[1] || 0)
    const factionSeatCount = Number(characterPageText.match(/势力与人物位\s+(\d+)/)?.[1] || 0)
    const totalCharacterCount = fullProfileCount + lightCardCount

    if (totalCharacterCount !== EXPECTED_TOTAL_CHARACTER_COUNT) {
      throw new Error(`unexpected_total_character_count:${totalCharacterCount}:full=${fullProfileCount}:light=${lightCardCount}`)
    }

    if (factionSeatCount <= 0) {
      throw new Error(`unexpected_faction_seat_count:${factionSeatCount}`)
    }

    await page.screenshot({
      path: path.join(outDir, '04-character-stage.png'),
      fullPage: true
    })

    const result = {
      email: ACCOUNT_EMAIL,
      projectName: PROJECT_NAME,
      expectedProjectId: 'v7vr38195j6awsf',
      creditsBefore,
      creditsAfter,
      creditsDelta: creditsBefore - creditsAfter,
      fullProfileCount,
      lightCardCount,
      totalCharacterCount,
      factionSeatCount,
      elapsedMs: Date.now() - startedAt,
      outDir,
      screenshots: [
        '01-home-after-auth.png',
        '02-project-opened.png',
        '03-outline-after-generation.png',
        '04-character-stage.png'
      ],
      serverStdout,
      serverStderr
    }

    await fs.writeFile(resultFile, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    await captureFailure(page, outDir, error)
    throw error
  } finally {
    if (app) {
      await app.close()
    }
    server.kill('SIGKILL')
    await stdoutHandle.close()
    await stderrHandle.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

