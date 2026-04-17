import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { FIXTURE_TIMESTAMP, prepareSeedOutDir, writeSeedProject } from './script-quality-shared.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const CASE_ID = 'fs-b'
export const SEED_VERSION = 'sq-fs-b-stress'

// FS-B: More formal facts, more character anchors, stronger relationship pressure
// Same base story but denser world and relationship load

function buildSummaryEpisodes() {
  return [
    '林守钥被迫接下守库旧约，先保住铜钥不被抢走。',
    '沈黑虎开始试探镇口账册的去向，把威胁推到明面。',
    '顾玄留下的旧规矩第一次逼林守钥压住出手冲动。',
    '镇口线人被清洗，林守钥求助旧日女伴沈云，却被拒绝。',
    '沈黑虎把搜库和抓人并线，逼出主角两难选择。',
    '顾玄留下的第二道禁令曝光，旧约代价开始吞回主角。',
    '林守钥发现账册和铜钥指向同一笔旧债，与沈家祖宅有关。',
    '沈黑虎抢先拿人质（林守钥的幼弟）换钥匙，冲突推到极致。',
    '顾玄真正托付的不是守物，而是守住镇口最后的证词。',
    '林守钥公开翻账、守住铜钥，也把旧约代价一起扛下来。'
  ].map((summary, index) => ({ episodeNo: index + 1, summary }))
}

function buildCharacters() {
  return [
    {
      name: '林守钥',
      biography: '守库少年，替失踪的师父顾玄守着铜钥和镇口旧账。家中有一幼弟林守诺，是其唯一软肋。',
      publicMask: '看起来寡言退让，像个只会守摊的学徒。',
      hiddenPressure: '一旦交出铜钥，顾玄留下的旧约就会彻底失守。幼弟在镇口上学，被沈黑虎盯上。',
      fear: '怕自己一动手就把顾玄留下的规矩和证词一起毁掉，更怕幼弟被牵连。',
      protectTarget: '顾玄留下的铜钥与镇口账册，以及幼弟林守诺的安全。',
      conflictTrigger: '任何人逼他交出铜钥或抹掉旧账，都会逼出他反击。幼弟被当筹码时尤其如此。',
      advantage: '记得住旧账细节，也能在高压下继续推线索。',
      weakness: '过度守约，容易错过最佳反击时机；幼弟是明显软肋。',
      goal: '守住铜钥和账册，把镇口旧债的真相翻出来，同时护住幼弟周全。',
      arc: '从只会守约，走到敢为守住真相主动亮底，最终学会以攻为守。'
    },
    {
      name: '沈黑虎',
      biography: '镇上的地下把头，盯着铜钥和旧账背后的利益，与林守钥有旧怨。',
      publicMask: '表面替镇口维持秩序，实则不断收紧搜库和抓人。',
      hiddenPressure: '旧账一旦翻出来，他这些年的逼压和分赃都会露底。其祖宅与旧债直接挂钩。',
      fear: '怕顾玄留下的证词和账册一起把自己钉死。',
      protectTarget: '自己控制镇口生意的盘子，以及沈家祖宅的名声。',
      conflictTrigger: '只要铜钥和账册还在林守钥手里，他就不会收手。知道林守诺是软肋。',
      advantage: '人多势重，能把威胁和封口同时压下来。知道对方的幼弟是弱点。',
      weakness: '一旦急着灭口，就会暴露真正要抢的东西。',
      goal: '抢到铜钥、毁掉账册，继续把镇口旧债压成死账，顺便除掉旧怨。',
      arc: '从暗中围堵，走到公开逼压林守钥交钥匙，手段越来越极端最终自陷。'
    },
    {
      name: '顾玄',
      biography: '失踪前把铜钥和旧账交给林守钥的师父，真实身份是县衙旧档管理员。',
      publicMask: '只留下规矩，不再亲自出面。',
      hiddenPressure: '他留下的旧规矩既是保护，也成了林守钥不能乱动的枷锁。真实目的藏得更深。',
      fear: '怕徒弟为了一时救急，直接毁掉整条旧账证词。',
      protectTarget: '镇口最后一份还能翻案的证词，以及他与县衙旧档的关联。',
      conflictTrigger: '只要局面逼到要动武，顾玄的旧话就会反过来压住林守钥。',
      advantage: '提前把规矩和托付埋进了林守钥的选择里。留下了更隐蔽的线索。',
      weakness: '人不在场，只能靠旧话和旧规矩起作用。',
      goal: '让林守钥守住铜钥和旧账，不要被沈黑虎逼到乱局，最终让真相经由官衙路径公开。',
      arc: '从缺席角色，变成持续改写主角动作的隐形控制力，最终其真身在县衙旧档中现身。'
    },
    {
      name: '沈云',
      biography: '镇口老猎户之女，与林守钥有旧识，曾受过顾玄恩惠。',
      publicMask: '镇上普通少女，在杂货铺帮工，与林守钥保持距离。',
      hiddenPressure: '知道一些旧账的线索，但沈黑虎也在监视她，被迫在旧情和自保间摇摆。',
      fear: '怕被沈黑虎盯上，失去目前在镇口的安稳生活。',
      protectTarget: '自己在镇口的立足之地，以及弟弟的学费。',
      conflictTrigger: '当林守钥求助时，她不得不在帮助旧友和避开沈黑虎之间做选择。',
      advantage: '知道部分旧账线索，在关键时刻能提供信息。',
      weakness: '自保优先，不愿意主动卷入冲突。',
      goal: '在乱世中保住自己和弟弟的安稳生活。',
      arc: '从自保走到有限度地出手帮助林守钥，最终成为真相公开的见证人。'
    },
    {
      name: '林守诺',
      biography: '林守钥的幼弟，十二岁，在镇口私塾上学，是林守钥唯一的牵挂。',
      publicMask: '私塾里的普通学生，不知道哥哥守的是什么。',
      hiddenPressure: '被沈黑虎的人盯上，作为威胁林守钥的筹码。',
      fear: '怕哥哥出事，也怕被沈黑虎的人带走。',
      protectTarget: '哥哥林守钥。',
      conflictTrigger: '被沈黑虎的人带走时，触发林守钥的最强反击。',
      advantage: '纯真无知，是林守钥坚守的底线所在。',
      weakness: '年幼，是明显软肋。',
      goal: '安全长大，不给哥哥添乱。',
      arc: '从无知软肋，变成林守钥决意反击的最终动力。'
    }
  ]
}

