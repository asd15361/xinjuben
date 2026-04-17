import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { FIXTURE_TIMESTAMP, prepareSeedOutDir, writeSeedProject } from './script-quality-shared.mjs'
import {
  buildSummaryEpisodes,
  buildCharacters,
  buildFormalFacts,
  buildDetailedOutlineSegments
} from './sq-fs-a-baseline.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const CASE_ID = 'rw-a'
export const SEED_VERSION = 'sq-rw-a-baseline'

// RW-A: Rewrite baseline — all 10 episodes written, board in completed state
// When user requests rewrite, mode='rewrite' is passed explicitly
// This triggers rewrite of the target episode range

function buildCompleteScript() {
  // 10 completed episodes — full target range is written
  const episodes = [
    {
      ep: 1,
      heading: '旧库前·日',
      action:
        '林守钥站在铜钥前，手指发白。沈黑虎的人已经围住了旧库大门。逼压感从第一场就建立起来。',
      dialogue: '沈黑虎："把钥匙交出来。"林守钥："钥匙不在我身上。"',
      emotion: '林守钥背水一战，手心渗汗，却死死攥紧衣角。'
    },
    {
      ep: 2,
      heading: '旧库内·日',
      action: '沈黑虎带人进入旧库，翻找账册。林守钥被按在角落。第一次正面对峙。',
      dialogue: '沈黑虎："账册在哪？"林守钥："不知道。"',
      emotion: '林守钥心中暗忖：师父留下的线索，只有我一个人知道。'
    },
    {
      ep: 3,
      heading: '旧库后山·黄昏',
      action: '林守钥脱身，来到旧库后山，按照师父留下的暗记寻找账册藏处。代价开始显现。',
      dialogue: '',
      emotion: '他一边挖，一边想起师父的话："不到万不得已，不能动武。"'
    },
    {
      ep: 4,
      heading: '镇口私塾外·夜',
      action: '沈黑虎发现账册失踪，派人监视林守钥的去向。围堵收紧。',
      dialogue: '',
      emotion: '林守钥心中一紧：幼弟林守诺在私塾上学。沈黑虎竟已在监视这里。'
    },
    {
      ep: 5,
      heading: '林家小院·深夜',
      action: '林守钥深夜回家，发现门上贴了沈黑虎的警告。他把账册藏好，准备下一步行动。',
      dialogue: '林守钥对弟弟："明天开始，你不要去私塾了。"林守诺："为什么？"',
      emotion: '林守钥第一次感受到了真正的压力——不是为自己，而是为了幼弟。'
    },
    {
      ep: 6,
      heading: '山间小道·黎明',
      action: '林守钥带幼弟离开镇口，沈黑虎的人追上。林守钥被迫还击，第一次动用武力。',
      dialogue: '沈黑虎手下："别让他们跑了！"',
      emotion: '师父的禁令被打破，林守钥意识到自己已经没有退路。代价正式开始吞噬他。'
    },
    {
      ep: 7,
      heading: '山中猎户小屋·日',
      action: '林守钥带幼弟躲进山中猎户小屋，那是沈云的家。旧友给了他们庇护。',
      dialogue: '沈云："你们怎么弄成这样？"林守钥："说来话长。"',
      emotion: '沈云的帮助让林守钥重燃希望，但也让他更清楚自己的处境有多危险。'
    },
    {
      ep: 8,
      heading: '山中秘道·黄昏',
      action:
        '沈云告知林守钥一条通往县衙的秘道，可以把账册直接送到县衙备案。顾玄的真正布局浮出水面。',
      dialogue: '沈云："你师父当年在县衙干过，他知道一条路能直达旧档库。"',
      emotion: '林守钥恍然大悟：师父留下的不只是规矩，还有一条翻盘的路。'
    },
    {
      ep: 9,
      heading: '县衙旧档库·夜',
      action: '林守钥只身潜入县衙旧档库，找到顾玄留下的完整账册副本。沈家旧债的真相终于完整曝光。',
      dialogue: '',
      emotion: '他终于拿到了能够彻底扳倒沈黑虎的证据。代价已经付出太多，但一切都值得。'
    },
    {
      ep: 10,
      heading: '镇口广场·日',
      action: '林守钥在镇口广场公开账册，沈黑虎的罪行曝光。沈黑虎被抓，林守钥守住了师父的旧约。',
      dialogue: '县衙捕头："沈黑虎，你被控私占官产、威逼百姓，证据确凿！"',
      emotion: '林守钥站在阳光下，心中默念师父的话：守约不等于退让，真正的守是把真相守到能见光。'
    }
  ]

  return episodes.map(({ ep, heading, action, dialogue, emotion }) => ({
    sceneNo: ep,
    episodeNo: ep,
    sceneHeading: heading,
    action,
    dialogue,
    emotion,
    quality: ep >= 5 ? '好' : '中'
  }))
}

function buildProgressBoard() {
  const statuses = []
  for (let i = 1; i <= 10; i++) {
    statuses.push({ episodeNo: i, status: 'completed', batchIndex: 0, reason: 'done' })
  }
  return {
    episodeStatuses: statuses,
    batchContext: {
      batchSize: 10,
      currentBatchIndex: 0,
      startEpisode: 1,
      endEpisode: 10,
      status: 'completed',
      resumeFromEpisode: null,
      reason: 'All 10 episodes completed — rewrite requested',
      stageContractFingerprint: null,
      updatedAt: FIXTURE_TIMESTAMP
    }
  }
}

export function buildStore(projectOverrides = {}) {
  const projectId = `sq-rw-a-${Date.now().toString(36)}`
  const fullScript = buildCompleteScript()
  const project = {
    id: projectId,
    name: `RW-A基线-${Date.now().toString(36)}`,
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
    scriptDraft: fullScript,
    scriptProgressBoard: buildProgressBoard(),
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
    projectName,
    existingScriptCount: 10
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
