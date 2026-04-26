import type { OutlineDraftDto } from '@shared/contracts/workflow'
import type { MarketProfileDto } from '@shared/contracts/project'
import { buildFormalFactSceneDirectives } from './build-formal-fact-scene-directives'
import { isFormalFactSemanticLabel } from '@shared/domain/formal-fact/semantic-label'
import {
  resolveGenerationStrategy,
  type GenerationStrategy
} from '@shared/domain/generation-strategy/generation-strategy'

interface BuildEpisodeSceneDirectivesOptions {
  marketProfile?: MarketProfileDto | null
  genre?: string | null
}

function hasConfirmedFact(outline: OutlineDraftDto, label: string): boolean {
  return outline.facts.some(
    (fact) => fact.status === 'confirmed' && isFormalFactSemanticLabel(fact, label)
  )
}

function resolveTotalEpisodes(outline: OutlineDraftDto): number {
  return Math.max(outline.summaryEpisodes?.length || 0, outline.planningUnitEpisodes || 0)
}

function resolveBatchContext(
  episodeNo: number,
  totalEpisodes: number
): {
  isBatchClosingSection: boolean
} {
  const batchSize = 5
  const batchIndex = Math.floor((episodeNo - 1) / batchSize)
  const batchStart = batchIndex * batchSize + 1
  const batchEnd = Math.min(batchStart + batchSize - 1, totalEpisodes)
  const positionInBatch = episodeNo - batchStart + 1
  const batchEpisodeCount = Math.max(1, batchEnd - batchStart + 1)

  return {
    isBatchClosingSection: positionInBatch >= Math.max(1, batchEpisodeCount - 2)
  }
}

