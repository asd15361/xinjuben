import type { OutlineEpisodeDto } from '@shared/contracts/workflow'
import type { SevenQuestionsResult } from './generate-seven-questions-prompt'
import type { CharacterProfileResult } from './generate-character-profile-prompt'
import { renderAnchorBlock } from './generation-stage-prompt-anchors'
import { formatSevenQuestionsAsNarrativeConstraint } from './generate-seven-questions-prompt'
import { formatCharacterProfileSummary } from './generate-character-profile-prompt'
import type { CharacterProfileV2Dto } from '@shared/contracts/character-profile-v2'
import type { FactionMatrixDto, FactionDto, CharacterPlaceholderDto } from '@shared/contracts/faction-matrix'
import type { PromptVariables } from '@shared/contracts/prompt-variables'
import type { MarketProfileDto } from '@shared/contracts/project'
import type { MarketPlaybookDto } from '@shared/contracts/market-playbook'
import { buildMarketProfilePromptSection } from './build-market-profile-prompt-section'
import { buildMarketPlaybookPromptBlock } from '@shared/domain/market-playbook/playbook-prompt-block'

export type RoughOutlineAct = 'opening' | 'midpoint' | 'climax' | 'ending'

export interface RoughOutlineActPlan {
  act: RoughOutlineAct
  startEpisode: number
  endEpisode: number
  summary?: string
}

/**
 * 粗纲总纲 Prompt 输入（扩展支持七问和人物小传）
 */
export interface RoughOutlineOverviewInput {
  generationBriefText: string
  totalEpisodes: number
  actPlans: RoughOutlineActPlan[]
  /** 七问结果（可选） */
  sevenQuestions?: SevenQuestionsResult
  /** 人物小传结果（可选） */
  characterProfiles?: CharacterProfileResult
  /** 五维人物小传 V2（可选，替代旧版人物小传） */
  characterProfilesV2?: CharacterProfileV2Dto[]
  /** 势力拆解表（可选，用于势力轮动法） */
  factionMatrix?: FactionMatrixDto
  /** Prompt 变量（泛化后替代硬编码人名） */
  promptVars?: PromptVariables
  /** 市场定位（男频/女频 + 垂类） */
  marketProfile?: MarketProfileDto | null
  /** 市场打法包（B 层，可选） */
  marketPlaybook?: MarketPlaybookDto | null
}

function renderEpisodeRange(startEpisode: number, endEpisode: number): string {
  return startEpisode === endEpisode ? `第${startEpisode}集` : `第${startEpisode}-${endEpisode}集`
}

function renderActPlans(plans: RoughOutlineActPlan[]): string {
  return plans
    .map((plan) => `${plan.act}｜${renderEpisodeRange(plan.startEpisode, plan.endEpisode)}`)
    .join('\n')
}

function renderActContext(plans: RoughOutlineActPlan[]): string {
  return plans
    .map((plan) => {
      const summary = plan.summary?.trim() || '待补这一段推进。'
      return `${plan.act}｜${renderEpisodeRange(plan.startEpisode, plan.endEpisode)}｜${summary}`
    })
    .join('\n')
}

function renderPreviousEpisodeTail(episodes: OutlineEpisodeDto[]): string {
  if (episodes.length === 0) return '无。当前批次从头推进。'
  return episodes
    .slice(-4)
    .map((episode) => `第${episode.episodeNo}集：${episode.summary}`)
    .join('\n')
}

function hasRankIdentityAnchor(text: string): boolean {
  return /(排行|第十九|最[小末]位|最小徒弟|末位|庶出|私生|养女|陪嫁|侧室)/.test(text)
}

function buildRankIdentityRules(generationBriefText: string, vars: PromptVariables): string[] {
  if (!hasRankIdentityAnchor(generationBriefText)) return []

  return [
    `5.6. 如果底稿里有"排行/庶出/私生/最小徒弟"这类身份事实，至少一集要显性写出这身份被点名、被轻视、被拿来压规矩或当众羞辱；不能只把它挂在设定清单。`,
    `5.7. 这类身份事实要变成可拍压强，比如"按排行${vars.protagonist}先跪下""最小徒弟没资格碰账册"这类能直接拍到的台词/动作，不要只写成人物介绍。`
  ]
}

/**
 * 构建势力轮动法规则文本（注入到总纲和分集 Prompt）。
 */
