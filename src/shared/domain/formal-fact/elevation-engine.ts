import type { FormalFactElevationEvaluationDto } from '../../contracts/formal-fact'

export function evaluateFormalFactElevation(input: {
  formalFactLabel: string
  conflictText: string
  emotionText: string
  themeText: string
}): FormalFactElevationEvaluationDto {
  const reasons: string[] = []
  let score = 100

  if (!input.conflictText.includes(input.formalFactLabel)) {
    reasons.push('当前情节没有直接推动正式事实进入冲突核心。')
    score -= 35
  }

  if (!input.emotionText.trim()) {
    reasons.push('当前情节缺少情绪推进，升格缺少人物弧光承接。')
    score -= 25
  }

  if (!input.themeText.includes(input.formalFactLabel)) {
    reasons.push('当前情节还没有把正式事实拉回主题层。')
    score -= 25
  }

  return {
    qualifies: score >= 60,
    score: Math.max(0, score),
    reasons
  }
}
