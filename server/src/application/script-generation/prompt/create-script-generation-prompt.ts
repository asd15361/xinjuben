/**
 * src/main/application/script-generation/prompt/create-script-generation-prompt.ts
 *
 * CURRENT PRODUCTION ENTRY for episode-level script generation prompt.
 * This is the official prompt builder used by run-script-generation-batch.
 *
 * Production path:
 * run-script-generation-batch -> create-script-generation-prompt -> parse-generated-scene -> finalize-script-postflight
 *
 * Scene-level alternatives (create-scene-generation-prompt.ts in this folder, assemble-episode-scenes.ts)
 * remain prototype-only and are NOT part of this production chain.
 *
 * REVISION LOG (2026-04-07):
 * - buildStoryContractLandingLines: DELETED — theme/arc judging belongs to arc_control_agent, not first draft
 * - buildFormalFactPromptBlock: REMOVED from prompt output — worldview narration belongs to world, not first draft
 * - buildEpisodePromptGuidance: REMOVED from prompt output — general direction belongs to control card, not first draft
 * - renderStoryContractPromptBlock (full): REMOVED from non-compact output — only compact version remains
 * - renderCompactStoryContractPromptBlock: KEPT — lightweight anchor only, not a judge
 * - ledger blocks in non-compact: DOWNGRADED to compact version — ledger is context, not a mandate
 * - "DELEGATED TO" comment block: PHYSICALLY DELETED
 */
