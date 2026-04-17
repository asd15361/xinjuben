/**
 * tools/e2e/utils/fresh-runner.mjs
 *
 * 真实生成跑手 — 走完整生产链。
 *
 * 核心原则：
 * - 不重放旧 evidence，不 mock AI 输出
 * - 用 tsx 子进程直接调 startScriptGeneration（处理全链路多批）
 * - evidence / summary 写入复用生产代码自带函数
 * - 只做两件事：启动跑手、读文件汇报结果
 *
 * 用法：
 *   node tools/e2e/utils/fresh-runner.mjs fresh-10
 *   node tools/e2e/utils/fresh-runner.mjs fresh-20
 */
import fsSync from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import process from 'node:process'
import { spawn } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..')

// ─────────────────────────────────────────────
// 启动脚本模板（写入临时文件，由 tsx 执行）
// ─────────────────────────────────────────────
const ENTRY_SCRIPT = `
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// 接收父进程传来的 caseId 和 mode（通过临时文件）
const CASEID_FILE = process.argv[2]
const MODE = process.argv[3] // 'fresh-10' | 'fresh-20'
const TARGET_EPISODES = MODE === 'fresh-20' ? 20 : 10
const caseId = fs.readFileSync(CASEID_FILE, 'utf8').trim()
const outDir = path.join(process.cwd(), 'tools', 'e2e', 'out', 'evidence-' + caseId)
process.env.E2E_CASE_ID = caseId
process.env.XINJUBEN_APP_MODE = 'e2e'

// Load .env
try {
  const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8')
  for (const line of envContent.split(/\\r?\\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq <= 0) continue
    const k = t.slice(0, eq).trim()
    if (!process.env[k]) process.env[k] = t.slice(eq + 1)
  }
} catch {}

// Load modules
const { buildScriptGenerationExecutionPlan } = await import(pathToFileURL(path.join(process.cwd(), 'src/main/application/script-generation/build-execution-plan.ts')).href)
const { createInitialProgressBoard } = await import(pathToFileURL(path.join(process.cwd(), 'src/main/application/script-generation/progress-board.ts')).href)
const { startScriptGeneration } = await import(pathToFileURL(path.join(process.cwd(), 'src/main/application/script-generation/start-script-generation.ts')).href)
const { loadRuntimeProviderConfig } = await import(pathToFileURL(path.join(process.cwd(), 'src/main/infrastructure/runtime-env/provider-config.ts')).href)

// ── Seed ──
const TS = '2026-04-07T00:00:00.000Z'
const summaryEpisodes = [
  '林守钥被迫接下守库旧约，先保住铜钥不被抢走。',
  '沈黑虎开始试探镇口账册的去向，把威胁推到明面。',
  '顾玄留下的旧规矩第一次逼林守钥压住出手冲动。',
  '镇口线人被清洗，林守钥只能用更慢的办法查账。',
  '沈黑虎把搜库和抓人并线，逼出主角两难选择。',
  '顾玄留下的第二道禁令曝光，旧约代价开始吞回主角。',
  '林守钥发现账册和铜钥指向同一笔旧债。',
  '沈黑虎抢先拿人质换钥匙，冲突被推到无法回避。',
  '顾玄真正托付的不是守物，而是守住镇口最后的证词。',
  '林守钥公开翻账、守住铜钥，也把旧约代价一起扛下来。'
].map((s, i) => ({ episodeNo: i + 1, summary: s }))

const characters = [
  { name: '林守钥', biography: '守库少年，替失踪的师父顾玄守着铜钥和镇口旧账。', publicMask: '看起来寡言退让，像个只会守摊的学徒。', hiddenPressure: '一旦交出铜钥，顾玄留下的旧约就会彻底失守。', fear: '怕自己一动手就把顾玄留下的规矩和证词一起毁掉。', protectTarget: '顾玄留下的铜钥与镇口账册。', conflictTrigger: '任何人逼他交出铜钥或抹掉旧账，都会逼出他反击。', advantage: '记得住旧账细节，也能在高压下继续推线索。', weakness: '过度守约，容易错过最佳反击时机。', goal: '守住铜钥和账册，把镇口旧债的真相翻出来。', arc: '从只会守约，走到敢为守住真相主动亮底。' },
  { name: '沈黑虎', biography: '镇上的地下把头，盯着铜钥和旧账背后的利益。', publicMask: '表面替镇口维持秩序，实则不断收紧搜库和抓人。', hiddenPressure: '旧账一旦翻出来，他这些年的逼压和分赃都会露底。', fear: '怕顾玄留下的证词和账册一起把自己钉死。', protectTarget: '自己控制镇口生意的盘子。', conflictTrigger: '只要铜钥和账册还在林守钥手里，他就不会收手。', advantage: '人多势重，能把威胁和封口同时压下来。', weakness: '一旦急着灭口，就会暴露真正要抢的东西。', goal: '抢到铜钥、毁掉账册，继续把镇口旧债压成死账。', arc: '从暗中围堵，走到公开逼压林守钥交钥匙。' },
  { name: '顾玄', biography: '失踪前把铜钥和旧账交给林守钥的师父。', publicMask: '只留下规矩，不再亲自出面。', hiddenPressure: '他留下的旧规矩既是保护，也成了林守钥不能乱动的枷锁。', fear: '怕徒弟为了一时救急，直接毁掉整条旧账证词。', protectTarget: '镇口最后一份还能翻案的证词。', conflictTrigger: '只要局面逼到要动武，顾玄的旧话就会反过来压住林守钥。', advantage: '提前把规矩和托付埋进了林守钥的选择里。', weakness: '人不在场，只能靠旧话和旧规矩起作用。', goal: '让林守钥守住铜钥和旧账，不要被沈黑虎逼到乱局。', arc: '从缺席角色，变成持续改写主角动作的隐形控制力。' }
]

const facts = [
  { id: 'fact_opponent_pressure', label: '对手压力', description: '沈黑虎带人围堵林守钥，逼他交出铜钥并拿镇口账册威胁。', linkedToPlot: true, linkedToTheme: true, authorityType: 'user_declared', status: 'confirmed', level: 'core', declaredBy: 'user', declaredStage: 'outline', createdAt: TS, updatedAt: TS },
  { id: 'fact_master_role', label: '师父角色', description: '师父顾玄留下旧规矩，交代林守钥不到万不得已不能动武。', linkedToPlot: true, linkedToTheme: true, authorityType: 'user_declared', status: 'confirmed', level: 'core', declaredBy: 'user', declaredStage: 'outline', createdAt: TS, updatedAt: TS }
]

const segments = [
  { act: 'opening', hookType: 'pressure-arrival', content: '开局先把对手压力落到现场：沈黑虎带人围堵林守钥，逼他交出铜钥并拿镇口账册威胁。师父顾玄留下旧规矩，交代林守钥不到万不得已不能动武。', episodeBeats: [summaryEpisodes[0], summaryEpisodes[1], summaryEpisodes[2]] },
  { act: 'midpoint', hookType: 'double-bind', content: '中段继续推进对手压力，沈黑虎把搜库和抓人并线，逼林守钥在铜钥和账册之间做取舍。顾玄留下的旧规矩持续起作用。', episodeBeats: [summaryEpisodes[3], summaryEpisodes[4], summaryEpisodes[5]] },
  { act: 'climax', hookType: 'forced-choice', content: '高潮让两条正式事实一起收紧：沈黑虎公开亮出围堵和灭口，顾玄的规矩逼林守钥先守住证词和账册再决定怎么还手。', episodeBeats: [summaryEpisodes[6], summaryEpisodes[7], summaryEpisodes[8]] },
  { act: 'ending', hookType: 'payoff', content: '终局里，林守钥利用账册翻出旧债，把沈黑虎的围堵反钉回去。', episodeBeats: [summaryEpisodes[9]] }
]

const storyIntent = {
  titleHint: '守钥风暴', genre: '古风悬疑', tone: '压迫、克制、逐层逼近',
  audience: '女频剧情向',
  sellingPremise: '守库少年被逼在守约和翻旧账之间做选择。',
  coreDislocation: '师父失踪后，守约反而成了主角最重的枷锁。',
  emotionalPayoff: '主角意识到真正守住的不是钥匙，而是能翻案的证词。',
  protagonist: '林守钥', antagonist: '沈黑虎',
  coreConflict: '沈黑虎逼林守钥交出铜钥并毁掉账册，林守钥必须守约也必须翻出旧债真相。',
  endingDirection: '林守钥守住铜钥和旧账，把沈黑虎的旧债翻到台前。',
  officialKeyCharacters: ['林守钥', '沈黑虎', '顾玄'],
  lockedCharacterNames: ['林守钥', '沈黑虎', '顾玄'],
  themeAnchors: ['守约不等于退让，真正的守是把真相守到能见光。'],
  worldAnchors: ['铜钥对应旧库暗格，账册记录镇口旧债流向。'],
  relationAnchors: [],
  dramaticMovement: ['每一场都接上一场的后果，围堵与旧规矩同步收紧。'],
  generationBriefText: '【项目】守钥风暴｜10集'
}

const outline = {
  title: '守钥风暴', genre: '古风悬疑',
  theme: '守约不等于退让，真正的守是把真相守到能见光。',
  mainConflict: '沈黑虎逼林守钥交出铜钥并毁掉账册，林守钥必须守约也必须翻出旧债真相。',
  protagonist: '林守钥',
  summary: '10集古风悬疑链路：林守钥守着师父顾玄留下的铜钥和账册，被沈黑虎持续围堵，必须在守约和翻案之间把每一次威胁接成下一场行动。',
  summaryEpisodes, facts
}

// ── Build plan & board ──
const plan = buildScriptGenerationExecutionPlan(
  { storyIntent, outline, characters, segments, script: [] },
  { mode: 'fresh_start', targetEpisodes: TARGET_EPISODES, runtimeFailureHistory: [] }
)

if (!plan.ready) {
  console.error('PLAN_NOT_READY:' + JSON.stringify(plan.blockedBy))
  process.exit(1)
}

const board = createInitialProgressBoard(plan, null)
const runtimeConfig = loadRuntimeProviderConfig()

console.error('[fresh-runner] plan ready, targetEpisodes=' + plan.targetEpisodes + ', caseId=' + caseId)
console.error('[fresh-runner] calling startScriptGeneration (multi-batch)...')

const result = await startScriptGeneration(
  {
    projectId: 'fresh-runner-' + caseId,
    plan,
    outlineTitle: outline.title,
    theme: outline.theme,
    mainConflict: outline.mainConflict,
    charactersSummary: characters.map(c => c.name),
    storyIntent,
    outline,
    characters,
    existingScript: []
  },
  runtimeConfig,
  board,
  { outline, characters, existingScript: [] },
  { onProgress: (p) => console.error('[fresh-runner] ' + p.phase + ': ' + p.detail) }
)

console.error('[fresh-runner] batch complete, success=' + result.success + ', episodes=' + result.generatedScenes.length)
fs.writeFileSync(path.join(outDir, 'batch-result.json'), JSON.stringify({
  success: result.success,
  episodeCount: result.generatedScenes.length,
  failure: result.failure
}, null, 2))
console.log('DONE')
`.trim()

