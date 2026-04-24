/**
 * 剧本格式规则资产（Screenplay Format Policy）
 *
 * 原则：
 * 1. 剧本是拍摄蓝图，不是小说。
 * 2. 格式错误会导致拍摄现场混乱和后期剪辑困难。
 * 3. 规则必须具体可检测，不能泛泛而谈。
 */

// ─────────────────────────────────────────────────────────────────────────────
// 一、格式规则定义
// ─────────────────────────────────────────────────────────────────────────────

export interface ScreenplayFormatRule {
  id: string
  name: string
  description: string
  correctExample: string
  wrongExample: string
  /** P5 修稿直接用的修复提示 */
  repairHint: string
}

export const SCREENPLAY_FORMAT_RULES: ScreenplayFormatRule[] = [
  {
    id: 'no_quotes_for_dialogue',
    name: '对话不用双引号',
    description: '剧本中对话无需像小说那样用双引号引用。角色名后直接写台词即可。',
    correctExample: '林晚：\n你也配站在这里？',
    wrongExample: '林晚：\n"你也配站在这里？"',
    repairHint: '删掉所有对话两侧的双引号。剧本格式：角色名换行后直写台词。'
  },
  {
    id: 'scene_heading_clear',
    name: '场景标识清楚',
    description: '每场戏必须有清晰的场景标题：集号-场号 地点 时间（日/夜/内/外）。',
    correctExample: '1-1 林家别墅客厅 日内',
    wrongExample: '林家\n或者只写"客厅"不写集号和场号',
    repairHint:
      '补全场景标题格式："集号-场号 具体地点 时间"。地点要具体（写"皇帝寝宫"不写"皇宫"），时间必须标日/夜和内/外。'
  },
  {
    id: 'no_director_camera',
    name: '不写导演机位',
    description: '编剧无需通篇写镜头。只有在需要交代特殊信息（如重要道具）时，才写特写。镜头设计是导演的工作。',
    correctExample: '△林晚从包里掉出半张旧照片',
    wrongExample: '特写：镜头缓缓推进，对准林晚颤抖的手，景深模糊背景...',
    repairHint: '删掉所有导演机位描述。如果必须强调某个道具，用"△"标记动作行即可。'
  },
  {
    id: 'action_line_clear',
    name: '动作行清楚',
    description: '动作描写用"△"标记开头，写可拍摄的动作，不写内心独白或小说式描写。',
    correctExample: '△林晚攥紧拳头，指甲掐进掌心，嘴角却勾起笑',
    wrongExample: '△林晚内心充满了愤怒和不甘，她想起三年前那个雨夜...',
    repairHint: '动作行只写外在可拍动作，不写内心活动。内心活动通过动作和台词暗示。'
  },
  {
    id: 'os_vs_vo_distinction',
    name: 'OS和VO区分清楚',
    description: 'OS（内心独白，角色在场但声音不出画）和VO（画外音，角色不在场或旁白）必须区分。',
    correctExample: '林晚（OS）：\n我不能在这里倒下。\n\n旁白（VO）：\n三年前的那个晚上，一切都不一样了。',
    wrongExample: '林晚（内心）：\n我不能在这里倒下。',
    repairHint: '统一用（OS）表示内心独白，（VO）表示画外音/旁白。不要用"内心""心声"等模糊标注。'
  },
  {
    id: 'episode_scene_numbering',
    name: '集号场号规范',
    description: '用阿拉伯数字标记，"1"代表第一集，"1-1"表示第一集第一场。每集的场号从1开始。',
    correctExample: '第1集\n1-1 公司门口 日外\n1-2 咖啡厅 日内',
    wrongExample: '第一集第一场\n或\n场景一：公司门口',
    repairHint: '统一用"第X集"标集号，用"X-Y"标场号。不要用中文数字或"场景X"。'
  },
  {
    id: 'location_specific',
    name: '地点具体',
    description: '场景名称必须具体，不能笼统。写"皇帝寝宫"不写"皇宫"，写"总裁办公室"不写"公司"。',
    correctExample: '1-1 皇帝寝宫 日内',
    wrongExample: '1-1 皇宫 日内',
    repairHint: '地点细化到具体房间或区域。如果场景笼统，改成具体的子地点。'
  },
  {
    id: 'time_day_night_clear',
    name: '日夜内外明确',
    description: '以是否能看到太阳光区分日戏和夜戏。日夜标识后直接标内景（内）或外景（外）。',
    correctExample: '1-1 林家客厅 日内\n1-2 林家花园 夜外',
    wrongExample: '1-1 林家客厅\n或\n1-1 林家客厅 白天',
    repairHint: '补全时间标识：日/夜 + 内/外。不要用"白天""晚上"等模糊词。'
  },
  {
    id: 'no_novel_narration',
    name: '不把小说旁白写成剧本',
    description: '剧本不能出现小说式旁白和描写。所有信息必须通过动作、对话、场景呈现。',
    correctExample: '△林晚看着窗外倾盆大雨，手指在玻璃上画圈',
    wrongExample: '那是一个雨夜，林晚站在窗前，思绪万千。她想起了母亲临终前的话...',
    repairHint: '删掉所有小说式旁白。把背景信息拆成可拍动作和潜台词对话。'
  },
  {
    id: 'synopsis_vs_outline_vs_script',
    name: '梗概/大纲/剧本分层',
    description: '梗概约1500字，写故事脉络；详纲写每集事件；剧本写可拍摄的对白和动作。三者不能混淆。',
    correctExample: '（剧本）\n林晚：\n你欠我的，我会连本带利拿回来。',
    wrongExample: '（在剧本中写大纲内容）\n林晚决定展开复仇计划，她开始调查三年前的事故真相...',
    repairHint: '删掉所有"决定""开始""计划"等概括性描述。只写当下发生的动作和说出的台词。'
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// 二、格式反模式
// ─────────────────────────────────────────────────────────────────────────────

export interface ScreenplayFormatAntiPattern {
  id: string
  label: string
  description: string
  detectableMarkers: string[]
  repairDirection: string
}

export const SCREENPLAY_FORMAT_ANTI_PATTERNS: ScreenplayFormatAntiPattern[] = [
  {
    id: 'quoted_dialogue',
    label: '对话带双引号',
    description: '剧本对话两侧出现中文或英文双引号',
    detectableMarkers: ['"', '"', '""'],
    repairDirection: '删除所有对话两侧的双引号'
  },
  {
    id: 'camera_directions',
    label: '写导演机位',
    description: '出现"特写""推进""拉远""俯拍"等导演机位词汇',
    detectableMarkers: ['特写', '推进', '拉远', '俯拍', '仰拍', '跟拍', '摇镜', '变焦'],
    repairDirection: '删掉机位描述，用"△"标记动作行代替'
  },
  {
    id: 'novel_narration_in_script',
    label: '小说旁白混入剧本',
    description: '出现小说式描写、心理活动叙述、背景铺陈',
    detectableMarkers: ['那是一个', '他想起', '她回忆起', '思绪', '往事', '多年前'],
    repairDirection: '删掉旁白，改写成动作行和对话'
  },
  {
    id: 'missing_scene_heading',
    label: '缺失场景标题',
    description: '场景没有集号-场号-地点-时间的完整标题',
    detectableMarkers: [],
    repairDirection: '补全场景标题：集号-场号 具体地点 日/夜 内/外'
  },
  {
    id: 'vague_location',
    label: '地点笼统',
    description: '地点写得太宽泛，不够具体',
    detectableMarkers: ['皇宫', '公司', '学校', '医院', '街上'],
    repairDirection: '地点细化到具体房间或区域'
  },
  {
    id: 'ambiguous_time',
    label: '时间模糊',
    description: '没有明确标日/夜和内/外',
    detectableMarkers: ['白天', '晚上', '早晨', '下午'],
    repairDirection: '统一为"日/夜"+"内/外"'
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// 三、生成提示指令
// ─────────────────────────────────────────────────────────────────────────────

export interface ScreenplayFormatInstructionInput {
  /** 当前集数 */
  episodeNo: number
  /** 场景数量 */
  sceneCount: number
}

export function buildScreenplayFormatInstruction(
  input: ScreenplayFormatInstructionInput
): string {
  const rules = SCREENPLAY_FORMAT_RULES
  const antiPatterns = SCREENPLAY_FORMAT_ANTI_PATTERNS

  const ruleBlocks = rules
    .map(
      (r) =>
        `### ${r.name}
${r.description}
✓ 正确：${r.correctExample}
✗ 错误：${r.wrongExample}`
    )
    .join('\n\n')

  const antiPatternBlocks = antiPatterns
    .map(
      (a) =>
        `- 【${a.label}】${a.description}
  检测词：${a.detectableMarkers.join('、') || '（需人工判断）'}
  修复：${a.repairDirection}`
    )
    .join('\n')

  return `第${input.episodeNo}集剧本格式执行标准

本集共${input.sceneCount}场，必须遵守以下格式规则：

${ruleBlocks}

绝对禁止以下反模式：
${antiPatternBlocks}

格式检查清单（输出前逐项核对）：
- [ ] 所有对话都没有双引号
- [ ] 每场戏都有"集号-场号 地点 日/夜 内/外"标题
- [ ] 地点具体，不写笼统名称
- [ ] 动作行用"△"开头，只写可拍动作
- [ ] 没有导演机位描述
- [ ] OS/VO标注清楚
- [ ] 没有小说式旁白
- [ ] 没有"决定""计划""开始"等概括性描述`
}

// ─────────────────────────────────────────────────────────────────────────────
// 四、辅助检测函数
// ─────────────────────────────────────────────────────────────────────────────

/** 检测剧本文本中的格式错误 */
export function detectFormatIssues(text: string): {
  antiPatternId: string
  label: string
  occurrences: string[]
}[] {
  const results: ReturnType<typeof detectFormatIssues> = []

  for (const pattern of SCREENPLAY_FORMAT_ANTI_PATTERNS) {
    const occurrences: string[] = []
    for (const marker of pattern.detectableMarkers) {
      if (!marker) continue
      let index = text.indexOf(marker)
      while (index !== -1) {
        // 提取上下文
        const start = Math.max(0, index - 10)
        const end = Math.min(text.length, index + marker.length + 10)
        const context = text.slice(start, end).replace(/\n/g, ' ')
        occurrences.push(`...${context}...`)
        index = text.indexOf(marker, index + 1)
      }
    }
    if (occurrences.length > 0) {
      results.push({
        antiPatternId: pattern.id,
        label: pattern.label,
        occurrences
      })
    }
  }

  return results
}

/** 按反模式ID获取修稿提示 */
export function getFormatRepairHintByAntiPatternId(antiPatternId: string): string {
  const pattern = SCREENPLAY_FORMAT_ANTI_PATTERNS.find((p) => p.id === antiPatternId)
  if (!pattern) {
    throw new Error(`Unknown format anti-pattern: ${antiPatternId}`)
  }
  return pattern.repairDirection
}

/** 简单检查场景标题格式是否正确 */
export function isSceneHeadingValid(heading: string): boolean {
  // 匹配 "数字-数字 文字 日/夜 内/外" 或类似格式
  return /^\d+\s*-\s*\d+\s+.+[日|夜][\s/]*[内|外]/.test(heading.trim())
}

/** 检查对话行是否带双引号 */
export function hasQuotedDialogue(line: string): boolean {
  const trimmed = line.trim()
  // 排除动作行和空行
  if (trimmed.startsWith('△') || trimmed === '') return false
  // 检查是否以引号开头或结尾（对话行通常以角色名开头后跟冒号）
  return /[""""].*[""""]/.test(trimmed)
}
