import type { StoryIntentPackageDto } from '@shared/contracts/intake'
import type { MarketProfileDto } from '@shared/contracts/project'
import type {
  CharacterDraftDto,
  OutlineDraftDto,
  OutlineEpisodeDto
} from '@shared/contracts/workflow'
import { renderShortDramaConstitutionPromptBlock } from '@shared/domain/short-drama/short-drama-constitution'
import { renderAnchorBlock, stripNoisyThemeClauses } from './generation-stage-prompt-anchors'
import { getConfirmedFormalFacts } from '@shared/domain/formal-fact/selectors'
import { buildMarketProfilePromptSection } from './build-market-profile-prompt-section'
import {
  resolveGenerationStrategy,
  type GenerationStrategy
} from '@shared/domain/generation-strategy/generation-strategy'

function cleanPromptValue(value: string | undefined): string {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  const cleaned = stripNoisyThemeClauses(trimmed)
  return cleaned || trimmed
}

function hasRankIdentityAnchor(text: string): boolean {
  return /(排行|第十九|第十九个徒弟|第十九徒|最小徒弟|最末位徒弟|小徒弟)/.test(text)
}

function buildCharacterRankIdentityRules(generationBriefText: string): string[] {
  if (!hasRankIdentityAnchor(generationBriefText)) return []

  return [
    '如果底稿里有“排行/第十九徒/最小徒弟”这类身份事实，至少把它写进 biography、hiddenPressure、weakness、conflictTrigger 或 goal 其中一处，变成会被人拿来轻视、点名、压规矩、卡名分的现实压强。',
    '主角若是最小徒弟或排行靠后，不能只写“守小柔、守钥匙”；还要写清别人怎样拿这层身份压他、看轻他、挡他、逼他先低头。'
  ]
}

function buildDetailedOutlineRankIdentityRules(outline: OutlineDraftDto): string[] {
  const factsText = getConfirmedFormalFacts(outline)
    .map((fact) => `${fact.label} ${fact.description}`)
    .join('\n')
  if (!hasRankIdentityAnchor(factsText)) return []

  return [
    '如果已确认正式事实里有“排行/第十九徒/最小徒弟”这类身份事实，至少一集 summary 或 sceneByScene 要把它写成具体压强：有人当众叫他“第十九个徒弟/最小徒弟”、拿排行压他资格、挡他碰账册、逼他先跪先退或拿这层身份羞辱他。',
    '这类身份事实不能只留在人物介绍或 facts 清单里，必须真正改一次局面或站位。'
  ]
}

function buildDetailedOutlineMonsterFactRules(outline: OutlineDraftDto): string[] {
  const factsText = getConfirmedFormalFacts(outline)
    .map((fact) => `${fact.label} ${fact.description}`)
    .join('\n')
  if (!/(妖兽蛇子|蛇子|镇妖地|封印外压)/.test(factsText)) return []

  return [
    '如果已确认正式事实里有“妖兽蛇子”，至少两集的 episode summary 或 sceneByScene 必须直接出现“妖兽蛇子”这四个字；不准只写鳞片、黑气、潭水翻涌、妖兽异动这类侧写就算落地。',
    '至少一场 sceneByScene 的 tension 或 hookEnd 要把“妖兽蛇子”直接写进正在发生的压迫：例如“妖兽蛇子在潭底翻身”“妖兽蛇子借宿主外溢”“妖兽蛇子逼近镇妖地裂缝”。',
    '如果是开局段或收束段，summary 里也必须直接点名“妖兽蛇子”，不要只让它躲在 sceneByScene 里。'
  ]
}