// ─────────────────────────────────────────────
// 解析命令行
// ─────────────────────────────────────────────
const modeArg = process.argv[2]
if (!modeArg || !['fresh-10', 'fresh-20'].includes(modeArg)) {
  console.error('Usage: node tools/e2e/utils/fresh-runner.mjs <fresh-10|fresh-20>')
  process.exit(1)
}

const targetEpisodes = modeArg === 'fresh-10' ? 10 : 20
const runId = `fs-fresh-${modeArg === 'fresh-10' ? '10' : '20'}-${Date.now().toString(36)}`
const outDir = path.join(REPO_ROOT, 'tools', 'e2e', 'out', `evidence-${runId}`)
fsSync.mkdirSync(outDir, { recursive: true })

// 写 caseId 到临时文件，传递给子进程（避免两个进程各自 Date.now() 产生不同 ID）
const caseIdFile = path.join(REPO_ROOT, 'tools', 'e2e', `fresh-caseid-${Date.now().toString(36)}.tmp`)
fsSync.writeFileSync(caseIdFile, runId, 'utf8')

// 写临时 tsx 入口
const tmpEntry = path.join(REPO_ROOT, 'tools', 'e2e', `fresh-tmp-${Date.now().toString(36)}.mts`)
fsSync.writeFileSync(tmpEntry, ENTRY_SCRIPT, 'utf8')

