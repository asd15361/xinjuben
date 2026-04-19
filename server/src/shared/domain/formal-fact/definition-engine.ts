import type { FormalFactValidationDto } from '../../contracts/formal-fact'

export function validateFormalFactDefinition(
  factDesc: string,
  mainPlotContext: string,
  theme: string
): FormalFactValidationDto {
  const suggestions: string[] = []
  let score = 100
  let isValid = true

  if (!factDesc || factDesc.length < 5) {
    return { isValid: false, score: 0, suggestions: ['正式事实定义过短，不足以支撑主线剧本'] }
  }

  if (!mainPlotContext.includes(factDesc) && score > 0) {
    suggestions.push('当前事实似乎未能强力关联主情节冲突，建议在主线里为其设定触发点。')
    score -= 30
  }

  if (!theme.includes(factDesc) && score > 0) {
    suggestions.push('这个事实如果能与主题绑定，其升格会更有力度。')
    score -= 30
  }

  if (score < 60) isValid = false

  return { isValid, score, suggestions }
}