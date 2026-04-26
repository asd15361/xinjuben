import type { StoryIntentPackageDto } from '@shared/contracts/intake'
import type { CharacterDraftDto } from '@shared/contracts/workflow'
import {
  resolveGenerationStrategy,
  type GenerationStrategy
} from '@shared/domain/generation-strategy/generation-strategy'
import { parseStructuredGenerationBrief } from './summarize-chat-for-generation-support'

type BriefCharacterCard = { name?: string; summary?: string }
type BriefCharacterLayer = { name?: string; layer?: string; duty?: string }
type StrategyTextContext = {
  conflictPrize: string
  pressureNetwork: string
  homeGround: string
  processGround: string
  protectorResources: string
}

const GENERIC_FIELD_PATTERNS = [
  /表面带着自己最容易被看到的角色样子/,
  /背后压着一条会影响主线的私人压力/,
  /最怕自己所在的位置被直接夺走/,
  /有自己一定要守的关系或立场/,
  /一旦自己的软肋被碰到，就会改变站位/,
  /对主线有独特作用/,
  /一旦站位被看穿就容易反噬/,
  /把自己手里的那条主线杠杆真正用起来/,
  /从局内人变成真正改变局面的关键杠杆/,
  /现在最大的压力，是一旦跟.+这条冲突线绑死/,
  /最怕自己被彻底卷进主线以后/,
  /想守住自己还能掌控的那点位置/,
  /只要有人逼他在.+之间明确站队/,
  /不再只当别人推动剧情的背景板/,
  /会从被局势裹着走，变成能把局面往前拱一把/,
  /^对主线有独特作用$/,
  /^一旦站位被看穿就容易反噬$/,
  /基本秩序，以及自己还能补救的现场关系/,
  /背下现场后果/,
  /现场变局之间/,
  /局势绕过程序/,
  /承认局势已经失控/,
  /承担站队代价/,
  /表面像一股越来越近的外压/,
  /不是站队角色/,
  /不会替任何人守体面/,
  /把外压推上台面/,
  /实质灾难/,
  /不需要讲情分也不需要讲规矩/,
  /把这条线里的漏洞和代价全部逼出来/,
  /最怕的不是输赢/,
  /被提前压回去/,
  /真正受什么吸引/,
  /凶性就能被提前引爆或反关/
]

function cleanText(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[，。；、]+|[，。；、]+$/g, '')
    .trim()
}

function isGenericField(value: string): boolean {
  const text = cleanText(value)
  return !text || GENERIC_FIELD_PATTERNS.some((pattern) => pattern.test(text))
}

function pickKeyAsset(text: string): string {
  if (text.includes('钥匙')) return '钥匙'
  if (text.includes('秘宝')) return '秘宝'
  if (text.includes('证据')) return '证据'
  return '关键底牌'
}

function pickWorldThreat(text: string): string {
  if (text.includes('蛇子')) return '蛇子'
  if (text.includes('妖兽')) return '妖兽危机'
  if (text.includes('宗门')) return '宗门压力'
  return '外部压力'
}

function pickPressureSource(text: string, fallback: string): string {
  const normalizedFallback = normalizePressureSource(fallback)
  if (normalizedFallback !== '外部压力' && text.includes(normalizedFallback)) return normalizedFallback
  if (text.includes('李科')) return '李科'
  if (text.includes('大长老')) return '大长老'
  if (text.includes('云天鹤')) return '云天鹤'
  if (text.includes('天衍真人')) return '天衍真人'
  if (text.includes('赵无极')) return '赵无极'
  if (text.includes('赵无忌')) return '赵无忌'
  if (/魔渊(?:遗脉|旧部|残部)?/u.test(text)) return '魔渊遗脉'
  if (/青云宗/u.test(text) && /外门|同门|狗腿|弟子/u.test(text)) return '青云宗外门'
  if (text.includes('天道盟')) return '天道盟'
  if (text.includes('仙盟')) return '仙盟'
  if (text.includes('慕容家')) return '慕容家'
  if (text.includes('家族')) return '家族'
  return normalizedFallback
}

function normalizePressureSource(value: string): string {
  const text = cleanText(value)
  if (!text) return '外部压力'
  if (/^(反派|对手|敌人|名门正派大小姐|反派大小姐|真女主|女主)$/u.test(text)) {
    return '外部压力'
  }
  return text
}

function firstClause(text: string): string {
  return cleanText(text.split(/[。！？]/)[0] || text)
}

function stripLeadingNamePredicate(text: string, name: string): string {
  const clean = cleanText(text)
  if (!name) return clean
  return clean.replace(new RegExp(`^${name}[是为乃]?`), '').trim() || clean
}

