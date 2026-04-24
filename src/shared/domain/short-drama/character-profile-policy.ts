/**
 * 人物小传规则资产（Character Profile Policy）
 *
 * 原则：
 * 1. 人物小传是人物，不是剧情梗概。
 * 2. 五要素必须齐全，缺一不可。
 * 3. 每个重要人物必须有明确的剧情功能。
 * 4. 反派也要有完整设计，不能只写"坏人"。
 */

// ─────────────────────────────────────────────────────────────────────────────
// 一、五要素定义
// ─────────────────────────────────────────────────────────────────────────────

export interface CharacterProfileElement {
  id: string
  label: string
  description: string
  /** 该要素必须回答的核心问题 */
  coreQuestion: string
  /** 反面警示（什么算没写好） */
  antiPattern: string
  /** 好例子示范 */
  goodExample: string
}

export const CHARACTER_PROFILE_REQUIRED_FIELDS: CharacterProfileElement[] = [
  {
    id: 'appearance',
    label: '外在形象',
    description: '年龄、性别、身高体型、穿衣风格、标志性外貌特征',
    coreQuestion: '这个人一眼看上去是什么样？观众第一眼能建立什么视觉印象？',
    antiPattern: '只写"年轻貌美"或"英俊潇洒"，没有具体可拍的特征',
    goodExample:
      '28岁，寸头，左眉有道旧疤，常年穿洗得发白的工装外套，走路时右手始终插在兜里（里面攥着一把老式钥匙）'
  },
  {
    id: 'personality',
    label: '性格特征',
    description: '核心性格、行为模式、情绪反应方式、口头禅或习惯性动作',
    coreQuestion: '这个人遇到事情会怎么反应？他的行为逻辑底层是什么？',
    antiPattern: '只写"善良""聪明"，没有具体行为支撑；或者性格前后矛盾没有弧光',
    goodExample:
      '表面沉默寡言，实则观察入微；遇到突发状况先稳住呼吸再说话；习惯在紧张时摸左眉的旧疤；绝不主动解释自己'
  },
  {
    id: 'identity',
    label: '身份处境',
    description: '社会身份、职业、家庭地位、当前处境（顺境/逆境/隐藏）',
    coreQuestion: '这个人在社会中处于什么位置？他当前面临什么处境？',
    antiPattern: '只写职业名称，不写处境；或者处境和剧情没有关联',
    goodExample:
      '表面是小区保安，实际是退役特种兵；因三年前一次任务失败自我放逐，目前靠最低收入生活， but 仍在暗中关注旧案'
  },
  {
    id: 'values',
    label: '价值观',
    description: '这个人最看重什么？什么原则不可动摇？什么情况下会破例？',
    coreQuestion: '驱动这个人行动的根本信念是什么？',
    antiPattern: '不写价值观，或者价值观和剧情行动对不上',
    goodExample:
      '信奉"欠的债必须还，不管是恩还是仇"；绝不主动伤害无辜，但报复时绝不手软；认为软弱比死亡更可怕'
  },
  {
    id: 'plotFunction',
    label: '剧情功能',
    description: '这个人在故事中承担什么功能？推动什么线？影响谁的命运？',
    coreQuestion: '如果没有这个人，故事会缺什么？',
    antiPattern: '写成"后来他去做了什么"的剧情流水账；或者人物功能重复（两个角色干同一件事）',
    goodExample:
      '核心功能：在主角最危险时提供关键信息；情感功能：让主角意识到"还有人记得他过去的好"；伏笔功能：他手中的钥匙是开启最终密室的道具'
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// 二、人物小传反模式
// ─────────────────────────────────────────────────────────────────────────────

export interface CharacterProfileAntiPattern {
  id: string
  label: string
  description: string
  /** 检测标志 */
  detectableMarkers: string[]
  /** 修复方向 */
  repairDirection: string
}

export const CHARACTER_PROFILE_ANTI_PATTERNS: CharacterProfileAntiPattern[] = [
  {
    id: 'plot_summary_masquerade',
    label: '剧情梗概伪装成人物小传',
    description: '把"第几集主角做了什么"写进人物小传，混淆人物设定和剧情梗概',
    detectableMarkers: ['第', '集', '后来', '接着', '之后', '最终'],
    repairDirection: '删掉所有剧情时间线，只保留人物静态属性和内在驱动'
  },
  {
    id: 'tool_person',
    label: '工具人',
    description: '人物存在只为推动某一个剧情点，没有独立性格、动机和价值观',
    detectableMarkers: ['帮助主角', '给主角', '提醒主角', '替主角'],
    repairDirection: '给工具人一个自己的欲望和矛盾：他为什么要帮主角？他从中能得到什么？他有什么代价？'
  },
  {
    id: 'flat_villain',
    label: '扁平反派',
    description: '反派只有"坏"这一个维度，没有权力来源、压迫方式和个人动机',
    detectableMarkers: ['很坏', '心狠手辣', '无恶不作', '就是想害主角'],
    repairDirection:
      '给反派一个具体的权力来源和压迫方式：他用规则压人？用权位压人？他的恐惧是什么？他的弱点是什么？'
  },
  {
    id: 'missing_plot_function',
    label: '缺失剧情功能',
    description: '写了人物形象和性格，但没写这个人在故事里起什么作用',
    detectableMarkers: [],
    repairDirection: '明确回答：删掉这个人，故事哪条线会断？哪场戏会塌？'
  },
  {
    id: 'protagonist_without_arc',
    label: '主角没有弧光',
    description: '主角从头到尾性格不变，没有成长、没有转变、没有代价',
    detectableMarkers: ['始终', '一直', '从来', '从未改变'],
    repairDirection: '给主角一个初始缺陷信念和一个必须付出的代价，让他在故事中被逼着改变'
  },
  {
    id: 'all_mouth_no_action',
    label: '只会说不会做',
    description: '人物价值观写得很漂亮，但剧情中他的行动和价值观对不上',
    detectableMarkers: [],
    repairDirection: '检查人物的所有关键行动，是否都能从他声明的价值观推导出来'
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// 三、按五要素生成提示指令
// ─────────────────────────────────────────────────────────────────────────────

export interface CharacterProfileInstructionInput {
  /** 角色名称 */
  characterName: string
  /** 角色层级：core=主角层, active=主动推进层, functional=功能层 */
  roleLayer: 'core' | 'active' | 'functional'
  /** 是否是反派 */
  isAntagonist?: boolean
  /** 已知信息（可选） */
  knownInfo?: {
    appearance?: string
    personality?: string
    identity?: string
    values?: string
    plotFunction?: string
  }
}

export function buildCharacterProfileInstruction(input: CharacterProfileInstructionInput): string {
  const elements = CHARACTER_PROFILE_REQUIRED_FIELDS
  const antiPatterns = CHARACTER_PROFILE_ANTI_PATTERNS

  const roleLabel = input.isAntagonist ? '反派' : input.roleLayer === 'core' ? '主角' : '重要角色'

  const knownBlocks: string[] = []
  if (input.knownInfo) {
    for (const element of elements) {
      const known = input.knownInfo[element.id as keyof typeof input.knownInfo]
      if (known) {
        knownBlocks.push(`【已确认·${element.label}】${known}`)
      }
    }
  }

  const elementBlocks = elements
    .map(
      (e) => `### ${e.label}
必须回答：${e.coreQuestion}
要求：${e.description}
反面警示：${e.antiPattern}
示例：${e.goodExample}`
    )
    .join('\n\n')

  const antiPatternBlocks = antiPatterns
    .map(
      (a) => `- 【${a.label}】${a.description}
  检测词：${a.detectableMarkers.join('、') || '（需人工判断）'}
  修复：${a.repairDirection}`
    )
    .join('\n')

  return `为【${roleLabel}】${input.characterName} 撰写人物小传。

${knownBlocks.length > 0 ? '已知信息（必须保留并扩展）：\n' + knownBlocks.join('\n') + '\n\n' : ''}人物小传必须包含以下五要素，缺一不可：

${elementBlocks}

绝对禁止以下反模式：
${antiPatternBlocks}

输出格式：
按五要素分块输出，每块标题明确。不要写成剧情流水账，不要写"第几集发生什么"。每块控制在80-150字。`
}

// ─────────────────────────────────────────────────────────────────────────────
// 四、辅助函数
// ─────────────────────────────────────────────────────────────────────────────

/** 检查人物小传文本是否包含反模式标记 */
export function detectCharacterProfileAntiPatterns(text: string): CharacterProfileAntiPattern[] {
  const detected: CharacterProfileAntiPattern[] = []
  for (const pattern of CHARACTER_PROFILE_ANTI_PATTERNS) {
    for (const marker of pattern.detectableMarkers) {
      if (marker && text.includes(marker)) {
        detected.push(pattern)
        break
      }
    }
  }
  return detected
}

/** 获取五要素标签列表 */
export function getCharacterProfileFieldLabels(): string[] {
  return CHARACTER_PROFILE_REQUIRED_FIELDS.map((f) => f.label)
}

/** 检查人物小传是否五要素齐全（简单关键词检测） */
export function checkCharacterProfileCompleteness(text: string): {
  fieldId: string
  label: string
  present: boolean
}[] {
  return CHARACTER_PROFILE_REQUIRED_FIELDS.map((field) => ({
    fieldId: field.id,
    label: field.label,
    present: text.includes(field.label)
  }))
}
