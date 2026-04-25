/**
 * 回归测试：男频都市逆袭 20 集生成
 *
 * 验证目标：
 * 1. marketProfile 是否正确传入生成链路
 * 2. 男频质量评分是否合理
 * 3. 修稿链是否按低分定向修
 * 4. 剧本是否符合男频爽点模型
 */

import { startScriptGeneration } from '../src/application/script-generation/start-script-generation.js'
import { buildScriptGenerationExecutionPlan } from '../src/application/script-generation/build-execution-plan.js'
import { createInitialProgressBoard } from '../src/application/script-generation/progress-board.js'
import { loadRuntimeProviderConfig, hasValidApiKey } from '../src/infrastructure/runtime-env/provider-config.js'
import type { StartScriptGenerationInputDto } from '../src/shared/contracts/script-generation.js'
import type { OutlineDraftDto, CharacterDraftDto, DetailedOutlineSegmentDto, DetailedOutlineBlockDto, ScriptSegmentDto } from '../src/shared/contracts/workflow.js'
import type { StoryIntentPackageDto } from '../src/shared/contracts/intake.js'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

const PROJECT_ID = 'regression-test-male-urban-2026-04-24'
const TARGET_EPISODES = 20

const storyIntent: StoryIntentPackageDto = {
  genre: '都市逆袭',
  subGenre: '男频都市',
  coreConflict: '外卖员陈锋被富二代张子豪当众羞辱、抢走女友，随后发现自己被公司开除、租房被收回。他必须在都市丛林中从底层爬起，用隐藏的技能和资源一步步反击。',
  sellingPremise: '一个被踩到尘埃里的外卖员，用自己的行业信息差、隐藏人脉和关键时刻亮出的底牌，把高高在上的富二代一步步拉下马。',
  protagonist: '陈锋',
  antagonist: '张子豪',
  protagonistCoreDrive: '夺回尊严、证明自己不是废物、保护母亲',
  antagonistPressure: '张子豪家里有钱有势，能操控陈锋的工作、住处、甚至报警把他抓进去',
  emotionalPromise: '每一集都要让陈锋从被压迫转到反击，打脸要当场兑现，让观众爽',
  moralPremise: '真正的力量不在背景里，在每一个你看不起的人手里',
  tone: '紧凑、真实、反转密集，台词接地气',
  pacing: '每集3场，开场即冲突，中场升级，结尾钩子',
  worldbuildingNotes: '2026年都市，普通三四线城市。外卖行业、装修行业、本地商圈、街道办等真实场景',
  tags: ['都市', '逆袭', '打脸', '外卖员', '富二代', '反转'],
  format: { episodes: 20, durationMinutes: 3, scenesPerEpisode: 3 },
  targetAudience: '18-35岁男性，喜欢逆袭爽文',
  comparableWorks: ['赘婿', '最强外卖员'],
  marketProfile: {
    audienceLane: 'male',
    subgenre: '男频都市逆袭'
  },
  protagonistArc: {
    startingPosition: '外卖员，被富二代抢走女友、当众羞辱、公司开除',
    transformation: '从隐忍到亮底牌，利用行业信息差和暗藏资源逐步反击',
    endingPosition: '揭开真实身份（前特种兵/隐藏技能），张子豪败落，陈锋获得尊重'
  },
  antagonistArc: {
    startingPosition: '富二代，嚣张跋扈，以为有钱就能为所欲为',
    endingPosition: '所有底牌被打穿，被父亲放弃，身败名裂'
  }
}