function inferFamilyLabel(input: { name: string; summary: string; antagonist: string }): string {
  const text = `${input.name}\n${input.summary}\n${input.antagonist}`
  for (const match of text.matchAll(/([\p{Script=Han}A-Za-z]{2,4}家)(?:族|世家|家主|家门)?/gu)) {
    const candidate = match[1]
    if (/为家|成家|本家|养为家|培养/u.test(candidate)) continue
    return candidate
  }

  const surname = input.name.trim().match(/^[\p{Script=Han}]/u)?.[0]
  if (surname) return `${surname}家`

  return '本家族'
}

function isLikelyMasculineName(name: string): boolean {
  return /(?:尘|渊|寒|霄|啸|天|岳|强|雄|峰|川|辰|墨|风|鹤|玄|昊|烈|锋|海|山|阳|明|凡|修|远)$/u.test(
    cleanText(name)
  )
}

function neutralizeFemaleTermsForMasculineName(value: string, name: string): string {
  const text = cleanText(value)
  if (!text || !isLikelyMasculineName(name)) return text
  return text
    .replace(/她/g, '他')
    .replace(/师妹/g, '同门')
    .replace(/少女/g, '年轻弟子')
    .replace(/大小姐/g, '少主')
    .replace(/嫡女/g, '嫡系子弟')
    .replace(/姑娘/g, '年轻弟子')
}

function stripGenericProtagonist(value: string, protagonist: string): string {
  const name = protagonist.trim()
  if (!name || name === '主角') return value
  return value.replace(/主角/g, name)
}

function buildStrategyTextContext(strategy: GenerationStrategy): StrategyTextContext {
  if (strategy.id === 'male_xianxia') {
    return {
      conflictPrize: '血脉',
      pressureNetwork: '仙盟',
      homeGround: '宗门',
      processGround: '宗门暗处流程',
      protectorResources: '掌门之女身份调阅秘档、动用密道和宗门情报，也能用上乘道法'
    }
  }

  const conflictPrize =
    strategy.worldLexicon.conflictObjects.slice(0, 2).join('和') || '核心筹码'
  const pressureNetwork = strategy.worldLexicon.factionTypes[0] || '对手势力'
  const homeGround = strategy.worldLexicon.factionTypes[0] || '所在阵营'
  const processGround = `${homeGround}内部流程`
  const protectorResources = `${homeGround}身份、人脉、信息渠道和关键物件`

  return {
    conflictPrize,
    pressureNetwork,
    homeGround,
    processGround,
    protectorResources
  }
}

function cleanPublicMask(value: string, name: string): string {
  return stripLeadingNamePredicate(value.replace(/^表面[是：:]\s*/u, ''), name)
}

function buildStructuredArc(input: {
  start: string
  trigger: string
  wobble: string
  cost: string
  end: string
}): string {
  return `起点：${cleanText(input.start)}；触发：${cleanText(input.trigger)}；摇摆：${cleanText(input.wobble)}；代价选择：${cleanText(input.cost)}；终局变化：${cleanText(input.end)}。`
}

function buildV2FallbackFields(input: {
  name: string
  summary: string
  layer: string
  protagonist: string
  antagonist: string
}): Pick<CharacterDraftDto, 'appearance' | 'personality' | 'identity' | 'values' | 'plotFunction'> {
  const summary = cleanText(input.summary)
  const shortSummary = firstClause(summary) || `${input.name}是局中关键人物`
  const roleHint = input.layer.includes('情感')
    ? '情感杠杆角色'
    : input.layer.includes('规则')
      ? '规则杠杆角色'
      : '局中行动角色'

  return {
    appearance: `${input.name}给人的第一印象是带着压场气息的关键人物，外形与穿着都服务于其在局中的功能位置。`,
    personality: `${input.name}在高压局面里偏向谨慎观察、临场应对，也会在触及自身立场时迅速做出反击。`,
    identity: shortSummary,
    values: input.antagonist
      ? `更看重在${input.protagonist || '主角'}与${input.antagonist}的对撞里保住自己认定的立场与筹码。`
      : `更看重在主线冲突里守住自己认定的立场与筹码。`,
    plotFunction: `${input.name}承担${roleHint}，负责把当前局面继续往前推，而不是只做背景板。`
  }
}

