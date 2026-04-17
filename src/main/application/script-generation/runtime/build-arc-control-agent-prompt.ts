/**
 * src/main/application/script-generation/runtime/build-arc-control-agent-prompt.ts
 *
 * 弧光控制 Agent Prompt 构建器。
 *
 * 职责：修复人物戏剧功能不足，让角色在这集里真的有用。
 *
 * 所有 Agent prompt 必须包含：
 * 1. 当前原稿全文
 * 2. 当前具体问题
 * 3. 明确目标
 * 4. 禁止事项
 *
 * 基于原稿改，不从零重写。
 */

import type { ScriptSegmentDto } from '../../../../shared/contracts/workflow.ts'
import type { CharacterArcSnapshot } from '../../../../shared/domain/script/screenplay-content-quality.ts'
import type { WeaknessDetectionResult } from '../../../../shared/domain/script/screenplay-weakness-detection.ts'

export interface ArcControlAgentInput {
  /** 当前集原稿 */
  previousScene: ScriptSegmentDto
  /** 各角色的弧线状态 */
  characterArcs: CharacterArcSnapshot[]
  /** 主角名 */
  protagonistName: string
  /** 配角名 */
  supportingName: string
  /** 对手名 */
  antagonistName: string
  /** 窝囊检测结果（可选） */
  weaknessDetection?: WeaknessDetectionResult
}

/**
 * 为单个角色构建戏剧功能推进描述。
 */
function buildArcDirection(arc: CharacterArcSnapshot): string {
  switch (arc.status) {
    case 'stagnant':
      return '本集必须让角色在行动、站队或关系上发生实质推进，不能继续停在原地反应'
    case 'regressed':
      return '本集必须让角色从被动挨打里挣出来，重新拿回一点主动'
    case 'advanced':
      return '本集应该继续推进角色的戏剧功能，让改变产生后果'
    case 'new':
      return '本集应该建立角色的戏剧功能，让观众知道他来干什么、卡谁、帮谁'
  }
}

/**
 * 构建弧光控制 Agent Prompt。
 */
