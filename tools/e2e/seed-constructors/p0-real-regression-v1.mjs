import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const P0_REAL_REGRESSION_SEED_VERSION = 'p0-real-regression-v1'
export const P0_REAL_REGRESSION_PROJECT_NAME = 'visible-p0-regression-v1'

const FIXTURE_TIMESTAMP = '2026-03-25T00:00:00.000Z'
const FIXTURE_PROJECT_ID = 'project_visible_p0_regression_v1'

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
  ].map((summary, index) => ({
    episodeNo: index + 1,
    summary
  }))
}

function buildCharacters() {
  return [
    {
      name: '林守钥',
      biography: '守库少年，替失踪的师父顾玄守着铜钥和镇口旧账。',
      publicMask: '看起来寡言退让，像个只会守摊的学徒。',
      hiddenPressure: '一旦交出铜钥，顾玄留下的旧约就会彻底失守。',
      fear: '怕自己一动手就把顾玄留下的规矩和证词一起毁掉。',
      protectTarget: '顾玄留下的铜钥与镇口账册。',
      conflictTrigger: '任何人逼他交出铜钥或抹掉旧账，都会逼出他反击。',
      advantage: '记得住旧账细节，也能在高压下继续推线索。',
      weakness: '过度守约，容易错过最佳反击时机。',
      goal: '守住铜钥和账册，把镇口旧债的真相翻出来。',
      arc: '从只会守约，走到敢为守住真相主动亮底。'
    },
    {
      name: '沈黑虎',
      biography: '镇上的地下把头，盯着铜钥和旧账背后的利益。',
      publicMask: '表面替镇口维持秩序，实则不断收紧搜库和抓人。',
      hiddenPressure: '旧账一旦翻出来，他这些年的逼压和分赃都会露底。',
      fear: '怕顾玄留下的证词和账册一起把自己钉死。',
      protectTarget: '自己控制镇口生意的盘子。',
      conflictTrigger: '只要铜钥和账册还在林守钥手里，他就不会收手。',
      advantage: '人多势重，能把威胁和封口同时压下来。',
      weakness: '一旦急着灭口，就会暴露真正要抢的东西。',
      goal: '抢到铜钥、毁掉账册，继续把镇口旧债压成死账。',
      arc: '从暗中围堵，走到公开逼压林守钥交钥匙。'
    },
    {
      name: '顾玄',
      biography: '失踪前把铜钥和旧账交给林守钥的师父。',
      publicMask: '只留下规矩，不再亲自出面。',
      hiddenPressure: '他留下的旧规矩既是保护，也成了林守钥不能乱动的枷锁。',
      fear: '怕徒弟为了一时救急，直接毁掉整条旧账证词。',
      protectTarget: '镇口最后一份还能翻案的证词。',
      conflictTrigger: '只要局面逼到要动武，顾玄的旧话就会反过来压住林守钥。',
      advantage: '提前把规矩和托付埋进了林守钥的选择里。',
      weakness: '人不在场，只能靠旧话和旧规矩起作用。',
      goal: '让林守钥守住铜钥和旧账，不要被沈黑虎逼到乱局。',
      arc: '从缺席角色，变成持续改写主角动作的隐形控制力。'
    }
  ]
}

function buildFormalFacts() {
  return [
    {
      id: 'fact_opponent_pressure',
      label: '对手压力',
      description: '沈黑虎带人围堵林守钥，逼他交出铜钥并拿镇口账册威胁。',
      linkedToPlot: true,
      linkedToTheme: true,
      authorityType: 'user_declared',
      status: 'confirmed',
      level: 'core',
      declaredBy: 'user',
      declaredStage: 'outline',
      createdAt: FIXTURE_TIMESTAMP,
      updatedAt: FIXTURE_TIMESTAMP
    },
    {
      id: 'fact_master_role',
      label: '师父角色',
      description: '师父顾玄留下旧规矩，交代林守钥不到万不得已不能动武。',
      linkedToPlot: true,
      linkedToTheme: true,
      authorityType: 'user_declared',
      status: 'confirmed',
      level: 'core',
      declaredBy: 'user',
      declaredStage: 'outline',
      createdAt: FIXTURE_TIMESTAMP,
      updatedAt: FIXTURE_TIMESTAMP
    }
  ]
}