export function buildOutlineGenerationPrompt(generationBriefText: string): string {
  return [
    '你是短剧总编剧。你正在规划一部爆款短剧的粗纲骨架。',
    '【短剧黄金铁律 · 必须刻进系统】',
    '1. 极限密度：每集只干一件事：施压 → 反击 → 留钩子。',
    '2. 黄金节奏：第1集开局30秒必须有巨大危机（丢官/退婚/被夺/被冤枉），1分钟必须有反转或打脸。',
    '3. 主角风骨：主角可以战略性忍让，但眼神必须冷、定、稳，绝对禁止真窝囊、真崩溃、持续吐血求饶。',
    '4. 反派高智：用规则杀人、用权势压人、用利益分化，微笑着把人逼死。禁止无脑吼叫/骂街。',
    '5. 60集爆款节奏表：',
    '   - 1-10集：绝境开局 → 首次反击',
    '   - 11-20集：搅动局面 → 反派破防',
    '   - 21-30集：连杀连胜 → 势力成型',
    '   - 31-40集：掀翻底牌 → 中层清算',
    '   - 41-50集：终极博弈 → 反派绝望',
    '   - 51-60集：登顶收官 → 完美闭环',
    '',
    '这一工序只负责“粗纲”，目标是根据正式创作底稿，交出可供下游继续推进的主线骨架。',
    '这一步要守住 6 件事：主欲望、总阻力、阶段升级、关键关系杠杆、每集事件推进、每集结尾钩子。',
    '先守住“设定成交句、核心错位、情绪兑现”这三个最上层抓手，再往下展开主线。',
    '粗纲开写前先在心里答一句：这部戏第一集最值钱、最像宣传语的一刀到底是什么；如果答不上来，就先把这一刀写清再推进。',
    '优化方向：让戏更有推力，不是把设定写得更满。',
    '请优先继承底稿里的正式事实，不要自己改主角、对手、关键关系、主题方向。',
    '如果底稿里已经给了固有角色、地点、道具、关系，就直接拿这些锚点往前写，不要退回“主角/反派/神秘势力”这种通用叫法。',
    '如果底稿里已有角色足够推动主线，就继续用现有角色，不需要额外扩表。',
    '每一集都要看得出：谁在动、谁在压、这一集局面怎么被往前拱、结尾悬着什么没完。',
    '事实优先级：先吃人物和关系，再吃关键道具与主题，再吃世界压力；不要把世界观介绍写成主线推进。',
    '输出严格 JSON：',
    '{',
    '  "storyIntent": {',
    '    "titleHint": string, "genre": string, "tone": string, "audience": string,',
    '    "protagonist": string, "antagonist": string, "coreConflict": string, "endingDirection": string,',
    '    "officialKeyCharacters": string[], "lockedCharacterNames": string[],',
    '    "themeAnchors": string[], "worldAnchors": string[], "relationAnchors": string[], "dramaticMovement": string[],',
    '    "manualRequirementNotes": string, "freeChatFinalSummary": string',
    '  },',
    '  "outline": {',
    '    "title": string,',
    '    "genre": string,',
    '    "theme": string,',
    '    "protagonist": string,',
    '    "mainConflict": string,',
    '    "summary": string,',
    '    "episodes": [{"episodeNo": number, "summary": string}],',
    '    "facts": [{"label": string, "description": string, "level": "core"|"supporting", "linkedToPlot": boolean, "linkedToTheme": boolean}]',
    '  }',
    '}',
    'episodes 写法要求：',
    '1. 每集必须写成一个最小可执行单集骨架，至少同时回答：这一集先发生什么、阻力怎么压下来、人物被逼着怎么变招或怎么误判、结尾新麻烦是什么。',
    '2. 每集 summary 用 3-5 个短句自然写清，不要输出 `【起】...【承】...【转】...【钩子】...` 这类固定标签，也不要只写一句推进句。',
    '3. 相邻两集的主要推进手法必须变化：正面逼压、试探、借力、反咬、调包、错判、揭底、关系翻面，至少换一种，不能一路只会“继续加码”。',
    '4. 让正式角色直接出现在分集里，不要总用泛称。',
    '5. 如果底稿写了权谋、智斗或“靠智慧周旋”，就优先写做局、抢口风、套话、借势、反证、调虎离山，不要自动滑成纯打怪升级或纯战力对轰。',
    '6. 优先把底稿里的关系、地点、道具、主题锚点写进主线推进，而不是只写成背景。',
    '7. 每集都要写出“这一集最想让人继续点开的理由”，不要只把事情讲清楚。',
    '8. 第一集尤其要写清：主角当前在守什么、对手怎么出手、为什么主角不能直接反打、这一集结束后局面变成什么新状态。',
    '9. 禁止这种不合格写法：只有几个固定结构词，或三五句本质都在重复同一个动作。',
    '',
    '这份底稿里你必须优先执行的锚点：',
    renderAnchorBlock(generationBriefText),
    '',
    '第一板块正式创作底稿：',
    generationBriefText
  ].join('\n')
}

