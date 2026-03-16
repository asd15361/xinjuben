import type { ValidationResultDto } from '../../contracts/system'
import type { DramaProgressionDimensionsDto } from '../../contracts/drama-progression'

export function detectDramaProgressionDimensions(text: string): DramaProgressionDimensionsDto {
  return {
    desire: /(想要|必须|决定|目标|夺回|守住|守护|争取|查清|复仇|翻盘|交出|护住|选一个)/i.test(text),
    opposition: /(阻碍|压制|威胁|追杀|围堵|打压|陷害|逼迫|拦截|对抗|搜身|围了上来|踢翻|抓走|带走|施压)/i.test(text),
    cost: /(代价|失去|牺牲|受伤|暴露|损耗|反噬|付出|护不住|失望|恐惧|窝囊|被迫|发烫|午时前)/i.test(text),
    relationship: /(信任|背叛|和解|站队|联手|反目|情感|关系|所爱|心上人|小柔|师父|守护|护不住人|眼神复杂|失望)/i.test(text),
    hook: /(悬念|钩子|伏笔|秘密|证据|倒计时|未解|反转|下一步|搜身|带走|苏醒|闷响|骑马而来|午时前|要么)/i.test(text)
  }
}

export function validateDramaProgression(
  actionDesc: string,
  _characterGoal: string
): ValidationResultDto {
  const suggestions: string[] = []
  let score = 100

  const hasConflictWords = /阻碍|反转|冲突|争吵|对抗|背叛/i.test(actionDesc)
  const hasEmotionWords = /愤怒|绝望|震撼|崩溃|坚定|释然/i.test(actionDesc)

  if (!hasConflictWords) {
    score -= 40
    suggestions.push('动作似乎太顺利了，缺乏阻碍，推进力不足。')
  }

  if (!hasEmotionWords) {
    score -= 30
    suggestions.push('动作后的情感闭环不够真实，建议增加主观情绪爆发点。')
  }

  const dimensions = detectDramaProgressionDimensions(actionDesc)
  const missingDimensions = Object.entries(dimensions)
    .filter(([, covered]) => !covered)
    .map(([key]) => key)

  if (missingDimensions.length >= 3) {
    score -= 20
    suggestions.push(`当前推进维度缺失过多：${missingDimensions.join(' / ')}。`)
  }

  return {
    isValid: score >= 60,
    score,
    suggestions
  }
}