const outlineDraft: OutlineDraftDto = {
  title: '逆袭外卖员',
  genre: '都市逆袭',
  theme: '底层小人物用智慧和底牌逆袭富二代',
  mainConflict: '陈锋被张子豪抢走女友、当众羞辱、公司开除、租房被收，必须从外卖行业中找到反击机会',
  protagonist: '陈锋',
  summary: '外卖员陈锋被富二代张子豪当众羞辱、抢走女友、被公司开除。他隐忍退让，暗中利用外卖行业的信息差和人脉，一步步收集张子豪的黑料，最终在一次商务宴会上当众亮出证据，让张子豪身败名裂。',
  planningUnitEpisodes: 20,
  summaryEpisodes: Array.from({ length: TARGET_EPISODES }, (_, i) => ({
    episodeNo: i + 1,
    summary: `第${i + 1}集概要占位`
  })),
  outlineBlocks: [
    { blockNo: 1, label: '第一幕：绝境开局', startEpisode: 1, endEpisode: 5, summary: '陈锋被羞辱、开除、母亲住院。他开始暗中收集情报，发现张子豪的灰色生意。', episodes: [] },
    { blockNo: 2, label: '第二幕：暗线反击', startEpisode: 6, endEpisode: 10, summary: '陈锋利用外卖员身份渗透张子豪的商业圈，认识关键人物，拿到第一个把柄。', episodes: [] },
    { blockNo: 3, label: '第三幕：正面交锋', startEpisode: 11, endEpisode: 15, summary: '陈锋在张子豪的地盘上制造麻烦，双方互设圈套，张子豪开始认真对付陈锋。', episodes: [] },
    { blockNo: 4, label: '第四幕：终局收网', startEpisode: 16, endEpisode: 20, summary: '陈锋收集完所有证据，在张子豪父亲的六十大寿宴上当众翻牌，张子豪败亡。', episodes: [] }
  ],
  facts: [
    { id: 'fact-001', label: '陈锋被张子豪当众羞辱', description: '在餐厅被张子豪泼酒、扇耳光、骂废物', linkedToPlot: true, linkedToTheme: true, authorityType: 'user_declared', originAuthorityType: 'user_declared', originDeclaredBy: 'user', status: 'confirmed', level: 'core', declaredBy: 'user', declaredStage: 'outline', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'fact-002', label: '陈锋有隐藏技能', description: '曾在特种部队服役，有侦察和格斗能力', linkedToPlot: true, linkedToTheme: true, authorityType: 'user_declared', originAuthorityType: 'user_declared', originDeclaredBy: 'user', status: 'confirmed', level: 'core', declaredBy: 'user', declaredStage: 'outline', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'fact-003', label: '张子豪经营灰色生意', description: '利用家族企业做非法借贷和洗钱', linkedToPlot: true, linkedToTheme: true, authorityType: 'user_declared', originAuthorityType: 'user_declared', originDeclaredBy: 'user', status: 'confirmed', level: 'core', declaredBy: 'user', declaredStage: 'outline', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'fact-004', label: '王涛是陈锋的老战友', description: '在本地开装修公司，有资源和信息渠道', linkedToPlot: true, linkedToTheme: false, authorityType: 'user_declared', originAuthorityType: 'user_declared', originDeclaredBy: 'user', status: 'confirmed', level: 'mid', declaredBy: 'user', declaredStage: 'outline', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ]
}

const characterDrafts: CharacterDraftDto[] = [
  {
    name: '陈锋', biography: '35岁，外卖员。前特种部队侦察兵，五年前因伤退役。为人低调隐忍，但骨子里有血性。母亲患重病需要医药费。', publicMask: '普通外卖员，懦弱好欺负', hiddenPressure: '母亲的医药费快断了，自己又被开除', fear: '母亲因没钱治病而去世', protectTarget: '母亲', conflictTrigger: '张子豪的持续打压', advantage: '侦察兵出身的观察力和格斗能力，外卖行业积累的信息和人脉', weakness: '表面实力太弱，被社会看不起', goal: '赚到母亲的医药费，夺回尊严', arc: '从隐忍装弱到亮出底牌正面反击', appearance: '普通身材，眼神锐利', personality: '隐忍、聪明、记仇、重情义', identity: '外卖员 / 前特种兵', values: '尊严无价，母亲重于一切', plotFunction: 'protagonist', depthLevel: 'core', roleLayer: 'core'
  },
  {
    name: '张子豪', biography: '28岁，富二代。父亲是本地最大建材商张建国。表面经营一家装修公司，实际做非法借贷和洗钱。嚣张跋扈，以为有钱就能摆平一切。', publicMask: '年轻有为的企业家', hiddenPressure: '父亲的生意有大量灰色地带，一旦被查就是刑事犯罪', fear: '身败名裂、被父亲放弃', protectTarget: '自己的财富和社会地位', conflictTrigger: '陈锋不肯低头、开始反击', advantage: '有钱有势，老爸的关系网，随时可以叫人打陈锋', weakness: '看不起底层人，低估陈锋的真实能力', goal: '让陈锋彻底消失在自己面前', arc: '从嚣张到恐慌到身败名裂', appearance: '西装革履，目中无人', personality: '嚣张、阴险、欺软怕硬', identity: '装修公司老板 / 富二代', values: '钱就是一切', plotFunction: 'antagonist', depthLevel: 'core', roleLayer: 'core'
  },
  {
    name: '王涛', biography: '38岁，陈锋的老战友，在同一部队服役。退伍后开了家装修公司，在本地有广泛人脉。为人仗义，重战友情。', publicMask: '本地装修公司老板', hiddenPressure: '公司规模小，得罪不起张子豪这样的地头蛇', fear: '帮陈锋会连累自己的公司和家人', protectTarget: '陈锋', conflictTrigger: '陈锋被张子豪逼到绝路', advantage: '本地人脉广，认识装修行业各路人', weakness: '公司实力有限，不敢正面硬抗张家', goal: '帮陈锋的同时保住自己的公司', arc: '从犹豫到全力支持老战友', appearance: '健壮，穿着工装', personality: '仗义、谨慎、务实', identity: '装修公司老板', values: '战友情义重于利益', plotFunction: 'ally', depthLevel: 'mid', roleLayer: 'active'
  },
  {
    name: '林雪', biography: '26岁，陈锋前女友。被张子豪用钱和承诺撬走，后来发现张子豪只是玩弄她，开始后悔。', publicMask: '张子豪的女友', hiddenPressure: '发现自己只是张子豪炫耀的战利品', fear: '自己在张家无足轻重，随时可以被丢掉', protectTarget: '自己', conflictTrigger: '张子豪对她的态度越来越差', advantage: '知道张子豪的一些私人秘密', weakness: '贪慕虚荣，犹豫不决', goal: '找一个能真正对自己好的人', arc: '从背叛到醒悟到暗中帮助陈锋', appearance: '漂亮，打扮时尚', personality: '虚荣但良心未泯', identity: '无业', values: '被爱和安全感', plotFunction: 'love_interest', depthLevel: 'mid', roleLayer: 'active'
  },
  {
    name: '陈母', biography: '60岁，退休工人。患慢性肾病，需要长期透析。是陈锋唯一的亲人，也是他奋斗的最大动力。', publicMask: '慈祥的老母亲', hiddenPressure: '知道儿子为了自己的医药费受了很多委屈', fear: '成为儿子的拖累', protectTarget: '儿子陈锋', conflictTrigger: '病情恶化需要更多医药费', advantage: '在社区有好人缘', weakness: '身体差，需要长期治疗', goal: '希望儿子能过上好日子', arc: '从病弱到看到儿子站起来', appearance: '瘦弱，面容慈祥', personality: '坚韧、善良、不多话', identity: '退休工人', values: '家人平安', plotFunction: 'supporting', depthLevel: 'mid', roleLayer: 'active'
  }
]

const STORY_BEATS: string[] = [
  '陈锋在餐厅被张子豪泼酒羞辱，林雪当场分手。',  // 1
  '陈锋被公司开除，发现租房被张子豪收回。',  // 2
  '陈锋母亲住院急需医药费，王涛借给他钱。',  // 3
  '陈锋跑外卖时发现张子豪的灰色生意。',  // 4
  '张子豪派人警告陈锋不要多管闲事。',  // 5
  '陈锋在顶层餐厅送餐时偷听到张子豪的生意内幕。',  // 6
  '王涛介绍陈锋认识一个被张家坑过的供应商。',  // 7
  '陈锋拿到第一份证据——张子豪偷税漏税的账单。',  // 8
  '张子豪发现陈锋在查他，派人砸了王涛的装修公司。',  // 9
  '陈锋用侦察兵技能潜入张家办公室，拍下账本。',  // 10
  '张子豪报警抓陈锋，陈锋当众亮出部分证据自保。',  // 11
  '张子豪父亲张建国开始关注这件事，给张子豪施压。',  // 12
  '陈锋在送外卖时被张子豪的人围堵，凭格斗技能脱身。',  // 13
  '林雪被张子豪冷暴力，开始暗中联系陈锋。',  // 14
  '陈锋把所有证据整理成册，林雪提供关键信息。',  // 15
  '张子豪绑架陈母逼陈锋交出证据。',  // 16
  '陈锋用计让张子豪的人内讧，救出母亲。',  // 17
  '张子豪的父亲发现儿子闯了大祸，断绝关系。',  // 18
  '陈锋在张建国六十大寿宴上公开所有证据。',  // 19
  '张子豪被警方带走，陈锋获得社会尊重和赔偿。'  // 20
]

const episodeBeats = STORY_BEATS.map((summary, index) => ({
  episodeNo: index + 1,
  summary,
  sceneByScene: [
    { sceneNo: index * 3 + 1, location: index % 2 === 0 ? '餐厅' : '街头', timeOfDay: index % 3 === 0 ? '白天' : '夜晚', setup: '冲突开场', tension: '施压', hookEnd: '悬念' },
    { sceneNo: index * 3 + 2, location: '室内', timeOfDay: index % 2 === 1 ? '白天' : '夜晚', setup: '升级', tension: '交锋', hookEnd: '反转' },
    { sceneNo: index * 3 + 3, location: index % 2 === 0 ? '车内' : '家中', timeOfDay: '夜晚', setup: '收束', tension: '回响', hookEnd: '下一集钩子' }
  ]
}))

const detailedOutlineBlocks: DetailedOutlineBlockDto[] = [
  { blockNo: 1, startEpisode: 1, endEpisode: 5, summary: '陈锋被打入谷底', episodeBeats: episodeBeats.slice(0, 5) },
  { blockNo: 2, startEpisode: 6, endEpisode: 10, summary: '暗线收集证据', episodeBeats: episodeBeats.slice(5, 10) },
  { blockNo: 3, startEpisode: 11, endEpisode: 15, summary: '正面交锋', episodeBeats: episodeBeats.slice(10, 15) },
  { blockNo: 4, startEpisode: 16, endEpisode: 20, summary: '终局收网', episodeBeats: episodeBeats.slice(15, 20) }
]

const detailedOutlineSegments: DetailedOutlineSegmentDto[] = [
  {
    act: 1,
    content: '第一幕：陈锋被张子豪打入谷底，失去工作、住房和女友。此时陈锋有隐藏技能（前特种兵侦察兵），但尚未暴露。',
    hookType: '逆境反转',
    episodeBeats: episodeBeats.slice(0, 5)
  },
  {
    act: 2,
    content: '第二幕：陈锋利用外卖员身份渗透张子豪的商业圈，暗中收集证据。王涛是陈锋的老战友，在本地开装修公司，提供信息和支援。',
    hookType: '暗线布局',
    episodeBeats: episodeBeats.slice(5, 10)
  },
  {
    act: 3,
    content: '第三幕：陈锋与张子豪正面交锋，互设圈套。陈锋开始使用前特种兵的侦察技能（隐藏技能），王涛持续提供支援。',
    hookType: '正面冲突',
    episodeBeats: episodeBeats.slice(10, 15)
  },
  {
    act: 4,
    content: '第四幕：陈锋在张家寿宴公开证据，张子豪身败名裂。陈锋的隐藏技能和老战友王涛的支援是最终翻盘的关键。',
    hookType: '大局收网',
    episodeBeats: episodeBeats.slice(15, 20)
  }
]

async function main(): Promise<void> {
  console.log('=== 回归测试：男频都市逆袭 20 集 ===')
  console.log(`时间: ${new Date().toISOString()}`)

  const runtimeConfig = loadRuntimeProviderConfig()
  if (!hasValidApiKey(runtimeConfig)) {
    console.error('错误: 没有可用的 AI API Key')
    process.exit(1)
  }

  const plan = buildScriptGenerationExecutionPlan(
    { storyIntent, outline: outlineDraft, characters: characterDrafts, segments: detailedOutlineSegments, detailedOutlineBlocks, script: [] },
    { mode: 'fresh_start', targetEpisodes: TARGET_EPISODES }
  )

  if (!plan.ready) {
    console.error('错误: 执行计划未就绪')
    console.error('blockedBy:', JSON.stringify(plan.blockedBy, null, 2))
    console.error('episodePlans:', JSON.stringify(plan.episodePlans?.slice(0, 2), null, 2))
    process.exit(1)
  }

  console.log(`执行计划: ready=${plan.ready}, target=${plan.targetEpisodes}, batchSize=${plan.runtimeProfile.recommendedBatchSize}`)

  const initialBoard = createInitialProgressBoard(plan, null)

  const generationInput: StartScriptGenerationInputDto = {
    projectId: PROJECT_ID,
    plan,
    outlineTitle: outlineDraft.title,
    theme: storyIntent.sellingPremise || '',
    mainConflict: storyIntent.coreConflict || '',
    charactersSummary: characterDrafts.map((c) => c.name),
    storyIntent,
    scriptControlPackage: plan.scriptControlPackage,
    outline: outlineDraft,
    characters: characterDrafts,
    segments: detailedOutlineSegments,
    detailedOutlineBlocks,
    existingScript: []
  }

  const startTime = Date.now()
  const progressLog: Array<{ phase: string; detail: string; timestamp: number }> = []

  try {
    const result = await startScriptGeneration(
      generationInput, runtimeConfig, initialBoard,
      { outline: outlineDraft, characters: characterDrafts, existingScript: [] },
      {
        onProgress: (payload) => {
          const elapsed = Math.round((Date.now() - startTime) / 1000)
          progressLog.push({ phase: payload.phase, detail: payload.detail, timestamp: elapsed })
          console.log(`[${elapsed}s] ${payload.detail} (已生成 ${payload.generatedScenes.length} 集)`)
        }
      }
    )

    const totalTime = Math.round((Date.now() - startTime) / 1000)
    console.log(`\n=== 生成完成 ===`)
    console.log(`总耗时: ${totalTime}s`)
    console.log(`成功: ${result.generatedScenes.length}/${TARGET_EPISODES} 集`)

    // 保存剧本
    const scriptLines: string[] = ['# 男频都市逆袭 20 集剧本\n']
    for (const scene of result.generatedScenes) {
      scriptLines.push(`## 第 ${scene.sceneNo} 集\n`)
      scriptLines.push('```')
      scriptLines.push(scene.screenplay || '// 无剧本内容')
      scriptLines.push('```\n')
    }
    writeFileSync(resolve(process.cwd(), 'regression-output-male-urban.md'), scriptLines.join('\n'), 'utf-8')
    console.log(`剧本已保存`)

    // 保存质量数据
    const qualityData = {
      meta: { projectId: PROJECT_ID, targetEpisodes: TARGET_EPISODES, generatedEpisodes: result.generatedScenes.length, totalTimeSeconds: totalTime, generatedAt: new Date().toISOString(), marketProfile: storyIntent.marketProfile },
      postflight: result.postflight ?? null,
      ledger: result.ledger ?? null,
      failure: result.failure ?? null,
      progressLog
    }
    writeFileSync(resolve(process.cwd(), 'regression-output-male-quality.json'), JSON.stringify(qualityData, null, 2), 'utf-8')
    console.log(`质量报告已保存`)

    // 打印质量摘要
    const quality = result.postflight?.quality
    if (quality) {
      console.log(`\n=== 质量摘要 ===`)
      console.log(`  集数: ${quality.episodeCount}, 通过: ${quality.passedEpisodes}`)
      console.log(`  市场匹配度: ${quality.marketQualityScore ?? 'N/A'}`)
      console.log(`  信息密度: ${quality.informationDensityScore ?? 'N/A'}`)
      console.log(`  剧本格式: ${quality.screenplayFormatScore ?? 'N/A'}`)
      console.log(`  开局冲击: ${quality.openingShockScore ?? 'N/A'}`)
      console.log(`  金句密度: ${quality.punchlineDensityScore ?? 'N/A'}`)
      console.log(`  爽点兑现: ${quality.catharsisPayoffScore ?? 'N/A'}`)
      console.log(`  反派压迫: ${quality.villainOppressionQualityScore ?? 'N/A'}`)
      console.log(`  集尾留客: ${quality.hookRetentionScore ?? 'N/A'}`)
      console.log(`  弱集: ${quality.weakEpisodes.length} 集`)
    }

    process.exit(result.success ? 0 : 1)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`\n生成错误: ${msg}`)
    process.exit(1)
  }
}

main()