export function buildCharacterGenerationPrompt(input: {
  generationBriefText: string
  protagonist: string
  antagonist: string
  keyCharacters: string[]
  conflict: string
  outlineSummary: string
  marketProfile?: MarketProfileDto | null
}): string {
  const rankIdentityRules = buildCharacterRankIdentityRules(input.generationBriefText)
  const marketProfileSection = buildMarketProfilePromptSection({
    marketProfile: input.marketProfile,
    stage: 'characters'
  })
  const requiredCharacterAnchors = Array.from(
    new Set(
      [input.protagonist, input.antagonist, ...(input.keyCharacters || [])]
        .map((item) => item.trim())
        .filter(Boolean)
    )
  )

  return [
    '你是短剧编剧助手。',
    ...(marketProfileSection ? [marketProfileSection] : []),
    '这一工序只负责”人物小传”，它不是人物百科，而是”详纲可执行说明书”。',
    '目标：让下游详纲一眼就知道，这个人想要什么、守什么、怎么施压、被逼到什么点会动、会付什么代价。',
    '人物要写得出戏，但不要替详纲和剧本提前决定最终解法、终局大战或结局答案。',
    '优化方向：人物分层，不冗余。优先保留真正推动主线的人物，不重复扩表。',
    '请优先使用底稿和粗纲里已经明确的人物，不要随意发明新的核心角色、改名或重写关系。',
    '如果底稿已经给了某个人的前史、悟道、关系、代价、传承来源，你要做的是压缩成交付下游可执行的抓手，不是重新发明一版人物。',
    '这次必须覆盖上游已经锁住的人物锚点，尤其是主角、对手和关键角色；缺任何一个都算失败。',
    '如果上游给的是角色标签而不是真实名字，就直接把这个标签原样写进 name，禁止自作主张改成新名字。',
    `禁止把“${requiredCharacterAnchors.join('/')}”改写成“林默/赵虎/小月”这种另一套名字；name 必须和上游锚点逐字一致。`,
    '每个人必须写清：name, biography, publicMask, hiddenPressure, fear, protectTarget, conflictTrigger, advantage, weakness, goal, arc。',
    '其中 biography 只写“当前人物为什么会这样行动”，不是堆背景；可写 1-2 句，其余字段都只写 1 句。',
    'goal、fear、protectTarget 优先写具体人、物、伤口、位置、账册、封印或名分；不要只写“宗门秩序”“自身利益”“自身存在”“大道”“真相”这种抽象大词。',
    '如果 protectTarget / fear / goal 里只有抽象词，没有能丢、能抢、能毁、能守的东西，说明人物抓手还是虚的，必须重写。',
    ...rankIdentityRules,
    '每个人都要让下游看得出：他最会把戏往哪边拧，是逼供、做局、护短、拖时间、挑拨、借势还是反咬；不要写成谁都能套用的说明书。',
    'publicMask 和 hiddenPressure 要形成反差；conflictTrigger 要直接写成“被逼到什么点会做什么动作”，不要只写抽象态度。',
    'advantage 和 weakness 只写会在戏里直接生效的抓手，不要写“聪明”“勇敢”“善良”这类空优势。',
    'arc 只写这一季人物位置和施压方式怎么变，不要提前写成“最终怎么大战、怎么封印、怎么牺牲、怎么揭开终极答案”。',
    '情感杠杆角色的 advantage、goal、arc 必须写成她主动能做的事：传信、藏证据、换条件、试探、自救、反咬或拖时间；不要写成“她的安危会刺激主角”这种被动说明。',
    '情感杠杆角色的 biography、publicMask 不能只停在“柔弱顺从、等人来救、不敢反抗”；至少同时写出她表面怎么装弱、暗里怎么传信、藏证、拖延、试探或设局。',
    '情感杠杆角色的 publicMask 不是“她对主角什么态度”，而是“她在压力场里表面怎么演、暗里怎么动”。',
    '情感杠杆角色的 publicMask 禁止直接出现“柔弱顺从”“逆来顺受”“等人来救”“礼貌保持距离”这类模板词；一旦出现，说明还在写人质模板，必须重写。',
    '情感杠杆角色的 publicMask 必须同时写出一个表面动作和一个暗里动作：例如装怕/服软/装晕/低头应声 + 递消息/藏证/拖时间/试探/换条件/反咬；缺一都算没写成。',
    '所有角色的 publicMask 都必须先写成“表面怎么演、怎么藏、怎么拖”的可拍动作，不准只写他/她对谁保持距离、疏离、冷淡、无感、敬畏这类态度结论。',
    '只要 publicMask 里出现“保持距离”“装作不识”“对谁冷淡”“对谁无感”这类态度句，而没有表面动作和暗里动作，直接判失败；必须翻成能拍到的演法。',
    '如果 publicMask 里没有装弱、赔笑、低头、装不懂、装听话、装作不识、递水、藏证、拖时间、套话、逼停、让步这类动作词，默认还没写成。',
    '主角的 publicMask 只能写当前压力场里的表面演法，例如装怂、认栽、赔笑、装不懂、装听话、装作和关键关系不熟；不要写成“对小柔保持距离”这种裁判句。',
    '主角 publicMask 至少同时包含一条“对外怎么装”和一条“对内怎么藏”，缺一都算没写成。',
    '错误示例：对黎明保持礼貌距离。正确示例：对李科低头应声，暗里借递水递纸条、藏证、套话或拖时间。',
    '如果 publicMask 写成“她对黎明冷淡/保持距离/不太喜欢他”这类态度词，等于没有写动作，必须重写成能直接拍到的表演。',
    '情感杠杆角色写法示意：publicMask 写“表面怎么装弱、服软、顺着说”，hiddenPressure/goal/arc 写“暗里怎么藏证、拖时间、换条件、递消息、套话、自救、反咬”；如果写成“等待主角救她”，说明回到了人质模板，必须重写。',
    '情感杠杆角色的 arc 禁止写成“从被动等人来救，到后来主动一点”这种复盘句；要直接写成“从装弱拖时，到主动藏证/递消息/换条件/反咬改局”。',
    '如果是外压层、规则杠杆层或非人角色，只写它如何放大人祸、被谁利用、在什么条件下失控；不要把它写成人类主线主角，更不要让它抢走终局主导。',
    '如果是师父、长老、高手或规则杠杆角色，只写他怎么改规则、压时限、给条件、逼表态；不要把他写成替主角收尾、替主角揭底、替主角完成终局的人。',
    '规则杠杆角色的 goal、arc 里禁止出现“领悟”“考验”“见证成长”“逼他自己醒悟”这种教化词；要写他当季具体守哪条秩序、拿什么规则压谁、什么情况下收手。',
    '规则杠杆角色的 biography、hiddenPressure、goal、arc 都禁止出现“悟道历程”“见证成长”“考验主角”“逼他自己醒悟”这类教化语；只写守哪条秩序、压哪条时限、拿什么规则逼谁表态。',
    '如果规则杠杆角色的 biography、hiddenPressure、goal、arc 里出现“确保主角领悟”“让主角悟道”“帮他完成成长”“逼他自己破局”，直接判失败；这还是教化口，不是规则动作。',
    '规则杠杆角色一旦写出“逼黎明自己破局”“逼主角自己破局”“等他自己悟到”“她不出手只等他醒悟”，就直接重写成：压哪条旧规、卡哪份记录、守哪块封印石、拿哪道时限逼谁表态。',
    '规则杠杆角色的 publicMask 也不能写成“表面不插手、暗里等他自己悟”这类空态度；必须写成可拍动作，例如只递规条、只收账册、只押去潭边、只准谁进门。',
    '规则杠杆角色也别只守“宗门秩序”；要写成哪块封印石、哪条旧规、哪份记录、哪条命不能砸在她手里。',
    '规则杠杆角色写法示意：goal 写“守哪条秩序、压谁表态、用什么时限或规则逼局”，arc 写“从旁观到改规则、压时限、认证后果”；如果写出“让主角领悟/考验主角/见证成长”，就说明字段写错了，必须重写成具体规则动作。',
    '规则杠杆角色写法反例：李诚阳暗里通过旧规和传承条件逼黎明自己破局。正例：李诚阳只认潭边旧规、只卡押送时限、只看账册和蛇鳞痕，不替任何人说教。',
    '如果是非人角色或灾变外压，goal、fear、arc 只能写“会被什么引动、被谁利用、会把哪笔人祸放大”，不要写成“突破镇封、吞噬天下、主导终局”这种自带主线目标。',
    '非人角色或灾变外压的 biography、hiddenPressure、goal、fear、arc 里禁止出现“渴望”“想要”“野心”“突破镇封”“主导终局”这类拟人欲望词；只写被什么引动、借谁外溢、把哪笔人祸放大。',
    '错误示例：渴望突破镇封。正确示例：一旦有人靠近潭边妄动，鳞片外渗并把在场人祸放大。',
    '所有字段都不能留“无”“待补”或“不适用”；如果是非人角色，也要把字段翻成可拍的状态、引动条件、扩压方式和失控代价。',
    '非人角色的 protectTarget 不能写“无”；要写它最先会缠住的宿主、最会放大的局面，或最先盯上的现场。比如“最先缠住误饮潭水的人”而不是“无”。',
    '非人角色的 protectTarget 禁止写“自身存在”；要写它最先缠住的人、最先盘住的潭口、最先外渗的封印裂缝。',
    '非人角色的 fear 不能写“无”或抽象大道理；要写什么会把它压回去、镇住或切断外溢，例如“七道观加固镇封”“离开潭边宿主”。',
    '非人角色的 goal 不能写“无自主目标”；要写成“被谁引动后把哪笔人祸放大”，让下游一看就知道它怎样改局。',
    '非人角色的 publicMask 也要写成能直接拍到的当前状态，例如“被镇在潭底、借宿主体活动、鳞片外渗”这种状态，不要留空。',
    'biography 和 arc 也少写“悟透”“领悟”“真谛”“大道”这类总结词，多写人物为什么现在装弱、躲、忍、反咬或一碰谁就会翻脸。',
    '主角和情感杠杆角色的 biography、goal、arc 也不要写成“帮助他领悟真正的道”“最终明白不争真义”；要翻成护住谁、藏住什么、撕掉哪页账、挨了哪道伤。',
    '人物写完后再自检一次：删掉妖兽或长老，这部戏是不是还成立为人逼人、人逼自己；如果不成立，说明人物分层还没写对。',
    '如果这个人物一开口、一出手还不像能直接写戏的人，说明还不够，继续压实。',
    '人物数量优先控制在 4-6 个，优先覆盖主驱动层、主阻力层、情感杠杆层、规则杠杆层；外压层只保留确实会直接改写局面的角色。',
    '输出严格 JSON：',
    '{',
    '  "characters": [{"name": string, "biography": string, "publicMask": string, "hiddenPressure": string, "fear": string, "protectTarget": string, "conflictTrigger": string, "advantage": string, "weakness": string, "goal": string, "arc": string}]',
    '}',
    '',
    `当前主角：${input.protagonist || '待补'}`,
    `当前对手：${input.antagonist || '待补'}`,
    `这次必须原样保留的人物锚点：${requiredCharacterAnchors.join('、') || '待补'}`,
    `当前主冲突：${input.conflict || '待补'}`,
    `当前粗纲总述：${input.outlineSummary}`,
    '',
    '这份底稿里你必须优先执行的锚点：',
    renderAnchorBlock(input.generationBriefText)
  ].join('\n')
}