function buildFactionRotationRules(totalEpisodes: number): string[] {
  return [
    '',
    '【势力轮动法 · 铁律】',
    `1. 每 5 集必须引入至少 2 个势力拆解表中的新人物进场，或者让已有势力发生关系反转（结盟/背叛/暴露卧底）。`,
    '2. 禁止让主角连续 10 集只跟同一个二级势力的干将打转；必须强迫主角在不同堂口、不同阵营之间辗转博弈。',
    `3. 当前 ${totalEpisodes} 集中，势力轮动节奏：`,
    `   - 1-10集：至少引入 2 个新势力/新阵营势力进场`,
    `   - 11-20集：至少 1 次重大关系反转（原本盟友变死敌，或原本敌对势力被迫临时合作）`,
    `   - 21-${Math.min(30, totalEpisodes)}集：至少 1 个卧底身份被揭露或双面间谍暴露`,
    `   - ${Math.min(31, totalEpisodes)}-${Math.min(40, totalEpisodes)}集：势力重组，至少 1 个二级分支倒戈或分裂`,
    `   - ${Math.min(41, totalEpisodes)}-${totalEpisodes}集：最终清算，所有暗线逐一收束`,
    '4. 每个 crossRelation（势力交叉关系）中标注的 revealEpisodeRange 必须在对应集数段触发事件（揭露/反转/爆发）。',
    '5. 卧底、双面间谍不能只在最后一集才暴露；必须在中间段提前放线索让读者猜。',
    '6. 不同势力之间的冲突必须从"人"升维到"阵营"——不是两个人吵架，是两套价值观和利益的碰撞。',
    '7. 禁止出现"势力A完全压制势力B持续5集以上"的单调局面；必须每3集至少出现一次势力间的攻守转换。'
  ]
}

function summarizeCharacterProfilesV2(characters: CharacterProfileV2Dto[]): string {
  if (!characters.length) return ''

  const lines: string[] = ['【五维人物图谱（压缩注入）】']
  const coreCharacters = characters.filter((item) => item.depthLevel === 'core').slice(0, 6)
  const supportCharacters = characters.filter((item) => item.depthLevel !== 'core').slice(0, 10)

  for (const character of coreCharacters) {
    const parts = [
      character.name,
      `身份=${character.identity}`,
      `性格=${character.personality}`,
      `价值观=${character.values}`,
      `剧情作用=${character.plotFunction}`,
      character.goal ? `目标=${character.goal}` : '',
      character.weakness ? `短板=${character.weakness}` : '',
      character.arc ? `弧光=${character.arc}` : ''
    ].filter(Boolean)
    lines.push(`- ${parts.join('｜')}`)
  }

  if (supportCharacters.length > 0) {
    lines.push('【势力配角速览】')
    for (const character of supportCharacters) {
      lines.push(
        `- ${character.name}｜${character.identity}｜${character.plotFunction}｜${character.factionId || '游离角色'}`
      )
    }
  }

  return lines.join('\n')
}

function pickRelevantFactionsForRange(
  factionMatrix: FactionMatrixDto,
  startEpisode: number,
  endEpisode: number
): FactionDto[] {
  const relevantIds = new Set<string>()

  for (const entry of factionMatrix.factionTimetable || []) {
    if (entry.entryEpisode <= endEpisode + 2) {
      relevantIds.add(entry.factionId)
    }
  }

  for (const relation of factionMatrix.crossRelations || []) {
    const revealStart = relation.revealEpisodeRange?.start ?? 1
    const revealEnd = relation.revealEpisodeRange?.end ?? endEpisode
    if (revealStart <= endEpisode + 2 && revealEnd >= startEpisode - 2) {
      relevantIds.add(relation.fromFactionId)
      relevantIds.add(relation.toFactionId)
    }
  }

  const preferred = factionMatrix.factions.filter((item) => relevantIds.has(item.id))
  return (preferred.length > 0 ? preferred : factionMatrix.factions).slice(0, 4)
}

