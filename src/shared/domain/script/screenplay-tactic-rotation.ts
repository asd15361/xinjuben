/**
 * src/shared/domain/script/screenplay-tactic-rotation.ts
 *
 * 打法轮换追踪模块。
 *
 * 定义 5 大压迫类别（硬夺、规则、关系、信息、时空），
 * 提供与 DTO 字段的映射、跨集轮换校验与替代建议。
 */

/** 压迫手段 5 大类别 */
export type TacticCategory =
  | 'hard_steal'
  | 'rules'
  | 'relationship'
  | 'information'
  | 'spatiotemporal'

/** 类别对应的中文显示名称 */
export const TACTIC_CATEGORY_LABELS: Record<TacticCategory, string> = {
  hard_steal: '硬夺类',
  rules: '规则类',
  relationship: '关系类',
  information: '信息类',
  spatiotemporal: '时空类'
}

/** 各类别的典型手法描述 */
export const TACTIC_CATEGORY_DESCRIPTIONS: Record<TacticCategory, string> = {
  hard_steal: '抢钥匙/抢人/绑人质/截路/搜身/夺物/直接动手毁东西',
  rules: '用宗门规矩压/用旧账压/用职责压/用名义压/追责令/当众质询',
  relationship: '分化主角团队/情感绑架/信任背刺/利益分化/借刀杀人/条件交换',
  information: '误导/试探/调包/截胡/反证/假情报/信息差碾压/暗中做局',
  spatiotemporal: '时限倒计时/封锁出口/围困/押送途中/让对方在错误的时间出现'
}

// ─────────────────────────────────────────────────────────────────────────────
// 映射逻辑
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 将 EpisodeControlCardDto 中的 pressureType 映射到 5 大类别。
 * 如果 pressureType 不在映射表中，返回 undefined。
 */
export function mapPressureTypeToCategory(
  pressureType: string | undefined
): TacticCategory | undefined {
  if (!pressureType) return undefined
  const type = pressureType.trim()

  // 映射 EpisodeControlCard 常用字段（4种原字段）
  if (type === '武力胁迫') return 'hard_steal'
  if (type === '人质要挟') return 'hard_steal' // 人质通常伴随物理控制
  if (type === '规则漏洞') return 'rules'
  if (type === '利益分化') return 'relationship'

  // 映射 5 大类别的中文名
  if (type.includes('硬夺')) return 'hard_steal'
  if (type.includes('规则')) return 'rules'
  if (type.includes('关系')) return 'relationship'
  if (type.includes('信息')) return 'information'
  if (type.includes('时空')) return 'spatiotemporal'

  // 模糊匹配常见动作
  if (/(抢|绑|搜|夺|闯)/.test(type)) return 'hard_steal'
  if (/(规|账|责|审|问)/.test(type)) return 'rules'
  if (/(站队|分化|信|背叛|交易|利)/.test(type)) return 'relationship'
  if (/(调包|伪造|陷阱|局|误导|试探)/.test(type)) return 'information'
  if (/(时限|倒计时|围|封锁|路)/.test(type)) return 'spatiotemporal'

  return undefined
}

// ─────────────────────────────────────────────────────────────────────────────
// 轮换校验
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 校验打法是否重复，并提供建议。
 */
export function validateTacticRotation(
  currentCategory: TacticCategory | undefined,
  history: TacticCategory[]
): {
  isDuplicate: boolean
  lastCategory?: TacticCategory
  suggestion?: TacticCategory
} {
  if (!currentCategory || history.length === 0) {
    return { isDuplicate: false }
  }

  const lastCategory = history[history.length - 1]
  const isDuplicate = currentCategory === lastCategory

  if (isDuplicate) {
    // 找出尚未在历史中出现的类别，或优先选一个不同于上两次的类别
    const allCategories: TacticCategory[] = [
      'hard_steal',
      'rules',
      'relationship',
      'information',
      'spatiotemporal'
    ]
    const lastTwo = history.slice(-2)
    const available = allCategories.filter((cat) => !lastTwo.includes(cat))
    const suggestion =
      available.length > 0 ? available[0] : allCategories.find((cat) => cat !== currentCategory)

    return {
      isDuplicate,
      lastCategory,
      suggestion
    }
  }

  return { isDuplicate: false }
}
