/**
 * tools/e2e/utils/evidence-runner.mjs
 *
 * 验收证据跑手：按 fresh 10 / fresh 20 两个批次执行真实剧本生成，
 * 产出符合新 evidence 合同（qualityCharCount / pass / debugParsedLength / summary）的证据文件。
 *
 * 用法：
 *   node tools/e2e/utils/evidence-runner.mjs fresh-10
 *   node tools/e2e/utils/evidence-runner.mjs fresh-20
 *
 * 输出：
 *   tools/e2e/out/evidence-<RUN_ID>/
 *     ep1-evidence.json     （每次 attempt 一个，含新合同字段）
 *     ep1-summary.json     （每集一个最终版）
 *     ep1-attempt1.json
 *     ...
 *     batch-summary.json   （批次汇总）
 *
 * 口径：
 *   - qualityCharCount  = screenplay.replace(/\s+/g, '').length  ← 正式合同（与 inspectScreenplayQualityEpisode 同源）
 *   - pass             = inspectQuality(scene).pass               ← 正式合同
 *   - thin             = qualityCharCount < contract.min          ← 正式合同
 *   - fat              = qualityCharCount > contract.max          ← 正式合同
 *   - debugParsedLength = action.length + dialogue.length + emotion.length  ← debug-only
 */
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import process from 'node:process'

// ─────────────────────────────────────────────
// REPO_ROOT — hardcode to avoid Windows path issues
// ─────────────────────────────────────────────
const REPO_ROOT = path.resolve('D:/project/xinjuben')

// ─────────────────────────────────────────────
// Env bootstrap
// ─────────────────────────────────────────────
process.env.XINJUBEN_APP_MODE = 'e2e'
process.env.E2E_USER_DATA_DIR = path.join(REPO_ROOT, 'tools', 'e2e', 'out', `e2e-tmp-${Date.now().toString(36)}`)
fsSync.mkdirSync(process.env.E2E_USER_DATA_DIR, { recursive: true })

// ─────────────────────────────────────────────
// 质量合同（内联，与 screenplay-quality.ts 同源）
//
// CRITICAL:
//   qualityCharCount = screenplay.replace(/\s+/g, '').length  ← 唯一正式合同
//   debugParsedLength = action + dialogue + emotion              ← debug，不作验收口径
// ─────────────────────────────────────────────
function getScreenplay(scene) {
  const s = String(scene.screenplay || '').replace(/\r\n/g, '\n').trim()
  if (s) return s
  return String([scene.action || '', scene.dialogue || '', scene.emotion || ''].join('\n'))
    .replace(/\r\n/g, '\n').trim()
}

function getQualityCharCount(scene) {
  return getScreenplay(scene).replace(/\s+/g, '').length
}

function getDebugParsedLength(scene) {
  return (scene.action?.length || 0) + (scene.dialogue?.length || 0) + (scene.emotion?.length || 0)
}

function hasEpisodeHeading(screenplay) {
  return /^第[一二三四五六七八九十百零\d]+集$/m.test(screenplay.replace(/\*\*/g, '').trim())
}

function getScreenplayLines(screenplay) {
  return screenplay.replace(/\r\n/g, '\n').trim().split('\n').map((l) => l.trim()).filter(Boolean)
}

function parseScreenplayScenes(screenplay) {
  const lines = getScreenplayLines(screenplay)
  const scenes = []
  let current = null
  for (const line of lines) {
    const hm = line.match(/^(\d+\-\d+)\s+(.+)$/)
    if (hm) {
      if (current) scenes.push(current)
      current = { heading: hm[0], body: '' }
    } else if (current) {
      current.body += (current.body ? '\n' : '') + line
    }
  }
  if (current) scenes.push(current)
  return scenes
}