// ─────────────────────────────────────────────
// 启动子进程
// ─────────────────────────────────────────────
console.log(`[fresh-runner] mode=${modeArg} target=${targetEpisodes} runId=${runId}`)
console.log(`[fresh-runner] outDir=${outDir}`)
console.log(`[fresh-runner] spawning tsx...`)

const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['tsx', tmpEntry, caseIdFile, modeArg],
  {
    cwd: REPO_ROOT,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
    shell: true,
    windowsHide: true
  }
)

let stderrData = ''

child.stdout.on('data', (chunk) => {
  const text = String(chunk)
  if (text.trim() === 'DONE') return
  process.stdout.write(text)
})
child.stderr.on('data', (chunk) => {
  const text = String(chunk)
  stderrData += text
  if (text.includes('[fresh-runner]')) process.stderr.write(text)
})
child.on('error', (err) => {
  console.error('[fresh-runner] spawn error:', err.message)
  process.exit(1)
})

// ─────────────────────────────────────────────
// 等待完成
// ─────────────────────────────────────────────
const exitCode = await new Promise((resolve) => {
  child.on('close', (code) => resolve(code ?? 0))
  child.on('error', () => resolve(1))
})

// 清理临时文件
try { fsSync.unlinkSync(caseIdFile) } catch {}
try { fsSync.unlinkSync(tmpEntry) } catch {}