function buildEmotionLeverDraft(input: {
  name: string
  summary: string
  protagonist: string
  antagonist: string
  strategy: GenerationStrategy
}): Partial<CharacterDraftDto> {
  const pressureSource = pickPressureSource(input.summary, input.antagonist)
  const strategyContext = buildStrategyTextContext(input.strategy)
  const protagonist = input.protagonist || '主角'
  const summary = stripLeadingNamePredicate(firstClause(input.summary), input.name)
  const isFamilyPawn = /家族|家主|独女|棋子|收养|苏家|慕容家/u.test(input.summary)
  const familyLabel = inferFamilyLabel({
    name: input.name,
    summary: input.summary,
    antagonist: input.antagonist
  })
  if (isFamilyPawn) {
    return {
      publicMask: summary,
      hiddenPressure: `${input.name}被${familyLabel}和${pressureSource}同时当成接近${protagonist}的棋子，越动真心越难完成争夺${strategyContext.conflictPrize}的任务。`,
      fear: `最怕任务失败牵连${familyLabel}，也怕${protagonist}看穿后再也不信${input.name}。`,
      protectTarget: `${familyLabel}给${input.name}的身份、自己最后的选择权，以及还能撤回来的退路。`,
      conflictTrigger: `只要${pressureSource}逼${input.name}牺牲${protagonist}，或${protagonist}因${input.name}的假意受伤，${input.name}就会被逼重新站队。`,
      advantage: `${input.name}能用亲近、试探和传递假情报制造信息差，也能在关键时刻反咬${pressureSource}。`,
      weakness: `${input.name}的软肋是${familyLabel}和真实感情，一旦两边同时被拿住，就会被迫做痛苦选择。`,
      goal: `先完成${pressureSource}交代的接近任务，再决定自己到底要守${familyLabel}还是守${protagonist}。`,
      arc: buildStructuredArc({
        start: `${input.name}被训练成只按家族任务行动的棋子`,
        trigger: `${pressureSource}逼${input.name}牺牲${protagonist}`,
        wobble: `${input.name}开始怀疑${pressureSource}所谓正义只是夺取${strategyContext.conflictPrize}的借口`,
        cost: `必须在${familyLabel}的安全和${protagonist}的信任之间割掉一边`,
        end: `${input.name}亲手决定是背叛任务还是完成救赎`
      })
    }
  }
  return {
    publicMask: summary,
    hiddenPressure: `${input.name}一边被${pressureSource}盯上，一边会因为和${protagonist}的关系变化把局面越推越险。`,
    fear: `最怕自己被人强行夺走，也最怕把${protagonist}一起拖进更深的险局。`,
    protectTarget: '想守住自己的选择、体面和还能信人的那口气。',
    conflictTrigger: `只要${pressureSource}再拿${input.name}当筹码，或${protagonist}因为${input.name}受伤，${input.name}就会被逼得重新站位。`,
    advantage: `${input.name}最能撬动的不是硬实力，而是关系温度、信任变化和别人不敢轻放的情感代价。`,
    weakness: `${input.name}一旦真把心和命门交出去，就最容易被${pressureSource}顺着这条线拿来逼${protagonist}。`,
    goal: '先活下来，再看清谁才是真正值得靠近的人。',
    arc: buildStructuredArc({
      start: `${input.name}只想先保住自己`,
      trigger: `${pressureSource}拿${input.name}当筹码，或${protagonist}因${input.name}受伤`,
      wobble: `${input.name}开始分不清自保、信任和利用之间哪一个还能站住`,
      cost: `必须把自己的退路、体面或一段关系拿出来交换`,
      end: `${input.name}从被动承压变成能主动逼出主线选择的情感杠杆`
    })
  }
}

function buildRuleLeverDraft(input: {
  name: string
  summary: string
  protagonist: string
  generationBriefText: string
}): Partial<CharacterDraftDto> {
  const asset = pickKeyAsset(input.generationBriefText)
  const worldThreat = pickWorldThreat(input.generationBriefText)
  return {
    publicMask: `表面是${firstClause(input.summary)}。`,
    hiddenPressure: `${input.name}既要压住${worldThreat}，也要盯着${input.protagonist || '主角'}把${asset}这条传承线走明白。`,
    fear: `最怕${worldThreat}提前失控，也最怕${input.protagonist || '主角'}在没悟透前就被逼着亮底。`,
    protectTarget: `想守住${worldThreat}的边界、${input.protagonist || '主角'}这条传承线，以及${asset}背后的规矩。`,
    conflictTrigger: `只要${worldThreat}越线，或有人逼近${asset}和${input.protagonist || '主角'}，她就会出手改局。`,
    advantage: `${input.name}真正的优势，是比任何人都更早看清${asset}和${worldThreat}背后的规矩与次序。`,
    weakness: `${input.name}最大的短板，是一旦必须提前亮明规矩和底线，自己多年压住的布局就会被迫提早翻面。`,
    goal: `压住${worldThreat}，同时用${asset}背后的规矩卡住${input.protagonist || '主角'}必须表态的时限。`,
    arc: buildStructuredArc({
      start: `${input.name}躲在幕后镇守旧规`,
      trigger: `${worldThreat}越线或${asset}被人抢到台前`,
      wobble: `继续藏规则会害人，提前亮底又会毁掉多年布局`,
      cost: `必须拿自己的权威、旧规和镇守秘密去换一次现场改局`,
      end: `她从幕后守规矩走到亲自改规则、压时限、认证后果`
    })
  }
}

