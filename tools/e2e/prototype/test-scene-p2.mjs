/**
 * P2 Scene-Level Batch Test
 *
 * Runs 3 episodes (Ep1-Ep3) through scene-level generation:
 *   per-scene generation -> assemble -> parseGeneratedScene -> quality inspection
 *
 * Each episode: 2 scenes, scene-level budget 350 chars/scene
 * Continuity: prevSceneHook + one-sentence prevSceneOutcome (minimal, no auto-extraction)
 *
 * Usage:
 *   node tools/e2e/prototype/test-scene-p2.mjs
 *
 * Requires: Real DeepSeek API key (env vars)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..', '..')

// ── Dynamic imports ────────────────────────────────────────────────────────────

const scenePromptPath    = 'file://' + path.resolve(REPO_ROOT, 'src', 'main', 'application', 'script-generation', 'prompt', 'create-scene-generation-prompt.ts')
const generateTextPath   = 'file://' + path.resolve(REPO_ROOT, 'src', 'main', 'application', 'ai', 'generate-text.ts')
const parseScenePath     = 'file://' + path.resolve(REPO_ROOT, 'src', 'main', 'application', 'script-generation', 'runtime', 'parse-generated-scene.ts')
const qualityPath        = 'file://' + path.resolve(REPO_ROOT, 'src', 'shared', 'domain', 'script', 'screenplay-quality.ts')
const providerConfigPath = 'file://' + path.resolve(REPO_ROOT, 'src', 'main', 'infrastructure', 'runtime-env', 'provider-config.ts')

const [
  { createSceneGenerationPrompt, assembleScenesForEpisode },
  { generateTextWithRuntimeRouter },
  { parseGeneratedScene },
  { inspectScreenplayQualityEpisode },
  { loadRuntimeProviderConfig }
] = await Promise.all([
  import(scenePromptPath),
  import(generateTextPath),
  import(parseScenePath),
  import(qualityPath),
  import(providerConfigPath)
])

const providerConfig = loadRuntimeProviderConfig()

// ── Real sceneByScene data from fs-a project (after-saveRuntime-snapshot.json) ─

const EPISODE_DATA = [
  {
    episodeNo: 1,
    scenes: [
      {
        sceneNo: 1, sceneCode: '1-1', timeOfDay: '日',
        characters: ['林守钥', '沈黑虎'],
        location: '旧库门前',
        setup: '沈黑虎带人围堵旧库大门，林守钥被堵在库内，铜钥在腰间布袋里。',
        tension: '沈黑虎限日落前交出铜钥，否则围堵弟弟私塾。师父规矩：不到万不得已不能动武。',
        hookEnd: '林守钥手指发白，死死按住腰间布袋，却不能动手。',
        budgetChars: 350
      },
      {
        sceneNo: 2, sceneCode: '1-2', timeOfDay: '日',
        characters: ['林守钥', '沈黑虎', '手下甲'],
        location: '旧库内',
        setup: '沈黑虎破门搜库，林守钥被按在角落，账册藏处只有他知道。',
        tension: '沈黑虎已拿到账册，林守钥的命和弟弟都在他手里。师父的规矩压不住这一步了。',
        hookEnd: '沈黑虎将那页纸猛地从砖下抽走，纸角折痕还是新的。林守钥的底牌，没了。',
        budgetChars: 350,
        prevSceneOutcome: '林守钥被堵在旧库内，沈黑虎限日落前交出铜钥，师父规矩压住他不能动武。',
        prevSceneHook: '林守钥手指发白，死死按住腰间布袋，却不能动手。'
      }
    ]
  },
  {
    episodeNo: 2,
    scenes: [
      {
        sceneNo: 1, sceneCode: '2-1', timeOfDay: '黄昏',
        characters: ['林守钥'],
        location: '旧库后山',
        setup: '林守钥甩掉追兵，按师父暗记在后山挖出账册副本和备用铜钥。',
        tension: '沈黑虎已知账册失踪，开始怀疑林守钥私下藏了东西。',
        hookEnd: '林守钥捧着账册副本，感觉像捧着一块烧红的热炭——这是翻盘的筹码。',
        budgetChars: 350
      },
      {
        sceneNo: 2, sceneCode: '2-2', timeOfDay: '夜',
        characters: ['林守钥'],
        location: '镇口私塾外',
        setup: '沈黑虎派人监视林守钥去向，林守钥远远看见弟弟在私塾读书。',
        tension: '沈黑虎用弟弟威胁他，暗示知道他把弟弟看得比命重。',
        hookEnd: '林守钥在暗处看着弟弟窗户，心里那根弦绷得发紧。',
        budgetChars: 350,
        prevSceneOutcome: '林守钥甩掉追兵，在后山挖出账册副本和备用铜钥，感觉像捧着翻盘筹码。',
        prevSceneHook: '林守钥捧着账册副本，感觉像捧着一块烧红的热炭——这是翻盘的筹码。'
      }
    ]
  },
  {
    episodeNo: 3,
    scenes: [
      {
        sceneNo: 1, sceneCode: '3-1', timeOfDay: '深夜',
        characters: ['林守钥'],
        location: '林家小院',
        setup: '林守钥深夜回家，发现沈黑虎的警告字条压在桌上。',
        tension: '三日期限已下，沈黑虎已开始下一步威胁。师父规矩压住他不能动武。',
        hookEnd: '林守钥把弟弟送到舅舅家，转身时手在发抖——第一次感到真正的代价。',
        budgetChars: 350
      },
      {
        sceneNo: 2, sceneCode: '3-2', timeOfDay: '黎明',
        characters: ['林守钥'],
        location: '山间小道',
        setup: '林守钥带弟弟离开，沈黑虎的人追上，被迫第一次动用武力。',
        tension: '师父的禁令被打破。林守钥第一次动武，打手已倒地，血已经流出来了——代价以最原始的方式开始兑现。',
        hookEnd: '林守钥将最后一个打手打倒在地，嘴角渗血的打手甲捂着肋部瘫在墙角，代价已经以血的形式落在了地上。',
        budgetChars: 350,
        prevSceneOutcome: '林守钥深夜发现警告字条，三日期限已下，将弟弟送到舅舅家，第一次感到真正代价。',
        prevSceneHook: '林守钥把弟弟送到舅舅家，转身时手在发抖——第一次感到真正的代价。'
      }
    ]
  },
  {
    episodeNo: 4,
    scenes: [
      {
        sceneNo: 1, sceneCode: '4-1', timeOfDay: '日',
        characters: ['林守钥'],
        location: '镇口茶馆',
        setup: '林守钥去茶馆找线人，发现线人已被沈黑虎清洗。',
        tension: '唯一的外援断了，沈黑虎的封口速度比林守钥想的更快。',
        hookEnd: '林守钥看着空荡荡的茶馆位置，知道沈黑虎已经把所有退路堵死。',
        budgetChars: 350
      },
      {
        sceneNo: 2, sceneCode: '4-2', timeOfDay: '夜',
        characters: ['林守钥'],
        location: '旧库后墙',
        setup: '林守钥趁夜回库房，发现沈黑虎已派人翻过，暗格被撬开。',
        tension: '沈黑虎知道有暗格但没找到东西，铜钥匙已被转移到窗棂缝隙里。库房外，敌人的火把光已经照进来了。',
        hookEnd: '铜钥匙已被塞进窗棂夹缝，账册贴身藏好。库房门外传来撬门声，敌人已经来了。',
        budgetChars: 350,
        prevSceneOutcome: '林守钥去茶馆找线人，发现线人已被沈黑虎清洗，所有退路被堵死。',
        prevSceneHook: '林守钥看着空荡荡的茶馆位置，知道沈黑虎已经把所有退路堵死。'
      }
    ]
  },
  {
    episodeNo: 5,
    scenes: [
      {
        sceneNo: 1, sceneCode: '5-1', timeOfDay: '日',
        characters: ['林守钥'],
        location: '山中猎户小屋',
        setup: '林守钥带弟弟躲进山中猎户小屋，旧友沈云收留了他们。',
        tension: '沈云告知有一条秘道通往县衙旧档库，可以把账册直接备案。',
        hookEnd: '林守钥终于找到翻盘的路——师父当年在县衙干过，早就留好了这条路。',
        budgetChars: 350
      },
      {
        sceneNo: 2, sceneCode: '5-2', timeOfDay: '黄昏',
        characters: ['林守钥'],
        location: '山中秘道入口',
        setup: '沈云带林守钥找到秘道入口，但沈黑虎的人已跟踪而至。',
        tension: '秘道暴露了，沈黑虎的人堵在秘道口，进退两难。',
        hookEnd: '林守钥把弟弟交给沈云，自己只身进秘道——没有退路了。',
        budgetChars: 350,
        prevSceneOutcome: '林守钥找到山中猎户小屋躲避，旧友沈云告知有秘道通往县衙旧档库，终于找到翻盘的路。',
        prevSceneHook: '林守钥终于找到翻盘的路——师父当年在县衙干过，早就留好了这条路。'
      }
    ]
  }
]

// ── Format validators (per-line, fixed from P0) ────────────────────────────────

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

// ── Output setup ─────────────────────────────────────────────────────────────

const E2E_CASE_ID = `p2-batch-${Date.now().toString(36)}`
const outDir = path.join(REPO_ROOT, 'tools', 'e2e', 'out', `evidence-${E2E_CASE_ID}`)
fs.mkdirSync(outDir, { recursive: true })

console.log('═'.repeat(70))
console.log(`P2 Scene-Level Batch Test  (E2E_CASE_ID=${E2E_CASE_ID})`)
console.log(`Episodes: ${EPISODE_DATA.map(e => e.episodeNo).join(', ')}`)
console.log('═'.repeat(70))

const allResults = []

// ── Main loop ────────────────────────────────────────────────────────────────

for (const episode of EPISODE_DATA) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Episode ${episode.episodeNo}`)
  console.log('─'.repeat(60))

  const sceneResults = []
  let prevOutcome = ''
  let prevHook    = ''

  for (const scene of episode.scenes) {
    console.log(`\n  [${episode.episodeNo}-${scene.sceneNo}] Generating ${scene.sceneCode}...`)

    // Build continuity context from previous scene
    const isLastScene = scene.sceneNo === episode.scenes.length
    const sceneInput = {
      episodeNo:   episode.episodeNo,
      sceneNo:     scene.sceneNo,
      sceneCode:   scene.sceneCode,
      timeOfDay:   scene.timeOfDay,
      characters:   scene.characters,
      setup:       scene.setup,
      tension:     scene.tension,
      hookEnd:     scene.hookEnd,
      budgetChars: scene.budgetChars,
      ...(prevOutcome ? { prevSceneOutcome: prevOutcome } : {}),
      ...(prevHook    ? { prevSceneHook:    prevHook    } : {}),
      ...(isLastScene  ? { isLastScene: true } : {})
    }

    const prompt = createSceneGenerationPrompt(sceneInput)

    try {
      const result = await generateTextWithRuntimeRouter(
        { task: 'episode_script', prompt, preferredLane: 'primary', allowFallback: false, temperature: 0.45, timeoutMs: 60000 },
        providerConfig
      )

      const raw  = result.text
      const fmt  = validateFormat(raw)
      const chars = charCount(raw)

      console.log(`  [${scene.sceneCode}] chars=${chars}/${scene.budgetChars} ${chars > scene.budgetChars ? '⚠️ OVER' : '✅'}`)

      sceneResults.push({
        sceneCode: scene.sceneCode,
        sceneNo:   scene.sceneNo,
        raw,
        chars,
        fmt,
        budget:    scene.budgetChars,
        success:   true,
        // For continuity tracking
        hookEnd:   scene.hookEnd
      })

      // Save continuity signals for next scene
      prevOutcome = `${scene.setup.slice(0, 30)}……`
      prevHook    = scene.hookEnd

      fs.writeFileSync(path.join(outDir, `ep${episode.episodeNo}-${scene.sceneCode}-raw.txt`), raw, 'utf8')

    } catch (err) {
      console.error(`  [${scene.sceneCode}] ERROR: ${err.message}`)
      sceneResults.push({ sceneCode: scene.sceneCode, sceneNo: scene.sceneNo, error: err.message, success: false })
    }
  }

  // ── Assembly ────────────────────────────────────────────────────────────────

  const successful = sceneResults.filter(r => r.success)
  if (successful.length !== episode.scenes.length) {
    console.log(`  Assembly SKIPPED — not all scenes succeeded (${successful.length}/${episode.scenes.length})`)
    allResults.push({ episodeNo: episode.episodeNo, sceneResults, assembled: null, parsed: null, quality: null, skipped: true })
    continue
  }

  const assembled = assembleScenesForEpisode(episode.episodeNo, successful.map(r => r.raw))
  const assembledChars = charCount(assembled)
  const assembledFmt = validateFormat(assembled)

  console.log(`\n  Assembly: ${assembledChars} chars | fmt: episode=${!assembledFmt.noEpisodeHeading} sceneHeading=${assembledFmt.firstLineIsSceneHeading} dialogue=${assembledFmt.hasDialogue} action=${assembledFmt.hasAction} noADE=${assembledFmt.noADE}`)

  fs.writeFileSync(path.join(outDir, `ep${episode.episodeNo}-assembled.txt`), assembled, 'utf8')

  // ── parseGeneratedScene ────────────────────────────────────────────────────

  let parsed
  try {
    parsed = parseGeneratedScene(assembled, episode.episodeNo)
    console.log(`  parseGeneratedScene: OK screenplayScenes.length=${parsed.screenplayScenes?.length ?? 0}`)
  } catch (err) {
    console.error(`  parseGeneratedScene ERROR: ${err.message}`)
    parsed = null
  }

  // ── inspectScreenplayQualityEpisode ───────────────────────────────────────

  let quality
  if (parsed) {
    try {
      quality = inspectScreenplayQualityEpisode({
        sceneNo:          parsed.sceneNo,
        screenplay:       parsed.screenplay,
        action:           parsed.action,
        dialogue:         parsed.dialogue,
        emotion:          parsed.emotion,
        screenplayScenes: parsed.screenplayScenes
      })
      console.log(`  quality: problems=${quality.problems.length === 0 ? 'none' : quality.problems.join(', ')}`)
      console.log(`    charCount=${quality.charCount} sceneCount=${quality.sceneCount}`)
    } catch (err) {
      console.error(`  quality ERROR: ${err.message}`)
      quality = null
    }
  }

  allResults.push({
    episodeNo:   episode.episodeNo,
    sceneResults,
    assembled,
    assembledChars,
    assembledFmt,
    parsed,
    quality,
    skipped: false
  })
}

// ── Write combined results ─────────────────────────────────────────────────────

const combinedReport = {
  E2E_CASE_ID: E2E_CASE_ID,
  timestamp: new Date().toISOString(),
  episodes: allResults.map(r => ({
    episodeNo:     r.episodeNo,
    skipped:      r.skipped,
    sceneCount:   r.sceneResults.length,
    assembledChars: r.assembledChars ?? null,
    sceneResults:  r.sceneResults.map(s => ({
      sceneCode: s.sceneCode,
      chars:     s.chars ?? null,
      budget:    s.budget ?? null,
      inBudget:  s.success ? s.chars <= s.budget : null,
      success:   s.success
    })),
    quality: r.quality ? {
      problems:    r.quality.problems,
      charCount:   r.quality.charCount,
      sceneCount:  r.quality.sceneCount,
      officialQuality: r.quality.officialQuality
    } : null,
    screenplayScenesLength: r.parsed?.screenplayScenes?.length ?? null
  }))
}

fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(combinedReport, null, 2), 'utf8')

// ── Summary ──────────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(70))
console.log('SUMMARY')
console.log('='.repeat(70))

for (const r of allResults) {
  const scenesOk = r.sceneResults.filter(s => s.success && s.chars <= s.budget).length
  const scenesTotal = r.sceneResults.length
  const qual = r.quality
  const passed = qual?.officialQuality?.pass ?? (qual?.problems.length === 0)

  console.log(
    `Ep${r.episodeNo}: chars=${r.assembledChars ?? 'N/A'} ` +
    `scenes=${r.parsed?.screenplayScenes?.length ?? scenesTotal}/${scenesTotal} ` +
    `budget=${scenesOk}/${scenesTotal} ` +
    `quality=${passed ? 'PASS' : 'FAIL'} ` +
    `${qual?.problems?.length ? '[' + qual.problems.join('; ') + ']' : ''}`
  )
}

console.log(`\nEvidence: ${outDir}`)
