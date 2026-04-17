import path from 'node:path'
import process from 'node:process'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from 'playwright'
import { prepareE2EOutDir } from '../../utils/e2e-output.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PROJECT_NAME = '���ɴ�������֤-583876'
const SOURCE_USER_DATA_DIR = 'userdata-script-real-run-fix2'

async function main() {
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..')
  const mainEntry = path.join(repoRoot, 'out', 'main', 'index.js')
  const { outDir, userDataDir } = await prepareE2EOutDir(repoRoot, 'stage-smoke')
  const sourceDir = path.join(outDir, SOURCE_USER_DATA_DIR)
  await fs.cp(sourceDir, userDataDir, { recursive: true })

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

    const search = page.getByPlaceholder(/搜索项目…|搜索\.\.\.|搜索…|搜索/)
    await search.fill(PROJECT_NAME)
    await page.waitForTimeout(500)
    await page.getByRole('button').filter({ hasText: PROJECT_NAME }).first().click()
    await page.waitForSelector(`text=/项目：\\s*${PROJECT_NAME}/`, { timeout: 30_000 })
    await page.waitForTimeout(1200)

    const stages = [
      { name: 'chat', button: /��жԻ�/, mustSee: ['������з���', 'ȥ�ָ�ȷ�Ϲؼ���ʵ'] },
      { name: 'outline', button: /粗略大纲/, mustSee: ['粗略大纲', '分集剧情视窗'] },
      { name: 'character', button: /人物小传/, mustSee: ['人物小传', '添加角色'] },
      { name: 'detailed_outline', button: /详细大纲/, mustSee: ['详细大纲', '把粗纲变成真正能往下写剧本的推进图'] },
      { name: 'script', button: /�籾����/, mustSee: ['�籾����', 'һ��ִ������'] }
    ]

    const results = []

    for (const stage of stages) {
      await page.getByRole('button', { name: stage.button }).first().click()
      await page.waitForTimeout(1000)

      const snapshot = await page.evaluate((input) => {
        const text = document.body.innerText || ''
        return {
          stage: input.name,
          matched: input.mustSee.every((keyword) => text.includes(keyword)),
          missing: input.mustSee.filter((keyword) => !text.includes(keyword))
        }
      }, stage)

      results.push(snapshot)

      await page.screenshot({
        path: path.join(outDir, `stage-smoke-${stage.name}.png`),
        fullPage: true
      })
    }

    console.log(`stageResults:${JSON.stringify(results)}`)
    console.log(`userDataDir:${userDataDir}`)

    const failed = results.find((item) => !item.matched)
    if (failed) {
      throw new Error(`stage_smoke_failed:${JSON.stringify(failed)}`)
    }
  } finally {
    await app.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})