function buildGuardianHeroineDraft(input: {
  name: string
  summary: string
  protagonist: string
  antagonist: string
  strategy: GenerationStrategy
}): Partial<CharacterDraftDto> {
  const pressureSource = pickPressureSource(input.summary, input.antagonist)
  const strategyContext = buildStrategyTextContext(input.strategy)
  const protagonist = input.protagonist || '主角'
  return {
    publicMask: stripLeadingNamePredicate(firstClause(input.summary), input.name),
    hiddenPressure: `${input.name}知道${pressureSource}背后的黑幕，却不能公开站到${protagonist}身边，否则父亲、${strategyContext.homeGround}和她掌握的真相都会被拖进清算。`,
    fear: `最怕${protagonist}因她暴露而被围杀，也怕父亲和${strategyContext.homeGround}被${pressureSource}反咬。`,
    protectTarget: `${protagonist}的安全、父亲的${strategyContext.homeGround}、旧案或${strategyContext.pressureNetwork}真相，以及自己还能暗中周旋的余地。`,
    conflictTrigger: `只要${protagonist}被围杀、被定罪，或父亲要求她放弃追查真相，${input.name}就会撕开冷淡伪装亲自介入。`,
    advantage: `${input.name}能借${strategyContext.protectorResources}在关键场面救人。`,
    weakness: `她对父亲和${protagonist}都放不下，越想两边都护住，越容易被${pressureSource}逼到公开站队。`,
    goal: `暗中保护${protagonist}，查清${pressureSource}黑幕，并在宗门崩盘前替${protagonist}争到选择正邪的机会。`,
    arc: buildStructuredArc({
      start: `${input.name}先以冷淡大小姐身份暗中守护${protagonist}`,
      trigger: `${protagonist}被围杀、被定罪，或父亲要求她放弃追查真相`,
      wobble: `她必须在父亲、宗门名声和${protagonist}的性命之间取舍`,
      cost: `必须押上掌门之女身份、秘档线索和自己与父亲的关系`,
      end: `${input.name}从场外守护者走到公开并肩的人`
    })
  }
}

function buildSeniorDiscipleDraft(input: {
  name: string
  summary: string
  protagonist: string
  antagonist: string
}): Partial<CharacterDraftDto> {
  const pressureSource = pickPressureSource(input.summary, input.antagonist)
  const protagonist = input.protagonist || '主角'
  return {
    publicMask: stripLeadingNamePredicate(firstClause(input.summary), input.name),
    hiddenPressure: `${input.name}夹在师父命令、同门规矩和对${protagonist}的关心之间，越按程序施压，越可能亲手把${protagonist}逼进绝境。`,
    fear: `最怕自己继续服从师命反而害死${protagonist}，也怕同门因他一次放水被${pressureSource}清算。`,
    protectTarget: `师父的托付、同门安危和${protagonist}尚未暴露前的退路。`,
    conflictTrigger: `只要${protagonist}被逼到无路可退，或拿到足以反咬掌门派和${pressureSource}的证据，${input.name}就必须决定继续压人还是暗中放人。`,
    advantage: `${input.name}有亲传大弟子的威望、演武场和戒律流程的人脉，也懂如何把门规压力变成可控的现场缓冲。`,
    weakness: `太习惯按师命和同门规矩处理问题，一旦局势绕过程序，他的动作会慢半拍。`,
    goal: `先守住师父和同门，再尽量替${protagonist}留一条不被当场处死的退路。`,
    arc: buildStructuredArc({
      start: `${input.name}以亲传大弟子身份替师父执行门规`,
      trigger: `${protagonist}被逼到无路可退，或证据指向掌门派和${pressureSource}`,
      wobble: `继续服从会害死${protagonist}，暗中放水又会背叛师命和同门规矩`,
      cost: `必须拿师父信任、同门名声和自己的亲传身份换一次真实选择`,
      end: `${input.name}从冷面执行者走到愿意替${protagonist}承担后果的同门`
    })
  }
}

