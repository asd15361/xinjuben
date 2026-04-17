/**
 * P1 Single-Episode Closed-Loop Test
 *
 * Full pipeline: per-scene generation -> assembly -> parseGeneratedScene -> quality inspection
 *
 * Tests Ep1 (2 scenes: 1-1, 1-2) end-to-end with real AI.
 *
 * Usage:
 *   node tools/e2e/prototype/test-scene-p1.mjs
 *
 * Requires: Real DeepSeek API key (set env vars before running)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..', '..')

// ── Dynamic imports (TypeScript files via file:// on Windows) ──────────────────

const scenePromptPath    = 'file://' + path.resolve(REPO_ROOT, 'src', 'main', 'application', 'script-generation', 'prompt', 'create-scene-generation-prompt.ts')
const generateTextPath   = 'file://' + path.resolve(REPO_ROOT, 'src', 'main', 'application', 'ai', 'generate-text.ts')
const parseScenePath     = 'file://' + path.resolve(REPO_ROOT, 'src', 'main', 'application', 'script-generation', 'runtime', 'parse-generated-scene.ts')
const providerConfigPath = 'file://' + path.resolve(REPO_ROOT, 'src', 'main', 'infrastructure', 'runtime-env', 'provider-config.ts')

const [{ createSceneGenerationPrompt, assembleScenesForEpisode }, { generateTextWithRuntimeRouter }, { parseGeneratedScene }, { loadRuntimeProviderConfig }] =
  await Promise.all([
    import(scenePromptPath),
    import(generateTextPath),
    import(parseScenePath),
    import(providerConfigPath)
  ])

const providerConfig = loadRuntimeProviderConfig()

// ── Ep1 scene scaffold (from fs-a seed, sceneByScene) ────────────────────────

const EP1_SCENES = [
  {
    sceneNo: 1,
    sceneCode: '1-1',
    timeOfDay: '日',
    characters: ['林守钥', '沈黑虎'],
    setup: '沈黑虎带人围堵旧库大门，林守钥被堵在库内，铜钥在腰间布袋里。',
    tension: '沈黑虎限日落前交出铜钥，否则围堵弟弟私塾。师父规矩：不到万不得已不能动武。',
    hookEnd: '林守钥手指发白，死死按住腰间布袋，却不能动手。',
    budgetChars: 350
  },
  {
    sceneNo: 2,
    sceneCode: '1-2',
    timeOfDay: '日',
    characters: ['林守钥', '沈黑虎', '手下甲'],
    setup: '沈黑虎破门搜库，林守钥被按在角落，账册藏处只有他知道。',
    tension: '沈黑虎拿到账册就灭口，拿不到就威胁弟弟。师父的规矩压住他不能动武。',
    hookEnd: '林守钥被抽空力气按在角落，却在心里默数账册藏在暗格的位置。',
    budgetChars: 350,
    prevSceneOutcome: '林守钥被堵在旧库内，沈黑虎限日落前交出铜钥，师父规矩压住他不能动武。',
    prevSceneHook: '林守钥手指发白，死死按住腰间布袋，却不能动手。'
  }
]

// ── Format validators (per-line, fixed from P0) ─────────────────────────────

const FORMAT_RULES = {
  hasEpisodeHeading: (text) => /第[一二三四五六七八九十百零\d]+集/.test(text),
  hasSceneHeading:   (text) => /^\d+\-\d+\s+/.test(text.trim().split('\n')[0]),
  hasCharacterRoster: (text) => text.trim().split('\n').some(l => /^人物[：:]/.test(l.trim())),
  hasDialogue:        (text) => text.trim().split('\n').some(l => /^[^\s△：:（）()]{1,16}[：:]/.test(l.trim())),
  hasAction:          (text) => text.includes('△'),
  hasADE:             (text) => /Action[:：]|Dialogue[:：]|Emotion[:：]/i.test(text)
}

function validateFormat(raw) {
  const lines = raw.trim().split('\n').map(l => l.trim()).filter(Boolean)
  return {
    noEpisodeHeading:   !FORMAT_RULES.hasEpisodeHeading(raw),
    firstLineIsSceneHeading: FORMAT_RULES.hasSceneHeading(raw),
    hasCharacterRoster: FORMAT_RULES.hasCharacterRoster(raw),
    hasDialogue:        FORMAT_RULES.hasDialogue(raw),
    hasAction:          FORMAT_RULES.hasAction(raw),
    noADE:              !FORMAT_RULES.hasADE(raw),
    firstLine:          lines[0] || '',
  }
}

function charCount(text) {
  return text.replace(/\s+/g, '').length
}

// ── Per-scene generation ─────────────────────────────────────────────────────

const E2E_CASE_ID = `p1-episode1-${Date.now().toString(36)}`
const outDir = path.join(REPO_ROOT, 'tools', 'e2e', 'out', `evidence-${E2E_CASE_ID}`)
fs.mkdirSync(outDir, { recursive: true })

console.log('═'.repeat(70))
console.log(`P1 Single-Episode Closed-Loop Test  (E2E_CASE_ID=${E2E_CASE_ID})`)
console.log('═'.repeat(70))

const sceneResults = []

for (const scene of EP1_SCENES) {
  console.log(`\n### Generating Scene ${scene.sceneNo}: ${scene.sceneCode}`)

  const prompt = createSceneGenerationPrompt({ episodeNo: 1, ...scene })
  console.log(`Prompt: ${prompt.length} chars`)

  fs.writeFileSync(path.join(outDir, `ep1-${scene.sceneCode}-prompt.txt`), prompt, 'utf8')

  try {
    const result = await generateTextWithRuntimeRouter(
      { task: 'episode_script', prompt, preferredLane: 'primary', allowFallback: false, temperature: 0.45, timeoutMs: 60000 },
      providerConfig
    )

    const raw  = result.text
    const fmt  = validateFormat(raw)
    const chars = charCount(raw)
    const budget = scene.budgetChars

    console.log(`Output: ${chars} chars (budget ${budget}) ${chars > budget ? '⚠️ OVER' : '✅'}`)
    console.log(`Format: noEpisode=${fmt.noEpisodeHeading} sceneHeading=${fmt.firstLineIsSceneHeading} roster=${fmt.hasCharacterRoster} dialogue=${fmt.hasDialogue} action=${fmt.hasAction} noADE=${fmt.noADE}`)

    sceneResults.push({ sceneCode: scene.sceneCode, raw, chars, fmt, budget, success: true })
    fs.writeFileSync(path.join(outDir, `ep1-${scene.sceneCode}-raw.txt`), raw, 'utf8')
  } catch (err) {
    console.error(`ERROR: ${err.message}`)
    sceneResults.push({ sceneCode: scene.sceneCode, error: err.message, success: false })
  }
}

// ── Assembly ──────────────────────────────────────────────────────────────────

console.log('\n### Assembly')
const successful = sceneResults.filter(r => r.success)
if (successful.length !== EP1_SCENES.length) {
  console.log('Skipped — not all scenes succeeded')
  process.exit(1)
}

const assembled = assembleScenesForEpisode(1, successful.map(r => r.raw))
const assembledFmt = validateFormat(assembled)
const assembledChars = charCount(assembled)

console.log(`Assembled: ${assembled.length} raw chars | ${assembledChars} charCount`)
console.log(`Format: noEpisode=${assembledFmt.noEpisodeHeading} sceneHeading=${assembledFmt.firstLineIsSceneHeading} roster=${assembledFmt.hasCharacterRoster} dialogue=${assembledFmt.hasDialogue} noADE=${assembledFmt.noADE}`)
console.log(`First line: "${assembledFmt.firstLine}"`)

fs.writeFileSync(path.join(outDir, 'ep1-assembled.txt'), assembled, 'utf8')

// ── parseGeneratedScene ───────────────────────────────────────────────────────

console.log('\n### parseGeneratedScene')
let parsed
try {
  parsed = parseGeneratedScene(assembled, 1)
  console.log(`parsed.sceneNo: ${parsed.sceneNo}`)
  console.log(`screenplayScenes.length: ${parsed.screenplayScenes?.length ?? 0}`)
  if (parsed.screenplayScenes) {
    for (const s of parsed.screenplayScenes) {
      console.log(`  ${s.sceneCode}: heading="${s.sceneHeading}" roster=${JSON.stringify(s.characterRoster)} bodyLen=${s.body?.length ?? 'N/A'}`)
    }
  }
  fs.writeFileSync(path.join(outDir, 'ep1-parsed.json'), JSON.stringify(parsed, null, 2), 'utf8')
} catch (err) {
  console.error(`parseGeneratedScene ERROR: ${err.message}`)
  fs.writeFileSync(path.join(outDir, 'ep1-parsed-error.txt'), String(err), 'utf8')
  process.exit(1)
}

// ── inspectScreenplayQualityEpisode ──────────────────────────────────────────

console.log('\n### inspectScreenplayQualityEpisode')
let qualityReport
try {
  // Dynamic import to avoid pulling in the entire module graph
  const [{ inspectScreenplayQualityEpisode }] = await Promise.all([
    import('file://' + path.resolve(REPO_ROOT, 'src', 'shared', 'domain', 'script', 'screenplay-quality.ts'))
  ])

  qualityReport = inspectScreenplayQualityEpisode({
    sceneNo:           parsed.sceneNo,
    screenplay:        parsed.screenplay,
    action:            parsed.action,
    dialogue:          parsed.dialogue,
    emotion:           parsed.emotion,
    screenplayScenes:  parsed.screenplayScenes
  })

  console.log(`problems: ${JSON.stringify(qualityReport.problems)}`)
  console.log(`charCount: ${qualityReport.charCount}`)
  console.log(`sceneCount: ${qualityReport.sceneCount}`)
  console.log(`officialQuality.pass: ${qualityReport.officialQuality?.pass}`)
  if (qualityReport.officialQuality) {
    console.log(`  passedEpisodes: ${qualityReport.officialQuality.passedEpisodes}`)
    console.log(`  averageCharCount: ${qualityReport.officialQuality.averageCharCount}`)
    console.log(`  weakEpisodes: ${JSON.stringify(qualityReport.officialQuality.weakEpisodes)}`)
  }

  fs.writeFileSync(path.join(outDir, 'ep1-quality.json'), JSON.stringify(qualityReport, null, 2), 'utf8')
} catch (err) {
  console.error(`inspectScreenplayQualityEpisode ERROR: ${err.message}`)
  fs.writeFileSync(path.join(outDir, 'ep1-quality-error.txt'), String(err), 'utf8')
  process.exit(1)
}

// ── Per-scene char count breakdown ───────────────────────────────────────────

console.log('\n### Per-Scene Breakdown')
const perSceneChars = parsed.screenplayScenes?.map((s, i) => {
  const raw = successful[i]?.raw ?? ''
  const bodyLen = s.body?.length ?? charCount(raw)
  return { sceneCode: s.sceneCode, bodyLen, rawChars: charCount(raw) }
}) ?? []
for (const sc of perSceneChars) {
  console.log(`  ${sc.sceneCode}: ${sc.bodyLen} body chars (raw: ${sc.rawChars})`)
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(70))
console.log('SUMMARY')
console.log('═'.repeat(70))

const allFmtPass = sceneResults.every(r => r.success && r.fmt.noEpisodeHeading && r.fmt.firstLineIsSceneHeading && r.fmt.hasCharacterRoster && r.fmt.hasDialogue && r.fmt.hasAction && r.fmt.noADE)

console.log(`Ep1 scenes generated: ${sceneResults.length}`)
console.log(`All scenes in budget: ${sceneResults.filter(r => r.success && r.chars <= r.budget).length}/${sceneResults.length}`)
console.log(`Assembly format OK: ${assembledFmt.noEpisodeHeading && assembledFmt.hasCharacterRoster && assembledFmt.hasDialogue}`)
console.log(`parseGeneratedScene OK: screenplayScenes.length=${parsed.screenplayScenes?.length ?? 0}`)
console.log(`quality pass: ${qualityReport.officialQuality?.pass ?? 'N/A'}`)
console.log(`quality problems: ${qualityReport.problems.length === 0 ? 'none' : qualityReport.problems.join(', ')}`)
console.log(`total charCount (assembled): ${assembledChars}`)

fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify({
  E2E_CASE_ID,
  sceneResults,
  assembledChars,
  assembledFirstLine: assembledFmt.firstLine,
  parsed: {
    sceneNo: parsed.sceneNo,
    screenplayScenesCount: parsed.screenplayScenes?.length ?? 0,
    screenplayScenes: parsed.screenplayScenes
  },
  qualityReport: {
    problems: qualityReport.problems,
    charCount: qualityReport.charCount,
    sceneCount: qualityReport.sceneCount,
    officialQuality: qualityReport.officialQuality
  },
  perSceneChars,
  timestamp: new Date().toISOString()
}, null, 2), 'utf8')

console.log(`\nEvidence: ${outDir}`)