if (exitCode !== 0) {
  console.error(`[fresh-runner] child exited ${exitCode}`)
  console.error('[fresh-runner] stderr:')
  console.error(stderrData)
  process.exit(exitCode)
}

if (!fsSync.existsSync(outDir)) {
  console.error(`[fresh-runner] outDir not found: ${outDir}`)
  process.exit(1)
}

// ─────────────────────────────────────────────
// 读结果
// ─────────────────────────────────────────────
const batchResultFile = path.join(outDir, 'batch-result.json')
let batchResult = { success: false, episodeCount: 0, failure: null }
if (fsSync.existsSync(batchResultFile)) {
  try { batchResult = JSON.parse(fsSync.readFileSync(batchResultFile, 'utf8')) } catch {}
}

const episodeSummaries = []
for (let i = 1; i <= targetEpisodes; i++) {
  const sf = path.join(outDir, `ep${i}-summary.json`)
  if (fsSync.existsSync(sf)) {
    try { episodeSummaries.push(JSON.parse(fsSync.readFileSync(sf, 'utf8'))) } catch {}
  }
}

function computeSummary(summaries) {
  if (!summaries.length) return null
  const charCounts = summaries.map(s => s.qualityCharCount)
  const passCount = summaries.filter(s => s.pass).length
  return {
    passRate: `${passCount}/${summaries.length}`,
    passRateDecimal: (passCount / summaries.length * 100).toFixed(1) + '%',
    min: Math.min(...charCounts),
    max: Math.max(...charCounts),
    avg: Math.round(charCounts.reduce((a, b) => a + b, 0) / charCounts.length),
    total: summaries.length,
    thinEpisodes: summaries.filter(s => s.thin).map(s => s.episode),
    fatEpisodes: summaries.filter(s => s.fat).map(s => s.episode),
    rewriteEpisodes: summaries.filter(s => s.rewrite).map(s => s.episode),
    maxAttemptCount: Math.max(...summaries.map(s => s.attemptCount)),
    generatedScenes: summaries.length
  }
}

const batchSummary = computeSummary(episodeSummaries)
const batchSummaryFile = path.join(outDir, 'batch-summary.json')
if (batchSummary) {
  fsSync.writeFileSync(batchSummaryFile, JSON.stringify(batchSummary, null, 2), 'utf8')
}

