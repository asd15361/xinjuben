/**
 * 回归测试：女频霸总甜宠 20 集生成
 *
 * 验证目标：
 * 1. marketProfile 是否正确传入生成链路
 * 2. 女频质量评分是否合理
 * 3. 修稿链是否按低分定向修
 * 4. 剧本是否符合女频情感模型
 */

import { startScriptGeneration } from '../src/application/script-generation/start-script-generation.js'
import { buildScriptGenerationExecutionPlan } from '../src/application/script-generation/build-execution-plan.js'
import { createInitialProgressBoard } from '../src/application/script-generation/progress-board.js'
import { loadRuntimeProviderConfig, hasValidApiKey } from '../src/infrastructure/runtime-env/provider-config.js'
import type { StartScriptGenerationInputDto } from '../src/shared/contracts/script-generation.js'
import type { OutlineDraftDto, CharacterDraftDto, DetailedOutlineSegmentDto, DetailedOutlineBlockDto } from '../src/shared/contracts/workflow.js'
import type { StoryIntentPackageDto } from '../src/shared/contracts/intake.js'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

const PROJECT_ID = 'regression-test-female-ceo-2026-04-24'
const TARGET_EPISODES = 20

const storyIntent: StoryIntentPackageDto = {
  genre: '都市甜宠',
  subGenre: '女频霸总',
  coreConflict: '服装设计师苏晚晴被未婚夫陈宇辉和继妹联手背叛，在事业和感情上双重受创。总裁陆景琛出手相助，但苏晚晴不愿意只做被保护的金丝雀，她要靠自己的设计能力站起来。',
  sellingPremise: '一个被背叛的女设计师，在霸道总裁的庇护下，靠自己的才华和判断力重新找回事业和尊严。',
  protagonist: '苏晚晴',
  antagonist: '陈宇辉',
  protagonistCoreDrive: '证明自己的能力，不靠男人也能成功',
  antagonistPressure: '陈宇辉联合苏晚晴的继妹苏雨欣，不断窃取她的设计、诋毁她的名声',
  emotionalPromise: '每一集都要让女主有情绪起伏，从委屈到坚强，从依赖到独立，让观众共情',
  moralPremise: '真正的强大不是被保护，而是被保护时有自己的判断，失去保护时能自己站起来',
  tone: '细腻、情感饱满、关系拉扯有张力',
  pacing: '每集3场，情感开场，冲突升级，情绪收尾',
  worldbuildingNotes: '2026年都市，时尚设计行业。高级定制工作室、时装秀、商务宴请等场景',
  tags: ['霸总', '甜宠', '设计', '背叛', '成长', '独立女性'],
  format: { episodes: 20, durationMinutes: 3, scenesPerEpisode: 3 },
  targetAudience: '20-35岁女性，喜欢甜宠兼有独立女主',
  comparableWorks: ['何以笙箫默', '你是我的荣耀'],
  marketProfile: {
    audienceLane: 'female',
    subgenre: '女频霸总甜宠'
  },
  protagonistArc: {
    startingPosition: '被未婚夫和继妹联手背叛，事业感情双失',
    transformation: '从依赖关系到靠设计能力独立，从被动接受到主动选择',
    endingPosition: '成为独立设计师，与陆景琛站在平等位置相爱'
  },
  antagonistArc: {
    startingPosition: '表面完美的未婚夫，暗中早已背叛',
    endingPosition: '真面目被揭穿，失去一切'
  }
}

