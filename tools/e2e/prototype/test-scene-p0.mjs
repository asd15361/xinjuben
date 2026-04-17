/**
 * P0 Single-Scene Prototype Test
 *
 * Tests the single-scene generation prompt with 2 real AI calls:
 *   Ep1-1 and Ep1-2
 *
 * Validates:
 *   - Per-scene word count budget (300-400 chars)
 *   - Format contract (no 「第X集」, no Action:/Dialogue:/Emotion:)
 *   - Assembly feasibility
 *   - Continuity (Ep1-2承接Ep1-1)
 *
 * Usage: node tools/e2e/prototype/test-scene-p0.mjs
 *
 * Requires: E2E_CASE_ID, MOCK_AI_ENABLE unset (real AI)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..', '..')

// ── Load the scene generation module ────────────────────────────────────────────

const scenePromptPath = 'file://' + path.resolve(REPO_ROOT, 'src', 'main', 'application', 'script-generation', 'prompt', 'create-scene-generation-prompt.ts')
const generateTextPath = 'file://' + path.resolve(REPO_ROOT, 'src', 'main', 'application', 'ai', 'generate-text.ts')
const providerConfigPath = 'file://' + path.resolve(REPO_ROOT, 'src', 'main', 'infrastructure', 'runtime-env', 'provider-config.ts')

const { createSceneGenerationPrompt, assembleScenesForEpisode } = await import(scenePromptPath)
const { generateTextWithRuntimeRouter } = await import(generateTextPath)
const { loadRuntimeProviderConfig } = await import(providerConfigPath)
const providerConfig = loadRuntimeProviderConfig()

// ── Ep1-1 and Ep1-2 scaffold from fs-a seed ──────────────────────────────────

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
    // P0 continuity: minimal, manually derived from scaffold (NOT auto-extracted from raw)
    prevSceneOutcome: '林守钥被堵在旧库内，沈黑虎限日落前交出铜钥，师父规矩压住他不能动武。',
    prevSceneHook: '林守钥手指发白，死死按住腰间布袋，却不能动手。'
  }
]

// ── Format validators ──────────────────────────────────────────────────────────

const FORMAT_RULES = {
  hasEpisodeHeading: (text) => /第[一二三四五六七八九十百零\d]+集/.test(text),
  hasSceneHeading: (text) => /^\d+\-\d+\s+/.test(text.trim().split('\n')[0]),
  // Per-line checks: iterate through lines, not anchored to string start
  hasCharacterRoster: (text) => text.trim().split('\n').some(l => /^人物[：:]/.test(l.trim())),
  hasDialogue: (text) => text.trim().split('\n').some(l => /^[^\s△：:（）()]{1,16}[：:]/.test(l.trim())),
  hasAction: (text) => text.includes('△'),
  hasADE: (text) => /Action[:：]|Dialogue[:：]|Emotion[:：]/i.test(text)
}

function validateFormat(raw) {
  const lines = raw.trim().split('\n').map(l => l.trim()).filter(Boolean)
  return {
    noEpisodeHeading: !FORMAT_RULES.hasEpisodeHeading(raw),
    firstLineIsSceneHeading: FORMAT_RULES.hasSceneHeading(raw),
    hasCharacterRoster: FORMAT_RULES.hasCharacterRoster(raw),
    hasDialogue: FORMAT_RULES.hasDialogue(raw),
    hasAction: FORMAT_RULES.hasAction(raw),
    noADE: !FORMAT_RULES.hasADE(raw),
    firstLine: lines[0] || '',
  }
}

function charCount(text) {
  return text.replace(/\s+/g, '').length
}

// ── Main test ──────────────────────────────────────────────────────────────────

const E2E_CASE_ID = `p0-scene-${Date.now().toString(36)}`
const outDir = path.join(REPO_ROOT, 'tools', 'e2e', 'out', `evidence-${E2E_CASE_ID}`)
fs.mkdirSync(outDir, { recursive: true })

const results = []

console.log('═'.repeat(70))
console.log(`P0 Single-Scene Prototype Test  (E2E_CASE_ID=${E2E_CASE_ID})`)
console.log('═'.repeat(70))

for (const scene of EP1_SCENES) {
  console.log(`\n### Scene ${scene.sceneNo}: ${scene.sceneCode}`)

  const prompt = createSceneGenerationPrompt({
    episodeNo: 1,
    ...scene
  })

  console.log(`Prompt length: ${prompt.length} chars`)

  // Write prompt evidence
  fs.writeFileSync(
    path.join(outDir, `ep1-${scene.sceneCode}-prompt.txt`),
    prompt,
    'utf8'
  )

  try {
    const result = await generateTextWithRuntimeRouter(
      {
        task: 'episode_script',
        prompt,
        preferredLane: 'primary',
        allowFallback: false,
        temperature: 0.45,
        timeoutMs: 60000
      },
      providerConfig
    )

    const raw = result.text
    const fmt = validateFormat(raw)
    const chars = charCount(raw)

    console.log(`Output length: ${raw.length} chars | charCount: ${chars}`)
    console.log(`Format: episodeHeading=${fmt.noEpisodeHeading} sceneHeading=${fmt.firstLineIsSceneHeading} roster=${fmt.hasCharacterRoster} dialogue=${fmt.hasDialogue} action=${fmt.hasAction} noADE=${fmt.noADE}`)
    console.log(`First line: "${fmt.firstLine}"`)

    results.push({
      sceneCode: scene.sceneCode,
      raw,
      chars,
      fmt,
      success: true
    })

    fs.writeFileSync(
      path.join(outDir, `ep1-${scene.sceneCode}-raw.txt`),
      raw,
      'utf8'
    )

  } catch (err) {
    console.error(`ERROR: ${err.message}`)
    results.push({ sceneCode: scene.sceneCode, error: err.message, success: false })
  }
}

// ── Assembly test ────────────────────────────────────────────────────────────────

console.log('\n### Assembly Test')
const successful = results.filter(r => r.success)
if (successful.length === 2) {
  const assembled = assembleScenesForEpisode(1, successful.map(r => r.raw))
  const fmtAll = validateFormat(assembled)
  console.log(`Assembled length: ${assembled.length} chars`)
  console.log(`Format check: noEpisode=${fmtAll.noEpisodeHeading} firstLine="${fmtAll.firstLine}"`)
  fs.writeFileSync(path.join(outDir, 'ep1-assembled.txt'), assembled, 'utf8')
} else {
  console.log('Skipped assembly (not all scenes succeeded)')
}

// ── Summary ────────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(70))
console.log('SUMMARY')
console.log('═'.repeat(70))
for (const r of results) {
  if (r.success) {
    const budget = EP1_SCENES.find(s => s.sceneCode === r.sceneCode)?.budgetChars
    const overBudget = r.chars > budget
    console.log(
      `${r.sceneCode}: ${r.chars} chars (budget ${budget}) ${overBudget ? '⚠️ OVER' : '✅'} | ` +
      `noEpisode=${r.fmt.noEpisodeHeading} sceneHeading=${r.fmt.firstLineIsSceneHeading} ` +
      `roster=${r.fmt.hasCharacterRoster} dialogue=${r.fmt.hasDialogue} noADE=${r.fmt.noADE}`
    )
  } else {
    console.log(`${r.sceneCode}: ERROR - ${r.error}`)
  }
}

fs.writeFileSync(
  path.join(outDir, 'results.json'),
  JSON.stringify({ E2E_CASE_ID, results, timestamp: new Date().toISOString() }, null, 2),
  'utf8'
)

console.log(`\nResults written to: ${outDir}`)
