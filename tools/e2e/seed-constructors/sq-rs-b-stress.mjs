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

export const CASE_ID = 'rs-b'
export const SEED_VERSION = 'sq-rs-b-stress'

// RS-B: Resume stress — 5 episodes done, board paused at episode 6,
// BUT there is failure history and failure resolution from a previous failed attempt

function buildPartialScript() {
  // Same 5 episodes as RS-A
  return [
    {
      sceneNo: 1,
      episodeNo: 1,
      sceneHeading: '旧库前·日',
      action: '林守钥站在铜钥前，手指发白。沈黑虎的人已经围住了旧库大门。',
      dialogue: '沈黑虎："把钥匙交出来，我饶你一条命。"林守钥："钥匙不在我身上。"',
      emotion:
        '林守钥背水一战，手心渗汗，却死死攥紧衣角。他知道，一旦交出铜钥，师父的旧约就此崩塌。',
      quality: '中'
    },
    {
      sceneNo: 2,
      episodeNo: 2,
      sceneHeading: '旧库内·日',
      action: '沈黑虎带人进入旧库，翻找账册。林守钥被按在角落。',
      dialogue: '沈黑虎："账册在哪？"林守钥："不知道。"',
      emotion: '林守钥心中暗忖：师父留下的线索，只有我一个人知道在哪里。只要活着出去，就能翻盘。',
      quality: '中'
    },
    {
      sceneNo: 3,
      episodeNo: 3,
      sceneHeading: '旧库后山·黄昏',
      action: '林守钥脱身，来到旧库后山，按照师父留下的暗记寻找账册藏处。',
      dialogue: '',
      emotion: '他一边挖，一边想起师父的话："不到万不得已，不能动武。"此刻，他只能用这种方式反击。',
      quality: '中'
    },
    {
      sceneNo: 4,
      episodeNo: 4,
      sceneHeading: '镇口私塾外·夜',
      action: '沈黑虎发现账册失踪，派人监视林守钥的去向。林守钥来到私塾外。',
      dialogue: '',
      emotion: '林守钥心中一紧：私塾里有他的幼弟林守诺。沈黑虎竟然把线人安插到了这里。',
      quality: '中'
    },
    {
      sceneNo: 5,
      episodeNo: 5,
      sceneHeading: '林家小院·深夜',
      action: '林守钥深夜回家，发现门上贴了沈黑虎的警告。他把账册藏好，准备下一步行动。',
      dialogue: '林守钥对弟弟："明天开始，你不要去私塾了。"林守诺："为什么？"',
      emotion: '林守钥第一次感受到了真正的压力——不是为自己，而是为了幼弟。他必须尽快翻盘。',
      quality: '好'
    }
  ]
}

function buildProgressBoard() {
  return {
    episodeStatuses: [
      { episodeNo: 1, status: 'completed', batchIndex: 0, reason: 'done' },
      { episodeNo: 2, status: 'completed', batchIndex: 0, reason: 'done' },
      { episodeNo: 3, status: 'completed', batchIndex: 0, reason: 'done' },
      { episodeNo: 4, status: 'completed', batchIndex: 0, reason: 'done' },
      { episodeNo: 5, status: 'completed', batchIndex: 0, reason: 'done' },
      // Episode 6 previously failed and was retried
      {
        episodeNo: 6,
        status: 'failed',
        batchIndex: 1,
        reason: 'runtime_interrupted: previous attempt failed at parse stage'
      },
      { episodeNo: 7, status: 'pending', batchIndex: 1, reason: 'ready to resume after repair' },
      { episodeNo: 8, status: 'pending', batchIndex: 1, reason: 'ready to resume' },
      { episodeNo: 9, status: 'pending', batchIndex: 1, reason: 'ready to resume' },
      { episodeNo: 10, status: 'pending', batchIndex: 1, reason: 'ready to resume' }
    ],
    batchContext: {
      batchSize: 5,
      currentBatchIndex: 1,
      startEpisode: 6,
      endEpisode: 10,
      status: 'failed',
      resumeFromEpisode: 6,
      reason: 'Batch failed at episode 6 — repair requested before retry',
      stageContractFingerprint: null,
      updatedAt: FIXTURE_TIMESTAMP
    }
  }
}

export function buildStore(projectOverrides = {}) {
  const projectId = `sq-rs-b-${Date.now().toString(36)}`
  const partialScript = buildPartialScript()
  const project = {
    id: projectId,
    name: `RS-B压力-${Date.now().toString(36)}`,
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
    scriptDraft: partialScript,
    scriptProgressBoard: buildProgressBoard(),
    scriptFailureResolution: {
      kind: 'retry',
      reason: 'Episode 6 failed due to runtime_interrupted. Repair requested before retry.',
      errorMessage: 'runtime_interrupted at episode 6 parse stage',
      eventId: `evt_rs_b_fail_${Date.now().toString(36)}`,
      lockRecoveryAttempted: false
    },
    scriptRuntimeFailureHistory: [
      {
        episodeNo: 6,
        code: 'runtime_interrupted',
        timestamp: FIXTURE_TIMESTAMP,
        detail: 'Previous generation attempt was interrupted at episode 6 during parse stage'
      }
    ],
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
    baselineScriptCount: 5
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