const outlineDraft: OutlineDraftDto = {
  title: '晚晴如你',
  genre: '都市甜宠',
  theme: '被背叛的女设计师在霸总帮助下找回自我、成就事业',
  mainConflict: '苏晚晴被陈宇辉和苏雨欣联手窃取设计、诋毁名声，同时要平衡对陆景琛的依赖和自己的独立',
  protagonist: '苏晚晴',
  summary: '服装设计师苏晚晴在被未婚夫和继妹背叛后，遇到总裁陆景琛。陆景琛给了她平台和资源，但苏晚晴坚持靠自己的设计说话。她在事业上不断突破，同时和陈宇辉的阴谋对抗，最终成为独立设计师，与陆景琛平等相爱。',
  planningUnitEpisodes: 20,
  summaryEpisodes: Array.from({ length: TARGET_EPISODES }, (_, i) => ({
    episodeNo: i + 1,
    summary: `第${i + 1}集概要占位`
  })),
  outlineBlocks: [
    { blockNo: 1, label: '第一幕：背叛与相遇', startEpisode: 1, endEpisode: 5, summary: '苏晚晴发现未婚夫和继妹的背叛，伤心之时遇到陆景琛。', episodes: [] },
    { blockNo: 2, label: '第二幕：重新站起来', startEpisode: 6, endEpisode: 10, summary: '苏晚晴进入陆氏集团设计部，用实力证明自己，但陈宇辉不断使绊。', episodes: [] },
    { blockNo: 3, label: '第三幕：风雨考验', startEpisode: 11, endEpisode: 15, summary: '苏晚晴的设计被窃取，她的名声受损。陆景琛出手相助，但苏晚晴坚持自己解决。', episodes: [] },
    { blockNo: 4, label: '第四幕：真相与选择', startEpisode: 16, endEpisode: 20, summary: '陈宇辉的真面目被揭穿，苏晚晴在时装秀上大放异彩，与陆景琛平等相爱。', episodes: [] }
  ],
  facts: [
    { id: 'fact-001', label: '陈宇辉和苏雨欣联手背叛苏晚晴', description: '陈宇辉在订婚宴当天失联，和苏雨欣在一起，两人暗中窃取苏晚晴的设计', linkedToPlot: true, linkedToTheme: true, authorityType: 'user_declared', originAuthorityType: 'user_declared', originDeclaredBy: 'user', status: 'confirmed', level: 'core', declaredBy: 'user', declaredStage: 'outline', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'fact-002', label: '陆景琛出手相助苏晚晴', description: '陆景琛在苏晚晴最困难的时候提供工作室和资源', linkedToPlot: true, linkedToTheme: true, authorityType: 'user_declared', originAuthorityType: 'user_declared', originDeclaredBy: 'user', status: 'confirmed', level: 'core', declaredBy: 'user', declaredStage: 'outline', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'fact-003', label: '苏晚晴有真正的设计才华', description: '她的设计曾在国际比赛中获奖，是她真正的核心竞争力', linkedToPlot: true, linkedToTheme: true, authorityType: 'user_declared', originAuthorityType: 'user_declared', originDeclaredBy: 'user', status: 'confirmed', level: 'core', declaredBy: 'user', declaredStage: 'outline', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'fact-004', label: '苏雨欣嫉妒苏晚晴', description: '继妹苏雨欣一直嫉妒苏晚晴的才华和陆景琛对苏晚晴的关注', linkedToPlot: true, linkedToTheme: false, authorityType: 'user_declared', originAuthorityType: 'user_declared', originDeclaredBy: 'user', status: 'confirmed', level: 'mid', declaredBy: 'user', declaredStage: 'outline', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ]
}

const characterDrafts = [
  {
    name: '苏晚晴', biography: '28岁，服装设计师。曾在国际设计比赛中获奖。性格温柔但有骨气，不愿意依靠男人。被未婚夫和继妹背叛后，一度陷入低谷，但靠设计才华重新站起来。', publicMask: '温柔知性的设计师', hiddenPressure: '被最信任的两个人背叛，怀疑自己的判断力', fear: '自己不够好，永远只是别人的附属品', protectTarget: '自己的设计作品和职业尊严', conflictTrigger: '陈宇辉和苏雨欣的持续打压', advantage: '真正的设计才华，对美的敏锐感知', weakness: '太容易相信别人，心软', goal: '成为独立的设计师，证明自己的能力', arc: '从依赖到独立，从受伤到强大', appearance: '清秀优雅，有艺术气质', personality: '温柔坚韧、有原则、重感情', identity: '服装设计师', values: '独立、真诚、才华', plotFunction: 'protagonist', depthLevel: 'core', roleLayer: 'core'
  },
  {
    name: '陆景琛', biography: '32岁，陆氏集团总裁。表面冷峻不苟言笑，内心其实重情重义。曾与苏晚晴有过一段短暂的相识，一直记得她。在苏晚晴最困难时出手相助，但尊重她的独立。', publicMask: '冷峻的总裁，不近人情', hiddenPressure: '作为一个大集团的总裁，不能让私人感情影响商业决策', fear: '利用自己的地位让苏晚晴感到压力', protectTarget: '苏晚晴', conflictTrigger: '陈宇辉对苏晚晴的背叛', advantage: '有资源和地位，但更尊重苏晚晴的选择', weakness: '不擅表达感情', goal: '保护苏晚晴，但更希望看到她独立成长', arc: '从默默守护到勇敢表达', appearance: '高大英俊，气质冷峻', personality: '外冷内热、沉稳、尊重女性', identity: '陆氏集团总裁', values: '信守承诺、尊重', plotFunction: 'ally', depthLevel: 'core', roleLayer: 'active'
  },
  {
    name: '陈宇辉', biography: '30岁，苏晚晴前未婚夫。表面温文尔雅的商人，实际利益至上。为了苏家的财产和事业，选择了和苏雨欣联手。', publicMask: '温文尔雅的未婚夫', hiddenPressure: '自己的事业遇到瓶颈，需要苏家的资源', fear: '失去苏家这条线', protectTarget: '自己的事业', conflictTrigger: '苏晚晴开始独立，不受控制', advantage: '了解苏晚晴的设计风格和弱點', weakness: '急功近利，没有底線', goal: '窃取苏晚晴的设计，为自己谋利', arc: '从伪君子到真面目暴露', appearance: '斯文，戴眼镜', personality: '虚伪、自私、算计', identity: '商人', values: '利益至上', plotFunction: 'antagonist', depthLevel: 'core', roleLayer: 'core'
  },
  {
    name: '苏雨欣', biography: '25岁，苏晚晴的继妹。一直嫉妒姐姐的才华和陆景琛对苏晚晴的关注。为了得到陆景琛的注意，和陈宇辉联手陷害苏晚晴。', publicMask: '乖巧的妹妹', hiddenPressure: '活在姐姐的阴影下，永远被比较', fear: '永远比不上苏晚晴', protectTarget: '自己在家里的地位', conflictTrigger: '陆景琛对苏晚晴的关注', advantage: '了解苏晚晴的生活习惯和设计习惯', weakness: '嫉妒心强，判断力差', goal: '取代苏晚晴的位置', arc: '从装乖到真面目暴露', appearance: '漂亮但眼神闪躲', personality: '虚荣、善妒、表面乖巧', identity: '无业', values: '被关注和认可', plotFunction: 'antagonist', depthLevel: 'mid', roleLayer: 'active'
  },
  {
    name: '林姐', biography: '45岁，陆氏集团设计部总监。严厉但公平，是苏晚晴职业生涯中的贵人。最初对苏晚晴的能力有怀疑，看到她的作品后全力支持。', publicMask: '严厉的女上司', hiddenPressure: '设计部业绩压力大，需要真正有才华的设计师', fear: '看错人，招到没有真才实学的关系户', protectTarget: '设计部的声誉', conflictTrigger: '陆景琛推荐苏晚晴进入设计部', advantage: '行业经验丰富，人脉广', weakness: '嘴硬心软', goal: '培养出真正优秀的设计师', arc: '从怀疑到全力支持', appearance: '干练的中年女性', personality: '严厉、公正、识才', identity: '设计部总监', values: '才华胜于关系', plotFunction: 'supporting', depthLevel: 'mid', roleLayer: 'active'
  }
]

const STORY_BEATS: string[] = [
  '苏晚晴在订婚宴当天发现陈宇辉和苏雨欣在一起，当场崩溃。',  // 1
  '苏晚晴的设计稿被苏雨欣偷走，陈宇辉宣布与苏雨欣订婚。',  // 2
  '陆景琛在咖啡厅偶遇失落的苏晚晴，认出她是当年的设计新秀。',  // 3
  '陆景琛提供工作室，苏晚晴犹豫后接受，决定重新开始。',  // 4
  '苏晚晴的第一批设计在工作室完成，陈宇辉派人打探。',  // 5
  '陆景琛推荐苏晚晴进入陆氏设计部，林姐面试后认可。',  // 6
  '陈宇辉窃取苏晚晴的新设计，抢先发布。',  // 7
  '苏晚晴被质疑抄袭，陆景琛相信她并暗中调查。',  // 8
  '苏晚晴熬夜重新设计，在内部展示会上打动林姐。',  // 9
  '苏雨欣在陆景琛面前假装受伤，挑拨他和苏晚晴的关系。',  // 10
  '苏晚晴的关键设计再次被泄露，公司内部开始怀疑她。',  // 11
  '苏晚晴主动要求内部调查，陆景琛支持她的决定。',  // 12
  '陆景琛查到陈宇辉和苏雨欣的证据，但没有直接出手。',  // 13
  '苏晚晴用自己的方式设局，让窃密者自己暴露。',  // 14
  '陈宇辉的阴谋被揭穿一部分，但他还有后手。',  // 15
  '时装秀在即，苏晚晴的设计再次被盗。',  // 16
  '苏晚晴亮出压箱底的作品——完全不同的系列，震惊全场。',  // 17
  '陆景琛公开陈宇辉和苏雨欣的全部证据，两人身败名裂。',  // 18
  '时装秀大获成功，苏晚晴成为独立设计师品牌创始人。',  // 19
  '苏晚晴和陆景琛在颁奖晚会上坦诚相对，平等相爱。'  // 20
]

const episodeBeats = STORY_BEATS.map((summary, index) => ({
  episodeNo: index + 1,
  summary,
  sceneByScene: [
    { sceneNo: index * 3 + 1, location: index % 2 === 0 ? '工作室' : '办公室', timeOfDay: index % 3 === 0 ? '白天' : '夜晚', setup: '情感开场', tension: '冲突', hookEnd: '悬念' },
    { sceneNo: index * 3 + 2, location: '陆氏大厦', timeOfDay: index % 2 === 1 ? '白天' : '夜晚', setup: '冲突升级', tension: '交锋', hookEnd: '反转' },
    { sceneNo: index * 3 + 3, location: index % 2 === 0 ? '家中' : '餐厅', timeOfDay: '夜晚', setup: '情绪收束', tension: '关系拉扯', hookEnd: '下一集钩子' }
  ]
}))

const detailedOutlineBlocks: DetailedOutlineBlockDto[] = [
  { blockNo: 1, startEpisode: 1, endEpisode: 5, summary: '背叛与重新开始', episodeBeats: episodeBeats.slice(0, 5) },
  { blockNo: 2, startEpisode: 6, endEpisode: 10, summary: '职场立足', episodeBeats: episodeBeats.slice(5, 10) },
  { blockNo: 3, startEpisode: 11, endEpisode: 15, summary: '危机与信任', episodeBeats: episodeBeats.slice(10, 15) },
  { blockNo: 4, startEpisode: 16, endEpisode: 20, summary: '真相与新起点', episodeBeats: episodeBeats.slice(15, 20) }
]

const detailedOutlineSegments = [
  { act: 1, content: '苏晚晴被背叛，遇到陆景琛，获得工作室重新开始', hookType: '绝境重生', episodeBeats: episodeBeats.slice(0, 5) },
  { act: 2, content: '苏晚晴在陆氏设计部证明自己，陈宇辉不断使绊', hookType: '职场逆袭', episodeBeats: episodeBeats.slice(5, 10) },
  { act: 3, content: '设计泄露危机，苏晚晴与陆景琛的关系经历考验', hookType: '信任考验', episodeBeats: episodeBeats.slice(10, 15) },
  { act: 4, content: '时装秀大获成功，真相大白，平等相爱', hookType: '事业爱情双丰收', episodeBeats: episodeBeats.slice(15, 20) }
]

async function main(): Promise<void> {
  console.log('=== 回归测试：女频霸总甜宠 20 集 ===')
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
    charactersSummary: characterDrafts.map((c: any) => c.name),
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

    // 保存剧本
    const scriptLines: string[] = ['# 女频霸总甜宠 20 集剧本\n']
    for (const scene of result.generatedScenes) {
      scriptLines.push(`## 第 ${scene.sceneNo} 集\n`)
      scriptLines.push('```')
      scriptLines.push(scene.screenplay || '// 无剧本内容')
      scriptLines.push('```\n')
    }
    writeFileSync(resolve(process.cwd(), 'regression-output-female-ceo.md'), scriptLines.join('\n'), 'utf-8')
    console.log(`剧本已保存`)

    // 保存质量数据
    const qualityData = {
      meta: { projectId: PROJECT_ID, targetEpisodes: TARGET_EPISODES, generatedEpisodes: result.generatedScenes.length, totalTimeSeconds: totalTime, generatedAt: new Date().toISOString(), marketProfile: storyIntent.marketProfile },
      postflight: result.postflight ?? null,
      ledger: result.ledger ?? null,
      failure: result.failure ?? null,
      progressLog
    }
    writeFileSync(resolve(process.cwd(), 'regression-output-female-quality.json'), JSON.stringify(qualityData, null, 2), 'utf-8')
    console.log(`质量报告已保存`)

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