function renderFactionMatrixSummary(
  factionMatrix: FactionMatrixDto,
  options: { mode: 'overview' } | { mode: 'batch'; startEpisode: number; endEpisode: number }
): string {
  const lines: string[] = [
    '【势力拆解表（压缩注入）】',
    `势力格局：${factionMatrix.landscapeSummary}`
  ]
  const selectedFactions =
    options.mode === 'overview'
      ? factionMatrix.factions.slice(0, 4)
      : pickRelevantFactionsForRange(factionMatrix, options.startEpisode, options.endEpisode)

  for (const faction of selectedFactions) {
    lines.push(`- ${faction.name}｜${faction.positioning}｜诉求=${faction.coreDemand}`)
    for (const branch of faction.branches.slice(0, 2)) {
      const members = branch.characters
        .slice(0, 4)
        .map((character: CharacterPlaceholderDto) => `${character.name}(${character.roleInFaction})`)
        .join('、')
      lines.push(`  ${branch.name}：${members}`)
    }
  }

  const relations =
    options.mode === 'overview'
      ? factionMatrix.crossRelations.slice(0, 6)
      : factionMatrix.crossRelations
          .filter((relation) => {
            const revealStart = relation.revealEpisodeRange?.start ?? 1
            const revealEnd = relation.revealEpisodeRange?.end ?? options.endEpisode
            return revealStart <= options.endEpisode + 2 && revealEnd >= options.startEpisode - 2
          })
          .slice(0, 4)

  if (relations.length > 0) {
    lines.push('【关键势力暗线】')
    for (const relation of relations) {
      const reveal = relation.revealEpisodeRange
        ? `第${relation.revealEpisodeRange.start}-${relation.revealEpisodeRange.end}集`
        : '待揭露'
      lines.push(`- ${relation.relationType}｜${relation.description}｜揭露窗口=${reveal}`)
    }
  }

  return lines.join('\n')
}

/**
 * 构建泛化版的粗纲规则文本。
 * 所有硬编码人名/地名/物品名已替换为变量占位符。
 */
function buildGeneralizedPromptRules(vars: PromptVariables): string[] {
  return [
    // ── 2.7 示例 ──
    `2.7. 正确方向示意：${vars.protagonist}先被${vars.antagonist}拿${vars.leverageCharacter}逼到亮底，随后借${vars.worldElement}、${vars.coreItem}和${vars.organization}旧规把人账、证据账、规则账越拧越紧，前半程藏锋挨压，后半程转为借力反咬，最终在亮出底牌后接住伤势、职责和余波。不要照抄这个例句，只学"整季一段拉通"的写法。`,
    // ── 10.5 外压落地 ──
    `10.5. 如果已确认事实里有${vars.worldElement}或封印外压，开局和当前批次末两集都要显性落一次；不准把它只写成前半段背景然后后面彻底消失。`,
    // ── 10.6 直给压法 ──
    `10.6. "拿刀抵喉/绑住人逼交${vars.coreItem}/抓住${vars.leverageCharacter}逼${vars.protagonist}现身"这种直给压法全季最多 2 次；用过后就换成证据、旧规、伤势、父辈、名声、残党或职责筹码，别十集都靠同一种逼法。`,
    // ── 10.8 主题词 ──
    `10.8. 前 1-6 集不要反复直说主题信条词；先写这套东西怎样让${vars.protagonist}忍、让、藏、换条件、护人或反咬。进入当前 5 集批次的收口段后才允许点题，而且整季直接点题最多 2 集。`,
    // ── 10.8.5 隐忍状态 ──
    `10.8.5. 如果主角设定里有"隐忍/藏锋/先让后反咬"，前 1-6 集至少两集 summary 要显性写出"${vars.protagonist}先忍""${vars.protagonist}藏锋""${vars.protagonist}装弱不亮底"这类动作状态；不准一路只写他忽然会打。`,
    // ── 13.95 外部势力 ──
    `13.95. 当前 5 集批次如果出现其他势力或更高层问责，他们只能拿现有旧账加压，不能接管主戏；主推进仍要落在${vars.protagonist}、${vars.leverageCharacter}、${vars.antagonist}、${vars.coreItem}、伤势、残党和证据上。`,
    // ── 14.5 末段开场 ──
    `14.5. 当前批次末段不准从${vars.organization}合议或${vars.ruleLeverCharacter}收${vars.coreItem}开场；必须从主角或情感杠杆角色正在处理上一集留下的伤势、血契、碎${vars.coreItem}、残党动作或未完追压起手。`,
    // ── 15 杠杆角色 ──
    `15. ${vars.leverageCharacter}或其他情感杠杆角色至少一次主动带出证据、换条件、传信、自救或反咬，不准一路只被押、被绑、等人来救。`,
    // ── 15.6 ──
    `15.6. 当前批次末两集不准把"谁来问责${vars.organization}/谁来重议权责"写成主戏眼；这只能是背景压强，真正推进仍要落在人、${vars.coreItem}、证据、伤势和职责落身上。`,
    // ── 16.6 ──
    `16.6. 当前 5 集批次主推进优先写医庐、静室交易、旧巢、山门、居所、追残党、接职责；不要再让${vars.organization}追责、内部清洗、权位重排自己长成新的主戏。`
  ]
}