function buildAmbitiousElderDraft(input: {
  name: string
  summary: string
  protagonist: string
  antagonist: string
  strategy: GenerationStrategy
}): Partial<CharacterDraftDto> {
  const protagonist = input.protagonist || '主角'
  const pressureSource = pickPressureSource(input.summary, input.antagonist)
  const strategyContext = buildStrategyTextContext(input.strategy)
  const elderFaction = /长老派/u.test(input.summary) ? '长老派' : `${strategyContext.homeGround}长老派`
  return {
    publicMask: stripLeadingNamePredicate(firstClause(input.summary), input.name),
    hiddenPressure: `${input.name}想借${elderFaction}架空掌门，却必须先控制${protagonist}身上的${strategyContext.conflictPrize}；血脉越强，他越贪，也越怕反噬。`,
    fear: `最怕${protagonist}彻底觉醒后反杀，也怕掌门先拿到他勾结${strategyContext.pressureNetwork}或夺权的证据。`,
    protectTarget: `${elderFaction}的权柄、夺取${strategyContext.conflictPrize}的禁术，以及取代掌门前不能见光的布局。`,
    conflictTrigger: `只要${protagonist}显露${strategyContext.conflictPrize}，或掌门公开调查${elderFaction}，${input.name}就会提前下杀局。`,
    advantage: `${input.name}掌握长老会票数、执法流程和${strategyContext.homeGround}资源，能用门规把私欲包装成宗门大义。`,
    weakness: `贪心太重又急于夺权，越依赖${pressureSource}和长老派声势，越容易在抢血脉时露出真面目。`,
    goal: `夺取${protagonist}的${strategyContext.conflictPrize}，架空掌门，把${strategyContext.homeGround}变成自己的权力根基。`,
    arc: buildStructuredArc({
      start: `${input.name}先以大长老身份暗中架空掌门`,
      trigger: `${protagonist}显露${strategyContext.conflictPrize}，或掌门开始调查${elderFaction}`,
      wobble: `继续装作维护宗门还能稳住名分，提前动手则会暴露夺权和夺血脉的野心`,
      cost: `必须押上长老派权柄、禁术布局和与${pressureSource}的暗线交易`,
      end: `${input.name}从幕后夺权者变成公开抢夺血脉的反派，被${protagonist}和掌门派清算`
    })
  }
}

