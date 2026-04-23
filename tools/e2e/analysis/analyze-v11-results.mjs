// tools/e2e/analysis/analyze-v11-results.mjs
// 读 v11 测试结果，分析瘦集和胖集的具体内容
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const E2E_ROOT = path.join(__dirname, '..')

const CASES = [
  {
    label: '30ep v11.2 (v11.2: 20/30)',
    dir: 'userdata-v11-30ep-mnf7s6zu',
    thinEps: [10, 15, 16, 17, 20, 25],
    fatEps: [2, 4, 6, 28]
  },
  {
    label: '50ep v11.3 (v11.3: 27/50)',
    dir: 'userdata-v11-50ep-mnf8saxc',
    thinEps: [1, 4, 5, 9, 10, 11, 14, 15, 16, 19, 23, 26, 29, 30, 31, 32, 33, 39, 50],
    fatEps: [40, 42, 47, 49]
  }
]

async function main() {
  for (const c of CASES) {
    console.log(`\n========== ${c.label} ==========`)
    const projectPath = path.join(E2E_ROOT, 'out', c.dir, 'evidence', 'final-project.json')
    let project
    try {
      const raw = await fs.readFile(projectPath, 'utf8')
      project = JSON.parse(raw)
    } catch {
      console.log('  [SKIP - no final-project.json]')
      continue
    }

    const scenes = project.scriptDraft || []

    // Show thinnest 2 episodes
    const sorted = [...scenes].sort((a, b) => {
      const ca = ((a.action || '') + (a.dialogue || '') + (a.emotion || '')).length
      const cb = ((b.action || '') + (b.dialogue || '') + (b.emotion || '')).length
      return ca - cb
    })

    console.log('\n-- 2 THINNEST episodes --')
    for (const ep of sorted.slice(0, 2)) {
      const total = ((ep.action || '') + (ep.dialogue || '') + (ep.emotion || '')).length
      const sp = ep.screenplay || ''
      console.log(`\n[Ep${ep.sceneNo}] total=${total} chars, screenplayLen=${sp.length}`)
      console.log('--- screenplay (first 600 chars) ---')
      console.log(sp.substring(0, 600))
      console.log('---')
    }

    // Show fattest 2 episodes
    console.log('\n-- 2 FATTEST episodes --')
    for (const ep of sorted.slice(-2).reverse()) {
      const total = ((ep.action || '') + (ep.dialogue || '') + (ep.emotion || '')).length
      const sp = ep.screenplay || ''
      console.log(`\n[Ep${ep.sceneNo}] total=${total} chars, screenplayLen=${sp.length}`)
      console.log('--- screenplay (first 800 chars) ---')
      console.log(sp.substring(0, 800))
      console.log('---')
    }

    // Show scene count distribution
    const sceneCounts = {}
    for (const ep of scenes) {
      const cnt = (ep.screenplayScenes || []).length
      sceneCounts[cnt] = (sceneCounts[cnt] || 0) + 1
    }
    console.log('\n-- scene count distribution --')
    for (const [cnt, n] of Object.entries(sceneCounts).sort((a, b) => a[0] - b[0])) {
      console.log(`  ${cnt} scenes: ${n} episodes`)
    }
  }
}

main().catch(console.error)