export function buildOutlineOverviewPrompt(input: RoughOutlineOverviewInput): string {
  const vars = input.promptVars || {
    protagonist: '主角',
    antagonist: '对手',
    leverageCharacter: '关键人物',
    coreItem: '核心筹码',
    organization: '组织',
    worldElement: '外部威胁',
    ruleLeverCharacter: '规则掌控者',
    extraCharacters: [],
    genre: input.generationBriefText?.includes('修仙') ? '修仙' : '短剧',
    genreArchetype: 'default' as const
  }

  const rankIdentityRules = buildRankIdentityRules(input.generationBriefText, vars)
  const factionMatrix = input.factionMatrix
  const generalizedRules = buildGeneralizedPromptRules(vars)

  const lines: string[] = []

  // 注入七问约束（如果有）
  if (input.sevenQuestions) {
    lines.push(formatSevenQuestionsAsNarrativeConstraint(input.sevenQuestions))
    lines.push('')
  }

  // 注入人物小传（如果有）——V2 优先
  if (input.characterProfilesV2 && input.characterProfilesV2.length > 0) {
    lines.push(summarizeCharacterProfilesV2(input.characterProfilesV2))
    lines.push('')
  } else if (input.characterProfiles) {
    lines.push(formatCharacterProfileSummary(input.characterProfiles.characters))
    lines.push('')
  }

  // 注入势力拆解表（如果有）
  if (factionMatrix) {
    lines.push(renderFactionMatrixSummary(factionMatrix, { mode: 'overview' }))
    lines.push('')
  }

  // 注入势力轮动法规则到总纲
  const factionRotationRules = factionMatrix ? buildFactionRotationRules(input.totalEpisodes) : []

  const marketProfileSection = buildMarketProfilePromptSection({
    marketProfile: input.marketProfile,
    stage: 'roughOutline'
  })

  const playbookBlock = buildMarketPlaybookPromptBlock({
    playbook: input.marketPlaybook,
    stage: 'script_skeleton'
  })

  return [
    '你是短剧总编剧。你正在规划整季粗纲骨架。',
    '【短剧黄金铁律 · 必须刻进系统】',
    ...(marketProfileSection ? [marketProfileSection] : []),
    ...(playbookBlock ? [playbookBlock] : []),
    '1. 极限密度：每集只干一件事：施压 → 反击 → 留钩子。',
    '2. 黄金节奏：第1集开局30秒必须有巨大危机（死人/丢官/退婚/被夺/被冤枉），1分钟必须有反转或打脸。',
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
    '这一工序只负责"粗纲总纲"，不是分集全量输出。',
    '正式真相只认第一板块确认后的创作底稿，你不能改主角、对手、核心关系、项目集数。',
    '你的任务是先把整季粗纲的总推进和四段推进图钉住，让后续分批分集生成有稳定骨架。',
    '这一步不要输出任何分集 episodes。',
    '输出严格 JSON：',
    '{',
    '  "outline": {',
    '    "title": string,',
    '    "genre": string,',
    '    "theme": string,',
    '    "protagonist": string,',
    '    "mainConflict": string,',
    '    "summary": string,',
    '    "facts": [{"label": string, "description": string, "level": "core"|"supporting", "linkedToPlot": boolean, "linkedToTheme": boolean}],',
    '    "actSummaries": [{"act": "opening"|"midpoint"|"climax"|"ending", "summary": string}]',
    '  }',
    '}',
    '要求：',
    `1. 这是 ${input.totalEpisodes} 集项目，不能偷改成别的集数。`,
    '2. summary 只写整季总述，控制在 3 到 5 句、只准 1 段，重点写主线怎么一路升级到亮底，再把人账、证据账、规则账拧到终点。',
    '2.5. summary 字段里禁止出现"第1集""第2集""第X集"这类集号，也禁止一行一集、分条罗列、按集复述 episodes；它只准写整季总推进，不准把四段 actSummary 换个说法重抄一遍。',
    '2.6. summary 更像整季宣传简介，不像分集梗概；如果读起来像"第1集……第2集……"，就说明写错了，必须重写成一段拉通的整季弧线。',
    ...generalizedRules.slice(0, 1),
    '3. actSummaries 必须严格 4 条，分别对应 opening / midpoint / climax / ending。',
    '4. 每条 actSummary 用大白话写清这一段在打什么仗、局面怎么升级、结尾悬着什么。',
    '5. facts 只保留真正支撑主线推进的事实，不要扩写背景资料。',
    '5.5. facts 只准写能被拿、抢、藏、毁、验、换、交出来的硬事实和硬筹码；不要把"象征了什么""说明了什么"写进 facts。',
    ...rankIdentityRules,
    '6. 不要输出 storyIntent，不要重复改写确认信息。',
    '7. 如果底稿明确写了权谋、智斗、借力周旋，就把整季主打法写成做局、借势、反证、调包、错判或站队变化；不要自动滑成纯打怪升级或纯修炼闯关。',
    '8. 中后段至少两次换压力来源、换战场、换筹码或换关系位次，不能十集都靠同一招重复加码。',
    '9. 至少两集要出现误判、倒挂、借力反打或局面反转，让主角不只是被动挨打后再升级。',
    '10. 外压（妖兽/灾变/高手等）只能放大人祸，不能反客为主变成主发动机；就算有怪物，也要写清是谁在借它做局、谁在拿它逼人、谁因此失势。',
    ...generalizedRules.slice(1, 4),
    '10.7. 禁止使用"人账""证据账""规则账""争证据""争站队""争时间""主导权"这类 writer-room 词；要翻成谁抢盒、谁堵门、谁把哪页账拍到谁脸上。',
    ...generalizedRules.slice(4, 6),
    '10.9. 第6集以后，每集 summary 第一短句优先落在搜屋、拦路、医治、抢证、追残党、毁契或换手这类外场动作；如果第一句就是执事、公审、合议、问责，说明主戏眼写歪了。',
    '10.9.5. 第4集以后，分集 summary 第一短句如果还是堂上流程、关押问话或盖章程序，直接重写成路上截人、住处搜物、暗巷换手、山林追逃。',
    '10.9.6. 当前 5 集批次如果必须有程序场，它们只能缩成半句过门：收证、定时限、转身离开。真正主句必须落在伏击、抢物、截使、醒来、追人、夺账这些私人动作上。',
    '10.9.7. 反例：先盖章再去追人。正例：主角刚出门就被伏击、刚醒来就收到急信、刚收证就有人烧账。',
    '10.10. 规则杠杆角色不能带着新证据进门直接替主角揭底；关键证据必须先由主角或情感杠杆角色拿到、藏住、换出或逼出来，他们最多负责验真和落锤。',
    '11. 最后 3 集优先回收人账、证据账、规则账、关系账：谁被揭穿、谁被追责、谁失去筹码、谁被迫站队，至少落两条，再写外压余波。',
    '12. 最后 3 集不准连续主要靠法阵、封印、议事或世界异象推进；规则杠杆角色出场只能改规则、压时限、逼表态，不能替主角把收尾做完。',
    '13. 当前批次末集的余波优先留在人际站位、职责变化、证据外流、伤势代价或谁盯上这笔旧账；不要临时再抬出更大一层怪物、更高一层封印或新世界设定把本批次终点顶掉。',
    '13.5. 当前批次末集不准临时引入新名字、新亲属、新残党领头人或新上位者来接管尾声；余波只能落回现有人物和现有旧账。',
    '14. 后 4 集里，至少两集的主推进必须由主角或情感杠杆角色亲自拿证据、换条件、做局、反咬或逼表态完成，不能让规则杠杆角色或公审替他们把人账收完。',
    '14.2. 每 3 集至少安排 1 次"主角或情感杠杆角色先让对手吃实亏"的主动回合：调包、反证、诈供、抢先递证、借规矩压回去、抢走筹码至少一种成立。',
    `14.5. 当前 5 集批次就算其他势力入场，也只能拿现有旧账加压，不能取代主角、对手、情感杠杆和${vars.coreItem}这条主冲突三角。`,
    '15. 公审、议事只准当压力容器，不能连续两集占主场；用了程序场推进后，下一集必须转去私下潜入、追逃、交易、拦截或路上反打。',
    '15.5. 当前批次末段如果出现程序场或表态，它们只能确认已经发生的后果，不能替主角或情感杠杆角色完成真正的收账动作。',
    ...generalizedRules.slice(6, 8),
    '15.7. 当前批次末集若必须出现合议、接任、令牌或职责确认，它们只能缩成一笔结果，不准占据最后一场的主戏眼。',
    '15.8. 反例：合议确认罪责+发职责令牌+解释看守职责。正例：罪责已定后，残党开始盯上他、伤口再裂、证据外流或旧账有人继续追。',
    '15.9. 当前批次末集如果必须出现接任、令牌、合议、问责或职责确认，它们只能占半句结果，summary 最后一句必须落在残党、旧账、见面约、证据外泄或伤势反噬追上门这类私人后果上。',
    ...factionRotationRules,
    '',
    '四段覆盖范围：',
    renderActPlans(input.actPlans),
    '',
    '这份底稿里你必须优先执行的锚点：',
    renderAnchorBlock(input.generationBriefText),
    '',
    '底稿只认上面这些锚点与事实，不继承原底稿里的讲经句、百科句、人物评语和待确认口气。',
    '如果原底稿同时写了"权谋智斗"和"悟道/大道/不争"，分集输出优先继承前者的动作打法；后者只留在主题字段和极后段余波。'
  ].join('\n')
}