export function buildArcControlAgentPrompt(input: ArcControlAgentInput): string {
  const { previousScene, characterArcs, protagonistName, supportingName, antagonistName, weaknessDetection } = input
  const sceneCount = previousScene.screenplayScenes?.length || 2
  const isEarlyEpisode = (previousScene.sceneNo || 0) <= 3
  const isOpeningEpisode = (previousScene.sceneNo || 0) === 1

  const lines: string[] = []

  // 角色和任务声明
  lines.push('【剧情弧光控制Agent · 人物行为逻辑指令】')
  lines.push('严格输出JSON，无多余文本。')
  lines.push('')
  lines.push('【爆款短剧 · 主角/反派行为规范】')
  lines.push('1. 主角规范：可以忍，但不能怕；可以装弱，但不能真弱；受辱必须在同一集讨回来；绝不解释，只用实力/证据/底牌说话。')
  lines.push('2. 反派规范：禁止大吼大叫、无脑骂街、强行降智。必须用规则杀人、用权位压人、用利益分化，微笑着把人逼死。')
  lines.push('')
  // 注入窝囊检测结果（如果有）
  if (weaknessDetection && weaknessDetection.hasForbiddenBehavior) {
    const behaviorLabels = weaknessDetection.behaviorTypes.map((t) => {
      switch (t) {
        case 'kneeling': return '下跪/磕头'
        case 'begging': return '求饶/认错'
        case 'freeze': return '呆住无反击'
        case 'empty_threat': return '空头威胁'
        case 'excessive_apology': return '过度道歉/退让'
      }
    }).join('、')

    lines.push('')
    lines.push('【自动检测 · 主角窝囊行为拦截】')
    lines.push(`系统检测到以下窝囊行为：${behaviorLabels}`)
    if (weaknessDetection.evidence.length > 0) {
      lines.push('具体证据：')
      for (const ev of weaknessDetection.evidence) {
        lines.push(`  - ${ev}`)
      }
    }
    lines.push('以上行为必须全部改写为以下策略之一：')
    lines.push('  1. 装弱反击：表面退让，实则暗中布局后手')
    lines.push('  2. 冷静对峙：不跪不求，用证据/底牌/规则直接反击')
    lines.push('  3. 损失换筹码：被打压后立刻拿回等价或更大筹码')
    lines.push('  4. 旁观者反杀：配角/对手的行动反向促成主角破局')
    lines.push('窝囊严重度越高，重写力度必须越大。')
  }
  lines.push('以下行为一旦出现在主角身上，判定为窝囊，必须重写：')
  lines.push('1. 主动下跪/求饶/认错/赔笑脸（假意配合除外）')
  lines.push('2. 被威胁后只说”我错了””我不敢””求你”')
  lines.push('3. 被夺筹码后只愣住/沉默/发呆，不立即反击或布局')
  lines.push('4. 被打脸后说”你等着””以后我会”——空话，无后续动作')
  lines.push('5. 连续3句都在解释/道歉/退让，没有一句实质动作')
  lines.push('')
  lines.push('【装弱 vs 真弱判断标准】')
  lines.push('- 装弱（允许）：表面退一步，暗中留后手；嘴里认输，手里藏钥匙；假装害怕，实际在观察弱点；跪下是为了接近对方腰间的东西。')
  lines.push('- 真弱（禁止）：只退不还手、只认不反抗、只求不报复、只哭不行动、只等救不求生。')
  lines.push('')
  lines.push('【反派压迫手段库 · 本集必须选用至少1种】')
  lines.push('一、规则类压迫：用宗门法规/旧规条款/职责命令/准入限制压人。如”按规矩你没有资格””这个位置不是你能站的”。')
  lines.push('二、把柄类压迫：抓住对方过去的秘密/隐藏的关系/偷藏的证据/暗中做的事。如”去年你在西山做的事，要不要我提醒？””证据在我手里”。')
  lines.push('三、利益分化：让对方团队内部分裂。如”跟着他你永远只是棋子””交出他，我让你坐那个位置”。')
  lines.push('四、信息不对等：掌握对方不知道的关键信息，用信息差碾压。如”你以为你知道全部？你只看见我想让你看的””最新消息还没传到这边吧”。')
  lines.push('五、时空压迫：时间/地点/人身限制。如”日出前你不离开，后果自负””一炷香时间考虑””在这间堂里你没有发言权”。')
  lines.push('')
  lines.push('【反派每集压迫要求】')
  lines.push('- 必须用以上至少1种压迫方式')
  lines.push('- 压迫后必须有可见结果：对手被迫让步/被夺物/被伤/改口/站队变化')
  lines.push('- 禁止连续2集用同一类压迫')
  lines.push('- 禁止反派只说狠话不动手，必须有具体动作落地')
  lines.push('   - 主角内心永远清醒、有算计、有后手，表面平静如水。')
  lines.push('2. 反派行为准则：')
  lines.push('   - 压迫必须是”实质性生存威胁”：夺修为、夺信物、夺权、杀人、灭口、断生路。')
  lines.push('   - 禁止靠吼叫、辱骂、无脑栽赃撑场面。')
  lines.push('   - 必须高智商：用规则杀人、用权术借刀、用利益分化、用布局围剿。')
  lines.push('3. 情感推进：主角与配角的信任/羁绊同步升级。')
  lines.push('')
  lines.push('【禁止事项 · 强制执行】')
  lines.push('1. 禁止主角窝囊、崩溃、绝望、持续吐血、被动挨打。')
  lines.push('2. 禁止反派低智、重复、只会喊”你不配”。')
  lines.push('3. 禁止主角用道德说教、讲道理反击，必须用实力/布局/底牌/证据反制。')
  lines.push('4. 禁止无爽点铺垫：有压迫→必有反击，有陷害→必有打脸。')
  lines.push('5. 禁止核心设定模糊：钥匙、蛇子、权限、规则必须讲透。')
  lines.push('')
  lines.push('【商业爽感底线】')
  lines.push('每一集必须让观众感受到：主角在赢、主角有后手、反派要倒霉了。')
  lines.push('')

  // 问题描述
  lines.push('【当前人物功能状态】')
  const protagonistArc = characterArcs.find((a) => a.characterName === protagonistName) || {
    characterName: protagonistName,
    status: 'new' as const,
    description: '',
    evidence: []
  }
  const supportingArc = characterArcs.find((a) => a.characterName === supportingName) || {
    characterName: supportingName,
    status: 'new' as const,
    description: '',
    evidence: []
  }
  const antagonistArc = characterArcs.find((a) => a.characterName === antagonistName) || {
    characterName: antagonistName,
    status: 'new' as const,
    description: '',
    evidence: []
  }

  lines.push(`- 主角 ${protagonistName}：[${protagonistArc.status.toUpperCase()}] ${buildArcDirection(protagonistArc)}`)
  lines.push(`- 配角 ${supportingName}：[${supportingArc.status.toUpperCase()}] ${buildArcDirection(supportingArc)}`)
  lines.push(`- 对手 ${antagonistName}：[${antagonistArc.status.toUpperCase()}] ${buildArcDirection(antagonistArc)}`)

  // 弧线推进指引
  lines.push('【本集人物功能推进方向】')
  for (const arc of characterArcs) {
    if (arc.status === 'stagnant' || arc.status === 'regressed') {
      lines.push(`- ${arc.characterName}：${buildArcDirection(arc)}`)
    }
  }

  lines.push('【本集剧本功能要求】')
  lines.push(`- 主角 ${protagonistName}：必须做出一个带后果的选择，不能只负责听、忍、回嘴。`)
  lines.push(`- 配角 ${supportingName}：必须提供一个杠杆，像线索、掩护、代价、情绪触发、站队变化。`)
  lines.push(`- 对手 ${antagonistName}：必须主动施压或改局，不能只重复威胁台词。`)
  lines.push('- 三个人不需要都“成长一点”，但至少要各自完成一个明确戏剧动作。')
  lines.push('- 这集最好形成一个闭环：主角做选择 -> 对手顶压力 -> 配角改变筹码或出口。')
  lines.push('- 主角的选择要尽量是二选一：保这个就要丢那个，护这个就得暴露那个，不能像流程动作。')
  lines.push(`- 对手 ${antagonistName} 最好加上明确时限、筹码或惩罚，不要只有口头压迫。`)
  lines.push(`- 配角 ${supportingName} 最好直接改掉一个筹码：藏证据、放人、翻供、挡刀、引开、泄密，至少命中一种。`)

  lines.push('【本集可用的修法】')
  lines.push('  1. 让角色做选择，并立刻付代价或得到结果')
  lines.push('  2. 让角色关系发生偏移，例如信任/背叛/让步/反咬')
  lines.push('  3. 让角色暴露新底牌，而不是重复旧口风')
  lines.push('  4. 让角色通过动作完成变化，不要靠解释性台词自述')
  lines.push('  5. 让角色从被动挨打，转成至少一次主动改局')
  lines.push('  6. 如果只能补一个人，优先补主角选择，其次补对手施压，再补配角杠杆')
  lines.push('  7. 配角不要只负责安慰或陪骂，必须带来线索、掩护、代价、背刺、转向中的至少一种')
  lines.push('  8. 主角的选择一旦成立，就让对手立刻顶上更狠的压迫，不要让选择白做')
  lines.push('  9. 对手的压迫一旦成立，就让配角去改筹码，不要让配角继续只是旁观')
  if (isEarlyEpisode) {
    lines.push('【开头集额外要求】')
    lines.push('- 这是前 3 集，主角不能一直像“以后会反击”的人，而要尽快做一次让观众记住的硬选择。')
    lines.push('- 对手最好尽快把刀架到眼前：限时、羞辱、栽赃、拿人质、逼交东西，至少命中一种。')
    lines.push('- 配角最好尽快变成杠杆，而不是只负责解释背景或表达担心。')
  }
  if (isOpeningEpisode) {
    lines.push('【第1集专用加力】')
    lines.push(`- 第1集里，主角 ${protagonistName} 必须尽快在“保人”与“保物/保脸/保底牌”之间做一次硬选择。`)
    lines.push(`- 第1集里，对手 ${antagonistName} 不只是威胁，要当场拿走一样东西、压下一道死条件，或者公开踩一次主角脸面。`)
    lines.push(`- 第1集里，配角 ${supportingName} 不能只被保护，最好顺手带出一个会逼动后续的筹码。`)
  }

  
  // ========================================================================
  // 首稿执行器移入的角色弧光规则（delegated from first-draft executor）
  // 这些是 arc_control_agent 的专属职责，不是首稿的事
  // ========================================================================
  lines.push('【弧光控制专属规则（来自首稿执行器）】')
  lines.push(
    '情感杠杆角色不能只做人质或陪跑，至少要主动带出一份证据，一个条件、一次交易或一次反咬。'
  )
  lines.push(
    '情感杠杆角色至少主动完成一次传信、藏证、换条件，自救，反咬或拖时间，不准一直被押、被绑、被等着救。'
  )
  lines.push(
    '当前 5 集批次里，关键收账动作必须先由主角或情感杠杆角色完成：拿证据、截人、换条件，反咬、夺物至少一种成立；师父、长老只能认证后果或追加规则。'
  )
  // ========================================================================

// 禁止事项
  lines.push('【禁止事项】')
  lines.push(`- 场数（第${sceneCount}场）和场号必须保持不变。`)
  lines.push('- 剧情主线、人物关系必须保持不变。')
  lines.push('- 不准从零重写，不准换剧情，不准换场次。')
  lines.push('- 只在原稿基础上改，补人物功能，不要推翻前面的剧情。')
  lines.push('- 必须保留「第X集」标题、原有场号、人物表、△动作和对白格式。')
  lines.push('- 禁止输出 Action:/Dialogue:/Emotion: 这类旧三段标签。')
  lines.push('- 只输出修改后的完整剧本正文，不要解释，不要分析。')
  lines.push('- 严禁让配角或反派抢走主角的最终决定权，主角必须是核心破局者。')

  // 原稿
  lines.push('【必须改的上一版原稿】')
  lines.push(previousScene.screenplay || '')

  return lines.join('\n')
}