function buildGeneralLeverDraft(input: {
  name: string
  summary: string
  protagonist: string
  antagonist: string
  strategy: GenerationStrategy
}): Partial<CharacterDraftDto> {
  const pressureSource = pickPressureSource(input.summary, input.antagonist)
  const strategyContext = buildStrategyTextContext(input.strategy)
  const protagonist = input.protagonist || '主角'
  const summary = firstClause(input.summary)
  const isFamilyAgent = /慕容家|家族|家主|父亲|女儿/u.test(input.summary)
  const isGuardianHeroine = /掌门之女|宗主之女|掌门千金|青瑶仙子|真女主|暗中守护|守护主角|守护主角|母亲遗愿|密道/u.test(input.summary)
  const isSeniorDisciple = /亲传大弟子|大弟子|师兄|师父|同门|掌门派/u.test(input.summary)
  const firstSummaryClause = firstClause(input.summary)
  const isElderIdentity =
    /(?:^|是|为|身份是).{0,18}(?:大长老|二长老|执掌长老|刑罚长老|长老派领袖)/u.test(firstSummaryClause) &&
    !/爪牙|亲信|走狗|手下|座下|倚重/u.test(firstSummaryClause)
  const isAmbitiousElder =
    isElderIdentity && /野心|取代掌门|架空掌门|夺取血脉|夺血脉|夺权|篡位/u.test(input.summary)
  const isPersonalLoyalist = /收养|养育|忠心耿耿|亲信|奉命|言听计从/u.test(input.summary)
  const isEnforcer =
    /爪牙|走狗|马前卒|欺凌|凌辱|打压|压迫者|狠辣|不留活口|监视|刁难|置于死地|执行/u.test(
      input.summary
    )
  const familyLabel = inferFamilyLabel({
    name: input.name,
    summary: input.summary,
    antagonist: input.antagonist
  })

  if (isGuardianHeroine) {
    return buildGuardianHeroineDraft(input)
  }

  if (isSeniorDisciple) {
    return buildSeniorDiscipleDraft(input)
  }

  if (isAmbitiousElder) {
    return buildAmbitiousElderDraft(input)
  }

  if (isFamilyAgent) {
    return {
      publicMask: stripLeadingNamePredicate(summary, input.name),
      hiddenPressure: `${input.name}一边要借${pressureSource}抬高门第，一边又怕${familyLabel}站队太深后被${strategyContext.conflictPrize}之争反噬。`,
      fear: `最怕${familyLabel}被${pressureSource}当成弃子，也怕族人把家族密谋提前暴露。`,
      protectTarget: `${familyLabel}的门面、资源和继续攀上${strategyContext.pressureNetwork}的资格。`,
      conflictTrigger: `只要${protagonist}威胁到${familyLabel}的交易，或${pressureSource}准备甩锅，他就会立刻加码。`,
      advantage: `${input.name}掌握${familyLabel}资源、人情账和与${pressureSource}合作的暗线，能把局面推向更脏的交易。`,
      weakness: `太把家族利益当护身符，一旦交易见光就会同时被${strategyContext.pressureNetwork}和主角反咬。`,
      goal: `让家族借${strategyContext.pressureNetwork}之势坐大，即使牺牲旁人也要保住上升通道。`,
      arc: buildStructuredArc({
        start: `${input.name}先躲在家族和${strategyContext.pressureNetwork}交易背后`,
        trigger: `${protagonist}威胁${familyLabel}的交易，或${pressureSource}准备甩锅`,
        wobble: `继续攀附会让${familyLabel}变成弃子，抽身又会丢掉上升通道`,
        cost: `必须拿${familyLabel}门面、资源和族人安危下注`,
        end: `${input.name}亲自下场保家族，也把${familyLabel}的代价暴露出来`
      })
    }
  }

  if (isEnforcer) {
    return {
      publicMask: stripLeadingNamePredicate(summary, input.name),
      hiddenPressure: `${input.name}靠${pressureSource}授意压人，越狠越能保住位置，但每次针对${protagonist}都会把自己推到复仇名单前排。`,
      fear: `最怕${pressureSource}失势后没人替他兜底，也怕${protagonist}成长到能公开清算他。`,
      protectTarget: `${pressureSource}给他的权力、爪牙身份和继续作恶的安全感。`,
      conflictTrigger: `只要${protagonist}反抗、变强或拿到能反咬${pressureSource}的证据，他就会先下死手。`,
      advantage: `${input.name}熟悉${strategyContext.processGround}，敢脏手，能把刁难、监视和灭口做成具体压力。`,
      weakness: `他依赖${pressureSource}的庇护，缺少独立谋局能力，一旦靠山露怯就会慌。`,
      goal: `替${pressureSource}压死${protagonist}这条隐患，换取自己在派系里的位置。`,
      arc: buildStructuredArc({
        start: `${input.name}只是${pressureSource}放在台前的爪牙`,
        trigger: `${protagonist}反抗、变强或拿到能反咬${pressureSource}的证据`,
        wobble: `他越想抢先下死手，越暴露自己只是靠山的替罪口`,
        cost: `必须押上爪牙身份和继续作恶的安全感`,
        end: `${input.name}成为${protagonist}第一次公开反击和清算的靶子`
      })
    }
  }

  if (isPersonalLoyalist) {
    return {
      publicMask: stripLeadingNamePredicate(summary, input.name),
      hiddenPressure: `${input.name}把${pressureSource}的命令当作活下去的根，越接近${protagonist}越容易暴露真实任务。`,
      fear: `最怕辜负${pressureSource}，也怕自己发现所谓正义只是夺取${strategyContext.conflictPrize}的借口。`,
      protectTarget: `${pressureSource}交给他的任务、养育恩情和自己相信过的正道名分。`,
      conflictTrigger: `只要${protagonist}逼近${pressureSource}的秘密，或他负责的暗线失控，他就会主动出手遮掩。`,
      advantage: `${input.name}有被信任的外壳和贴身监控的位置，能把假消息递到关键人物身边。`,
      weakness: `忠诚来自被收养的恩情，一旦${pressureSource}露出贪婪本相，他的判断会被撕开。`,
      goal: `完成${pressureSource}交代的卧底和监控任务，证明自己配得上这份收养之恩。`,
      arc: buildStructuredArc({
        start: `${input.name}把效忠${pressureSource}当成唯一活法`,
        trigger: `${protagonist}逼近${pressureSource}的秘密，或他负责的暗线失控`,
        wobble: `他开始看见恩情背后的利用和夺取${strategyContext.conflictPrize}真相`,
        cost: `必须在养育恩情、正道名分和良知之间付出代价`,
        end: `${input.name}从盲目效忠走到亲手承担递出证据或继续遮掩的后果`
      })
    }
  }

  if (/执法|堂主|法规|调查|卷宗|证据|线索|公平|公正|高层/u.test(input.summary)) {
    return {
      publicMask: stripLeadingNamePredicate(firstClause(input.summary), input.name),
      hiddenPressure: `${input.name}夹在执法职责、${strategyContext.conflictPrize}线索和高层遮掩之间，越按章调查越会碰到不能公开的真相。`,
      fear: `最怕自己守了一辈子的执法公信被高层拿来遮丑，也怕${protagonist}的${strategyContext.conflictPrize}线索在自己手里失控。`,
      protectTarget: `执法堂的公信、卷宗里的真实线索，以及自己还能依法追查的余地。`,
      conflictTrigger: `只要高层要求他压下${protagonist}的线索，或伪证逼他定案，他就必须当场表态。`,
      advantage: `${input.name}掌握执法堂流程、传讯权和卷宗入口，能把暗处线索变成可查证的现场压力。`,
      weakness: `他太信程序和证据，一旦高层先改卷宗、后定口径，他的动作就容易慢半拍。`,
      goal: `查清${protagonist}身上的${strategyContext.conflictPrize}疑点，同时守住执法堂不能被高层当刀使的底线。`,
      arc: buildStructuredArc({
        start: `${input.name}把公平执法当作唯一底线`,
        trigger: `高层要求他压下${protagonist}的线索，或伪证逼他定案`,
        wobble: `继续按章办事会得罪高层，配合遮掩又会毁掉执法公信`,
        cost: `必须拿执法堂名声、卷宗线索和自己的位置作抵押`,
        end: `${input.name}从只守程序走到亲自追查真相并承担反噬`
      })
    }
  }

  if (/老仆|仆人|遗物|母亲|身世|林家|旧事/u.test(input.summary)) {
    return {
      publicMask: stripLeadingNamePredicate(firstClause(input.summary), input.name),
      hiddenPressure: `${input.name}守着林家旧事和母亲遗物，却不能过早说破${protagonist}的身世，否则会引来灭口。`,
      fear: `最怕林家旧证被夺走，也怕${protagonist}在真相没拼齐前先被${strategyContext.conflictPrize}之争吞掉。`,
      protectTarget: `林家的旧诺、母亲遗物和${protagonist}查清身世前最后一条退路。`,
      conflictTrigger: `只要有人搜查母亲遗物，或${protagonist}被逼到身世真相前，他就会冒险递出证据。`,
      advantage: `${input.name}熟知林家旧事和遗物来历，能用送药、递信、藏证物把真相一点点交到${protagonist}手里。`,
      weakness: `年老势弱，只能靠隐忍和熟人关系周旋，一旦暴露就很难自保。`,
      goal: `把林家遗物和母亲旧案安全交给${protagonist}，让他有资格追问自己的${strategyContext.conflictPrize}来处。`,
      arc: buildStructuredArc({
        start: `${input.name}躲在杂役身份里守着林家旧诺`,
        trigger: `母亲遗物被搜查，或${protagonist}逼近身世真相`,
        wobble: `继续沉默能保命，开口则会把旧案和自己一起送上刀口`,
        cost: `必须拿林家旧诺、母亲遗物和自己的性命风险下注`,
        end: `${input.name}从暗中照应走到公开递出证据，推动${protagonist}觉醒`
      })
    }
  }

  const pressureActor =
    pressureSource === '外部压力' ? strategyContext.pressureNetwork : pressureSource

  return {
    publicMask: stripLeadingNamePredicate(firstClause(input.summary), input.name),
    hiddenPressure: `${input.name}被${pressureActor}和${protagonist}的冲突推到台前，必须在职责、证据和自保之间立刻动作。`,
    fear: `最怕自己办砸现场差事，也怕${protagonist}反击后把他推成第一个被追责的人。`,
    protectTarget: `${input.name}当前负责的差事、能交代过去的结果，以及不被当场问责的退路。`,
    conflictTrigger: `只要${protagonist}破坏${pressureActor}的安排，或现场证据指向${input.name}，他就会被迫加码。`,
    advantage: `${input.name}熟悉当前差事、人手和现场流程，能把暗处矛盾压成一次可见行动。`,
    weakness: `${input.name}太依赖临场遮掩和上层口风，一旦证据落地就很难再把责任推开。`,
    goal: `借${pressureActor}的安排保住自己的位置，并在${protagonist}崛起前完成站队。`,
    arc: buildStructuredArc({
      start: `${input.name}先跟着局势借力自保`,
      trigger: `${protagonist}破坏${pressureActor}的安排，或现场证据指到自己身上`,
      wobble: `他发现继续遮掩会被追责，转身承认又会立刻失去位置`,
      cost: `必须拿当前位置、现场责任和站队后果换一次选择`,
      end: `${input.name}因站错队或被迫表态而付出清算代价`
    })
  }
}