function buildDetailedOutlineSegments() {
  return [
    {
      act: 'opening',
      hookType: 'pressure-arrival',
      content:
        '开局先把对手压力落到现场：沈黑虎带人围堵林守钥，逼他交出铜钥并拿镇口账册威胁。与此同时，师父角色也压住主角动作，师父顾玄留下旧规矩，交代林守钥不到万不得已不能动武。'
    },
    {
      act: 'midpoint',
      hookType: 'double-bind',
      content:
        '中段继续推进对手压力，沈黑虎把搜库和抓人并线，逼林守钥在铜钥和账册之间做取舍。顾玄留下的旧规矩持续起作用，林守钥每次想直接反打，都会被师父那句不到万不得已不能动武拦住。'
    },
    {
      act: 'climax',
      hookType: 'forced-choice',
      content:
        '高潮让两条正式事实一起收紧：沈黑虎公开亮出围堵和灭口，逼林守钥立刻交出铜钥；顾玄留下的规矩逼林守钥先守住证词和账册，再决定怎么还手。'
    },
    {
      act: 'ending',
      hookType: 'payoff',
      content:
        '终局里，林守钥利用账册翻出旧债，把沈黑虎的围堵反钉回去，也证明顾玄留下旧规矩不是软弱，而是为了守住能翻案的最后证词。'
    }
  ]
}

export function buildP0RealRegressionStore() {
  const project = {
    id: FIXTURE_PROJECT_ID,
    name: P0_REAL_REGRESSION_PROJECT_NAME,
    workflowType: 'ai_write',
    stage: 'script',
    genre: '古风悬疑',
    updatedAt: FIXTURE_TIMESTAMP,
    chatMessages: [],
    generationStatus: null,
    storyIntent: {
      titleHint: '守钥风暴',
      genre: '古风悬疑',
      tone: '压迫、克制、逐层逼近',
      audience: '女频剧情向',
      sellingPremise: '守库少年被逼在守约和翻旧账之间做选择。',
      coreDislocation: '师父失踪后，守约反而成了主角最重的枷锁。',
      emotionalPayoff: '主角意识到真正守住的不是钥匙，而是能翻案的证词。',
      protagonist: '林守钥',
      antagonist: '沈黑虎',
      coreConflict: '沈黑虎逼林守钥交出铜钥并毁掉账册，林守钥必须守约也必须翻出旧债真相。',
      endingDirection: '林守钥守住铜钥和旧账，把沈黑虎的旧债翻到台前。',
      officialKeyCharacters: ['林守钥', '沈黑虎', '顾玄'],
      lockedCharacterNames: ['林守钥', '沈黑虎', '顾玄'],
      themeAnchors: ['守约不等于退让，真正的守是把真相守到能见光。'],
      worldAnchors: ['铜钥对应旧库暗格，账册记录镇口旧债流向。'],
      relationAnchors: [],
      dramaticMovement: ['每一场都接上一场的后果，围堵与旧规矩同步收紧。'],
      generationBriefText: '【项目】守钥风暴｜10集'
    },
    outlineDraft: {
      title: '守钥风暴',
      genre: '古风悬疑',
      theme: '守约不等于退让，真正的守是把真相守到能见光。',
      mainConflict: '沈黑虎逼林守钥交出铜钥并毁掉账册，林守钥必须守约也必须翻出旧债真相。',
      protagonist: '林守钥',
      summary:
        '10 集古风悬疑链路：林守钥守着师父顾玄留下的铜钥和账册，被沈黑虎持续围堵，必须在守约和翻案之间把每一次威胁接成下一场行动。',
      summaryEpisodes: buildSummaryEpisodes(),
      facts: buildFormalFacts()
    },
    characterDrafts: buildCharacters(),
    detailedOutlineSegments: buildDetailedOutlineSegments(),
    scriptDraft: [],
    scriptProgressBoard: null,
    scriptFailureResolution: null,
    scriptStateLedger: null
  }

  return {
    projects: {
      [project.id]: project
    }
  }
}

export async function writeP0RealRegressionSeed() {
  const seedDir = path.resolve(__dirname, '..', 'seeds', P0_REAL_REGRESSION_SEED_VERSION)
  const workspaceDir = path.join(seedDir, 'workspace')
  const filePath = path.join(workspaceDir, 'projects.json')
  await fs.mkdir(workspaceDir, { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(buildP0RealRegressionStore(), null, 2)}\n`, 'utf8')
  return filePath
}

export async function main() {
  const shouldWrite = process.argv.includes('--write')
  if (!shouldWrite) {
    process.stdout.write(`${JSON.stringify(buildP0RealRegressionStore(), null, 2)}\n`)
    return
  }

  const filePath = await writeP0RealRegressionSeed()
  console.log(`seed_written=${filePath}`)
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