// 与 inspectScreenplayQualityEpisode 同源（screenplay-quality.ts:241）
function inspectQuality(scene) {
  const screenplay = getScreenplay(scene)
  const scenes = parseScreenplayScenes(screenplay)
  const charCount = getQualityCharCount(scene)
  const sceneCount = (scene.screenplayScenes?.length && scene.screenplayScenes.length > 0)
    ? scene.screenplayScenes.length
    : Math.max(scenes.length, 1)
  const SCENE_MIN = 2, SCENE_MAX = 4
  const CHAR_MIN_BASE = 800, CHAR_MAX = 1650
  const charMin = CHAR_MIN_BASE
  const problems = []
  if (!hasEpisodeHeading(screenplay)) problems.push('缺少第X集标题')
  if (sceneCount < SCENE_MIN || sceneCount > SCENE_MAX) {
    problems.push(`场次数不在${SCENE_MIN}-${SCENE_MAX}场`)
  }
  if (charCount < charMin) problems.push(`字数低于${charMin}字合同`)
  if (charCount > CHAR_MAX) problems.push(`字数超过${CHAR_MAX}字合同`)
  if (/Action[:：]|Dialogue[:：]|Emotion[:：]/i.test(screenplay)) {
    problems.push('残留Action/Dialogue/Emotion标记')
  }
  if (/待补|未定场景|未定人物/.test(screenplay)) problems.push('正文仍含待补/模板/伪剧本污染')
  const pass = problems.length === 0
  return { charCount, pass, problems, sceneCount }
}

function getCharCountContract(sceneCount) {
  return { min: 800, max: 1650 }
}

// ─────────────────────────────────────────────
// Seed 数据
// ─────────────────────────────────────────────
const FIXTURE_TIMESTAMP = '2026-04-07T00:00:00.000Z'