function buildSynthesizedDraft(input: {
  name: string
  summary: string
  layer: string
  protagonist: string
  antagonist: string
  generationBriefText: string
  strategy: GenerationStrategy
}): Partial<CharacterDraftDto> {
  if (input.layer.includes('情感')) {
    return buildEmotionLeverDraft(input)
  }
  if (input.layer.includes('规则')) {
    return buildRuleLeverDraft(input)
  }
  return buildGeneralLeverDraft(input)
}

function shouldForceEmotionRewrite(character: CharacterDraftDto, summary: string): boolean {
  const text = `${character.name} ${character.biography} ${summary}`
  if (isLikelyMasculineName(character.name)) return false
  return /少女|小柔|苏婉/.test(text) || /筹码/.test(text)
}

export function enrichCharacterDrafts(input: {
  characters: CharacterDraftDto[]
  storyIntent: StoryIntentPackageDto
  generationBriefText: string
}): CharacterDraftDto[] {
  const generationStrategy = resolveGenerationStrategy({
    marketProfile: input.storyIntent.marketProfile,
    genre: input.storyIntent.genre,
    storyIntentGenre: `${input.storyIntent.coreConflict || ''}\n${input.generationBriefText}`,
    title: input.storyIntent.titleHint
  }).strategy
  const structured = parseStructuredGenerationBrief(input.generationBriefText)
  const brief =
    structured?.generationBrief && typeof structured.generationBrief === 'object'
      ? (structured.generationBrief as {
          characterCards?: BriefCharacterCard[]
          characterLayers?: BriefCharacterLayer[]
        })
      : null
  const cards = Array.isArray(brief?.characterCards) ? brief.characterCards : []
  const layers = Array.isArray(brief?.characterLayers) ? brief.characterLayers : []

  return input.characters.map((character) => {
    const card = cards.find((item) => cleanText(item.name || '') === character.name)
    const layer = cleanText(
      layers.find((item) => cleanText(item.name || '') === character.name)?.layer || ''
    )
    const summary = cleanText(card?.summary || character.biography)
    if (!summary) return character

    const isProtagonist =
      cleanText(character.name) === cleanText(input.storyIntent.protagonist || '')
    const isAntagonist = cleanText(character.name) === cleanText(input.storyIntent.antagonist || '')
    const rewriteAsEmotion =
      !isProtagonist && !isAntagonist && shouldForceEmotionRewrite(character, summary)

    const synthesized = rewriteAsEmotion
      ? buildEmotionLeverDraft({
          name: character.name,
          summary,
          protagonist: input.storyIntent.protagonist || '',
          antagonist: input.storyIntent.antagonist || '',
          strategy: generationStrategy
        })
      : buildSynthesizedDraft({
          name: character.name,
          summary,
          layer,
          protagonist: input.storyIntent.protagonist || '',
          antagonist: input.storyIntent.antagonist || '',
          generationBriefText: input.generationBriefText,
          strategy: generationStrategy
        })

    const v2Fallback = buildV2FallbackFields({
      name: character.name,
      summary,
      layer,
      protagonist: input.storyIntent.protagonist || '',
      antagonist: input.storyIntent.antagonist || ''
    })

    const enriched = {
      ...character,
      biography: cleanText(character.biography) || summary,
      appearance: cleanText(character.appearance || '') || cleanText(v2Fallback.appearance || ''),
      personality:
        cleanText(character.personality || '') || cleanText(v2Fallback.personality || ''),
      identity: cleanText(character.identity || '') || cleanText(v2Fallback.identity || ''),
      values: cleanText(character.values || '') || cleanText(v2Fallback.values || ''),
      plotFunction:
        cleanText(character.plotFunction || '') || cleanText(v2Fallback.plotFunction || ''),
      publicMask:
        rewriteAsEmotion || isGenericField(character.publicMask)
          ? cleanText(synthesized.publicMask || '')
          : character.publicMask,
      hiddenPressure:
        isGenericField(character.hiddenPressure) || rewriteAsEmotion
          ? cleanText(synthesized.hiddenPressure || '')
          : character.hiddenPressure,
      fear:
        isGenericField(character.fear) || rewriteAsEmotion
          ? cleanText(synthesized.fear || '')
          : character.fear,
      protectTarget:
        isGenericField(character.protectTarget) || rewriteAsEmotion
          ? cleanText(synthesized.protectTarget || '')
          : character.protectTarget,
      conflictTrigger:
        isGenericField(character.conflictTrigger) || rewriteAsEmotion
          ? cleanText(synthesized.conflictTrigger || '')
          : character.conflictTrigger,
      advantage:
        isGenericField(character.advantage) || rewriteAsEmotion
          ? cleanText(synthesized.advantage || '')
          : character.advantage,
      weakness:
        isGenericField(character.weakness) || rewriteAsEmotion
          ? cleanText(synthesized.weakness || '')
          : character.weakness,
      goal:
        isGenericField(character.goal) || rewriteAsEmotion
          ? cleanText(synthesized.goal || '')
          : character.goal,
      arc:
        isGenericField(character.arc) || rewriteAsEmotion
          ? cleanText(synthesized.arc || '')
          : character.arc
    }

    for (const field of [
      'biography',
      'appearance',
      'personality',
      'identity',
      'values',
      'plotFunction',
      'publicMask',
      'hiddenPressure',
      'fear',
      'protectTarget',
      'conflictTrigger',
      'advantage',
      'weakness',
      'goal',
      'arc'
    ] as const) {
      enriched[field] = neutralizeFemaleTermsForMasculineName(
        stripGenericProtagonist(cleanText(enriched[field] || ''), input.storyIntent.protagonist || ''),
        enriched.name
      )
    }
    enriched.publicMask = cleanPublicMask(enriched.publicMask || '', enriched.name)

    return enriched
  })
}