function buildFormalFacts() {
  return [
    {
      id: 'ff_opponent_pressure',
      label: '对手压力',
      description: '沈黑虎带人围堵林守钥，逼他交出铜钥并拿镇口账册威胁。其祖宅与旧债直接挂钩。',
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
      id: 'ff_master_role',
      label: '师父角色',
      description: '师父顾玄留下旧规矩，交代林守钥不到万不得已不能动武。真实身份是县衙旧档管理员。',
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
      id: 'ff_young_brother',
      label: '幼弟人质',
      description: '林守钥有一幼弟林守诺在镇口私塾上学，被沈黑虎盯上作为威胁筹码。',
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
      id: 'ff_shengyun_rejected',
      label: '旧友拒绝',
      description: '林守钥求助旧日女伴沈云，却被拒绝。沈云被迫在旧情和自保间摇摆。',
      linkedToPlot: true,
      linkedToTheme: true,
      authorityType: 'user_declared',
      status: 'confirmed',
      level: 'important',
      declaredBy: 'user',
      declaredStage: 'outline',
      createdAt: FIXTURE_TIMESTAMP,
      updatedAt: FIXTURE_TIMESTAMP
    },
    {
      id: 'ff_legacy_debt_origin',
      label: '旧债源头',
      description: '账册和铜钥指向的旧债与沈家祖宅有关，涉及顾玄县衙旧档管理员身份的真相。',
      linkedToPlot: true,
      linkedToTheme: true,
      authorityType: 'user_declared',
      status: 'confirmed',
      level: 'important',
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
        '开局多重压力同时压下：沈黑虎带人围堵林守钥逼交铜钥，同时幼弟林守诺被盯上；顾玄旧规矩压住主角初始反击念头；旧友沈云拒绝帮助，林守钥陷入孤立。'
    },
    {
      act: 'midpoint',
      hookType: 'double-bind',
      content:
        '中段压力升级：沈黑虎把搜库和抓人并线，林守钥求助沈云被拒后被迫独行；顾玄第二道禁令曝光，旧债代价开始吞噬主角行动空间；林守诺被监视，软肋彻底暴露。'
    },
    {
      act: 'climax',
      hookType: 'forced-choice',
      content:
        '高潮多重选择被推到极致：沈黑虎公开围堵并拿林守诺作人质，逼林守钥立刻交出铜钥；顾玄规矩和幼弟安全形成不可调和的冲突；旧账指向沈家祖宅与县衙旧档的关联，真相浮出水面。'
    },
    {
      act: 'ending',
      hookType: 'payoff',
      content:
        '终局林守钥以攻为守：利用账册和县衙旧档线索翻出旧债，沈黑虎祖宅被牵连，其多年逼压和分赃彻底曝光；林守诺被救下；顾玄现身县衙旧档，真相经由官衙路径公开，林守钥完成从守约到亮底的终极转变。'
    }
  ]
}

