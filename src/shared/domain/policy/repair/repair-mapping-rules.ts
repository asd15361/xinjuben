import type { ScriptAuditIssueDto } from '../../../contracts/script-audit'

export interface RepairMappingRule {
  policyKey: string
  source: string
  focus: string[]
  evidenceHint: string
  buildInstruction: (issue: ScriptAuditIssueDto) => string
}

export const REPAIR_MAPPING_RULES: Array<{
  match: (issue: ScriptAuditIssueDto) => boolean
  rule: RepairMappingRule
}> = [
  {
    match: (issue) => issue.code === 'formal_fact_not_landed' || issue.code.startsWith('formal_fact_'),
    rule: {
      policyKey: 'formal_fact_landing',
      source: '正式事实主线',
      focus: ['正式事实', '动作', '对白', '情绪'],
      evidenceHint: '检查当前场是否真的把 confirmed formal facts 落进可拍行为或冲突台词。',
      buildInstruction: () => '请把已确认正式事实真正落进当前相关场景的动作、对白或情绪推进里。'
    }
  },
  {
    match: (issue) => issue.code === 'user_anchor_roster_missing',
    rule: {
      policyKey: 'user_anchor_roster',
      source: '用户锚点主线',
      focus: ['人物名册', '用户锚点', '角色承接'],
      evidenceHint: '检查缺失锚点对应的人物是否已在角色层或当前场被承接。',
      buildInstruction: () => '请补齐用户锚点对应的人物承接，避免后续主线人物名册继续丢失。'
    }
  },
  {
    match: (issue) => issue.code === 'heroine_anchor_missing',
    rule: {
      policyKey: 'heroine_anchor_cover',
      source: '情感锚点主线',
      focus: ['情感锚点', '人物弧光', '主情感线'],
      evidenceHint: '检查当前人物层和场景情绪是否真正承接了用户声明的主情感锚点。',
      buildInstruction: () => '请让人物层承接用户声明的情感锚点，避免主情感线悬空。'
    }
  },
  {
    match: (issue) => issue.code === 'antagonist_continuity_missing',
    rule: {
      policyKey: 'antagonist_continuity',
      source: '故事契约',
      focus: ['对手贯穿', '持续施压', '主线冲突'],
      evidenceHint: '检查对手是否真正进入场景并形成持续施压，而不是只在背景里存在。',
      buildInstruction: () => '请让对手真正进入当前相关场景，并对主线形成持续施压。'
    }
  },
  {
    match: (issue) => issue.code === 'relationship_shift_missing',
    rule: {
      policyKey: 'relationship_shift',
      source: '故事契约',
      focus: ['关系推进', '情感对象', '态度变化'],
      evidenceHint: '检查情感对象是否已经进入场景，并和主角发生关系变化或态度推进。',
      buildInstruction: () => '请让情感对象进入当前场景，并推动与主角的关系或态度发生变化。'
    }
  },
  {
    match: (issue) => issue.code === 'antagonist_love_conflict_missing',
    rule: {
      policyKey: 'antagonist_love_conflict',
      source: '故事契约',
      focus: ['对手情感争夺', '关系施压', '主角代价'],
      evidenceHint: '检查对手是否真的把主角所爱当作施压杠杆，而不是只让关系线挂在背景里。',
      buildInstruction: () => '请补一处对手围绕主角所爱展开的施压或争夺，让关系压力变成剧情动作。'
    }
  },
  {
    match: (issue) => issue.code === 'healing_technique_missing',
    rule: {
      policyKey: 'healing_technique',
      source: '故事契约',
      focus: ['救治事件', '术法/手段', '关键兑现'],
      evidenceHint: '检查剧本是否兑现了关键救治事件，而不是只提一句概念。',
      buildInstruction: () => '请把关键救治事件真正写进动作与结果里，并体现具体手段。'
    }
  },
  {
    match: (issue) => issue.code === 'hidden_capability_foreshadow_missing',
    rule: {
      policyKey: 'hidden_capability_foreshadow',
      source: '故事契约',
      focus: ['隐藏能力', '克制出手', '前置伏笔'],
      evidenceHint: '检查主角是否有“明明能出手却先克制”的前置伏笔。',
      buildInstruction: () => '请补一处主角隐藏能力或克制出手的伏笔，为后续显露做准备。'
    }
  },
  {
    match: (issue) => issue.code.includes('_trait_binding_weak'),
    rule: {
      policyKey: 'trait_binding_strengthen',
      source: '人物特质绑定',
      focus: ['人物特质', '行为落地', '记忆回声'],
      evidenceHint: '检查角色优势、短板、执念有没有落成微动作、回忆触发或冲突动作。',
      buildInstruction: () => '请把角色特质落进具体行为，可以是微动作、回忆回声，或直接驱动冲突选择。'
    }
  },
  {
    match: (issue) => issue.code === 'memory_echo_missing' || issue.code === 'memory_echo_regressed',
    rule: {
      policyKey: 'memory_echo_restore',
      source: '跨批次连续性',
      focus: ['记忆回声', '前史承接', '连续性'],
      evidenceHint: '检查这一轮是否还保留了前史、旧疤、曾经承诺或历史创伤的回声。',
      buildInstruction: () => '请补一处记忆回声，让当前场明确回响前史、旧伤或过去承诺。'
    }
  },
  {
    match: (issue) => issue.code === 'hard_anchor_pending',
    rule: {
      policyKey: 'hard_anchor_cover',
      source: '硬锚点接口',
      focus: ['主题', '主冲突', '主角承接'],
      evidenceHint: '检查当前场是否真的承接了主题、主冲突或主角核心接口，而不是写成无关支线。',
      buildInstruction: () => '请让当前场至少承接一个硬锚点，可以是主题、主冲突，或主角核心接口。'
    }
  },
  {
    match: (issue) => issue.code.includes('_action_missing'),
    rule: {
      policyKey: 'scene_action_completion',
      source: '戏剧推进链',
      focus: ['动作', '冲突推进', '可拍性'],
      evidenceHint: '检查这一场有没有真正发生动作，而不是只有信息说明。',
      buildInstruction: () => '请补足可拍摄动作，让本场不是只有信息没有行为。'
    }
  },
  {
    match: (issue) => issue.code.includes('_dialogue_missing'),
    rule: {
      policyKey: 'scene_dialogue_completion',
      source: '戏剧推进链',
      focus: ['对白', '冲突命中', '正式事实推进'],
      evidenceHint: '检查这一场有没有一句真正命中冲突和正式事实的对白。',
      buildInstruction: () => '请补足命中冲突的对白，让本场能真正推进正式事实。'
    }
  },
  {
    match: (issue) => issue.code.includes('_emotion_missing'),
    rule: {
      policyKey: 'scene_emotion_completion',
      source: '戏剧推进链',
      focus: ['情绪变化', '弧光推进', '关系张力'],
      evidenceHint: '检查这一场结尾情绪是否相较开场发生了明确变化。',
      buildInstruction: () => '请补足情绪变化，让本场情感状态相较开场发生明确推进。'
    }
  },
  {
    match: (issue) => issue.code.includes('_progression_chain_weak'),
    rule: {
      policyKey: 'progression_chain_strengthen',
      source: '戏剧推进链',
      focus: ['欲望', '阻力', '代价', '关系杠杆', '钩子'],
      evidenceHint: '检查这一场是不是只有信息，没有形成欲望、阻力、代价、关系和钩子的推进链。',
      buildInstruction: () => '请补强这一场的戏剧推进链，至少让欲望、阻力、代价、关系杠杆、钩子中的关键维度真正成立。'
    }
  },
  {
    match: (issue) => issue.code.includes('_f6_expository_dialogue'),
    rule: {
      policyKey: 'f6_expository_dialogue',
      source: '表达层F6',
      focus: ['对白像人话', '人物味道', '嘴感'],
      evidenceHint: '检查对白是不是一直在解释事情，而不是让人物在处境里说出来。',
      buildInstruction: () => '请把这场对白从“直接说明事情”改成“人物在当下处境里说出来”，去掉解释味，补出人物自己的说话劲。'
    }
  },
  {
    match: (issue) => issue.code.includes('_f6_character_voice_weak'),
    rule: {
      policyKey: 'f6_character_voice_strengthen',
      source: '表达层F6',
      focus: ['人物味道', '对白分化', '角色口气'],
      evidenceHint: '检查这场对白是不是句子都太满，换个人说也成立。',
      buildInstruction: () => '请把对白压短压活，让句子更像这个人自己会说的话，避免换个人说也成立。'
    }
  },
  {
    match: (issue) => issue.code.includes('_f6_stilted_dialogue'),
    rule: {
      policyKey: 'f6_dialogue_flow',
      source: '表达层F6',
      focus: ['嘴感', '停顿', '重点前置'],
      evidenceHint: '检查这场对白是不是一句塞太多任务，重点总往后拖。',
      buildInstruction: () => '请把发卡的整句拆开，把重点前置，让人物能顺着嘴说出去。'
    }
  },
  {
    match: (issue) => issue.code.includes('_f6_playability_weak'),
    rule: {
      policyKey: 'f6_playability_strengthen',
      source: '表达层F6',
      focus: ['场景可演', '动作对白情绪一体', '处境压力'],
      evidenceHint: '检查动作、对白、情绪是不是还在分栏摆放，没有真正扣成一股劲。',
      buildInstruction: () => '请把动作、对白、情绪重新扣成一体，让这场戏读完就知道人物怎么演、怎么受压、怎么回击。'
    }
  },
  {
    match: (issue) => issue.code.includes('_f6_continuation_weak'),
    rule: {
      policyKey: 'f6_continuation_strengthen',
      source: '表达层F6',
      focus: ['续写承接', '后续压力', '场尾钩子'],
      evidenceHint: '检查这场结尾是不是已经把局面停死，没有给后续留下顺手承接点。',
      buildInstruction: () => '请在场尾补出顺着就能接下去的动作、关系压力或未说完的危险，让后续不是硬挂钩。'
    }
  }
]

export const DEFAULT_RULE: RepairMappingRule = {
  policyKey: 'generic_repair',
  source: '通用修补策略',
  focus: ['正式事实', '用户锚点', '主线冲突'],
  evidenceHint: '先核对问题是否会破坏正式事实、用户锚点或主线冲突，再决定怎么修。',
  buildInstruction: (issue) => `请修补问题：${issue.message}，同时保持正式事实、用户锚点和主线冲突一致。`
}