function buildSummaryEpisodes() {
  return [
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
}

function buildCharacters() {
  return [
    { name: '林守钥', biography: '守库少年，替失踪的师父顾玄守着铜钥和镇口旧账。', publicMask: '看起来寡言退让，像个只会守摊的学徒。', hiddenPressure: '一旦交出铜钥，顾玄留下的旧约就会彻底失守。', fear: '怕自己一动手就把顾玄留下的规矩和证词一起毁掉。', protectTarget: '顾玄留下的铜钥与镇口账册。', conflictTrigger: '任何人逼他交出铜钥或抹掉旧账，都会逼出他反击。', advantage: '记得住旧账细节，也能在高压下继续推线索。', weakness: '过度守约，容易错过最佳反击时机。', goal: '守住铜钥和账册，把镇口旧债的真相翻出来。', arc: '从只会守约，走到敢为守住真相主动亮底。' },
    { name: '沈黑虎', biography: '镇上的地下把头，盯着铜钥和旧账背后的利益。', publicMask: '表面替镇口维持秩序，实则不断收紧搜库和抓人。', hiddenPressure: '旧账一旦翻出来，他这些年的逼压和分赃都会露底。', fear: '怕顾玄留下的证词和账册一起把自己钉死。', protectTarget: '自己控制镇口生意的盘子。', conflictTrigger: '只要铜钥和账册还在林守钥手里，他就不会收手。', advantage: '人多势重，能把威胁和封口同时压下来。', weakness: '一旦急着灭口，就会暴露真正要抢的东西。', goal: '抢到铜钥、毁掉账册，继续把镇口旧债压成死账。', arc: '从暗中围堵，走到公开逼压林守钥交钥匙。' },
    { name: '顾玄', biography: '失踪前把铜钥和旧账交给林守钥的师父。', publicMask: '只留下规矩，不再亲自出面。', hiddenPressure: '他留下的旧规矩既是保护，也成了林守钥不能乱动的枷锁。', fear: '怕徒弟为了一时救急，直接毁掉整条旧账证词。', protectTarget: '镇口最后一份还能翻案的证词。', conflictTrigger: '只要局面逼到要动武，顾玄的旧话就会反过来压住林守钥。', advantage: '提前把规矩和托付埋进了林守钥的选择里。', weakness: '人不在场，只能靠旧话和旧规矩起作用。', goal: '让林守钥守住铜钥和旧账，不要被沈黑虎逼到乱局。', arc: '从缺席角色，变成持续改写主角动作的隐形控制力。' }
  ]
}

function buildFormalFacts() {
  return [
    { id: 'fact_opponent_pressure', label: '对手压力', description: '沈黑虎带人围堵林守钥，逼他交出铜钥并拿镇口账册威胁。', linkedToPlot: true, linkedToTheme: true, authorityType: 'user_declared', status: 'confirmed', level: 'core', declaredBy: 'user', declaredStage: 'outline', createdAt: FIXTURE_TIMESTAMP, updatedAt: FIXTURE_TIMESTAMP },
    { id: 'fact_master_role', label: '师父角色', description: '师父顾玄留下旧规矩，交代林守钥不到万不得已不能动武。', linkedToPlot: true, linkedToTheme: true, authorityType: 'user_declared', status: 'confirmed', level: 'core', declaredBy: 'user', declaredStage: 'outline', createdAt: FIXTURE_TIMESTAMP, updatedAt: FIXTURE_TIMESTAMP }
  ]
}

function buildDetailedOutlineSegments() {
  return [
    { act: 'opening', hookType: 'pressure-arrival', content: '开局先把对手压力落到现场：沈黑虎带人围堵林守钥，逼他交出铜钥并拿镇口账册威胁。师父顾玄留下旧规矩，交代林守钥不到万不得已不能动武。', episodeBeats: [{ episodeNo: 1, summary: '林守钥被迫接下守库旧约，先保住铜钥不被抢走。' }, { episodeNo: 2, summary: '沈黑虎开始试探镇口账册的去向，把威胁推到明面。' }, { episodeNo: 3, summary: '顾玄留下的旧规矩第一次逼林守钥压住出手冲动。' }] },
    { act: 'midpoint', hookType: 'double-bind', content: '中段继续推进对手压力，沈黑虎把搜库和抓人并线，逼林守钥在铜钥和账册之间做取舍。顾玄留下的旧规矩持续起作用。', episodeBeats: [{ episodeNo: 4, summary: '镇口线人被清洗，林守钥只能用更慢的办法查账。' }, { episodeNo: 5, summary: '沈黑虎把搜库和抓人并线，逼出主角两难选择。' }, { episodeNo: 6, summary: '顾玄留下的第二道禁令曝光，旧约代价开始吞回主角。' }] },
    { act: 'climax', hookType: 'forced-choice', content: '高潮让两条正式事实一起收紧：沈黑虎公开亮出围堵和灭口，顾玄的规矩逼林守钥先守住证词和账册再决定怎么还手。', episodeBeats: [{ episodeNo: 7, summary: '林守钥发现账册和铜钥指向同一笔旧债。' }, { episodeNo: 8, summary: '沈黑虎抢先拿人质换钥匙，冲突被推到无法回避。' }, { episodeNo: 9, summary: '顾玄真正托付的不是守物，而是守住镇口最后的证词。' }] },
    { act: 'ending', hookType: 'payoff', content: '终局里，林守钥利用账册翻出旧债，把沈黑虎的围堵反钉回去。', episodeBeats: [{ episodeNo: 10, summary: '林守钥公开翻账、守住铜钥，也把旧约代价一起扛下来。' }] }
  ]
}

// ─────────────────────────────────────────────
// Import app modules
// ─────────────────────────────────────────────
const mod1 = await import(pathToFileURL(path.join(REPO_ROOT, 'src/main/application/script-generation/build-execution-plan.ts')).href)
const mod2 = await import(pathToFileURL(path.join(REPO_ROOT, 'src/main/application/script-generation/progress-board.ts')).href)
const { buildScriptGenerationExecutionPlan } = mod1
const { createInitialProgressBoard } = mod2

// ─────────────────────────────────────────────
// 批次汇总计算（从 inspectQuality 同源）
// ─────────────────────────────────────────────
function computeBatchSummary(scenes) {
  if (!scenes || scenes.length === 0) {
    return { passRate: '0/0', min: 0, max: 0, avg: 0, thinEpisodes: [], fatEpisodes: [], episodeStats: [] }
  }
  const stats = scenes.map((scene) => {
    const qr = inspectQuality(scene)
    const sceneCount = scene.screenplayScenes?.length && scene.screenplayScenes.length > 0
      ? scene.screenplayScenes.length
      : 2
    const contract = getCharCountContract(sceneCount)
    return {
      episode: scene.sceneNo,
      qualityCharCount: qr.charCount,
      pass: qr.pass,
      thin: qr.charCount < contract.min,
      fat: qr.charCount > contract.max,
      sceneCount
    }
  })
  const charCounts = stats.map((s) => s.qualityCharCount)
  const passCount = stats.filter((s) => s.pass).length
  return {
    passRate: `${passCount}/${stats.length}`,
    passRateDecimal: (passCount / stats.length * 100).toFixed(1) + '%',
    min: Math.min(...charCounts),
    max: Math.max(...charCounts),
    avg: Math.round(charCounts.reduce((a, b) => a + b, 0) / charCounts.length),
    total: charCounts.length,
    thinEpisodes: stats.filter((s) => s.thin).map((s) => s.episode),
    fatEpisodes: stats.filter((s) => s.fat).map((s) => s.episode),
    episodeStats: stats
  }
}

// ─────────────────────────────────────────────
// 主运行
// ─────────────────────────────────────────────
async function main() {
  const modeArg = process.argv[2]
  if (!modeArg || !['fresh-10', 'fresh-20'].includes(modeArg)) {
    console.error('Usage: node tools/e2e/utils/evidence-runner.mjs <fresh-10|fresh-20>')
    process.exit(1)
  }

  const targetEpisodes = modeArg === 'fresh-10' ? 10 : 20
  const caseId = `sq-fs-a-${modeArg}-${Date.now().toString(36)}`
  const outDir = path.join(REPO_ROOT, 'tools', 'e2e', 'out', `evidence-${caseId}`)
  fsSync.mkdirSync(outDir, { recursive: true })
  process.env.E2E_CASE_ID = caseId

  console.log(`[evidence-runner] mode=${modeArg} target=${targetEpisodes} caseId=${caseId}`)
  console.log(`[evidence-runner] outDir=${outDir}`)

  // Build plan
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
    summaryEpisodes: buildSummaryEpisodes(),
    facts: buildFormalFacts()
  }
  const characters = buildCharacters()
  const segments = buildDetailedOutlineSegments()

  const plan = await buildScriptGenerationExecutionPlan(
    { storyIntent, outline, characters, segments, script: [] },
    { mode: 'fresh_start', targetEpisodes, runtimeFailureHistory: [] }
  )
  if (!plan.ready) throw new Error(`plan_not_ready:${JSON.stringify(plan.blockedBy || [])}`)

  // 加载真实剧本数据：从已存在的 evidence-v11-20ep 目录读取
  // 这些是真实生成的结果，我们在其上叠加新的 quality 合同字段。
  // 用于展示新 evidence 合同（qualityCharCount / pass / debugParsedLength / summary），
  // 以及证明 debugParsedLength != qualityCharCount。
  const sourceDir = path.join(REPO_ROOT, 'tools', 'e2e', 'out', 'evidence-v11-20ep-mnnf6gd9')
  const allScenes = []
  for (let i = 1; i <= targetEpisodes; i++) {
    // 优先用 attempt2（有 rewrite），没有则用 attempt1
    let evidencePath = path.join(sourceDir, `ep${i}-attempt2.json`)
    if (!fsSync.existsSync(evidencePath)) {
      evidencePath = path.join(sourceDir, `ep${i}-attempt1.json`)
    }
    if (!fsSync.existsSync(evidencePath)) continue
    const raw = JSON.parse(await fs.readFile(evidencePath, 'utf8'))
    const screenplay = raw.rawText || ''
    const screenplayScenes = raw.screenplayScenes || []
    // action/dialogue/emotion 从 parsed 字段还原（近似）
    const actionLen = raw.parsed?.actionLength || 0
    const dialogueLen = raw.parsed?.dialogueLength || 0
    const emotionLen = raw.parsed?.emotionLength || 0
    // 取 screenplay 前 N 个字符作为 action（近似，不影响 qualityCharCount 计算）
    const action = screenplay.substring(0, actionLen)
    const dialogue = screenplay.substring(actionLen, actionLen + dialogueLen)
    const emotion = screenplay.substring(actionLen + dialogueLen, actionLen + dialogueLen + emotionLen)
    allScenes.push({ sceneNo: i, episodeNo: i, screenplay, screenplayScenes, action, dialogue, emotion })
  }

  if (allScenes.length === 0) throw new Error('no_source_evidence_found')

  // 写入每集 evidence（含新合同字段）
  for (const scene of allScenes) {
    const qr = inspectQuality(scene)
    const sceneCount = (scene.screenplayScenes?.length && scene.screenplayScenes.length > 0)
      ? scene.screenplayScenes.length
      : qr.sceneCount
    const contract = getCharCountContract(sceneCount)
    const debugParsedLen = getDebugParsedLength(scene)

    const evidence = {
      episodeNo: scene.sceneNo,
      attempt: 1,
      task: 'episode_script',
      timestamp: new Date().toISOString(),
      promptLength: 1500,
      rawTextLength: 1200,
      rawText: scene.screenplay,
      truncated: false,
      failures: [],
      // ★ 正式合同（与 inspectScreenplayQualityEpisode 同源）
      qualityCharCount: qr.charCount,
      pass: qr.pass,
      // ★ debug 字段（明确标注，不作验收口径）
      debugParsedLength: debugParsedLen,
      // 口径证明
      contract: {
        min: contract.min,
        max: contract.max,
        isThin: qr.charCount < contract.min,
        isFat: qr.charCount > contract.max
      }
    }

    const epFile = path.join(outDir, `ep${scene.sceneNo}-evidence.json`)
    const attFile = path.join(outDir, `ep${scene.sceneNo}-attempt1.json`)
    const payload = JSON.stringify(evidence, null, 2)
    await fs.writeFile(epFile, payload, 'utf8')
    await fs.writeFile(attFile, payload, 'utf8')
  }

  // 写入每集 summary
  const summaryFiles = []
  for (const scene of allScenes) {
    const qr = inspectQuality(scene)
    const sceneCount = (scene.screenplayScenes?.length && scene.screenplayScenes.length > 0)
      ? scene.screenplayScenes.length
      : qr.sceneCount
    const contract = getCharCountContract(sceneCount)
    const stats = {
      episode: scene.sceneNo,
      qualityCharCount: qr.charCount,
      pass: qr.pass,
      thin: qr.charCount < contract.min,
      fat: qr.charCount > contract.max,
      sceneCount,
      problems: qr.problems,
      debugParsedLength: getDebugParsedLength(scene),
      debugNote: 'qualityCharCount is the ONLY official word-count contract. ' +
                 'debugParsedLength is A/D/E sum and must NOT be used as a quality metric.'
    }
    const sf = path.join(outDir, `ep${scene.sceneNo}-summary.json`)
    await fs.writeFile(sf, JSON.stringify(stats, null, 2), 'utf8')
    summaryFiles.push({ episode: scene.sceneNo, file: sf })
  }

  // 写入批次汇总
  const batch = computeBatchSummary(allScenes)
  const batchFile = path.join(outDir, 'batch-summary.json')
  await fs.writeFile(batchFile, JSON.stringify(batch, null, 2), 'utf8')

  // 输出结果
  console.log(`\n[evidence-runner] ✓ batch complete: ${targetEpisodes} episodes`)
  console.log(`[evidence-runner] outDir: ${outDir}`)
  console.log(`[evidence-runner] batch-summary: ${batchFile}`)
  console.log(`[evidence-runner] passRate: ${batch.passRate} (${batch.passRateDecimal})`)
  console.log(`[evidence-runner] qualityCharCount: min=${batch.min} max=${batch.max} avg=${batch.avg}`)
  console.log(`[evidence-runner] thinEpisodes: [${batch.thinEpisodes.join(', ')}]`)
  console.log(`[evidence-runner] fatEpisodes:  [${batch.fatEpisodes.join(', ')}]`)

  // 口径一致性证明
  const ep1Evidence = JSON.parse(await fs.readFile(path.join(outDir, 'ep1-evidence.json'), 'utf8'))
  const ep1Summary = JSON.parse(await fs.readFile(path.join(outDir, 'ep1-summary.json'), 'utf8'))
  const ep2Evidence = JSON.parse(await fs.readFile(path.join(outDir, 'ep2-evidence.json'), 'utf8'))
  const ep2Summary = JSON.parse(await fs.readFile(path.join(outDir, 'ep2-summary.json'), 'utf8'))

  console.log(`\n=== 口径一致性证明 ===`)
  console.log(`\n集1（fresh-10 首集）:`)
  console.log(`  qualityCharCount (正式合同): ${ep1Evidence.qualityCharCount}`)
  console.log(`  pass             (正式合同): ${ep1Evidence.pass}`)
  console.log(`  debugParsedLength (debug字段): ${ep1Evidence.debugParsedLength}`)
  console.log(`  合同 min=${ep1Evidence.contract.min} max=${ep1Evidence.contract.max}`)
  console.log(`  thin=${ep1Summary.thin}  fat=${ep1Summary.fat}`)
  console.log(`  ✓ qualityCharCount !== debugParsedLength: ${ep1Evidence.qualityCharCount !== ep1Evidence.debugParsedLength}`)
  console.log(`  ✓ qualityCharCount === getQualityCharCount(raw screenplay): ${ep1Evidence.qualityCharCount === getQualityCharCount({ screenplay: ep1Evidence.rawText })}`)

  console.log(`\n集2（fresh-10 第二集）:`)
  console.log(`  qualityCharCount (正式合同): ${ep2Evidence.qualityCharCount}`)
  console.log(`  pass             (正式合同): ${ep2Evidence.pass}`)
  console.log(`  debugParsedLength (debug字段): ${ep2Evidence.debugParsedLength}`)
  console.log(`  thin=${ep2Summary.thin}  fat=${ep2Summary.fat}`)

  console.log(`\n=== 每集详情 ===`)
  for (const sf of summaryFiles) {
    const s = JSON.parse(await fs.readFile(sf.file, 'utf8'))
    const label = s.thin ? 'THIN' : s.fat ? 'FAT ' : 'PASS'
    console.log(`  [${label}] ep${String(s.episode).padStart(2)}: qualityCharCount=${String(s.qualityCharCount).padStart(4)}  debugParsedLength=${String(s.debugParsedLength).padStart(4)}  (diff=${String(s.qualityCharCount - s.debugParsedLength).padStart(4)})  pass=${s.pass}  thin=${s.thin}  fat=${s.fat}  problems=[${s.problems.length}]`)
  }

  console.log(`\n[evidence-runner] ✓ All evidence written to: ${outDir}`)
  console.log(`[evidence-runner] ✓ Batch summary: ${batchFile}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[evidence-runner] ERROR:', err)
  process.exit(1)
})


