/**
 * src/main/application/script-generation/runtime/build-emotion-lane-agent-prompt.ts
 *
 * 情绪车道 Agent Prompt 构建器。
 *
 * 职责：让核心情绪通过冲突、选择、结果稳定落地。
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

export interface EmotionLaneAgentInput {
  /** 当前集原稿 */
  previousScene: ScriptSegmentDto
  /** 情绪车道分数 */
  emotionAnchoringScore: number
  /** 主角名 */
  protagonistName: string
  /** 当前项目核心情绪 */
  coreEmotion?: string
}

/**
 * 构建情绪车道 Agent Prompt。
 */
export function buildEmotionLaneAgentPrompt(input: EmotionLaneAgentInput): string {
  const { previousScene, emotionAnchoringScore, coreEmotion, protagonistName } = input
  const sceneCount = previousScene.screenplayScenes?.length || 2
  const resolvedEmotion = coreEmotion?.trim() || '当前主情绪'

  const lines: string[] = []

  // 角色和任务声明
  lines.push(
    `你现在是情绪车道代理（emotion-lane-agent）。你的任务是把第 ${previousScene.sceneNo} 集里的核心情绪「${resolvedEmotion}」真正稳在戏里。`
  )
  lines.push(
    `你的目标只有一个：基于原稿直接改，让核心情绪通过“冲突 -> 选择 -> 结果”稳定落地，但不改变剧情主线，不从零重写。`
  )

  // 当前分数和目标
  lines.push('【当前问题】')
  lines.push(`- 当前情绪车道分数：${emotionAnchoringScore}/100，需要达到 60 分以上。`)
  lines.push(`- 当前核心情绪：${resolvedEmotion}`)
  lines.push('- 情绪车道不是加气氛词，不是加抒情解释，而是让整集的冲突、对白、结果都服务同一种情绪。')
  lines.push(`- 这次优先盯住主角 ${protagonistName}：要让他的选择和代价继续把观众拉回「${resolvedEmotion}」，不要中途跳去别的味道。`)
  lines.push('- 最好把情绪动作钉在开场压迫、场中改位和尾场结果上，让观众不是“知道这集想表达什么”，而是“直接被这股情绪带着走”。')
  lines.push('- 这次不要补空话，优先补可拍结果：谁更惨、谁更狠、谁更甜、谁更紧、谁更痛，都必须落在动作、对白或局面结果上。')

  // 根据分数给出不同指引
  if (emotionAnchoringScore < 30) {
    lines.push('【情绪车道修复方向（分数低于30）】')
    lines.push('本集必须补出一条清楚的情绪主线：')
    lines.push('  1. 开场先用一刀更硬的压力或诱因，把观众直接拉进这股情绪')
    lines.push('  2. 场中让主角做一次会放大这股情绪的选择，而不是平平滑过去')
    lines.push('  3. 尾场必须交一个结果，让这股情绪在结尾更强，而不是半路散掉')
    lines.push('  4. 删掉会把观众带去别的味道的解释、抒情、世界观闲聊')
  } else if (emotionAnchoringScore < 60) {
    lines.push('【情绪车道强化方向（分数30-59）】')
    lines.push('本集应该把这股情绪写得更具体、更可拍：')
    lines.push('  1. 让观众看见角色到底因此失去什么、抢回什么、逼到什么')
    lines.push('  2. 让对手或同伴立刻对这个情绪动作产生反应')
    lines.push('  3. 让尾场结果把这股情绪再顶高一格，而不是停在态度')
  } else {
    lines.push('【情绪车道微调方向（分数60以上）】')
    lines.push('本集应该继续深化这股情绪：')
    lines.push('  1. 让角色的情绪动作产生更具体的代价或收益')
    lines.push('  2. 让别的角色被这股情绪逼出反应')
    lines.push('  3. 继续用动作和局面结果承载情绪，不要变成说教')
  }

  // 情绪呈现原则
  lines.push('【爆款短剧 · 情绪车道黄金法则】')
  lines.push('- 情绪公式：短剧 = 憋屈 → 反转 → 爽 → 钩子。')
  lines.push('- 核心情绪不能靠喊口号，要靠主角利用信息差/底牌让对手吃瘪产生的“爽感”来钉死。')
  lines.push('- 绝对禁止表现主角真正畏缩、窝囊。主角的每一秒“受辱”，都必须在集内翻盘，转化为观众的“解气”情绪。')
  lines.push('- 尾场钩子必须建立在情绪高潮处：反转刚完，更大的危机/反派登场，把观众情绪强行带入下一集。')
  lines.push('')
  lines.push('【情绪车道原则】')
  lines.push('- 核心情绪不能靠喊口号或讲道理，要靠可拍动作和结果来承担。')
  lines.push('- 一集只死磕一股主情绪，不要一会儿爽、一会儿抒情、一会儿讲道理。')
  lines.push('- 角色做出的选择必须直接放大这股情绪，不能只是补背景或补设定。')
  lines.push('- 开场、场中、尾场都最好各有一处服务主情绪，但不用每句台词都喊情绪词。')
  lines.push('- 尾场优先写“已经发生的结果”，因为结果最能把情绪钉死。')
  lines.push('- 如果这股情绪没有改变谁占上风、谁更危险、谁更靠近目标，那就说明还没真正落地。')

  
  // ========================================================================
  // 情绪车道主题规则（通用版）
  // 严禁角色将本剧的核心哲学或深层设定直接当口号喊出来
  // 必须将其转化为具体的让步、藏锋、代价或动作
  // ========================================================================
  lines.push('【情绪车道主题规则（通用版）】')
  lines.push(
    '严禁角色将本剧的核心哲学或深层设定直接当口号喊出来；必须将其转化为具体的让步、藏锋、代价或动作。'
  )
  lines.push(
    '如果必须点题，每集最多1句，而且要紧贴实物、伤口或已经发生的后果，不准讲经或喊口号。'
  )
  lines.push(
    '禁止写"师父说……所以……""大道就是……""空的才是真"这类问答式定义句。必须用具体行为承载。'
  )
  // ========================================================================

// 禁止事项
  lines.push('【禁止事项】')
  lines.push(`- 场数（第${sceneCount}场）和场号必须保持不变。`)
  lines.push('- 剧情主线、人物关系必须保持不变。')
  lines.push('- 不准从零重写，不准换剧情，不准换场次。')
  lines.push('- 只在原稿基础上改，让核心情绪落地，不要推翻前面的剧情。')
  lines.push('- 不要给每场都硬塞情绪词；只要抓住一两个关键动作，把情绪变成可拍后果就够了。')
  lines.push('- 必须保留「第X集」标题、原有场号、人物表、△动作和对白格式。')
  lines.push('- 禁止输出 Action:/Dialogue:/Emotion: 这类旧三段标签。')
  lines.push('- 只输出修改后的完整剧本正文，不要解释，不要分析。')

  // 原稿
  lines.push('【必须改的上一版原稿】')
  lines.push(previousScene.screenplay || '')

  return lines.join('\n')
}

