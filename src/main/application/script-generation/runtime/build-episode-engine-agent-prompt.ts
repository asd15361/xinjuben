/**
 * src/main/application/script-generation/runtime/build-episode-engine-agent-prompt.ts
 *
 * 推进引擎 Agent Prompt 构建器。
 *
 * 职责：打破已知循环模式、引入新事件、保持故事连贯性。
 *
 * 所有 Agent prompt 必须包含：
 * 1. 当前原稿全文
 * 2. 当前具体问题
 * 3. 明确目标
 * 4. 禁止事项
 *
 * 基于原稿改，不从零重写。
 */

import { KNOWN_LOOP_PATTERNS } from '../../../../shared/domain/script/screenplay-content-quality.ts'
import type { ScriptSegmentDto } from '../../../../shared/contracts/workflow.ts'

export interface EpisodeEngineAgentInput {
  /** 当前集原稿 */
  previousScene: ScriptSegmentDto
  /** 检测到的循环问题 */
  loopsDetected: Array<{ patternId: string; patternLabel: string }>
  /** 下一集提示（可选） */
  nextEpisodeHint?: string
  /** 期望的新事件（可选） */
  expectedEvent?: string
  /** 打法轮换违规信息（可选） */
  tacticRotationViolation?: {
    isDuplicate: boolean
    suggestedCategory?: string
    currentCategory?: string
  }
}

/**
 * 构建推进引擎 Agent Prompt。
 */