export function buildStore(projectOverrides = {}) {
  const projectId = `sq-fs-b-${Date.now().toString(36)}`
  const project = {
    id: projectId,
    name: `FS-B压力-${Date.now().toString(36)}`,
    workflowType: 'ai_write',
    stage: 'script',
    genre: '古风悬疑',
    updatedAt: FIXTURE_TIMESTAMP,
    chatMessages: [],
    generationStatus: null,
    storyIntent: {
      titleHint: '守钥风暴',
      genre: '古风悬疑',
      tone: '压迫、克制、逐层逼近、多线收紧',
      audience: '女频剧情向',
      sellingPremise: '守库少年被逼在守约和翻旧账之间做选择，幼弟被当筹码。',
      coreDislocation: '师父失踪后，守约反而成了主角最重的枷锁；幼弟的存在让每一次选择都更沉重。',
      emotionalPayoff: '主角意识到真正守住的不是钥匙，而是能翻案的证词；以攻为守才是真正的守。',
      protagonist: '林守钥',
      antagonist: '沈黑虎',
      coreConflict:
        '沈黑虎逼林守钥交出铜钥并毁掉账册，以幼弟为筹码；林守钥必须守约也必须翻出旧债真相，同时护住幼弟。',
      endingDirection: '林守钥守住铜钥和旧账，翻出沈家旧债，救下幼弟，真相经由官衙公开。',
      officialKeyCharacters: ['林守钥', '沈黑虎', '顾玄', '沈云', '林守诺'],
      lockedCharacterNames: ['林守钥', '沈黑虎', '顾玄', '沈云', '林守诺'],
      themeAnchors: [
        '守约不等于退让，真正的守是把真相守到能见光。',
        '以攻为守才是最强的守。',
        '幼弟的存在让每一次选择都有了底线和代价。'
      ],
      worldAnchors: ['铜钥对应旧库暗格，账册记录镇口旧债流向；县衙旧档是最终真相的存放地。'],
      relationAnchors: [
        '林守钥与沈云：旧识，有限信任，被现实撕裂。',
        '林守钥与幼弟林守诺：唯一软肋，也是坚守的底线。',
        '沈黑虎与林守钥：有旧怨，祖宅旧债直接挂钩。'
      ],
      dramaticMovement: ['每一场都接上一场的后果，围堵、软肋、旧规矩、旧债四线同步收紧。'],
      generationBriefText: '【项目】守钥风暴｜10集｜多事实锚点'
    },
    outlineDraft: {
      title: '守钥风暴',
      genre: '古风悬疑',
      theme: '守约不等于退让，真正的守是把真相守到能见光；以攻为守才是最强的守。',
      mainConflict:
        '沈黑虎逼林守钥交出铜钥并毁掉账册，以幼弟为筹码；林守钥必须守约也必须翻出旧债真相，同时护住幼弟。',
      protagonist: '林守钥',
      summary:
        '10 集古风悬疑链路（多事实锚点版）：林守钥守着师父顾玄留下的铜钥和账册，被沈黑虎持续围堵，幼弟被当筹码，必须在守约、翻案、护幼弟三重压力下把每一次威胁接成下一场行动。',
      summaryEpisodes: buildSummaryEpisodes(),
      facts: buildFormalFacts()
    },
    characterDrafts: buildCharacters(),
    detailedOutlineSegments: buildDetailedOutlineSegments(),
    scriptDraft: [],
    scriptProgressBoard: null,
    scriptFailureResolution: null,
    scriptRuntimeFailureHistory: [],
    scriptStateLedger: null,
    ...projectOverrides
  }
  return { projects: { [project.id]: project } }
}

export async function prepareSeed(repoRoot) {
  const { outDir, userDataDir } = await prepareSeedOutDir(repoRoot, CASE_ID)
  const store = buildStore()
  const project = store.projects[Object.keys(store.projects)[0]]
  const { storePath, projectId, projectName } = await writeSeedProject(userDataDir, project)
  return {
    seedVersion: SEED_VERSION,
    caseId: CASE_ID,
    outDir,
    userDataDir,
    storePath,
    projectId,
    projectName
  }
}

export async function main() {
  const shouldWrite = process.argv.includes('--write')
  const store = buildStore()
  if (!shouldWrite) {
    process.stdout.write(`${JSON.stringify(store, null, 2)}\n`)
    return
  }
  const repoRoot = path.resolve(__dirname, '..', '..', '..')
  const result = await prepareSeed(repoRoot)
  console.log(`seed_written=${result.storePath}`)
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
