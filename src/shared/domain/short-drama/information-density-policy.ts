/**
 * 信息密度规则资产（Information Density Policy）
 *
 * 原则：
 * 1. 短剧信息密度直接决定观众留存，每一秒都要有有效信息。
 * 2. 四种核心技法：冲突、道具、潜台词、动作情绪。
 * 3. 每条规则带 repairHint，P5 修稿直接调用。
 */

// ─────────────────────────────────────────────────────────────────────────────
// 一、信息密度规则定义
// ─────────────────────────────────────────────────────────────────────────────

export interface InformationDensityRule {
  id: string
  name: string
  description: string
  goodExample: string
  badExample: string
  /** P5 修稿直接用的修复提示 */
  repairHint: string
}

export const INFORMATION_DENSITY_RULES: InformationDensityRule[] = [
  {
    id: 'conflict_over_exposition',
    name: '用冲突代替设定',
    description:
      '短剧无需冗长背景介绍，用即时冲突传递关键信息，让观众3秒入戏。冲突中自带人设、背景、矛盾点。',
    goodExample:
      '女主刚下班，反派（前男友+新欢）堵在公司门口，当众嘲讽她穷酸，逼她还当初的"分手费"——冲突中交代了：女主近况、两人过往关系、反派动机。',
    badExample:
      '女主起床、洗漱、吐槽生活，然后引出反派找麻烦——铺垫占比超50%，观众前10秒不知道要看什么。',
    repairHint:
      '删掉所有铺垫性场景和解释性台词。直接切入冲突，把背景信息拆碎塞进冲突动作和对话里。'
  },
  {
    id: 'prop_as_carrier',
    name: '用道具承载信息',
    description:
      '不写无用道具，每个道具都承载"人设、剧情、钩子"三重功能。一物多用，让道具成为信息载体。',
    goodExample:
      '女主包里掉出"旧照片"（照片上是她和大佬的合影，但被撕了一半）。①人设：念旧、有隐藏过往；②剧情：反派看到照片嘲讽"你还幻想攀高枝"；③钩子：观众好奇"照片上的人是谁"。',
    badExample:
      '女主坐在咖啡厅，面前放着一杯咖啡，喝着咖啡回忆过去——咖啡与剧情无关，纯装饰。',
    repairHint:
      '检查场景中每个道具：如果删掉它剧情不受影响，就删掉。如果保留，给它一个隐藏信息或剧情功能。'
  },
  {
    id: 'subtext_over_statement',
    name: '用潜台词代替解释',
    description:
      '台词不说废话，每一句都藏"未说透的信息"，既省时间又留悬念。让观众通过上下文脑补背景。',
    goodExample:
      '反派："你现在连杯奶茶都喝不起，当初还装千金骗我？" 女主："我没骗你，只是你没等到我拿回属于我的东西"——潜台词交代了女主曾经的身份和即将的逆袭。',
    badExample:
      '女主直白说："我曾经是XX集团的千金，后来家道中落，你当初是为了钱才跟我在一起"——信息量足但生硬拖沓。',
    repairHint:
      '把所有直白说明的台词改成"话里有话"。让观众从上下文中推断背景，不要直接告诉观众。'
  },
  {
    id: 'action_emotion_binding',
    name: '用行动绑定情绪',
    description:
      '人物动作不孤立，每个动作都要带"情绪"，情绪里藏"人设/处境"。避免无意义动作。',
    goodExample:
      '女主被反派嘲讽后，没有哭闹，而是"攥紧拳头，指甲掐进掌心，嘴角却勾起笑"——动作：隐忍+不服输；情绪：委屈但坚韧；人设：外柔内刚。',
    badExample:
      '女主被嘲讽后，"转身走了"——动作没有情绪，没有信息量，观众不知道她是什么态度。',
    repairHint:
      '给每个关键动作加上情绪细节：手怎么动、眼神怎样、身体姿态如何。动作要服务于"塑造人设"或"推动剧情"。'
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// 二、信息密度检查点
// ─────────────────────────────────────────────────────────────────────────────

export interface InformationDensityCheckpoint {
  id: string
  label: string
  description: string
  /** 每集必须满足的数量 */
  minimumCount: number
}

export const INFORMATION_DENSITY_CHECKPOINTS: InformationDensityCheckpoint[] = [
  {
    id: 'conflict_carrier',
    label: '冲突载体',
    description: '本集核心信息是否通过冲突场景传递，而非解释台词',
    minimumCount: 1
  },
  {
    id: 'prop_carrier',
    label: '道具载体',
    description: '本集是否有至少一个道具承载人设/剧情/钩子三重功能',
    minimumCount: 1
  },
  {
    id: 'subtext_line',
    label: '潜台词',
    description: '本集是否有至少一句台词包含未说透的信息',
    minimumCount: 1
  },
  {
    id: 'action_emotion_beat',
    label: '动作情绪节拍',
    description: '本集是否有至少一个动作携带明确情绪信息',
    minimumCount: 1
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// 三、生成提示指令
// ─────────────────────────────────────────────────────────────────────────────

export interface InformationDensityInstructionInput {
  /** 当前集数 */
  episodeNo: number
  /** 场景数量 */
  sceneCount: number
  /** 目标字数 */
  targetWordCount?: number
}

export function buildInformationDensityInstruction(
  input: InformationDensityInstructionInput
): string {
  const rules = INFORMATION_DENSITY_RULES
  const checkpoints = INFORMATION_DENSITY_CHECKPOINTS

  const ruleBlocks = rules
    .map(
      (r) =>
        `### ${r.name}
${r.description}
✓ 正确示例：${r.goodExample}
✗ 错误示例：${r.badExample}`
    )
    .join('\n\n')

  const checkpointBlocks = checkpoints
    .map((c) => `- 【${c.label}】${c.description}（至少${c.minimumCount}处）`)
    .join('\n')

  return `第${input.episodeNo}集信息密度执行标准

本集共${input.sceneCount}场，${input.targetWordCount ? `目标字数${input.targetWordCount}字，` : ''}必须遵守以下四招：

${ruleBlocks}

自检查清单（写完必须逐项核对）：
${checkpointBlocks}

信息密度公式：
有效信息 = 冲突（剧情）+ 道具（载体）+ 潜台词（对话）+ 情绪动作（人设）
如果一场戏删掉后不影响观众理解，这场戏就不该存在。`
}

// ─────────────────────────────────────────────────────────────────────────────
// 四、修稿专用函数
// ─────────────────────────────────────────────────────────────────────────────

/** 按规则ID获取修稿提示 */
export function getRepairHintByRuleId(ruleId: string): string {
  const rule = INFORMATION_DENSITY_RULES.find((r) => r.id === ruleId)
  if (!rule) {
    throw new Error(`Unknown information density rule: ${ruleId}`)
  }
  return rule.repairHint
}

/** 获取所有修稿提示 */
export function getAllRepairHints(): Record<string, string> {
  const result: Record<string, string> = {}
  for (const rule of INFORMATION_DENSITY_RULES) {
    result[rule.id] = rule.repairHint
  }
  return result
}

/** 检测剧本文本中是否包含解释性台词（简单启发式检测） */
export function detectExpositionLines(text: string): string[] {
  const expositionPatterns = [
    /我曾经是/,
    /你要知道/,
    /让我告诉你/,
    /事情是这样的/,
    /三年前/,
    /那时候/,
    /我们之前/,
    /你忘了/,
    /你记得/,
    /简单来说/,
    /说白了/,
    /其实/,
    /原来/,
    /当初/,
    /之前/
  ]

  const lines = text.split('\n')
  const expositionLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('△')) continue

    for (const pattern of expositionPatterns) {
      if (pattern.test(trimmed)) {
        expositionLines.push(trimmed)
        break
      }
    }
  }

  return expositionLines
}

/** 检查一场戏是否满足信息密度最低要求 */
export function checkSceneInformationDensity(sceneText: string): {
  checkpointId: string
  label: string
  passed: boolean
  evidence: string
}[] {
  const results: ReturnType<typeof checkSceneInformationDensity> = []

  // 冲突检测：是否有明显的对抗性动作或对话
  const hasConflict =
    /[反对抗拒争骂打逼压羞辱嘲笑威胁配]|你也配|凭什么|欠我的|还我|找死|滚/u.test(
      sceneText
    )
  results.push({
    checkpointId: 'conflict_carrier',
    label: '冲突载体',
    passed: hasConflict,
    evidence: hasConflict ? '检测到冲突关键词' : '未检测到冲突场景'
  })

  // 道具检测：是否有具体物件名称
  const propMatch = sceneText.match(
    /(照片|信件|文件|戒指|项链|钥匙|手机|合同|证据|刀|枪|药物|酒杯|书本|盒子|卡片)/
  )
  results.push({
    checkpointId: 'prop_carrier',
    label: '道具载体',
    passed: !!propMatch,
    evidence: propMatch ? `检测到道具：${propMatch[0]}` : '未检测到具体道具'
  })

  // 潜台词检测：是否有反问或双关
  const hasSubtext = /[吗呢吧]?[\?？]|"[^"]*"|——|…|\\.{3}/u.test(sceneText)
  results.push({
    checkpointId: 'subtext_line',
    label: '潜台词',
    passed: hasSubtext,
    evidence: hasSubtext ? '检测到潜台词标记' : '未检测到潜台词'
  })

  // 动作情绪检测：是否有情绪描述
  const emotionMatch = sceneText.match(/(冷笑|攥紧|颤抖|眼神|咬牙|怒吼|沉默|低头|抬头)/)
  results.push({
    checkpointId: 'action_emotion_beat',
    label: '动作情绪节拍',
    passed: !!emotionMatch,
    evidence: emotionMatch ? `检测到情绪动作：${emotionMatch[0]}` : '未检测到情绪动作'
  })

  return results
}