export function buildEpisodeEngineAgentPrompt(input: EpisodeEngineAgentInput): string {
  const { previousScene, loopsDetected, nextEpisodeHint, expectedEvent, tacticRotationViolation } = input
  const sceneCount = previousScene.screenplayScenes?.length || 2
  const isEarlyEpisode = (previousScene.sceneNo || 0) <= 3
  const isOpeningEpisode = (previousScene.sceneNo || 0) === 1

  const lines: string[] = []

  // 角色和任务声明
  lines.push(
    `你现在是推进引擎代理（episode-engine-agent）。你的任务是把第 ${previousScene.sceneNo} 集从“原地打转”改成“局面真的往前推，而且尾场结果必须落地”。`
  )
  lines.push(
    `你的目标只有一个：基于原稿直接改，让这一集出现新的推进、关系变化或结果落地，但不改变剧情主线，不从零重写。`
  )

  // 问题描述
  lines.push('【当前问题】')
  if (loopsDetected.length > 0) {
    lines.push(`- 当前集检测到 ${loopsDetected.length} 个已知循环模式：`)
    for (const loop of loopsDetected) {
      lines.push(`  - ${loop.patternLabel}`)
    }
  } else {
    lines.push('- 当前集缺乏新事件推进，情节停滞。')
  }
  lines.push('- 必须让本集至少新增 1 个可拍的推进：信息揭露、站位变化、局面逆转、结果落地，四选一或多选。')
  lines.push('- 不能只是“上一场继续吵完”；至少要把局面推到一个更危险、更明确或更难回头的位置。')
  lines.push('- 这次优先追求“不可逆结果”：人被拖走、证据易手、门被撞开、伤口见血、身份暴露、站队翻转，至少命中一种。')

  // 必须避免的 6 个已知循环模式
  lines.push('【必须避免的 6 个已知循环模式】')
  for (const pattern of KNOWN_LOOP_PATTERNS) {
    lines.push(`- ${pattern.label}：${pattern.description}`)
    if (pattern.alternativeTactics && pattern.alternativeTactics.length > 0) {
      lines.push(`  - 推荐替代打法：${pattern.alternativeTactics.join(' / ')}`)
    }
  }

  // 新事件指引
  lines.push('【爆款短剧 · 推进引擎黄金法则】')
  lines.push('- 每一集只干一件事：施压 → 反击 → 留钩子。')
  lines.push('- 第1集开局30秒必须炸场（死人/丢官/退婚/被夺/被冤枉），1分钟必须出现反转或打脸。')
  lines.push('- 集尾钩子法则：结尾必须停在反转刚完、最爽的前0.1秒，紧接着更大的悬念。')
  lines.push('- 5集一爽原则：当前集如果是5的倍数集，必须安排”当众打脸/身份揭晓/实力碾压”等大爽点。')
  lines.push('')
  lines.push('【主角窝囊即时拦截 · 出现即改】')
  lines.push('如果本集原稿中主角出现以下行为之一，必须重写：')
  lines.push('- 主动下跪/求饶/认错/赔笑脸（假意配合引蛇出洞除外）')
  lines.push('- 被威胁后只说”我错了””我不敢””求你别”')
  lines.push('- 被夺筹码后只愣住不反击，也不布局后手')
  lines.push('- 被打脸后说空话不行动：”你等着””以后我会”')
  lines.push('- 连续3句都在解释/道歉/退让')
  lines.push('')
  lines.push('【装弱 vs 真弱判断标准】')
  lines.push('- 装弱（允许且鼓励）：表面退一步暗藏后手；嘴里认输手里藏钥匙；假装害怕实则观察弱点；跪下是为了接近对方腰间的东西。')
  lines.push('- 真弱（禁止）：只退不还手、只认不反抗、只求不报复、只哭不行动。')
  lines.push('')
  lines.push('【本集连续性修复目标】')
  if (expectedEvent) {
    lines.push(`- 本集必须发生：${expectedEvent}`)
  } else {
    lines.push('- 必须从以下剧本方向引入至少 1 项明确推进：')
    lines.push('  1. 新信息落地：不是猜测，而是有人拿到证据、听到真话、看见结果')
    lines.push('  2. 关系变化：谁压着谁、谁信谁、谁站谁那边，必须发生偏移')
    lines.push('  3. 局面变化：门被撞开、人被带走、证据被夺、计划被破、身份暴露')
    lines.push('  4. 代价落地：有人受伤、失去、暴露、被迫让步、错过机会')
    lines.push('  5. 集尾结果：最后几行必须让局面比开头更糟、更紧或更明确，而不是停在“准备做”')
    lines.push('  6. 如果只能补一刀，优先补“集尾已发生结果”，不要补解释或铺垫')
  }

  lines.push('【剧本工艺要求】')
  lines.push('- 每一场都要让人物关系、信息量或局势至少变化一项。')
  lines.push('- 每一场都最好形成“阻碍 -> 应对 -> 结果”三步，不要只剩来回对骂。')
  lines.push('- 不要只让人物重复吵架、重复威胁、重复藏东西。')
  lines.push('- 集尾优先写“已经发生的结果”，不要停在“看见了什么”或“准备去做什么”。')
  lines.push('- 能把结果写到物件、伤口、门、火、证据、站位变化上，就不要只写情绪。')
  lines.push('- 如果本集只有 2-3 场，至少要有 1 场把局面直接改掉，不能每场都只是加压却不落结果。')
  lines.push('- 所谓“推进够狠”，不是多骂两句，而是有人已经失去东西、被逼改口、被迫换位、或者退路被切断。')
  lines.push('- 优先把结果写成当场发生，少写“后面会怎样”，多写“现在已经怎样”。')
  if (isEarlyEpisode) {
    lines.push('【开头集额外要求】')
    lines.push('- 这是前 3 集，前 30% 就要让主冲突咬人，不能慢慢热身。')
    lines.push('- 最好尽快让主角失去一个眼前能守住的东西，或被迫交出一个筹码。')
    lines.push('- 开头集的推进不要只停在“盯上了”，而要尽量写到“已经拿走、已经闯进、已经栽赃、已经逼到眼前”。')
  }
  if (isOpeningEpisode) {
    lines.push('【第1集专用加力】')
    lines.push('- 这是第1集，开头 30% 内必须完成一次硬夺筹码：钥匙被夺、人被扣住、门被堵死、脸面被踩穿，至少命中一种。')
    lines.push('- 第1集结尾不要只停在“主角决定去查”，而要尽量写到“对手已经先走一步、主角已经丢了一样东西、下一步已经被逼出来”。')
    lines.push('- 第1集最值钱的不是铺世界观，而是让观众立刻吃到“主角真被压住了，但也真开始反咬了”。')
  }

  // 下一集提示
  if (nextEpisodeHint) {
    lines.push(`【下一集提示】${nextEpisodeHint}`)
  }

  // 打法轮换违规提示
  if (tacticRotationViolation?.isDuplicate) {
    const current = tacticRotationViolation.currentCategory || '未知类别'
    const suggested = tacticRotationViolation.suggestedCategory || '其他类别'
    lines.push('')
    lines.push('【打法轮换 · 强制变位】')
    lines.push(`本集压迫手段与上一集重复（均为${current}），必须换成${suggested}类压迫。`)
    lines.push('五种压迫类别：')
    lines.push('- 硬夺类：抢钥匙/抢人/绑人质/截路/搜身/夺物')
    lines.push('- 规则类：用宗门规矩压/用旧账压/用职责压/用名义压/追责令/公审')
    lines.push('- 关系类：分化站队/情感绑架/信任背刺/利益分化/借刀杀人/条件交换')
    lines.push('- 信息类：误导/试探/调包/截胡/反证/假情报/信息差碾压/暗中做局')
    lines.push('- 时空类：时限倒计时/封锁出口/围困/押送途中')
  }

  // ========================================================================
  // 首稿执行器移入的推进规则（delegated from first-draft executor）
  // 这些是 episode_engine_agent 的专属职责，不是首稿的事
  // ========================================================================
  lines.push('【推进引擎专属规则（来自首稿执行器）】')
  lines.push(
    '如果底稿偏权谋、智斗或"靠智慧周旋"，优先写抢人、抢物、抢证据、抢口风、抢时间、换站队；不要滑成纯打、纯追、纯怪物升级。'
  )
  lines.push(
    '每场先找到一个戏眼：谁夺什么、谁守什么、谁在试探、做局、反咬或拖时间。sceneByScene 只是骨架，不是逐句翻译稿。'
  )
  lines.push(
    '相邻两场的推进手法必须变化；上一场若是正面逼压，下一场就换试探、借势、误导、反证、调包或关系倒挂，别连着两场只会吼、威胁、打。'
  )
  lines.push(
    '妖兽、灾变、高手外压只能放大人祸，不能抢戏；它们只能把抢人、逼供、追责、争物、翻案、换站队推得更狠，不准自己接管终局。'
  )
  lines.push(
    '最后三场优先收人账、证据账、规则账、关系账：谁被揭穿、谁失去筹码、谁被迫表态、谁拿证据换命、谁被追责，至少落两条，再写外压后果。'
  )
  lines.push(
    '师父、长老、高手若出场，只能改规则、压时限、给条件、逼表态；不能直接执行"废修为、收钥匙、投入炼炉、当众宣判"这类终局动作来替主角收账。'
  )
  lines.push(
    '公审、议事、对质类场景只保留最能改局的 4-6 句发言；每个人只准贡献一句新信息或新威胁，重复前情和重复立场全删。同一集制度场最多 1 场；若上一集已在殿内/公审推进，本集就转去抢证、拦人、毁契、追逃或私下交易。'
  )
  lines.push(
    '后半程别套"堂上流程 -> 廊道威胁 -> 夜潜查证 -> 再回堂上流程"的循环；上一集若刚用了程序场，本集第一场就转去山林、暗巷、医庐、旧巢、门外、路上、宅邸或潭边；"被带去问话"不算推进。'
  )
  lines.push(
    '当前 5 集批次若其他道观、使者、长老或新上位者出场，他们只能拿旧账加压，不能接管主戏；真正推进仍要落在黎明、小柔、李科、钥匙、伤势、证据和职责落身上。'
  )
  lines.push(
    '接任、宣判、认罚、废修为、宗门表态只能做结果确认，不准占满一整集；若必须出现，只放最短一场，前面先把抢证、护人、烧钥匙、截路或带伤选择写完。'
  )
  lines.push(
    '不要写"象征意义、话语权、势力格局、内部分裂"这类抽象推进词；必须翻成谁拿着什么、谁堵路、谁抢盒、谁逼谁站队。'
  )
  lines.push(
    '别把台词、动作或场尾写成"争证据、争站队、争时间、主导权、推进、升级、收束"这类策划词；必须写成谁夺了什么、谁堵住了谁、谁把哪件东西拍到谁脸上。'
  )
  lines.push(
    '第6集以后每集第一场优先从搜屋、门外堵截、押送路上、医庐换药、地窖取物、暗巷换手、山林追逃、潭边毁契这些私人动作开；如果第一场还是程序场、关押问话或听宣盖章，算写偏。'
  )
  lines.push(
    '第4集以后，scene1 禁止落在堂上流程、关押问话或盖章程序里；若上游真有问责，也只能放到本集最短后半场。'
  )
  lines.push(
    '师父、执事、长老只能验真、截停、压时限、改规则；不准突然带着新账册、新记录、新证词进门直接替主角揭底。关键证据必须先由主角或情感杠杆角色拿到、藏住、换出、递出或逼出来。'
  )
  lines.push(
    '潜入、搜屋、尾随、躲藏、包扎、换药这类场也不能整场默剧；至少落一次可听见的人声交锋、低声试探、门外喊话、短促示警或喘着回话，让戏还在对人施压，不是只剩动作示意。'
  )
  lines.push(
    '包扎、换药、歇脚、潭边喘气这类场也必须继续推进：至少带出藏账页、压伤口、塞碎钥匙、换路线、盯残党或下一步去处之一，不准把人物停下来互相解释主题。'
  )
  // ========================================================================

  // 禁止事项
  lines.push('【禁止事项】')
  lines.push(`- 场数（第${sceneCount}场）和场号必须保持不变。`)
  lines.push('- 剧情主线、人物关系、承接关系必须保持不变。')
  lines.push('- 不准从零重写，不准换剧情，不准换场次。')
  lines.push('- 不准增加新角色（除非本集原本就需要新角色出场）。')
  lines.push('- 只在原稿基础上改，打破循环，不要推翻前面的剧情。')
  lines.push('- 必须保留「第X集」标题、原有场号、人物表、△动作和对白格式。')
  lines.push('- 禁止输出 Action:/Dialogue:/Emotion: 这类旧三段标签。')
  lines.push('- 只输出修改后的完整剧本正文，不要解释，不要分析。')

  // 原稿
  lines.push('【必须改的上一版原稿】')
  lines.push(previousScene.screenplay || '')

  return lines.join('\n')
}