import type {
  CharacterDraftDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '@shared/contracts/workflow'
import type { StartScriptGenerationInputDto } from '@shared/contracts/script-generation'
import {
  EPISODE_CHAR_COUNT_MAX,
  EPISODE_CHAR_COUNT_MIN
} from '@shared/domain/workflow/contract-thresholds'
import { resolveEpisodeControlCardFromPackage } from '@shared/domain/script-generation/script-control-package'
import { renderShortDramaConstitutionPromptBlock } from '@shared/domain/short-drama/short-drama-constitution'
import { buildScriptBatchContext } from '@shared/domain/workflow/planning-blocks'
import {
  buildCompactedCharacterBlock,
  buildCompactedSegmentBlock,
  buildCompactedStoryIntentBlock
} from './compact-script-context'
import {
  buildKnowledgeBoundaryBlock,
  buildLedgerAssertionBlock,
  buildLedgerConstraintBlock
} from './build-ledger-prompt-blocks'
import { buildScriptStateLedger } from '../ledger/build-script-ledger'
import { buildEpisodeSceneDirectives } from './build-episode-scene-directives'
import { buildSceneProgressionDirectives } from './build-scene-progression-directives'

// ============================================================================
// FIRST DRAFT EXECUTION CONSTANTS
// These are the ONLY rules the first-draft executor is responsible for.
// Everything else is delegated to its respective Agent (episode_engine / arc_control / emotion_lane).
// ============================================================================

const SCREENPLAY_RESULT_LANDING_RULE =
  '每场最后一条△动作或最后一句对白，必须落在具体可见的结果上（做了┄/倒下┄/说出┄/抓住┄/被按住┄/门已被撞开┄）；禁止停在"有┄/感到┄/开始┄/有种┄/是┄"这类开放性句式。如果最后只是展示动作（抬手/摊开/展示），必须补上该动作的即时后果。'

const SCREENPLAY_EMOTION_RULE =
  '情绪只能藏在△动作、对白语气和人物当场反应里，不要另起一行写情绪总结，不要写"人物情绪："或"他此刻很痛苦"这类裁判句。'

const SCREENPLAY_ANTI_BLOAT_RULE =
  '同一场只保留能改变局势的关键动作和关键对白；同类动作、同义威胁、同一情绪反应不准换句重复写。'

const SCREENPLAY_CONCISE_LINE_RULE =
  '动作句一行只写一个关键动作，优先 8-20 字；单场默认 6-10 行正文，超了就删掉重复动作、缩短对白或切场。对白能短就短，优先 4-14 字，能一句顶回去就别写成长段解释。'

const SCREENPLAY_NO_VO_RULE =
  '不要写画外音、旁白、OS；对白行里不准出现（画外音/旁白/OS），人物栏里没出现的人也不准隔空说话。门外/窗外/台阶下/身后的声音，一律先写成△门外传来某人的喊声或脚步声，等人物真正冲进场再让他开口。'

const SCREENPLAY_NO_VO_EXAMPLE_RULE =
  '反例：李科：（画外音）让他进来。正例：△堂内传来李科的声音："让他进来。" 反例：小柔：（画外音）黎明！正例：△门外突然传来小柔的喊声："黎明！"'

const SCREENPLAY_NO_OFFSCREEN_DIALOGUE_RULE =
  '凡是写成"角色名：对白"的句子，这个角色必须已经在本场人物表里、并且身体已经到场；还没进场的人只能先写成△门外传来他的喊声："……"，绝不准偷写成正式对白行。'

const SCREENPLAY_FINAL_RUN_COMPRESSION_RULE =
  '每场只准完成一个推进回合：起手压进来 -> 反应/变招 -> 结果落地，然后立刻切场；同一场不准连续写第二轮追打、第三次翻转、第四段解释。'

const SCREENPLAY_FINAL_RUN_LENGTH_RULE =
  '每场正文尽量压在 8-12 行内；超过 12 行时，优先删重复动作、重复威胁、重复解释和第二次同义逼问，不要把一场写成三场连打。'

const SCREENPLAY_SEASON_END_RULE =
  '末集余波优先留在人际站位、职责变化、证据外流、伤势代价和旧账未清；不要临时抬出更大怪物、更高封印层或新世界秘密来抢走本批次终点。'

const SCREENPLAY_FINAL_OPENING_RULE =
  '末集第一场必须从上一集留下的伤势、血契、碎钥匙、残党动作或未完追压起手，不准从宗门合议、代表宣判、卷轴宣读、长老落锤或侧殿静室听处分开场。'

const SCREENPLAY_NO_NEW_TAKEOVER_RULE =
  '末两集不准临时引入新角色名号接管尾声；余波只能落在已出现人物和旧账上。'

const SCREENPLAY_INSTITUTION_PASSING_RULE =
  '程序场必须出现时，只准做过门：收证、定时限、转身离场。做完这一步马上退场，不准围着它来回对质三轮。'

const FIRST_DRAFT_EPISODE_TARGET = {
  goal: 1000,
  min: 900,
  max: 1200,
  bySceneCount: {
    2: { perSceneMin: 450, perSceneMax: 600, totalMin: 900, totalMax: 1200 },
    3: { perSceneMin: 300, perSceneMax: 380, totalMin: 900, totalMax: 1140 },
    4: { perSceneMin: 220, perSceneMax: 280, totalMin: 880, totalMax: 1120 }
  }
} as const

function buildEpisodeCharContractLine(): string {
  return `【字数合同】全集硬红线 ${EPISODE_CHAR_COUNT_MIN}-${EPISODE_CHAR_COUNT_MAX} 字。首稿只负责先写出稳定可修稿，不追求一次把所有工艺都写满；执行目标直接按 ${FIRST_DRAFT_EPISODE_TARGET.goal} 字左右收，尽量控制在 ${FIRST_DRAFT_EPISODE_TARGET.min}-${FIRST_DRAFT_EPISODE_TARGET.max} 字。每场参考靶子：2场集每场 ${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[2].perSceneMin}-${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[2].perSceneMax} 字；3场集每场 ${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[3].perSceneMin}-${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[3].perSceneMax} 字；4场集每场 ${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[4].perSceneMin}-${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[4].perSceneMax} 字。低于 ${EPISODE_CHAR_COUNT_MIN} 后续会补厚，超过 ${EPISODE_CHAR_COUNT_MAX} 后续会压缩；首稿阶段先保住冲突、场次和承接，不要为了凑满工艺把单场写胖。`
}

const SCREENPLAY_PER_SCENE_HARD_CONTRACT = `【单场字数靶子】正式硬红线还是整集 ${EPISODE_CHAR_COUNT_MIN}-${EPISODE_CHAR_COUNT_MAX} 字。为了减少返工，2场集每场参考 ${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[2].perSceneMin}-${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[2].perSceneMax} 字；3场集每场参考 ${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[3].perSceneMin}-${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[3].perSceneMax} 字；4场集每场参考 ${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[4].perSceneMin}-${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[4].perSceneMax} 字。场数少就每场写得更实，场数多就少废话、快落结果。字数不够就加对手交锋、加当场反应、加结果落地；字数超了就删同义重复动作和同义重复对白，不准删实质冲突。每场至少 2 句硬对白，让双方都开口。`

const SCREENPLAY_ENDING_EPISODES_CONTRACT =
  '【末两集专属合同】末两集不准把 summary 句直接翻成剧本句，不准出现"待补/模板/伪剧本"污染。每场必须有：人物表、至少一条△动作、至少两句对白、末句必须是已发生结果。末两集每场只准完成一个推进回合，不准把两轮追打或两轮嘴仗叠在同一场。末集尾场必须落在残党盯梢、证据外泄、水潭异动、伤势反噬或旧账追上门，不准用制度结果收尾。'

const SCREENPLAY_FIRST_DRAFT_AGENT_FIRST_RULE =
  '【首稿定位】这一步只负责写出稳定首稿：先把场次、承接、冲突、结果写稳，不要试图一次兼顾所有人物弧光、主题点题和高级修辞。人物/主题/连续性如果还不够精，会交给后续 Agent 继续修。'

const SCREENPLAY_FIRST_DRAFT_MIN_DRAMA_RULE =
  '【最小戏剧密度】每场只做一轮有效推进：有人压进来 -> 有人应对/变招 -> 有一个可见结果落地，然后切场。每场至少保留 1 条有效△动作和 2 句有效对白；没有结果就不算这场成立。'

const SCREENPLAY_FIRST_DRAFT_BAN_RULE =
  '【首稿禁止事项】不要写画外音、旁白、OS、心理总结、分析句、策划词、占位词、Action/Dialogue/Emotion 旧标签；不要新增场、拆场、并场，也不要把一场写成三轮重复追打或重复逼问。'

type CurrentEpisodeBeat = NonNullable<
  NonNullable<StartScriptGenerationInputDto['segments']>[number]['episodeBeats']
>[number]

function clipPromptText(value: string | undefined, maxLength: number): string {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(12, maxLength - 1)).trim()}…`
}

function resolveCurrentEpisodeBeat(
  input: StartScriptGenerationInputDto,
  episodeNo: number
): CurrentEpisodeBeat | null {
  const fromSegments = (input.segments || [])
    .flatMap((segment) => segment.episodeBeats || [])
    .find((beat) => beat.episodeNo === episodeNo)
  const fromBlocks = (input.detailedOutlineBlocks || [])
    .flatMap((block) => [
      ...(block.episodeBeats || []),
      ...(block.sections || []).flatMap((section) => section.episodeBeats || [])
    ])
    .find((beat) => beat.episodeNo === episodeNo)

  return fromSegments || fromBlocks || null
}

function buildCurrentEpisodeTaskLines(
  input: StartScriptGenerationInputDto,
  episodeNo: number,
  includeSceneDetails: boolean
): string[] {
  const taskLines = [`【当前集任务】第 ${episodeNo} 集`]
  const currentBeat = resolveCurrentEpisodeBeat(input, episodeNo)

  const summaryEpisodes = input.outline?.summaryEpisodes || []
  const currentSummaryEpisode = summaryEpisodes.find((episode) => episode.episodeNo === episodeNo)

  if (!currentBeat) {
    if (currentSummaryEpisode?.summary?.trim()) {
      taskLines.push(`- 当前集摘要：${currentSummaryEpisode.summary.trim()}`)
      taskLines.push(
        '- 当前集未提供逐场细纲，禁止模型自行补全整季骨架；只能围绕本集摘要把这一集写实。'
      )
    } else {
      taskLines.push('- 当前集细纲待补，禁止模型自行补全整季骨架。')
    }
    return taskLines
  }

  taskLines.push(`- 当前集细纲：${currentBeat.summary || '待补'}`)

  // Scene details from segments.episodeBeats[].sceneByScene — always include when available
  const scenes = currentBeat.sceneByScene || []
  if (scenes.length > 0) {
    taskLines.push(
      `- 当前集已给出 ${scenes.length} 场 sceneByScene，必须严格写成 ${scenes.length} 场；不得新增场、拆场或补一场纯解释/疗伤/公审补充场。`
    )
    taskLines.push(
      `- 场号必须严格使用：${scenes.map((scene) => `${episodeNo}-${scene.sceneNo}`).join('、')}。`
    )
    for (const scene of scenes.slice(0, 4)) {
      taskLines.push(
        `- 第 ${scene.sceneNo} 场标题：${episodeNo}-${scene.sceneNo} ${scene.timeOfDay || '待补'}｜地点：${scene.location || '待补'}`
      )
      taskLines.push(`- 第 ${scene.sceneNo} 场 setup：${scene.setup || '待补'}`)
      taskLines.push(`- 第 ${scene.sceneNo} 场 tension：${scene.tension || '待补'}`)
      taskLines.push(`- 第 ${scene.sceneNo} 场 hookEnd：${scene.hookEnd || '待补'}`)
    }
    const budgetRule = buildSceneBudgetRule(scenes.length)
    taskLines.push('【场级字数预算】')
    taskLines.push(budgetRule)
    taskLines.push(buildEpisodeTotalBudgetRule())
  } else if (includeSceneDetails) {
    taskLines.push('- 当前集未提供逐场细纲；必须围绕摘要自主规划 2-4 场剧本结构。')
  }

  return taskLines
}

function buildEpisodeHookLandingLines(
  input: StartScriptGenerationInputDto,
  episodeNo: number
): string[] {
  const currentBeat = resolveCurrentEpisodeBeat(input, episodeNo)
  const scenes = currentBeat?.sceneByScene || []
  if (scenes.length === 0) return []

  const lastScene = scenes[scenes.length - 1]
  return [
    '【当集最后一场结果落点】',
    `- 最后一场：第 ${lastScene.sceneNo} 场`,
    `- 最后一场 tension：${lastScene.tension || '待补'}`,
    `- 最后一场 hookEnd：${lastScene.hookEnd || '待补'}`,
    '最后一句落到可见结果即可，不强求完美钩子。'
  ]
}

function buildShortDramaControlPackageLines(
  input: StartScriptGenerationInputDto,
  episodeNo: number
): string[] {
  const constitution =
    input.scriptControlPackage?.shortDramaConstitution || input.storyIntent?.shortDramaConstitution
  const controlCard =
    resolveEpisodeControlCardFromPackage(input.scriptControlPackage, episodeNo) ||
    resolveCurrentEpisodeBeat(input, episodeNo)?.episodeControlCard ||
    null
  if (!constitution && !controlCard) return []

  const lines: string[] = []

  if (constitution) {
    lines.push('【短剧创作宪法】')
    lines.push(renderShortDramaConstitutionPromptBlock(constitution))
  }

  if (controlCard) {
    lines.push('【当前集控制卡】')
    lines.push(`- episodeMission：${controlCard.episodeMission || '待补'}`)
    lines.push(`- openingBomb：${controlCard.openingBomb || '待补'}`)
    lines.push(`- conflictUpgrade：${controlCard.conflictUpgrade || '待补'}`)
    lines.push(`- arcBeat：${controlCard.arcBeat || '待补'}`)
    lines.push(`- emotionBeat：${controlCard.emotionBeat || '待补'}`)
    lines.push(`- hookLanding：${controlCard.hookLanding || '待补'}`)
    lines.push(`- povConstraint：${controlCard.povConstraint || '待补'}`)
    lines.push(
      `- forbiddenDrift：${
        controlCard.forbiddenDrift.length > 0 ? controlCard.forbiddenDrift.join('；') : '待补'
      }`
    )
  }

  lines.push('【控制包优先级】')
  lines.push('- 如果短剧创作宪法、当前集控制卡、sceneByScene 与其他散规则冲突，以这三层为准。')

  return lines
}

function buildSceneBudgetRule(sceneCount: number): string {
  switch (sceneCount) {
    case 2:
      return `本集 2 场时：每场参考 ${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[2].perSceneMin}-${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[2].perSceneMax} 字，首稿整集尽量落在 ${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[2].totalMin}-${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[2].totalMax} 字。先把每场一个推进回合写实，不要在同一场里叠第二轮追打、第二轮解释或第二轮制度对质。`
    case 3:
      return `本集 3 场时：每场参考 ${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[3].perSceneMin}-${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[3].perSceneMax} 字，首稿整集尽量落在 ${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[3].totalMin}-${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[3].totalMax} 字。每场只落一个最关键结果，不要平均铺信息。`
    case 4:
      return `本集 4 场时：每场参考 ${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[4].perSceneMin}-${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[4].perSceneMax} 字，首稿整集尽量落在 ${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[4].totalMin}-${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[4].totalMax} 字。场多就少解释、快落结果，不要把四场都写成同一种压迫或同一种吵法。`
    default:
      return `每场参考 ${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[3].perSceneMin}-${FIRST_DRAFT_EPISODE_TARGET.bySceneCount[3].perSceneMax} 字，首稿整集尽量落在 ${FIRST_DRAFT_EPISODE_TARGET.min}-${FIRST_DRAFT_EPISODE_TARGET.max} 字。先稳住场次和结果，不要为了凑厚度加空解释。`
  }
}

function buildEpisodeTotalBudgetRule(): string {
  return `整集硬红线 ${EPISODE_CHAR_COUNT_MIN}-${EPISODE_CHAR_COUNT_MAX} 字；首稿先按 ${FIRST_DRAFT_EPISODE_TARGET.goal} 字左右收，尽量控制在 ${FIRST_DRAFT_EPISODE_TARGET.min}-${FIRST_DRAFT_EPISODE_TARGET.max} 字。低于 ${EPISODE_CHAR_COUNT_MIN} 视为偏瘦，超过 ${EPISODE_CHAR_COUNT_MAX} 视为偏胖。`
}

function buildPromptCharacterSummary(characters: CharacterDraftDto[]): string {
  return (
    characters
      .map(
        (character) =>
          `${character.name}：${character.goal || character.biography || character.hiddenPressure || '待补人物摘要'}`
      )
      .join('；') || '待补人物摘要'
  )
}

function buildActiveCharacterPackageLines(
  packageSummary: ReturnType<typeof buildScriptBatchContext>['activeCharacterPackage']
): string[] {
  if (!packageSummary || packageSummary.members.length === 0) return []

  return [
    '【当前批次活跃人物包】',
    `- 当前批次：第 ${packageSummary.startEpisode}-${packageSummary.endEpisode} 集`,
    `- 当前上场人物：${packageSummary.memberNames.join('、') || '待补'}`,
    `- 旧人延续：${packageSummary.carryOverCharacterNames.join('、') || '无'}`,
    `- 新人首次登场：${packageSummary.debutCharacterNames.join('、') || '无'}`,
    `- 需要升级完整小传：${packageSummary.upgradeCandidateNames.join('、') || '无'}`
  ]
}

function buildCompactLedgerBridgeBlock(ledger: ReturnType<typeof buildScriptStateLedger>): string {
  const publicFacts = ledger.knowledgeBoundaries.publicFacts.slice(0, 2).join('；') || '待补'
  return [
    '【连续性硬锚】',
    `- 上一场钩子=${ledger.storyMomentum.previousCliffhanger || '待补'}｜下一步=${ledger.storyMomentum.nextRequiredBridge || '待补'}`,
    `- 当前冲突=${ledger.storyMomentum.activeConflictLine || '待补'}｜待兑现代价=${ledger.storyMomentum.pendingCost || '待补'}`,
    `- 当前公开事实=${publicFacts}`
  ].join('\n')
}

function findCharacterByName(
  characters: CharacterDraftDto[],
  name: string | null | undefined
): CharacterDraftDto | null {
  if (!name) return null
  return characters.find((character) => character.name === name) || null
}

function buildDialogueVoiceBlock(input: {
  characters: CharacterDraftDto[]
  protagonistName: string
  antagonistName?: string
  heroineName?: string
  mentorName?: string
  compactMode?: boolean
}): string {
  const protagonist = findCharacterByName(input.characters, input.protagonistName)
  const antagonist = findCharacterByName(input.characters, input.antagonistName)
  const heroine = findCharacterByName(input.characters, input.heroineName)
  const mentor = findCharacterByName(input.characters, input.mentorName)
  const compactMode = input.compactMode === true

  const lines = ['【对白口风】']

  if (protagonist) {
    lines.push(
      compactMode
        ? `- ${protagonist.name}：少解释，先装后反咬；先让半句，再把刀子藏在后半句。炸点=${clipPromptText(protagonist.conflictTrigger, 24) || '被逼急再翻脸'}。`
        : `- ${protagonist.name}：平时先藏、先让、先认一口，再把话折回来；少解释，句子要短，宁可一句顶回去也别长篇讲理。表面演法=${clipPromptText(protagonist.publicMask, 48) || '先装住'}；被逼到炸点=${clipPromptText(protagonist.conflictTrigger, 42) || '再突然反咬'}。`
    )
  }

  if (antagonist) {
    lines.push(
      compactMode
        ? `- ${antagonist.name}：先点名羞辱，再加价威胁，别讲大道理；筹码=${clipPromptText(antagonist.goal || antagonist.protectTarget, 20) || '人和物'}。`
        : `- ${antagonist.name}：先点名羞辱、再压价、再威胁，要让人当众难堪；别讲大道理，也别一下把底全漏光。表面演法=${clipPromptText(antagonist.publicMask, 46) || '先装凶后翻脸'}；最爱拿来压人的筹码=${clipPromptText(antagonist.goal || antagonist.protectTarget, 32) || '人和物'}。`
    )
  }

  if (heroine && !compactMode) {
    lines.push(
      `- ${heroine.name}：表面顺着说、装弱、拖时间，关键时刻只用一两句戳要害；不要只会哭喊求救。表面演法=${clipPromptText(heroine.publicMask, 48) || '先装住'}；炸点=${clipPromptText(heroine.conflictTrigger, 36) || '被逼急就反咬'}。`
    )
  }

  if (mentor && !compactMode) {
    lines.push(
      `- ${mentor.name}：说话像规矩落地，只给条件、时限、后果，不讲人生课。表面演法=${clipPromptText(mentor.publicMask, 44) || '先压规矩'}；目标=${clipPromptText(mentor.goal, 32) || '守住秩序'}。`
    )
  }

  if (lines.length === 1) {
    lines.push('- 角色说话先带站位、筹码和当场压力，别把人都写成一个腔。')
  }

  lines.push('- 同一句话如果换给别的角色说也成立，就继续改，直到能一耳朵听出是谁。')
  return lines.join('\n')
}

function buildSeasonFinaleContractLines(episodeNo: number, targetEpisodes: number): string[] {
  if (episodeNo !== targetEpisodes || targetEpisodes < 10) return []

  return [
    '【整季末集收口合同】',
    `- 这是全季最后一集（第 ${targetEpisodes} 集），必须把本集给定的全部场次完整写完；不准只写标题、人物表、第一条动作或半截对白就停。`,
    '- 末集绝对禁止占位稿和结构外总结：不准出现"人物：人物""【本集终】""局面推进结果：""信息揭露+证据易手："这类收尾标签或复盘条目。',
    '- 末集开头第一场不准重复吐集标题、场号或假人物表来垫字；像"△第30集""人物：人物""30-1 日"后面再跟一个同场号正式场这种写法一律不准出现。',
    '- 末场必须同时给出三件事：眼前还在发生的动作、人物当场的情绪负担、以及逼向下一步的余波，不准只剩结构结论。',
    '- 如果末场出现箭伤、残党、旧账、监视、伤势反噬、职责落身这类尾钩，必须写成角色眼前正在处理的场面，不能只用一句总结带过。',
    '- 写完末场后直接停在剧本场面里，不要再追加提纲式复盘、条目清单、后记或解释。'
  ]
}

export function createScriptGenerationPrompt(
  input: StartScriptGenerationInputDto,
  outline: OutlineDraftDto,
  characters: CharacterDraftDto[],
  episodeNo: number,
  /** Newer episodes from the current batch — used to provide rolling context within a batch */
  generatedScenes?: ScriptSegmentDto[]
): string {
  const batchContext = buildScriptBatchContext({
    outline,
    detailedOutlineBlocks: input.detailedOutlineBlocks,
    characters,
    episodeNo,
    activeCharacterBlocks: input.activeCharacterBlocks,
    entityStore: input.entityStore
  })
  const activeCharacterPackage = batchContext.activeCharacterPackage
  const promptCharacters =
    activeCharacterPackage && activeCharacterPackage.characters.length > 0
      ? activeCharacterPackage.characters
      : characters
  const ledger = buildScriptStateLedger({
    storyIntent: input.storyIntent,
    outline,
    characters: promptCharacters,
    script: input.existingScript
  })
  const compactMode = input.plan.runtimeProfile.shouldCompactContextFirst
  const currentBeat = resolveCurrentEpisodeBeat(input, episodeNo)
  const currentScenes = currentBeat?.sceneByScene || []
  const hasSceneByScene = currentScenes.length > 0
  const episodeSceneDirectives = buildEpisodeSceneDirectives(outline, episodeNo)
  const sceneProgressionDirectives = buildSceneProgressionDirectives({
    existingScript: input.existingScript,
    episodeNo,
    targetEpisodes: input.plan.targetEpisodes,
    generatedScenes
  })
  const compactEpisodeSceneDirectives = compactMode
    ? [
        '每场先争人/物/证据/时间之一，不准解释空转。',
        '相邻两场换打法；制度场不连开，外场动作接管。',
        '同类动作、同义威胁、同一情绪不重复。',
        '情绪只藏在动作和对白里，不另写总结。',
        '对白必须能听出"这句话为什么非得这个人现在说"；每场至少1-2轮有实质内容的对白，不准整场纯靠动作说明推进。',
        '人物冲突和博弈优先用对白展现，不准把嘴仗全部转成动作打斗。',
        '后段师父执事只验真压时限，不带新证据揭底。',
        '当前批次末两集制度确认最短，余波回到伤势、旧账、残党。'
      ]
    : episodeSceneDirectives
  const compactSceneProgressionDirectives = compactMode
    ? sceneProgressionDirectives.slice(0, 4)
    : sceneProgressionDirectives
  const sceneCountRule =
    currentScenes.length > 0
      ? `本集已给出 ${currentScenes.length} 场 sceneByScene，必须严格写成 ${currentScenes.length} 场；只准使用 ${currentScenes.map((scene) => `${episodeNo}-${scene.sceneNo}`).join('、')} 这些场号，不准自行新增 ${episodeNo}-${currentScenes.length + 1} 之类额外场次。`
      : '每集 2-4 场。'
  const includeSceneDetails = !compactMode || hasSceneByScene
  const currentEpisodeTaskLines = buildCurrentEpisodeTaskLines(
    input,
    episodeNo,
    includeSceneDetails
  )
  const shortDramaControlPackageLines = buildShortDramaControlPackageLines(input, episodeNo)
  const seasonFinaleContractLines = buildSeasonFinaleContractLines(
    episodeNo,
    input.plan.targetEpisodes
  )
  const dialogueVoiceBlock = buildDialogueVoiceBlock({
    characters: promptCharacters,
    protagonistName: outline.protagonist,
    antagonistName: input.storyIntent?.antagonist,
    heroineName: undefined,
    mentorName: undefined,
    compactMode
  })
  const ledgerConstraintBlock = buildLedgerConstraintBlock(ledger)

  // Craft rules — identical for both modes after the slimming
  const craftRules = [
    buildEpisodeCharContractLine(),
    SCREENPLAY_FIRST_DRAFT_AGENT_FIRST_RULE,
    '【格式合同】正文第一行必须是「第X集」标题（如「第1集」），独占一行。',
    '只输出剧本正文，不写分析说明、幕后工作词、括号注释。',
    sceneCountRule,
    '每场必须有场景标题（如「1-1 日」「1-2 夜」「2-3 晨」），独占一行。',
    '每场格式：场景标题后写「人物：角色1，角色2」+「△动作」+「角色名：对白内容」。禁止使用旧三段标签格式（动作标签、对白标签、情绪标签）作为输出结构。',
    compactMode
      ? `示意：
