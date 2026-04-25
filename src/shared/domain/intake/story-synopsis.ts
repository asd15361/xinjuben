import type { StorySynopsisDto } from '../../contracts/intake.ts'

export interface StorySynopsisReadiness {
  ready: boolean
  missing: string[]
  suggestions: string[]
}

const REQUIRED_FIELDS: Array<{
  key: keyof StorySynopsisDto
  label: string
  suggestion: string
}> = [
  {
    key: 'openingPressureEvent',
    label: '开局压迫事件',
    suggestion: '第一集主角被怎么羞辱/压迫？比如"被当众判废体、逼跪认罪"'
  },
  {
    key: 'firstFaceSlapEvent',
    label: '第一场打脸',
    suggestion: '主角第一次反击是什么结果？比如"测灵石炸裂反噬长老"'
  },
  {
    key: 'protagonistCurrentDilemma',
    label: '主角当前困境',
    suggestion: '主角开局最紧迫的处境是什么？'
  },
  {
    key: 'antagonistForce',
    label: '核心反派/势力',
    suggestion: '第一反派是谁？比如"宗门长老"或"刺客组织首领"'
  },
  {
    key: 'antagonistPressureMethod',
    label: '反派压迫方式',
    suggestion: '反派怎么压主角？用规则、权位、还是利益分化？'
  },
  {
    key: 'stageGoal',
    label: '主角阶段目标',
    suggestion: '前20集主角要达成什么？比如"查清组织黑幕、逃出宗门"'
  },
  {
    key: 'corePayoff',
    label: '核心爽点',
    suggestion: '这部剧最核心的爽感来源是什么？逆袭？身份揭露？权力借用？'
  }
]

/**
 * 检测故事梗概是否达到最低可用标准。
 *
 * 不阻塞创作：返回 missing 供 UI 提示用户补充，
 * 或允许用户选择"用推荐方案补齐"。
 */
export function inspectStorySynopsisReadiness(
  synopsis: StorySynopsisDto | undefined | null
): StorySynopsisReadiness {
  if (!synopsis) {
    return {
      ready: false,
      missing: REQUIRED_FIELDS.map((f) => f.label),
      suggestions: REQUIRED_FIELDS.map((f) => f.suggestion)
    }
  }

  const missing: string[] = []
  const suggestions: string[] = []

  for (const field of REQUIRED_FIELDS) {
    const value = synopsis[field.key]
    if (!value || (typeof value === 'string' && value.trim().length < 3)) {
      missing.push(field.label)
      suggestions.push(field.suggestion)
    }
  }

  return {
    ready: missing.length === 0,
    missing,
    suggestions
  }
}