export function buildEpisodeSceneDirectives(
  outline: OutlineDraftDto,
  episodeNo: number,
  options: BuildEpisodeSceneDirectivesOptions = {}
): string[] {
  const generationStrategy = resolveGenerationStrategy({
    marketProfile: options.marketProfile,
    genre: options.genre || outline.genre,
    storyIntentGenre: `${outline.mainConflict || ''}\n${outline.summary || ''}`,
    title: outline.title
  }).strategy

  if (generationStrategy.id !== 'male_xianxia') {
    return [
      ...buildGenericEpisodeSceneDirectives(generationStrategy, outline, episodeNo),
      ...buildFormalFactSceneDirectives(outline, episodeNo)
    ]
  }

  const lines = [
    '每场先钉住一个当场争夺对象：人、物、证据、口风、时间或站队至少一种；没有争夺对象，就不要把这场写成解释稿。',
    '先把这场最能卖的反差、错位或关系不对劲打出来，再补其他信息。',
    '如果底稿偏权谋、智斗或"靠智慧周旋"，优先让人物做局、试探、借势、反证、反咬、拖时间，不要自动滑成纯打斗和纯追杀。',
    '妖兽、灾变、高手外压只能放大人祸，不能反客为主抢走主导戏份；就算打起来，也要写清是谁借外压做局、谁在拿外压逼人、谁因此失势。',
    'sceneByScene 只是骨架，不是逐句翻译稿；setup、tension、hookEnd 都要落成眼前正在发生的戏。',
    '正文里不准出现"（站位：…）""（钉子句）""（说明）"这类幕后注释。',
    '对白先带目的和算计，再带信息；能抢话就抢话，能打断就打断，不要整段播报现状。',
    '如果一句对白换给对手、主角或旁人说都成立，说明这句还没写到人身上，必须继续改。',
    '对白不要一口气把信息讲满，优先让人物先顶一句、躲一句、反咬一句，再把真正要命的信息漏出来。',
    '不要直接端出"他很生气""她很难过"这种情绪结论，要把情绪压强落在停顿、顶嘴、反咬、让步、手上动作和代价里。',
    '少写"盯着/看向/沉默/皱眉/闭眼/意识到"这类微动作；不改局就删。',
    '不要把"争证据""争站队""争时间""主导权"这类策划词直接写进 sceneByScene；翻成抢盒、堵门、截人、毁契、换手、逼供。',
    '第4集以后，scene1 禁止落在偏殿、审讯室、地牢、执事房、广场宣判或侧殿听令；若上游真有问责，也只能放到本集最短后半场。',
    '每场至少要让一件东西真的变了：人被抢走、证据换手、口风漏出、位置调换、伤口变重、退路变窄，至少一种成立。',
    '"拿刀抵喉/绑住人逼交钥匙/抓住小柔逼黎明现身"这种直给压法全季最多 2 次；如果上集刚用过，这集就换证据、旧规、伤势、残党、账册、名声或职责筹码。',
    '相邻两场的推进手法必须变化；上一场若是正面逼压，下一场就优先换成试探、误导、借势、调包、关系倒挂或抢口风。',
    '公审、议事、对质类场景只保留最能改局的 4-6 句发言；不要让所有人轮流表态，把一场写成会议纪要或说明会。',
    '如果当前集 sceneByScene 已给出山林、密室、旧巢、医庐、静室、居所或路上动作，就不要自作主张把第一场改成议事殿、公审或质询场；殿内场只能退成最短确认场。',
    '不要套"殿内对质 -> 廊道威胁 -> 夜潜查证 -> 再回殿里质询"的循环；后半程主发动机必须轮到抢人、追逃、取证、伤势、交易或职责落身。',
    '当前 5 集批次若其他道观、使者、长老或新上位者入场，他们只能拿旧账加压，不能取代黎明、小柔、李科、钥匙、伤势和证据这条主线。',
    '终局场次不能只剩大战收尾，至少要把前面的人账、证据账、规则账或关系账收掉两条。',
    '情绪只准藏在△动作、对白语气和人物当场反应里，不要另起一行做情绪总结，更不要替人物写分析报告。',
    '每场都要尽快给出一口当下可兑现的情绪，不要一直拖到后面才让观众爽、痛或心里一紧。',
    '每一场都必须比上一场更往前一步，不能只把上一场换个说法重新写一遍。',
    '不要写画外音、旁白、幕后播报；对白行里不准出现（画外音/旁白/OS），人物栏里没出现的人也不准隔空说话。',
    '门外、窗外、台阶下、身后的声音，一律先写成△门外传来某人的喊声/脚步声/砸门声；等人真正冲进场，再让他开口，不准直接写"某人：（画外音）"。',
    '反例：李科：（画外音）让他进来。正例：△堂内传来李科的声音："让他进来。" 反例：小柔：（画外音）黎明！正例：△门外突然传来小柔的喊声："黎明！"',
    '潜入、搜屋、尾随、躲藏、包扎、换药这类场也不能整场默剧；至少落一次可听见的人声交锋、低声试探、门外喊话、短促示警或喘着回话。'
  ]

  const totalEpisodes = resolveTotalEpisodes(outline)
  const batchContext = resolveBatchContext(episodeNo, totalEpisodes)
  const isMidRun =
    totalEpisodes >= 8 && episodeNo >= 4 && episodeNo <= Math.min(7, totalEpisodes - 3)
  const isFinalRun = batchContext.isBatchClosingSection

  if (isMidRun) {
    lines.push(
      '如果上一集刚是执事、长老、公审或合议落锤，这一集第一句不准再由他们开口；先让伤口、追兵、钥匙、证据或残党动作闯进来。'
    )
    lines.push(
      '第4-7集若制度压力入场，第一场优先写押送路上、门外堵截、搜物、换手、封口、换药或截人；别连着用哨岗、偏殿、审讯室、合议堂。'
    )
    lines.push(
      '"被带去问话/对质"不算推进；至少再发生投毒、塞证据、抢钥匙、封口、掉包、截人或追逃之一。'
    )
    lines.push(
      '同一集若已经用了 1 场偏殿、审讯、合议或哨岗，第二拍就搬到门外、押送路、屋外、巷里或山林，不准连着两场同地点质询。'
    )
    lines.push('上一集刚在制度场落锤，这一集就回路上、门外、山林、旧屋或静室收账，别再开第二场会。')
  }

  if (isFinalRun) {
    lines.push(
      '当前 5 集批次的收口段优先收人账、证据账、规则账、关系账：谁被揭穿、谁失去筹码、谁被迫表态、谁拿证据换命、谁被追责，至少落两条。'
    )
    lines.push(
      '当前 5 集批次的收口段不准连续靠运功、法阵、镇压、长老解释或天地异象推进；外压只能把抢人、逼供、翻案、追责、争物、换站队推得更狠。'
    )
    lines.push(
      '师父、长老、高手若出场，只能改规则、压时限、给条件、逼表态，不能替主角把最后的人账收完。'
    )
    lines.push(
      '第6集以后别让师父、执事把新账册、新记录、新证词送进场里当第一证据；关键证据必须先由主角或情感杠杆角色拿到、藏住、换出或逼出来。'
    )
    lines.push(
      '情感杠杆角色不能只做人质或陪跑，至少要主动带出一份证据、一个条件、一次交易、一次反咬或一次站队变化。'
    )
    lines.push(
      '主角或情感杠杆角色每集至少亲手推进一次关键变化：拿证据、换条件、截人、自救、反咬、夺物，至少一种成立；不准把收账动作全交给师父、长老或群体裁决。'
    )
    lines.push(
      '小柔这类情感杠杆角色在当前 5 集批次的收口段至少有一次主动动作改局，不能一路只被押着等人救。'
    )
    lines.push(
      '不要把"名分""象征意义""话语权"当对白中心；把抽象争夺翻成谁要抢盒、谁要截人、谁被逼站队。'
    )
    lines.push(
      '前 1-6 集不要让人物把谦卦、不争、大道直接讲明白；当前批次若必须点题，也只准贴着空钥匙、血契、伤口、卷轴或已经发生的后果说一句。'
    )
    lines.push(
      '当前 5 集批次的末两集不准让师父、长老直接废修为、收钥匙、投入炼炉或当众宣判来替主角收账；这些只能在主角或情感杠杆角色先把局面做成后，作为确认后果的半步。'
    )
    lines.push(
      '若上一集已经用了公审、殿内对质或合议，这一集必须转去潜入、截人、毁契、抢证、追逃或私下交易，不准再写第二场大会。'
    )
    lines.push(
      '当前 5 集批次的末两集整集最多只允许 1 场公审、议事或殿内对质主场；其余场次必须拿去抢证、抢人、追残党、处理伤势或接新职责。'
    )
    lines.push(
      '当前批次末集的第一场不准从合议堂、卷轴宣读、代表宣判或长老落锤开场，必须从上一集留下的伤势、血契、碎钥匙、残党动作或未完追压起手。'
    )
    lines.push(
      '当前批次末集的第一场如果是静室听宣判或侧殿领处分，就是偷懒，改成上一集麻烦直接闯进门。'
    )
    lines.push(
      '当前批次末集若保留侧殿、合议、接任、令牌或职责确认场，它只能是本批次最短一场；最后一句不准停在职责令牌、新看守职责、合议确认或制度说明上，必须回到残党、监视、伤势、证据外流或人际站位变化。'
    )
    lines.push(
      '当前 5 集批次的末两集不准临时抬出堂兄、师叔、新残党头子这类新名字接管尾声；余波只能落回现有人物和旧账。'
    )
    lines.push(
      '当前 5 集批次的末两集若必须出现接任、认罚、废修为、宣判或宗门表态，只能放在最短一场做结果确认；真正主戏仍要落在抢证、护人、烧钥匙、带伤选择或旧账收口。'
    )
    lines.push(
      '当前批次末集的余波优先留在人际站位、职责变化、证据外流、伤势代价和旧账未清，不要临时抬出更大怪物、更高封印层或新世界秘密。'
    )
    lines.push(
      '当前 5 集批次的收口段优先写伤势处理、残党动作、证据换手和新职责落身；宗门追责、内部清洗、权位重排只能当后果背景，不能自己变成整集主戏。'
    )
    lines.push(
      '当前 5 集批次如果执事、外门执事、偏殿、公议或合议必须出现，只准做过门：收证、定时限、转身离场；不准围着执事来回对质三轮。'
    )
    lines.push(
      '当前 5 集批次的收口段如果场景落在包扎、疗伤、潭边、锁旁或歇脚处，不准让人物互问"为什么藏到现在/为什么不争/师父说了什么"；要把推进落在压伤口、藏账页、塞碎钥匙、换路或盯残党上。'
    )
    lines.push(
      '当前 5 集批次若主题必须露面，只准贴着空锁、血迹、账页、碎钥匙、撤退脚步或已发生的代价说一句短句；不准写"守空才能不争""空的，才是真的"这类定义句。'
    )
    lines.push(
      '当前 5 集批次就算只有 2 场，也要让每场各自完成一次独立变位：实物换手、伤口加重、追兵压近、残党现身、门被撞开至少一种成立；别用一条长句把三拍戏压成一场摘要。'
    )
    lines.push(
      '当前 5 集批次每场只准打一轮：压进来 -> 变招 -> 结果落地，然后切场；同一场里不准再接第二轮追打、第三次翻盘、第四段解释。'
    )
    lines.push(
      '场级预算必须硬控：2 场集每场目标 420-560 字，3 场集每场目标 280-380 字，4 场集每场目标 220-300 字；2 场集单场超过 650 字、3 场集单场超过 450 字、4 场集单场超过 340 字都算写胖。'
    )
    lines.push(
      '当前 5 集批次每场正文尽量压在 8-12 行内；一旦开始重复吼、重复逼问、重复追打、重复解释，就说明这场已经超了，立刻删到只剩最值钱的一轮。'
    )
    lines.push(
      '瘦场也不准只剩提纲句：2 场集单场低于 320 字、3 场集单场低于 220 字、4 场集单场低于 180 字，就补对手回应、动作结果和当场代价，不准拿解释句凑字数。'
    )
    lines.push(
      '当前 5 集批次的收口段如果有人还没进本场人物表，就不准直接写成"某人：对白"；门外喊声、台阶下喝声、窗外示警，一律先写成△传来某人的声音："……"'
    )
  }

  if (episodeNo === 1) {
    lines.push('第 1 场先只盯住一条主压强：对手当面逼压，主角为了守人和守物硬压着不动，当场吃亏。')
    lines.push('第 1 场开头 30% 内容内就要起冲突，不能先铺世界观和人物分析。')
    lines.push('第 1 场必须写清主角眼下最想守住的人或物，而且这个选择要立刻害他付出看得见的代价。')
    lines.push(
      '第 1 场必须让观众明确看见"他明明能动手，却因为旧规矩、旧誓言或师父交代硬压着不动"。'
    )
    lines.push(
      '第 1 场必须让观众一眼看懂这部戏最不对劲、最反常、最值得点开的地方，不准把设定成交点藏到后面。'
    )
    lines.push(
      '第 1 场对白先不要急着讲明白前情，先让观众从顶撞、嘴硬、试探、护短里听见关系和压强。'
    )
    lines.push('第 1 场关键对白必须带人物自己的口气和站位，不能换个人说也通。')

    if (hasConfirmedFact(outline, '对手压力')) {
      lines.push(
        '第 1 场必须让对手本人亲自出场并当面施压，不能只让手下代打，也不能只用"李爷""那位爷"这类影子称呼带过。'
      )
      lines.push('对手施压时，必须直接冲着主角要守的人或要守的东西来，让观众一眼看懂谁在压谁。')
    }

    if (hasConfirmedFact(outline, '师父角色')) {
      lines.push(
        '第 1 场必须让师父的嘱托、规矩、旧事、物件或警告至少一种正在起作用，而且要直接影响主角当场的选择。'
      )
    }

    if (hasConfirmedFact(outline, '关键关系')) {
      lines.push('第 1 场必须让关键关系对象当场被卷进冲突，并和主角发生一次带伤感的互动。')
    }

    if (hasConfirmedFact(outline, '关键道具')) {
      lines.push('第 1 场必须让关键道具进入动作或对白，而且它要成为本场冲突焦点之一。')
    }

    lines.push(
      '第 1 场必须带出一次师父、旧事或旧规矩在主角心里被触发的瞬间，最好直接出现一句师父旧话、旧规矩或旧告诫，形成看得见的记忆回声。'
    )
    lines.push(
      '如果上游主冲突里已经有妖兽危机或更大外压，第 1 场至少要露一个不安信号，不能把整条大压强完全留空。'
    )
    lines.push('第 1 场结尾必须留下立刻要发生的硬钩子，例如搜身、夺物、带走人、限时威胁。')
    lines.push('第 1 场结尾要让人明确感到"下一秒麻烦会更大"，不能只是正常收尾。')
    lines.push(
      '第 1 场最后两句里，至少有一句必须是"下一秒就会发生"的具体动作或逼压，不能只停在主角心里发紧、决定变重这种感受上。'
    )
    lines.push(
      '如果结尾没有门外脚步、刀再压近、手已经伸过来、对手开始动手、有人被拖走、时限被钉死这类眼前动作，就说明钩子还没落地，继续改。'
    )
    lines.push(
      '第 1 场最后一句优先写"已经开始发生"的动作，不要只写"他准备去做什么""他意识到什么"。'
    )
    lines.push(
      '如果结尾还是停在计划、决心、意识到、知道自己必须这类收口，说明承接点还是假的，必须改成已经压到眼前的动作或危险。'
    )
    lines.push('只要上面这条主压强已经成立，其他信息一律让位，不要平均用力。')
  }

  return [...lines, ...buildFormalFactSceneDirectives(outline, episodeNo)]
}