第1集
1-1 日
人物：林守钥，沈黑虎
△旧库院门被踹开。
林守钥：你交出来。
沈黑虎：还没到时候。`
      : `示意：
第1集
1-1 日
人物：林守钥，沈黑虎
△旧库院门被一脚踹开。
林守钥：（后退）你交出来。
沈黑虎：（冷笑）还没到时候。`,
    SCREENPLAY_FIRST_DRAFT_MIN_DRAMA_RULE,
    SCREENPLAY_FIRST_DRAFT_BAN_RULE,
    compactMode
      ? [
          '前30%内打出这集最好卖的冲突、反差和代价，不先铺背景。',
          '第2集以后先接上一场后果，再补非补不可的解释。',
          '权谋戏优先抢人、抢物、抢证、换站队，不滑成纯打纯追。',
          '相邻两场换打法；别连着两场只吼或只打。'
        ]
      : [
          '先按这个顺序写：先把这场最值钱的冲突打出来，再让对手应对，最后落一个可见结果；不要平均交代信息。',
          '第一场必须先有事发生。前 30% 内就把这集最好卖的冲突、反差和代价一起打到观众眼前，不要先铺背景和世界观。',
          '第 2 集以后，开场先接上一场已经造成的后果，再补那句非补不可的解释。'
        ],
    SCREENPLAY_RESULT_LANDING_RULE,
    SCREENPLAY_EMOTION_RULE,
    '每场只保留 1-2 条关键△动作、1-2 轮有效对打、至少 1 个可见后果；同类动作和同义威胁不重复。',
    SCREENPLAY_CONCISE_LINE_RULE,
    SCREENPLAY_ANTI_BLOAT_RULE,
    '门被撞开 / 人被拖走 / 刀已经抵住 / 证据拍到脸上，这类眼前动作优先于情绪空话。',
    '【完成判定】只写到标题/开头摘要都算未完成，必须直接输出完整剧本正文，不得以标题+摘要代替正文。',
    SCREENPLAY_NO_VO_RULE,
    SCREENPLAY_NO_VO_EXAMPLE_RULE,
    SCREENPLAY_NO_OFFSCREEN_DIALOGUE_RULE,
    SCREENPLAY_FINAL_RUN_COMPRESSION_RULE,
    SCREENPLAY_FINAL_RUN_LENGTH_RULE,
    SCREENPLAY_SEASON_END_RULE,
    SCREENPLAY_FINAL_OPENING_RULE,
    SCREENPLAY_NO_NEW_TAKEOVER_RULE,
    SCREENPLAY_INSTITUTION_PASSING_RULE,
    SCREENPLAY_PER_SCENE_HARD_CONTRACT,
    SCREENPLAY_ENDING_EPISODES_CONTRACT
  ].flat()

  return [
    `你正在为短剧《${input.outlineTitle || '未命名项目'}》写第 ${episodeNo} 集剧本。`,
    '【首稿执行要点】（红线规则已写入 System 指令，以下为具体上下文）',
    '4. 【爽感落地三件套】当控制卡传来 catharsisMoment 时，本场必须严格执行三步：',
    '   第一步【动态 Punchline】：主角必须结合本场核心道具或主角底牌，说出一句 15 字以内的致命陈述句或反问句。禁止使用空泛金句（如"你也配"），必须锚定当前剧情中的具体物件或底牌。',
    '   第二步【反派溃败表现】：反派听到/看到主角的底牌或反咬后，必须写出实质性的身体溃败动作——后退半步、脸色铁青、瘫坐在地、手中的东西掉落、嘴角发抖。不只是"愣住"或"沉默"。',
    '   第三步【旁观者锚点】：必须有一名旁观者或配角露出震惊、恐惧或崇拜的反应，作为观众视角的共鸣锚点。',
    '',
    `主题：${input.theme || '待补主题'}`,
    `核心冲突：${input.mainConflict || '待补核心冲突'}`,
    `设定成交句：${input.storyIntent?.sellingPremise || '待补'}`,
    `核心错位：${input.storyIntent?.coreDislocation || '待补'}`,
    `优先兑现情绪：${input.storyIntent?.emotionalPayoff || '待补'}`,
    `角色摘要：${buildPromptCharacterSummary(promptCharacters)}`,
    ...currentEpisodeTaskLines,
    ...shortDramaControlPackageLines,
    ...buildActiveCharacterPackageLines(activeCharacterPackage),
    ...buildEpisodeHookLandingLines(input, episodeNo),
    '【前情提要】',
    buildCompactedStoryIntentBlock(input),
    buildCompactedCharacterBlock({
      characters: promptCharacters,
      maxChars: input.plan.runtimeProfile.maxCharacterChars
    }),
    buildCompactedSegmentBlock({
      segments: input.segments || [],
      maxChars: input.plan.runtimeProfile.maxSegmentChars,
      targetEpisodes: input.plan.targetEpisodes
    }),
    buildLedgerAssertionBlock(ledger),
    ledgerConstraintBlock,
    compactMode ? buildCompactLedgerBridgeBlock(ledger) : buildKnowledgeBoundaryBlock(ledger),
    dialogueVoiceBlock,
    '禁止写成分析报告、人物解说、分点拆解、情绪层次总结；只保留剧本正文和场景格式，不要输出任何三段结构标签。',
    '正文里绝对不要出现"站位""钉子句""关系施压""说明如下""总结如下"这些幕后工作词，也不要写 ## 标题、序号小节或括号注释说明。',
    ...craftRules,
    ...seasonFinaleContractLines,
    ...compactEpisodeSceneDirectives,
    ...compactSceneProgressionDirectives
  ]
    .flat()
    .filter(Boolean)
    .join('\n')
}