type DetailedOutlineAct = 'opening' | 'midpoint' | 'climax' | 'ending'

const DETAILED_OUTLINE_ACT_LABEL: Record<DetailedOutlineAct, string> = {
  opening: '开局段',
  midpoint: '中段',
  climax: '高潮段',
  ending: '收束段'
}

function formatDetailedOutlineCharacterSummary(characters: CharacterDraftDto[]): string {
  return characters
    .slice(0, 6)
    .map((item) =>
      [
        `${item.name}：${item.goal || item.biography || item.arc || '待补人物驱动力'}`,
        item.biography ? `人物底：${item.biography}` : '',
        item.fear ? `最怕失去：${item.fear}` : '',
        item.protectTarget ? `最想守住：${item.protectTarget}` : '',
        item.conflictTrigger ? `一被逼就会这样动：${item.conflictTrigger}` : '',
        item.advantage ? `能打的点：${item.advantage}` : '',
        item.weakness ? `最会出事的点：${item.weakness}` : '',
        item.arc ? `这一季会怎么变：${item.arc}` : ''
      ]
        .filter(Boolean)
        .join(' ')
    )
    .join('\n')
}

function formatDetailedOutlineStoryIntent(storyIntent?: StoryIntentPackageDto | null): string {
  return [
    `设定成交句：${cleanPromptValue(storyIntent?.sellingPremise) || '待补'}`,
    `核心错位：${cleanPromptValue(storyIntent?.coreDislocation) || '待补'}`,
    `情绪兑现：${cleanPromptValue(storyIntent?.emotionalPayoff) || '待补'}`,
    `主线欲望：${cleanPromptValue(storyIntent?.dramaticMovement?.[0] || storyIntent?.coreConflict) || '待补'}`,
    `总阻力：${cleanPromptValue(storyIntent?.dramaticMovement?.[1] || storyIntent?.relationAnchors?.[0]) || '待补'}`,
    `代价升级：${cleanPromptValue(storyIntent?.dramaticMovement?.[2] || storyIntent?.themeAnchors?.[0]) || '待补'}`,
    `关系杠杆：${
      (storyIntent?.relationAnchors || [])
        .map((item) => cleanPromptValue(item))
        .filter(Boolean)
        .join('；') || '待补'
    }`,
    `世界压力：${
      (storyIntent?.worldAnchors || [])
        .map((item) => cleanPromptValue(item))
        .filter(Boolean)
        .join('；') || '待补'
    }`,
    `短剧创作宪法：\n${renderShortDramaConstitutionPromptBlock(storyIntent?.shortDramaConstitution)}`
  ].join('\n')
}

function formatDetailedOutlineEpisodes(episodes: OutlineEpisodeDto[]): string {
  return episodes.map((episode) => `第${episode.episodeNo}集：${episode.summary}`).join('\n')
}

function formatDetailedOutlineFormalFacts(outline: OutlineDraftDto): string {
  const facts = getConfirmedFormalFacts(outline)
  if (facts.length === 0) return '当前无已确认正式事实'
  return facts.map((fact) => `- ${fact.label}：${fact.description}`).join('\n')
}

