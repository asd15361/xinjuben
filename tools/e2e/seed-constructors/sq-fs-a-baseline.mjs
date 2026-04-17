import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { FIXTURE_TIMESTAMP, prepareSeedOutDir, writeSeedProject } from './script-quality-shared.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const CASE_ID = 'fs-a'
export const SEED_VERSION = 'sq-fs-a-baseline'

// ─────────────────────────────────────────────
// Base story — same foundation as P0, 10 episodes
// ─────────────────────────────────────────────

export function buildSummaryEpisodes() {
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
  ].map((summary, index) => ({ episodeNo: index + 1, summary }))
}

export function buildCharacters() {
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

export function buildFormalFacts() {
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

export function buildDetailedOutlineSegments() {
  return [
    {
      act: 'opening',
      hookType: 'pressure-arrival',
      content:
        '开局先把对手压力落到现场：沈黑虎带人围堵林守钥，逼他交出铜钥并拿镇口账册威胁。与此同时，师父角色也压住主角动作，师父顾玄留下旧规矩，交代林守钥不到万不得已不能动武。',
      episodeBeats: [
        {
          episodeNo: 1,
          summary: '林守钥被迫接下守库旧约，先保住铜钥不被抢走。',
          sceneByScene: [
            {
              sceneNo: 1,
              location: '旧库门前',
              timeOfDay: '日',
              setup: '沈黑虎带人围堵旧库大门，林守钥被堵在库内，铜钥在腰间布袋里。',
              tension: '沈黑虎限日落前交出铜钥，否则围堵弟弟私塾。师父规矩：不到万不得已不能动武。',
              hookEnd: '林守钥手指发白，死死按住腰间布袋，却不能动手。'
            },
            {
              sceneNo: 2,
              location: '旧库内',
              timeOfDay: '日',
              setup: '沈黑虎破门搜库，林守钥被按在角落，账册藏处只有他知道。',
              tension: '沈黑虎拿到账册就灭口，拿不到就威胁弟弟。师父的规矩压住他不能动武。',
              hookEnd: '林守钥被抽空力气按在角落，却在心里默数账册藏在暗格的位置。'
            }
          ]
        },
        {
          episodeNo: 2,
          summary: '沈黑虎开始试探镇口账册的去向，把威胁推到明面。',
          sceneByScene: [
            {
              sceneNo: 1,
              location: '旧库后山',
              timeOfDay: '黄昏',
              setup: '林守钥甩掉追兵，按师父暗记在后山挖出账册副本和备用铜钥。',
              tension: '沈黑虎已知账册失踪，开始怀疑林守钥私下藏了东西。',
              hookEnd: '林守钥捧着账册副本，感觉像捧着一块烧红的热炭——这是翻盘的筹码。'
            },
            {
              sceneNo: 2,
              location: '镇口私塾外',
              timeOfDay: '夜',
              setup: '沈黑虎派人监视林守钥去向，林守钥远远看见弟弟在私塾读书。',
              tension: '沈黑虎用弟弟威胁他，暗示知道他把弟弟看得比命重。',
              hookEnd: '林守钥在暗处看着弟弟窗户，心里那根弦绷得发紧。'
            }
          ]
        },
        {
          episodeNo: 3,
          summary: '顾玄留下的旧规矩第一次逼林守钥压住出手冲动。',
          sceneByScene: [
            {
              sceneNo: 1,
              location: '林家小院',
              timeOfDay: '深夜',
              setup: '林守钥深夜回家，发现沈黑虎的警告字条压在桌上。',
              tension: '三日期限已下，沈黑虎已开始下一步威胁。师父规矩压住他不能动武。',
              hookEnd: '林守钥把弟弟送到舅舅家，转身时手在发抖——第一次感到真正的代价。'
            },
            {
              sceneNo: 2,
              location: '山间小道',
              timeOfDay: '黎明',
              setup: '林守钥带弟弟离开，沈黑虎的人追上，被迫第一次动用武力。',
              tension: '师父的禁令被打破，规矩的代价开始吞回主角。',
              hookEnd: '林守钥还击时，师父那句话像钉子一样钉在脑子里——代价已经开始了。'
            }
          ]
        }
      ]
    },
    {
      act: 'midpoint',
      hookType: 'double-bind',
      content:
        '中段继续推进对手压力，沈黑虎把搜库和抓人并线，逼林守钥在铜钥和账册之间做取舍。顾玄留下的旧规矩持续起作用，林守钥每次想直接反打，都会被师父那句不到万不得已不能动武拦住。',
      episodeBeats: [
        {
          episodeNo: 4,
          summary: '镇口线人被清洗，林守钥只能用更慢的办法查账。',
          sceneByScene: [
            {
              sceneNo: 1,
              location: '镇口茶馆',
              timeOfDay: '日',
              setup: '林守钥去茶馆找线人，发现线人已被沈黑虎清洗。',
              tension: '唯一的外援断了，沈黑虎的封口速度比林守钥想的更快。',
              hookEnd: '林守钥看着空荡荡的茶馆位置，知道沈黑虎已经把所有退路堵死。'
            },
            {
              sceneNo: 2,
              location: '旧库后墙',
              timeOfDay: '夜',
              setup: '林守钥趁夜回库房，发现沈黑虎已派人翻过，暗格被撬开。',
              tension: '沈黑虎知道有暗格但没找到东西，林守钥必须在他们下一次来之前转移证据。',
              hookEnd: '林守钥从暗格取出备用铜钥和账册副本，决定把战场引到县衙。'
            }
          ]
        },
        {
          episodeNo: 5,
          summary: '沈黑虎把搜库和抓人并线，逼出主角两难选择。',
          sceneByScene: [
            {
              sceneNo: 1,
              location: '山中猎户小屋',
              timeOfDay: '日',
              setup: '林守钥带弟弟躲进山中猎户小屋，旧友沈云收留了他们。',
              tension: '沈云告知有一条秘道通往县衙旧档库，可以把账册直接备案。',
              hookEnd: '林守钥终于找到翻盘的路——师父当年在县衙干过，早就留好了这条路。'
            },
            {
              sceneNo: 2,
              location: '山中秘道入口',
              timeOfDay: '黄昏',
              setup: '沈云带林守钥找到秘道入口，但沈黑虎的人已跟踪而至。',
              tension: '秘道暴露了，沈黑虎的人堵在秘道口，进退两难。',
              hookEnd: '林守钥把弟弟交给沈云，自己只身进秘道——没有退路了。'
            }
          ]
        },
        {
          episodeNo: 6,
          summary: '顾玄留下的第二道禁令曝光，旧约代价开始吞回主角。',
          sceneByScene: [
            {
              sceneNo: 1,
              location: '县衙旧档库',
              timeOfDay: '夜',
              setup: '林守钥只身潜入县衙旧档库，找到师父留下的完整账册副本。',
              tension: '沈家旧债真相完整曝光，但追兵已到门口。',
              hookEnd: '林守钥捧着账册副本，手在发抖——师父留的不只是规矩，是一条翻案的路。'
            },
            {
              sceneNo: 2,
              location: '县衙后巷',
              timeOfDay: '深夜',
              setup: '林守钥被沈黑虎的人围住，账册和铜钥都在身上。',
              tension: '沈黑虎的人已经知道他去了县衙，这是最后一次围堵。',
              hookEnd: '林守钥把账册塞进怀里，准备最后一搏——师父的规矩已破，没有退路了。'
            }
          ]
        }
      ]
    },
    {
      act: 'climax',
      hookType: 'forced-choice',
      content:
        '高潮让两条正式事实一起收紧：沈黑虎公开亮出围堵和灭口，逼林守钥立刻交出铜钥；顾玄留下的规矩逼林守钥先守住证词和账册，再决定怎么还手。',
      episodeBeats: [
        {
          episodeNo: 7,
          summary: '林守钥发现账册和铜钥指向同一笔旧债。',
          sceneByScene: [
            {
              sceneNo: 1,
              location: '山中废炭窑',
              timeOfDay: '黎明',
              setup: '林守钥带着账册和弟弟汇合，躲在废炭窑里。沈黑虎的人正在搜山。',
              tension: '弟弟发着烧，沈黑虎的人越搜越近，账册上那笔旧债是唯一的武器。',
              hookEnd: '林守钥看着账册上沈黑虎三年前截留码头规银的记录，知道这就是钉死他的那一笔。'
            },
            {
              sceneNo: 2,
              location: '废炭窑外',
              timeOfDay: '晨',
              setup: '沈黑虎的人找到废炭窑，堵住出口。林守钥没有退路。',
              tension: '铜钥和账册都在身上，交给沈黑虎就全完了。',
              hookEnd: '林守钥把弟弟藏好，拿着账册走出来——这是他最后一次用师父的规矩反钉沈黑虎。'
            }
          ]
        },
        {
          episodeNo: 8,
          summary: '沈黑虎抢先拿人质换钥匙，冲突被推到无法回避。',
          sceneByScene: [
            {
              sceneNo: 1,
              location: '镇口广场',
              timeOfDay: '日',
              setup: '沈黑虎当着镇民的面公开威胁林守钥，要求交出铜钥换弟弟。',
              tension: '全镇的面子里子都在这里，林守钥必须当场做出选择。',
              hookEnd: '林守钥当着所有人的面，把账册上沈黑虎截留码头规银的记录当场念出来。'
            },
            {
              sceneNo: 2,
              location: '镇口广场',
              timeOfDay: '日',
              setup: '沈黑虎被当众揭底，恼羞成怒，亮出最后一张底牌：弟弟在手上。',
              tension: '人质在手，沈黑虎要林守钥当众下跪认输，否则弟弟没命。',
              hookEnd: '林守钥从怀里掏出铜钥，却没有跪，而是把铜钥扔进了广场中央的井里。'
            }
          ]
        },
        {
          episodeNo: 9,
          summary: '顾玄真正托付的不是守物，而是守住镇口最后的证词。',
          sceneByScene: [
            {
              sceneNo: 1,
              location: '镇口广场',
              timeOfDay: '日',
              setup: '铜钥落井，沈黑虎和林守钥都没有退路。围堵升级到极点。',
              tension: '沈黑虎要当场拿人，林守钥护着弟弟，师父的规矩已破但真相还在。',
              hookEnd: '林守钥当众宣布：真正的钥匙不是铜钥，是账册上沈黑虎自己的罪证。'
            },
            {
              sceneNo: 2,
              location: '镇口私塾',
              timeOfDay: '黄昏',
              setup: '沈黑虎派人去私塾抓林守诺做人质，却发现人早被沈云转移了。',
              tension: '沈黑虎的最后一招落空，而林守钥的账册已在县衙备案。',
              hookEnd: '林守钥收到沈云的消息，知道弟弟安全了——这是师父那句话最后的重量：不到万不得已。'
            }
          ]
        }
      ]
    },
    {
      act: 'ending',
      hookType: 'payoff',
      content:
        '终局里，林守钥利用账册翻出旧债，把沈黑虎的围堵反钉回去，也证明顾玄留下旧规矩不是软弱，而是为了守住能翻案的最后证词。',
      episodeBeats: [
        {
          episodeNo: 10,
          summary: '林守钥公开翻账、守住铜钥，也把旧约代价一起扛下来。',
          sceneByScene: [
            {
              sceneNo: 1,
              location: '县衙门口',
              timeOfDay: '日',
              setup: '县衙捕头上门，拿沈黑虎当众宣读的罪证当场拘押他。',
              tension: '沈黑虎当场被拘，但林守钥打破师父规矩的代价还在——他动了武。',
              hookEnd: '林守钥站在县衙门口，看着沈黑虎被带走，心里那块压了太久的石头终于裂开。'
            },
            {
              sceneNo: 2,
              location: '旧库门口',
              timeOfDay: '黄昏',
              setup: '林守钥回到旧库，铜钥已经沉在井里，但师父的真相守住了。',
              tension: '旧约已破，但真相见光了。师父的话还在耳边。',
              hookEnd: '林守钥在库门口站了很久，然后转身，朝着弟弟的方向走去——这一次，是他自己选的路。'
            }
          ]
        }
      ]
    }
  ]
}

export function buildStore(projectOverrides = {}) {
  const projectId = `sq-fs-a-${Date.now().toString(36)}`
  const project = {
    id: projectId,
    name: `FS-A基线-${Date.now().toString(36)}`,
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