// ─────────────────────────────────────────────
// 汇报
// ─────────────────────────────────────────────
function readJson(p) {
  if (!fsSync.existsSync(p)) return null
  try { return JSON.parse(fsSync.readFileSync(p, 'utf8')) } catch { return null }
}

console.log(`\n${'═'.repeat(60)}`)
console.log(`FRESH RUN 结果：${modeArg}`)
console.log(`runId: ${runId}`)
console.log(`outDir: ${outDir}`)
console.log(`${'─'.repeat(60)}`)

if (!batchResult.success) {
  console.error(`[WARN] batch result success=false`)
  if (batchResult.failure) console.error(`  failure: ${batchResult.failure.message || JSON.stringify(batchResult.failure)}`)
}

console.log(`\n[结果汇总]`)
if (batchSummary) {
  console.log(`  passRate:       ${batchSummary.passRate} (${batchSummary.passRateDecimal})`)
  console.log(`  qualityCharCount: min=${batchSummary.min}  max=${batchSummary.max}  avg=${batchSummary.avg}`)
  console.log(`  thinEpisodes:   [${batchSummary.thinEpisodes.join(', ')}]${batchSummary.thinEpisodes.length === 0 ? ' (无)' : ''}`)
  console.log(`  fatEpisodes:    [${batchSummary.fatEpisodes.join(', ')}]${batchSummary.fatEpisodes.length === 0 ? ' (无)' : ''}`)
  console.log(`  rewriteEpisodes: [${batchSummary.rewriteEpisodes.join(', ')}]`)
  console.log(`  maxAttemptCount: ${batchSummary.maxAttemptCount}`)
  console.log(`  generatedScenes: ${batchSummary.generatedScenes}`)
} else {
  console.log(`  (无有效 summary 数据，请检查 stderr 输出)`)
}

console.log(`\n[每集明细]`)
for (const s of episodeSummaries) {
  const label = s.thin ? 'THIN' : s.fat ? 'FAT ' : 'PASS'
  console.log(`  [${label}] ep${String(s.episode).padStart(2)}: qualityCharCount=${String(s.qualityCharCount).padStart(4)}  pass=${String(s.pass).padStart(5)}  thin=${s.thin}  fat=${s.fat}  rewrite=${s.rewrite}  attemptCount=${s.attemptCount}`)
}

console.log(`\n[口径一致性证明]`)
if (episodeSummaries.length >= 2) {
  const ep1Ev = readJson(path.join(outDir, 'ep1-evidence.json'))
  const ep1Sm = episodeSummaries[0]
  const ep2Ev = readJson(path.join(outDir, 'ep2-evidence.json'))

  console.log(`\n  集1:`)
  if (ep1Ev) {
    console.log(`    qualityCharCount (正式合同): ${ep1Ev.qualityCharCount}`)
    console.log(`    pass             (正式合同): ${ep1Ev.pass}`)
    console.log(`    debugParsedLength (debug字段): ${ep1Ev.debugParsedLength}`)
    console.log(`    thin=${ep1Sm.thin}  fat=${ep1Sm.fat}`)
    console.log(`    qualityCharCount !== debugParsedLength: ${ep1Ev.qualityCharCount !== ep1Ev.debugParsedLength}`)
    console.log(`    problems: [${(ep1Ev.failures || []).map(f => f.code || f.detail || '?').join(', ')}]`)
  }

  console.log(`\n  集2:`)
  if (ep2Ev) {
    console.log(`    qualityCharCount (正式合同): ${ep2Ev.qualityCharCount}`)
    console.log(`    pass             (正式合同): ${ep2Ev.pass}`)
    console.log(`    debugParsedLength (debug字段): ${ep2Ev.debugParsedLength}`)
    console.log(`    qualityCharCount !== debugParsedLength: ${ep2Ev.qualityCharCount !== ep2Ev.debugParsedLength}`)
  }
}

console.log(`\n[文件路径]`)
console.log(`  evidence目录: ${outDir}`)
console.log(`  批次汇总:     ${batchSummaryFile}`)
console.log(`${'═'.repeat(60)}`)

if (!batchSummary) process.exit(1)