function buildGenericEpisodeSceneDirectives(
  strategy: GenerationStrategy,
  outline: OutlineDraftDto,
  episodeNo: number
): string[] {
  const totalEpisodes = resolveTotalEpisodes(outline)
  const batchContext = resolveBatchContext(episodeNo, totalEpisodes)
  const sceneSpaces = strategy.worldLexicon.factionTypes.join('、')
  const roles = strategy.worldLexicon.roleTitles.join('、')
  const conflictObjects = strategy.worldLexicon.conflictObjects.join('、')
  const payoffActions = strategy.worldLexicon.payoffActions.join('、')
  const lines = [
    `【题材场景策略：${strategy.label}】`,
    `场景空间优先贴合：${sceneSpaces}。`,
    `人物身份优先贴合：${roles}。`,
    `每场先钉住一个当场争夺对象，优先从${conflictObjects}里选；没有争夺对象，就不要把这场写成解释稿。`,
    `每集至少推动一种可见变化：${payoffActions}。`,
    '禁用其他题材的组织、称谓、能力体系；本集只使用当前题材策略内的世界词库。',
    'sceneByScene 只是骨架，不是逐句翻译稿；setup、tension、hookEnd 都要落成眼前正在发生的戏。',
    '正文里不准出现"（站位：…）""（钉子句）""（说明）"这类幕后注释。',
    '对白先带目的和算计，再带信息；能抢话就抢话，能打断就打断，不要整段播报现状。',
    '如果一句对白换给对手、主角或旁人说都成立，说明这句还没写到人身上，必须继续改。',
    '不要直接端出"他很生气""她很难过"这种情绪结论，要把情绪压强落在停顿、顶嘴、反咬、让步、手上动作和代价里。',
    '每场至少要让一件东西真的变了：证据换手、口风漏出、位置调换、退路变窄、关系公开、条件改写，至少一种成立。',
    '相邻两场的推进手法必须变化；上一场若是正面逼压，下一场就优先换成试探、误导、借势、调包、关系倒挂或抢口风。',
    '情绪只准藏在△动作、对白语气和人物当场反应里，不要另起一行做情绪总结，更不要替人物写分析报告。',
    '不要写画外音、旁白、幕后播报；对白行里不准出现（画外音/旁白/OS），人物栏里没出现的人也不准隔空说话。'
  ]

  if (batchContext.isBatchClosingSection) {
    lines.push(
      '当前 5 集批次的收口段优先收人账、证据账、规则账、关系账：谁被揭穿、谁失去筹码、谁被迫表态、谁拿证据换条件，至少落两条。'
    )
    lines.push(
      '当前批次末集的第一场必须从上一集留下的未完压力起手，不要开成制度说明、代表宣判或抽象总结。'
    )
    lines.push(
      '当前 5 集批次每场只准打一轮：压进来 -> 变招 -> 结果落地，然后切场；不要在同一场里接多轮重复逼问。'
    )
  }

  if (episodeNo === 1) {
    lines.push('第 1 场开头 30% 内容内就要起冲突，不能先铺世界观和人物分析。')
    lines.push(
      `第 1 场必须让观众一眼看懂这个${strategy.label}故事最不对劲、最反常、最值得点开的地方。`
    )
    lines.push(
      `第 1 场必须让${conflictObjects}至少一种进入动作或对白，而且它要成为本场冲突焦点之一。`
    )
    lines.push('第 1 场结尾必须留下立刻要发生的硬钩子，例如搜查、带走人、限时威胁、证据被抢或关系公开。')
  }

  return lines
}