function buildDetailedOutlineStrategyRules(strategy: GenerationStrategy): string[] {
  const lexicon = [
    ...strategy.worldLexicon.factionTypes,
    ...strategy.worldLexicon.roleTitles,
    ...strategy.worldLexicon.conflictObjects,
    ...strategy.worldLexicon.payoffActions
  ]
    .filter(Boolean)
    .join('、')

  const commonRules = [
    `【题材策略细化】当前策略：${strategy.label}`,
    `本段只能使用当前策略词库里的世界、职业、机构和冲突物：${lexicon || '按当前项目设定'}`,
    '凡是主题、信条、旧规或价值观类正式事实，当前批次末两集至少要把词面或直接同义动作落出来；但只能贴着实物、合同、证据、关系代价或已发生后果落一句短狠结果，不准讲道理。',
    '如果正式事实里确认主角有“隐忍/藏锋/先让后反咬”，前 1-6 集至少两集必须显性落出主角怎样装弱、藏锋、先忍住不出手或先让一步换证据；不准只写他突然能赢。',
    '外部压力只能放大人祸，不能替代人祸；哪怕有行业黑幕、制度问责、舆论风暴或超常外压，也要明确是谁借它做局、谁拿它逼人、谁因此失去筹码。',
    '如果当前已经进入收束段，至少一集要直接写谁被揭穿、谁失去筹码、谁被迫站队、谁拿证据换命或谁被追责，不准把后三集主推进连续写成会议、抽象程序或世界规则说明。',
    '规则掌控者、上级、机构负责人只能改规则、压时限、给条件、逼表态；不能直接替主角完成终局动作。真正把人账落地、把关系翻面、把证据拿出来的人，必须还是主角或关键关系角色。',
    '规则掌控者不能带着新证据入场替主角揭底；他们最多只负责验真、压时限、截停。关键证据必须先由主角或情感杠杆角色碰到、藏到、换到、抢到或逼出来。',
    '当前 5 集批次里，至少两集要由主角或情感杠杆角色亲自拿出证据、换条件、诈供、截人或反咬完成关键推进；规则掌控者最多只负责认证、施压或给通道，不能做第一揭底人。',
    '会议、听证、问责、审查只准当压力容器，不能连续两集占主场；同一阶段里，程序场最多只允许 1 集当主战场，一旦用了，下一集就要转去潜入、追逃、交易、拦截、抢人、毁约或路上反打。',
    '不要把后半程写成“程序场对质 -> 廊道威胁 -> 夜潜取证 -> 再回程序场质询”的循环；如果上一集用了室内程序场，这一集第一场就必须落在外场追逃、密室套话、旧巢取证、伤势处理、抢人、埋伏或静室交易里。',
    '一旦组织问责入场，它只负责压时限和改规则；真正戏眼要落在押送路上、门外堵截、住处搜物、路上投毒、暗巷换手、静室交易、门口截人、现场封口这些动作上，不要把“被带去问话”本身写成整集。',
    '当前 5 集批次如果出现外部机构、使者、负责人问责或更高层表态，他们只能拿现有旧账加压，不能替代主角、关键关系人、对手、核心筹码和当前代价这条主线；summary 里不准把“外部问责/权责重排”写成第一戏眼。',
    '当前 5 集批次如果必须出现执行人员、合议或审查，它们只能做半句盖章：收证、定时限、押送、转身离开。summary 和 sceneByScene 的真正推进要立刻切回伏击、抢纸、截副本、急醒、追人或夺账。',
    '情感杠杆角色至少一次亲手保管、调包、递送、换出或毁掉一件实物筹码（账册、录音、合同、钥匙、药瓶、证词至少一种），不能只负责传话或哭喊。',
    '当前 5 集批次的收口段主推进优先落在代价处理、追兵动作、证据换手、新职责落身；组织追责、内部清洗、权位重排只能当后果背景，不能自己变成每集主戏眼。',
    '当前批次末两集如果必须出现接任、宣判、认罚或组织表态，它们只能放在最后最短一场做结果确认；scene1 和主推进场必须落在处理代价、截人、抢证、毁筹码、护人或藏账。',
    '当前批次末集的余波优先落在人际站位、职责变化、证据外流、代价未清和旧账未清，不要临时抬出更大外部设定、新世界秘密或新名字接管本批次终点。',
    '当前批次末集最多只允许 1 场制度确认；其余场次都要落在主角、关键关系人、追兵动作、代价处理或新职责的现实处理上。',
    '当前批次末集如果出现合议、接任、令牌或职责确认，它只能放在中段最短一场；尾场必须落在盯梢、见面约、证据外泄、现场异动、代价反噬或旧账追上门，不准用制度结果收尾。',
    '当前批次末集第一场不准从组织合议、文件宣读、负责人落锤或制度宣判起手；必须从上一集留下的人、物、伤、追兵动作或未完人账直接开场。',
    '当前 5 集批次如果场景落在包扎、休息、静室或歇脚处，不准把拉扯写成“为什么藏到现在/为什么不争/上级说过什么”的问答戏；要改成藏账页、压伤口、换路线、盯追兵、转移筹码、决定先护谁。',
    '当前 5 集批次若主题必须显形，只能贴着具体道具、证据、血迹、账页、盯梢人或已发生的代价落一句短狠结果，不准预埋抽象定义句。',
    'sceneByScene 也不准预埋“某人说过…所以…”“这才是真的…”“她帮他想通了”这类解释句；只准给下游留动作抓手、实物抓手和下一步后果。'
  ]

  if (strategy.id !== 'male_xianxia') return commonRules

  return [
    ...commonRules,
    '【玄幻修仙专属补充】若正式事实里已确认妖兽、封印、血契、旧宗规或外压异象，可以使用这些词，但它们只能放大人祸，不能替代人物选择。',
    '玄幻收束段可以出现宗门、长老、法阵或封印压力，但主推进仍必须落在主角或关键关系角色亲自拿证、换条件、反咬、护人或付代价。'
  ]
}