export interface RoughOutlineEpisodeBatchInput {
  generationBriefText: string
  totalEpisodes: number
  startEpisode: number
  endEpisode: number
  overviewSummary: string
  actPlans: RoughOutlineActPlan[]
  previousEpisodes: OutlineEpisodeDto[]
  /** 七问结果（可选） */
  sevenQuestions?: SevenQuestionsResult
  /** 人物小传结果（可选） */
  characterProfiles?: CharacterProfileResult
  /** 五维人物小传 V2（可选） */
  characterProfilesV2?: CharacterProfileV2Dto[]
  /** 势力拆解表（可选，用于势力轮动法） */
  factionMatrix?: FactionMatrixDto
  /** Prompt 变量（泛化后替代硬编码人名） */
  promptVars?: PromptVariables
  /** 市场定位（男频/女频 + 垂类） */
  marketProfile?: MarketProfileDto | null
  /** 市场打法包（B 层，可选） */
  marketPlaybook?: MarketPlaybookDto | null
}

export function buildOutlineEpisodeBatchPrompt(input: RoughOutlineEpisodeBatchInput): string {
  const batchEpisodeCount = input.endEpisode - input.startEpisode + 1
  const vars = input.promptVars || {
    protagonist: '主角',
    antagonist: '对手',
    leverageCharacter: '关键人物',
    coreItem: '核心筹码',
    organization: '组织',
    worldElement: '外部威胁',
    ruleLeverCharacter: '规则掌控者',
    extraCharacters: [],
    genre: input.generationBriefText?.includes('修仙') ? '修仙' : '短剧',
    genreArchetype: 'default' as const
  }

  const rankIdentityRules = buildRankIdentityRules(input.generationBriefText, vars)
  const factionRotationRules = input.factionMatrix
    ? buildFactionRotationRules(input.totalEpisodes)
    : []
  const generalizedRules = buildGeneralizedPromptRules(vars)

  const lines: string[] = []

  // 注入七问约束（如果有）
  if (input.sevenQuestions) {
    lines.push(formatSevenQuestionsAsNarrativeConstraint(input.sevenQuestions))
    lines.push('')
  }

  // 注入人物小传（如果有）——V2 优先
  if (input.characterProfilesV2 && input.characterProfilesV2.length > 0) {
    lines.push(summarizeCharacterProfilesV2(input.characterProfilesV2))
    lines.push('')
  } else if (input.characterProfiles) {
    lines.push(formatCharacterProfileSummary(input.characterProfiles.characters))
    lines.push('')
  }

  // 注入势力拆解表到分集批次（如果有）
  if (input.factionMatrix) {
    lines.push(
      renderFactionMatrixSummary(input.factionMatrix, {
        mode: 'batch',
        startEpisode: input.startEpisode,
        endEpisode: input.endEpisode
      })
    )
    lines.push('')
  }

  const marketProfileSection = buildMarketProfilePromptSection({
    marketProfile: input.marketProfile,
    stage: 'roughOutline'
  })

  const playbookBlock = buildMarketPlaybookPromptBlock({
    playbook: input.marketPlaybook,
    stage: 'script_skeleton'
  })

  return [
    '你是短剧总编剧。你正在生成当前批次的分集粗纲。',
    '【单集标准结构 · 固定三段式】',
    ...(marketProfileSection ? [marketProfileSection] : []),
    ...(playbookBlock ? [playbookBlock] : []),
    '每一集必须严格按照以下三幕结构进行规划：',
    '1. 第一幕：施压 (0-20秒) —— 反派拿把柄/规则压人，把主角逼到无路可退。',
    '2. 第二幕：反转 (20-45秒) —— 主角拿出证据/底牌/后手，让反派当众吃瘪。',
    '3. 第三幕：钩子 (45-60秒) —— 新危机立刻到来，最后一句台词扎心留客。',
    '',
    '【打法轮换 · 强制变位】',
    '压法分类定义：',
    `- 硬夺类：抢${vars.coreItem}/抢人/绑人质/截路/搜身/夺物`,
    '- 规则类：用把柄压/用旧账压/用职责压/用名义压/追责令/公审',
    '- 关系类：分化站队/情感绑架/信任背刺/利益分化/借刀杀人/条件交换',
    '- 信息类：误导/试探/调包/截胡/反证/假情报/信息差碾压/暗桩',
    '- 时空类：时限倒计时/封锁出口/围困/押送路上',
    '',
    '强制规则：',
    '1. 本集压法类型必须与上一集不同类',
    '2. 连续2集禁止使用同一类压法',
    '3. 连续5集必须出现至少1次"主角主动做局/先手反击"',
    `4. "绑人质逼交${vars.coreItem}"全季最多2次`,
    '',
    '这一工序只负责"当前批次的分集粗纲骨架"，不是重写整季总纲。',
    '正式真相只认第一板块确认后的创作底稿，你不能改项目集数、主角、对手、核心关系。',
    `当前只生成第${input.startEpisode}-${input.endEpisode}集，共 ${batchEpisodeCount} 集。`,
    '输出严格 JSON：',
    '{',
    '  "batchSummary": string,',
    '  "episodes": [{"episodeNo": number, "summary": string}]',
    '}',
    '要求：',
    `1. 只能输出第${input.startEpisode}到第${input.endEpisode}集，不能缺集、不能多集、不能重复集号。`,
    '2. 每一集 summary 用 3-5 个短句自然写清，不要输出固定标签，不要出现 `【起】`、`【承】`、`【转】`、`【钩子】` 这类模板词。',
    '3. 每一集都必须同时覆盖：起手事件、这一集主要逼压、人物变招或误判、结尾新麻烦。',
    '4. 每一集都要直接写正式角色和动作，不要用"主角/反派/神秘势力"糊过去。',
    '5. 相邻两集的主要推进手法必须变化：正面逼压、借力、试探、反咬、误导、调包、揭底、众压、私压，至少换一种，不能十集都只会"对手继续加码"。',
    '6. 如果底稿写了权谋、智斗或"靠智慧周旋"，就优先写做局、抢口风、套话、借势、栽赃、反证、调虎离山，不要自动滑成纯打怪升级或纯战力对轰。',
    '7. 当前批次里至少安排 2 集不是直线加码，而是局势倒挂、角色误判、关系翻面或主角主动做局。',
    '8. 这一批分集要接住整季总纲和对应四段推进，不要写成孤立段子。',
    '9. batchSummary 只总结这一批 5 集在打什么仗、玩法怎么变，控制在 2-3 句。',
    '10. 结尾不要老停在沉思、凝视、意识到、风更冷了这类虚收口；钩子要是下一轮更糟或更狠的具体局面。',
    '10.2. batchSummary 和 episodes 里都不要解释"象征了什么""说明了什么""哪套大道被领悟"；主题只能藏在动作后果里，不准翻成作者解说。',
    ...rankIdentityRules,
    '11. 外压（妖兽/灾变/高手等）只能放大人祸，不能替代人祸；哪怕打起来，也要写清是谁借外压逼人、谁借外压翻盘。',
    ...generalizedRules.slice(2, 4),
    '11.7. 禁止使用"人账""证据账""规则账""争证据""争站队""争时间""主导权"这类 writer-room 词；要翻成谁抢盒、谁堵门、谁把哪页账拍到谁脸上。',
    ...generalizedRules.slice(4, 6),
    '11.9. 第6集以后，每集 summary 第一短句必须先落在搜屋、拦路、医治、抢证、追残党、毁契、换手或逃跑这类私人动作；如果第一句就是执事、公审、合议、问责，说明主戏眼写歪了。',
    '11.9.5. 第4集以后，分集 summary 第一短句如果还是堂上流程、关押问话或盖章程序，直接重写成路上截人、住处搜物、暗巷换手、山林追逃。',
    '11.9.6. 当前 5 集批次如果必须有程序场，它们只能缩成半句过门：收证、定时限、转身离开。summary 的真正主句必须落在伏击、抢物、截副本、急醒、追人、夺账这些私人动作上。',
    '11.9.7. 反例：先盖章再去追人。正例：刚离现场就被伏击、刚醒就得知副本出城、刚收证就有人烧账。',
    '11.10. 规则杠杆角色不能带着新证据进门直接替主角揭底；关键证据必须先由主角或情感杠杆角色拿到、藏住、换出或逼出来，他们最多负责验真和落锤。',
    '12. 如果当前批次已经进入后半程或收束段，每集至少落一笔人账、证据账、规则账或关系账，不能连续把主推进写成法阵、封印、开会或天象异变。',
    '13. 收束段优先写谁被揭穿、谁失去筹码、谁被迫表态、谁拿证据换命、谁被追责；外压只能把这些账推得更狠，不能自己变成主角。',
    '13.5. 后半程全季里，程序场主场最多 2 集；一旦某集用了，后面至少 2 集转去追逃、密室套话、旧巢取证、抢人、伤势处理或私下交易。',
    '13.6. 不要把第5-10集写成"对质 -> 威胁 -> 查证 -> 再质询"的循环；后半程主发动机必须轮换到外场动作、关系账和现实代价。',
    '13.7. 一旦组织问责入场，它只能当压力容器；真正推进要落在押送途中、门外堵截、证据换手、私下封口、追逃、抢人或路上投毒，不要把"被带去问话"本身写成整集。',
    '13.8. 中段（尤其第4-7集）如果上一集已经用了程序场，下一集第一场必须转去路上、医庐、旧屋、山林、宅邸或暗巷，不能再让堂上场连续坐庄。',
    '13.85. 如果第4集已经从程序场起手，第5集第一句必须改成逃跑、押送、潜入、医治、换手或山林动作；不要再从堂上场开场。',
    '13.9. 同一集 summary 里如果已经用了问责、对质或程序场，后半句必须转成门外堵截、住处夜袭、押送路上、私下传证、路上封口或追逃；不要一集都泡在制度空间里。',
    ...generalizedRules.slice(5, 6),
    '14. 当前批次末集结尾不要再临时开"更大怪物/更高封印/更深世界秘密"这种新口；余波优先留给权位重排、旧账未清、伤势后果或谁开始盯上主角手里的位置与责任。',
    ...generalizedRules.slice(7, 8),
    '14.6. 当前批次末集第一场不准从疗伤、静室听宣判或领处分起手；必须先处理上一集留下的人、物、伤或追兵，再把制度结果塞进后面最短一场。',
    '14.7. 当前批次末两集如果必须写接任、认罚、宣判或表态，只能用 1-2 句当结果确认，不能把它们写成整集主推进。',
    '14.75. 当前批次末段若出现合议、接任、令牌或职责，只能做最短确认；不准把"职责令牌""新看守职责"写成尾钩。',
    '14.8. 当前批次末集 summary 最后一句必须是残党、旧账、见面约、证据外泄或伤势反噬追上门；不能以"接任""等待结果""受审"收尾。',
    '15.5. 每 3 集至少安排 1 次主角或情感杠杆角色先让对手吃实亏：调包、反证、抢先递证、借规矩压回去、夺物或诈供至少一种成立。',
    '16. 当前批次末段不要把"揭穿/裁决/表态"写成主推进；正式收账动作必须由主角或关键关系角色先完成，公审只能确认后果。',
    '16.5. 规则杠杆角色不能直接执行"终局动作"来替主角收账；他们最多只确认已经被主角或关键关系角色做成的后果。',
    '16.6. 当前 5 集批次主推进优先写医庐、静室交易、旧巢、居所、追残党、接职责；不要再让追责、内部清洗、权位重排自己长成新的主戏。',
    '17. 不要把"象征意义、话语权、势力格局、各方震动"这类抽象词当推进，必须翻成谁拿什么逼谁、谁带着什么跑、谁拦谁、谁换了站队。',
    '17.5. 当前批次末两集不准临时引入新名字、新亲属、新残党领头人接管尾声；余波只能落回现有人物和现有旧账。',
    ...factionRotationRules,
    '',
    `项目总集数：${input.totalEpisodes}集`,
    `整季总述：${input.overviewSummary}`,
    '',
    '当前批次对应的四段推进：',
    renderActContext(input.actPlans),
    '',
    '上一批最后几集已经发生的事：',
    renderPreviousEpisodeTail(input.previousEpisodes),
    '',
    '这份底稿里你必须优先执行的锚点：',
    renderAnchorBlock(input.generationBriefText),
    '',
    '底稿只认上面这些锚点与事实，不继承原底稿里的讲经句、百科句、人物评语和待确认口气。',
    '如果原底稿同时写了"权谋智斗"和"悟道/大道/不争"，分集输出优先继承前者的动作打法；后者只留在主题字段和极后段余波。'
  ].join('\n')
}
