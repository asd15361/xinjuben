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

export const CASE_ID = 'rs-a'
export const SEED_VERSION = 'sq-rs-a-baseline'

// RS-A: Resume baseline — 5 episodes done, board paused at episode 6
// scriptProgressBoard set, scriptFailureResolution=null, no failure history

function buildPartialScript() {
  // 5 completed episodes — the prefix that resume picks up from
  return [
    {
      sceneNo: 1,
      episodeNo: 1,
      sceneHeading: '旧库前·日',
      action:
        '旧库大门被撞开，木屑和尘土一起扬到林守钥脸上。沈黑虎的人从三面合围过来，把他和那扇旧木门堵在了同一道缝里。林守钥右手死死按着腰间布袋，里面是师父临走前塞给他的铜钥和拓印账册。沈黑虎站在最前面，身后七个打手已经把旧库围成铁桶。林守钥往后退了半步，背脊撞上冰冷的门板——无路可退。他的手指在布袋上发白，心跳压得很低，师父那句话像钉子一样钉在脑子里：不到万不得已，不能动武。',
      dialogue:
        '沈黑虎："把钥匙交出来，我饶你一条命。"林守钥（声音发紧）："钥匙不在我身上。"沈黑虎（往前逼一步）："不在？那你身后那布袋里装的是什么？改天我让人搜完这库房里的每一寸地，你猜我找不找得到。"林守钥没接话，手指扣进布袋的缝隙里。沈黑虎冷笑一声："行，你不交，我有的是法子让你交。"（抬手，身后人影往前逼）"今晚日落之前，我要看到那把钥匙。否则，下一个被围的就是你弟弟那间私塾。"',
      emotion:
        '林守钥感觉胸口被压了一块巨石。沈黑虎那句"私塾"像一把刀子，精准地扎在他最软的地方——幼弟林守诺就在那里读书。他可以不顾自己，但他不能不顾弟弟。代价已经来了，不是为他自己，是为师父留下的那条规矩。他第一次感受到这种压迫感：不是被围的恐惧，而是"不得不接住这一拳"的重量。他的手在发抖，但不是为了交钥匙——是为了压住自己不要现在就动手。师父说不能动武，可他没说不可以不躲。下一招，他得先想清楚。',
      quality: '好'
    },
    {
      sceneNo: 2,
      episodeNo: 2,
      sceneHeading: '旧库内·日',
      action:
        '沈黑虎的人破门而入，翻箱倒柜的声音在旧库里回荡。林守钥被两个打手按在角落木架上，动弹不得。他的眼睛死死盯着沈黑虎的人在库房里翻找，心里默数着师父留下的暗记——账册藏在哪，只有他知道。沈黑虎站在库房中央，拎着一盏油灯，光打在林守钥惨白的脸上。',
      dialogue:
        '沈黑虎（拎着灯，往角落走）："账册在哪？你那师父留的东西，不止一把钥匙吧。"林守钥（嘴唇发白）："不知道。"沈黑虎（蹲下身，用灯照他）："不知道？那你师父临走前跟你说了什么？他总不会只说一句\'守住\'就走吧。"林守钥（压低声音）："师父只说了规矩，没留别的东西。"沈黑虎（笑了一声）："规矩？那你告诉我，什么规矩值一条命。"（抬手，身后人影往前逼）"带走。关到柴房里，让他好好想想。"',
      emotion:
        '林守钥被架起来的时候，脑子里师父那句话又响了起来：不到万不得已，不能动武。他现在被抽空了力气，按在角落，被当众羞辱。可他心里那口气没有散——他在数。沈黑虎的人在翻箱倒柜，但师父真正的线索藏在另一个地方，一个这些人永远找不到的暗格。他必须活着出去。只要活着出去，就能翻盘。代价已经摆到台面上了，不是他一个人的命，是他师父留下的所有东西。他不能在这里倒下。',
      quality: '好'
    },
    {
      sceneNo: 3,
      episodeNo: 3,
      sceneHeading: '旧库后山·黄昏',
      action:
        '林守钥在后山小道上一路狂奔，师父留下的暗记指引着他穿过一片竹林。他来到一处隐蔽的山坳，按照记忆中的位置开始挖土。几分钟后，一个油布包裹被从地下取出——里面是师父临走前藏好的账册副本和一枚备用的铜钥匙。他的手在发抖，不是因为害怕，而是因为终于拿到了翻盘的筹码。',
      dialogue:
        '林守钥（打开油布包，低声）："师父，你到底留了多少后手……"（翻到账册最后一页，上面写着一行字）"这里还有一笔——沈黑虎，三年前腊月初七，截留码头规银一百两……"（手指发白）"这一笔，够把他送进去了。"',
      emotion:
        '林守钥捧着账册，感觉像捧着一块烧红的热炭。师父的代价已经付清了，而沈黑虎欠下的这笔债，现在在他手里。他终于明白师父为什么要走——不是输了，而是要把证据留到能翻盘的时候。他把账册贴身藏好，站起来，往山下走。下一招，他已经想好了。',
      quality: '好'
    },
    {
      sceneNo: 4,
      episodeNo: 4,
      sceneHeading: '镇口私塾外·夜',
      action:
        '沈黑虎派来的两个监视的人已经埋伏在私塾外的巷口。林守钥远远看见了他们，没有走近。他在街角的阴影里站了很久，看着私塾里微弱的灯火，想着弟弟林守诺正在里面读书写字。沈黑虎的人似乎也发现了他，远远地盯着，但没有动手——他们只是在等。',
      dialogue:
        '林守钥（站在暗处，低声自语）："沈黑虎，你想拿我弟弟威胁我……可你不知道，我已经拿到了我要的东西。"（转身消失在夜色中）',
      emotion:
        '林守钥在暗处看着弟弟的窗户，心里压着的不是恐惧，是一种冷静的决心。沈黑虎已经开始用弟弟威胁他了，这意味着沈黑虎也怕了。怕了就会出错，出错就会露底。他不能去私塾，但下一招可以别的地方走。他要亲手把沈黑虎的底撕开。代价他已经认了，但现在还不是扔底牌的时候。他要等一个更好的时机。',
      quality: '好'
    },
    {
      sceneNo: 5,
      episodeNo: 5,
      sceneHeading: '林家小院·深夜',
      action:
        '林守钥深夜潜回林家小院，发现院门被人动过。他推门进去，看见正屋桌上压着一张纸，是沈黑虎的警告：三日之内不交钥匙，拿林守诺是问。他把纸条收好，开始整理这几日收集到的所有证据。账册副本就在他怀里，铜钥在暗格里，还有师父留下的那封密信。他把所有东西藏好，然后走到弟弟的窗前，看着熟睡中的林守诺，心里做了一个决定。',
      dialogue:
        '林守钥（轻声）："守诺，明天开始，你不要去私塾了。"林守诺（揉眼睛）："为什么？哥哥，出什么事了？"林守钥（摸了摸他的头，声音很轻但很坚定）："没事，哥哥在外面惹了点麻烦。你先到舅舅家躲几天，等哥哥处理完了，再接你回来。记得，不管谁问你什么，都不要说见过哥哥。"林守诺（感觉到了什么，没再问）："好，哥哥你小心。"',
      emotion:
        '林守钥看着弟弟重新入睡的样子，心里那根弦绷得发紧。他从小就把这个弟弟护在手心里，现在却要亲手把他推开。不是不爱了，是不能让他成为沈黑虎拿捏自己的筹码。真正的压力不是为自己，是为他在乎的人。他把弟弟送走，不是逃避，是要把战场放到一个沈黑虎够不到的地方。代价已经砸下来了，他接着就是。',
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
      { episodeNo: 6, status: 'pending', batchIndex: 1, reason: 'ready to resume' },
      { episodeNo: 7, status: 'pending', batchIndex: 1, reason: 'ready to resume' },
      { episodeNo: 8, status: 'pending', batchIndex: 1, reason: 'ready to resume' },
      { episodeNo: 9, status: 'pending', batchIndex: 1, reason: 'ready to resume' },
      { episodeNo: 10, status: 'pending', batchIndex: 1, reason: 'ready to resume' }
    ],
    batchContext: {
      batchSize: 5,
      currentBatchIndex: 1,
      startEpisode: 6,
      endEpisode: 10,
      status: 'paused',
      resumeFromEpisode: 6,
      reason: 'User paused after 5 episodes — ready to resume',
      stageContractFingerprint: null,
      updatedAt: FIXTURE_TIMESTAMP
    }
  }
}

export function buildStore(projectOverrides = {}) {
  const projectId = `sq-rs-a-${Date.now().toString(36)}`
  const partialScript = buildPartialScript()
  const project = {
    id: projectId,
    name: `RS-A基线-${Date.now().toString(36)}`,
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