export function buildDetailedOutlineActPrompt(input: {
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  storyIntent?: StoryIntentPackageDto | null
  act: DetailedOutlineAct
  startEpisode: number
  endEpisode: number
  episodes: OutlineEpisodeDto[]
  previousActSummary?: string
  marketProfile?: MarketProfileDto | null
}): string {
  const characterSummary = formatDetailedOutlineCharacterSummary(input.characters)
  const storyIntentBlock = formatDetailedOutlineStoryIntent(input.storyIntent)
  const formalFactBlock = formatDetailedOutlineFormalFacts(input.outline)
  const actLabel = DETAILED_OUTLINE_ACT_LABEL[input.act]
  const rankIdentityRules = buildDetailedOutlineRankIdentityRules(input.outline)
  const monsterFactRules = buildDetailedOutlineMonsterFactRules(input.outline)
  const marketProfileSection = buildMarketProfilePromptSection({
    marketProfile: input.marketProfile,
    stage: 'detailedOutline'
  })
  const generationStrategy = resolveGenerationStrategy({
    marketProfile: input.marketProfile ?? input.storyIntent?.marketProfile,
    genre: input.outline.genre,
    storyIntentGenre: input.storyIntent?.genre,
    title: input.outline.title
  }).strategy
  const detailedOutlineStrategyRules = buildDetailedOutlineStrategyRules(generationStrategy)

  return [
    '你是短剧总编剧。你现在负责详细大纲的局部展开。',
    ...(marketProfileSection ? [marketProfileSection] : []),
    '【单集标准结构 · 固定三段式】',
    '每一集必须严格按照以下三幕结构进行规划（反映在 summary 和 sceneByScene 中）：',
    '1. 第一幕：施压 (0-20秒) —— 反派拿把柄/规则压人，把主角逼到无路可退。',
    '2. 第二幕：反转 (20-45秒) —— 主角拿出证据/底牌/后手，让反派当众吃瘪。',
    '3. 第三幕：钩子 (45-60秒) —— 新危机立刻到来，最后一句台词扎心留客。',
    '',
    `当前只写：${actLabel}（第${input.startEpisode}-${input.endEpisode}集）。`,
    '这一步只做一件事：把这一段对应的粗纲逐集，展开成能直接写剧本的逐集细纲。',
    '你不能改动上游已经确认的人物、关系、设定和集数，也不能补写别的阶段。',
    '这段必须持续吃住“设定成交句、核心错位、情绪兑现”，不要把最好卖的那一刀写平。',
    '如果底稿更偏权谋、智斗或“靠智慧周旋”，就把推进主打法放在做局、借势、试探、反证、误导、调包、借刀、抢口上；不要自动滑成纯打怪升级或纯战力闯关。',
    '阶段 summary 只写这一段到底在打什么仗：谁想守什么、谁在压、代价怎么变重、这一段收口后局面正式变成什么。',
    '阶段 summary 控制在 2 到 4 句，短、硬、能执行，不要写成长解释、背景说明、复盘报告。',
    '逐集细纲必须一集对一集，不准漏集、并集、跳集，也不准把别的集数混进来。',
    'summary、facts、sceneByScene 都不要解释“象征了什么”“说明了什么”“哪套道理被想通”；主题只能藏在动作后果和代价里，不准翻成作者解说。',
    'summary、episode summary、sceneByScene 里禁止使用“争证据”“争站队”“争时间”“主导权”“推进”“升级”“收束”这类 writer-room 词；都要翻成谁抢盒、谁堵门、谁把哪件东西拍到谁脸上。',
    '前 1-6 集不要反复直说主题词或价值观；先写这套东西怎样逼主角忍、让、藏、换条件、护人或反咬。进入当前 5 集批次的收口段后才允许点题，而且每集最多 1 次，必须贴着实物或已发生的后果，不准讲道理。',
    '第6集以后，每集 summary 第一短句必须先落在外场或私下动作：搜屋、拦路、处理代价、抢证、追人、毁约、换手、押送路上、门外堵截至少一种；如果第一句还是堂上流程、关押问话或盖章程序，说明主戏眼写歪了。',
    '第4集以后，scene1 禁止设在堂上流程、关押问话或盖章程序里；若上游真有问责，也只能挪到本集最短后半场。',
    '已确认正式事实不能只留在整季总述里；每一段至少让其中一条正式事实在 episode summary 或 sceneByScene 里显性落地。',
    ...rankIdentityRules,
    ...(generationStrategy.id === 'male_xianxia' ? monsterFactRules : []),
    ...detailedOutlineStrategyRules,
    '每一集先钉住一个本集戏眼：这一集到底在争人、争物、争证据、争名声、争时间还是争站队；summary 和 sceneByScene 都围着这个戏眼写。',
    '每一集都要写清：这一集最具体的推进动作、最直接的压强、最明显的代价变化、集尾继续点开的口子。',
    '“拿刀抵喉/绑住人逼交关键筹码/抓住情感杠杆角色逼主角现身”这种直给压法全季最多 2 次；上集用过，本集就换成证据、旧规、代价、父辈、名声、追兵、账册或职责筹码，别连续复制。',
    'sceneByScene 才是现役主数据，优先 3 场，2 场也可以但必须有两次独立变位；收束段优先 2-3 场，能并掉的解释场、疗伤场、议事场就并掉；每场都要写地点、时段、当下动作、当场压强、场尾钩子。',
    '【优先 3 场】每集优先写 3 场，只有当戏眼确实能用两场完整写完时才写 2 场。3 场集优先写法：scene1 起手压进来、scene2 对方回应变招、scene3 结果落地切尾钩。2 场集同样要求两场都有独立变位；不能一场交代起因、一场交代结果就结束。',
    '',
    '【打法轮换 · 强制变位】',
    '压法分类定义：',
    '- 硬夺类：抢钥匙/抢人/抢证据/绑人质/截人/夺物/搜身/拿把柄',
    '- 规则类：用把柄压/用旧账压/用职责压/用伤疤压/用名义压/追责令/公审/宣判/收证',
    '- 关系类：分化站队/情感绑架/信任背刺/利益分化/借刀杀人/反咬/条件交换/站队变化',
    '- 信息类：误导/试探/调包/截胡/反证/假情报/信息差碾压/暗桩/窃听',
    '- 时空类：时限倒计时/封锁出口/围困在某个地点/断水断粮/押送路上',
    '',
    '强制规则：',
    '1. 本集压法类型必须与上一集不同类',
    '2. 连续2集禁止使用同一类压法',
    '3. 连续5集必须出现至少1次"主角主动做局/先手反击"',
    '4. "绑人质逼交钥匙/拿刀抵喉"全季最多2次',
    '5. 如果上一集用了硬夺类，本集必须换成规则类/信息类/关系类至少一种',
    '相邻两集的逐集细纲不准出现相同地点+相同动作组合；如果上一集已经在同一地点抢同一件物，下一集必须换地点、换目标、换手法或换阶段，不能把同一段戏拆成两集重写。',
    '相邻两场 tension 不能只是同一句换说法，比如连续三场都只是“继续逼他交钥匙/继续拿人威胁”；每场至少新增一种真正变化：新信息、新伤口、新筹码、新站队、新误判、新暴露、新失手。',
    '每集至少安排一场不是被动挨压，而是有人主动做局、试探、借力、反咬、调包或拖时间。',
    '每一集的拉扯不能只剩一句动作摘要；至少要写出"我方动作→对方回应→局面变化"这三步，否则下游剧本一定会写瘦。',
    '【sceneByScene 密度硬规则】每一场 sceneByScene 必须同时包含：(1) 具体动作：谁用什么手段/拿什么物/在哪个地点做什么；(2) 压强细节：对方怎么被堵住、被逼、被威胁或被失手；(3) 结果句：谁输、谁赢、谁被揭穿、谁失去筹码或谁被堵门。不准只有态度变化或情绪判断，必须有实物动作和即时后果。如果某集的 sceneByScene 看完不知道"谁具体做了什么事导致什么结果"，这集骨架就偏薄，必须补实。',
    '【骨架偏薄识别】如果 sceneByScene 看完只知道"更危险了/被盯上了/局势更紧了/人物态度变了"，这就是骨架偏薄的信号。修复方法：把每一场的 setup 改成"谁做了什么具体动作"，把 tension 改成"对方当场怎么被堵住/失去/认输或被迫回应"，把 hookEnd 改成"谁出了什么事/哪扇门被关上/哪件物被抢走"。',
    '【骨架偏薄识别】如果 sceneByScene 每场都只有态度变化而没有实物动作，这就是骨架偏薄的信号。修复方法：每场 setup 必须写一个具体动作（"谁走进某地/谁拿什么东西/谁对谁做了什么"），每场 tension 必须写对方当场怎么被逼到（"谁被堵门/谁被夺走什么/谁被迫放弃什么"），hookEnd 必须写谁出了什么事。',
    '',
    '每一集至少要有 2 次独立变位：不能整集只围绕一次冲突展开；至少要有两次不同的争夺对象、两次不同的对手回应、两次不同的局面变化。如果一集只写了一次抢物、一次追人、一次对峙，说明这集骨架太薄，必须再加一次变位。',
    '每 3 集至少安排 1 次"主角或情感杠杆角色先让对手吃实亏"的主动回合：调包、反证、抢先递证、借规矩压回去、诈供、夺物至少一种成立。',
    '越到中后段，越要换打法：换战场、换压力来源、换筹码或换关系位次至少一种，不能只是把火力越拧越大。',
    '终局不能只剩大战收尾；必须把前面的人账、证据账、规则账或关系账至少收掉两条，让外压服务于收账，而不是替代收账。',
    '情感杠杆角色不能只做人质或陪跑，至少要主动带出一份证据、一个条件、一次交易、一次反咬或一次站队变化。',
    '情感杠杆角色至少一次亲手保管、调包、递送、换出或毁掉一件实物筹码（账册、鳞片、钥匙碎片、血书、衣物、药瓶至少一种），不能只负责传话或哭喊。',
    '后六集整段里，程序场主场总数最多 2 集，而且默认不能占 scene1；只有上游摘要明确写“当场对质/公审落锤”时，才允许它做本集的一场，而且必须是最短的一场。',
    '第4-7集如果上一集已经用了程序场，这一集第一场必须立刻转去路上、旧屋、外场、宅邸、公司、法院外、暗巷或门外动作，不能再让堂上场连续两集坐在 scene1。',
    '中段若上一集 scene1 已是程序场，这一集 scene1 必须改成路上、旧屋、外场、暗巷或门外动作；不要再从堂上场开场。',
    '同一集里，程序场最多只允许 1 场；如果还有下一拍，必须搬到门外、押送路上、住处、暗巷、山林或医庐继续推进。',
    '当前批次末场第一句不准从盖章句或堂上结果起手；必须改成谁刚出门就被刺旧伤、谁刚醒就收到急信、谁刚抢到账页就被人堵住。',
    '不要把“象征意义、话语权、势力格局、内部分裂”直接写成 summary；必须翻成谁拿着什么、想逼谁表态、谁堵路、谁抢盒、谁带证据跑。',
    '情感杠杆角色在中后段至少一次主动改局：传信、藏证、换条件、自救、反咬、拖时间，至少一种成立。',
    '当前 5 集批次如果某集只给 2 场，summary 里必须明确写出两次独立变位；不要用一条长句把“潜入+埋证+被盯梢”打包成一拍。每场都得有自己的局面变化和尾钩。',
    '当前 5 集批次每场只准完成一个推进回合：压进来、变招、结果落地，然后切场；不要在同一场里再接第二轮追打、第三次翻盘、第四段解释。',
    '当前 5 集批次每场正文目标就是 8-12 行的有效戏；如果 sceneByScene 一看就在同场塞三次变招、两段追打、好几轮问答，下游剧本一定发胖，必须先在详纲层删掉。',
    '收束段的当前批次末集若保留制度确认场，它只能做最短第三场：1句起手 + 1句结果，不准把职责令牌、新看守职责或侧殿合议写成尾钩。',
    '当前 5 集批次的 sceneByScene 不能只写“被盯上了/更危险了/局势更紧了”这种空钩；hookEnd 至少要落一个已经发生的外部动作：门被撞、纸被抢、血滴上去、人被堵住、黑影现身、脚步追到门口之一。',
    'sceneByScene 每场只写 1-2 句，优先 1 句 setup + 1 句 tension/hook；不要把同一场写成四五个逗号长句，后面剧本会一起发胖。',
    'sceneByScene 的 setup / tension / hookEnd 不准写“意识到、感到、明白、发现自己、沉默片刻、目光一沉”这类判断句或情绪句；要翻成谁把什么塞出去、谁被堵住、哪扇门被锁上、哪件物被抢走这种可拍变化。',
    'sceneByScene 若出现门外喊声、台阶下喝声、窗外示警，不准写成 `角色名：台词`；只能写成“△门外传来某人的喊声：……”这种动作描述，避免下游剧本继续长出画外音。',
    '当前批次末集第一场如果还是“侧殿听宣判 / 静室接处罚 / 合议堂落锤”，就算写错；先把上一集遗留的人、物、伤、追兵或残党动作写出来，再把制度结果塞进后面最短一场。',
    '不要把场景写成对本集 summary 的拆条解释；sceneByScene 读起来要像真的有镜头顺序和局面变化。',
    '所有字段都只写叙述句，不要写对白，不要出现””、「」或英文双引号里的台词，也不要写 `角色名：台词` 这种格式。',
    'hookEnd 也只写悬念动作和局面变化，不要直接塞一句台词。',
    '人物推动不能只写态度，要写他们这一集怎么硬撑、嘴硬、失手、让步、反咬。',
    '每集还必须输出 15 个创作骨架字段（与 summary 同级，直接挂在 episodes 数组的每个对象里）：',
    '  - coreGoal：本集主角核心目标（必须具体，不是”查明真相”而是”把账册送到刑部”）',
    '  - villainPressure：反派施加的致命压力（必须是真实生存威胁）',
    '  - pressureType：施压类型（四选一：武力胁迫 / 人质要挟 / 规则漏洞 / 利益分化）',
    '  - catharsisMoment：本集打脸爽点——主角利用信息差/隐藏底牌/布局陷阱，让反派当众吃瘪',
    '  - twistPoint：本集反转点',
    '  - cliffhanger：结尾钩子',
    '  - nextEpisodeTeaser：下集预告方向',
    '  - protagonistActionType：主角核心行动类型（五选一：装弱反击 / 冷静对峙 / 主动设局 / 借力打力 / 底牌碾压）',
    '  - viralHookType：本集钩子类型。第1集=入局钩子；末集=收束钩子；第5/10/15...集=打脸钩子；第3/6/9...集=身份钩子；其余=升级钩子/反转钩子',
    '  - signatureLineSeed：金句种子。基于本集核心道具、身份、证据或规则，生成一句15字以内的短钉子句方向（不是最终台词，是给下游的生成种子）。禁止输出空泛模板如”你也配”，必须绑定具体元素。',
    '  - payoffType：爽点类型。从以下16种中按集数轮换选择：证据打脸、身份碾压、羞辱反转、反派自食其果、反派被背刺、隐藏大佬撑腰、关键证人反水、你不是一个人、假证据被戳穿、反派权力被冻结、反派当众社死、反派下跪道歉、反派被规则反噬、主角一句话全场震动、主角一招秒杀全场、终极底牌亮出。',
    '  - payoffLevel：爽点级别。normal=常规爽点（大部分集）；major=每5集一次的大爽点（第5/10/15...集必须是major）；final=末集终局爽点（最后一集必须是final）。',
    '  - villainOppressionMode：反派压迫模式。四选一：规则压迫 / 权位压迫 / 利益分化 / 借刀杀人。禁止反派只靠吼叫、骂街、无脑栽赃。',
    '  - openingShockEvent：开局冲击事件。描述本集第一场必须发生的高损失/高羞辱/高危险/高反转事件之一，必须具体可见，不能抽象。',
    '  - retentionCliffhanger：集尾留客钩子。描述集尾必须停在新危机压到眼前的瞬间，最后一句台词扎心，强制观众点开下一集。',
    '输出必须是严格 JSON，不要 markdown，不要解释。',
    'JSON schema:',
    '{',
    '  "summary": string,',
    '  "episodes": [{',
    '    "episodeNo": number,',
    '    "summary": string,',
    '    "sceneByScene": [{"sceneNo": number, "location": string, "timeOfDay": string, "setup": string, "tension": string, "hookEnd": string}],',
    '    "coreGoal": string,',
    '    "villainPressure": string,',
    '    "pressureType": "武力胁迫" | "人质要挟" | "规则漏洞" | "利益分化",',
    '    "catharsisMoment": string,',
    '    "twistPoint": string,',
    '    "cliffhanger": string,',
    '    "nextEpisodeTeaser": string,',
    '    "protagonistActionType": "装弱反击" | "冷静对峙" | "主动设局" | "借力打力" | "底牌碾压",',
    '    "viralHookType": string,',
    '    "signatureLineSeed": string,',
    '    "payoffType": string,',
    '    "payoffLevel": "normal" | "major" | "final",',
    '    "villainOppressionMode": "规则压迫" | "权位压迫" | "利益分化" | "借刀杀人",',
    '    "openingShockEvent": string,',
    '    "retentionCliffhanger": string',
    '  }]',
    '}',
    `episodes 只能覆盖第${input.startEpisode}-${input.endEpisode}集，而且必须全部覆盖。`,
    '',
    `剧本名称：${input.outline.title}`,
    `题材：${input.outline.genre}`,
    `主题：${input.outline.theme}`,
    `主角：${input.outline.protagonist}`,
    `核心冲突：${input.outline.mainConflict}`,
    `整季粗纲总述：${input.outline.summary}`,
    input.previousActSummary ? `上一段已经落定：${input.previousActSummary}` : '',
    `本段粗纲逐集：\n${formatDetailedOutlineEpisodes(input.episodes)}`,
    `已确认正式事实：\n${formalFactBlock}`,
    `更上层推进合同：\n${storyIntentBlock}`,
    `【人物背景参考资料（RAG底料）】\n${characterSummary || '当前人物信息为空'}\n\n注意：以上人物信息仅供参考，是背景资料库，不是硬性合同；请根据实际剧情需要灵活运用。`
  ]
    .filter(Boolean)
    .join('\n')
}
