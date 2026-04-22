import { HOOK_WINDOW_SIZE } from '../workflow/contract-thresholds.ts'

const HARD_HOOK_EVENT_MARKERS = [
  '撞开',
  '踹响',
  '断裂',
  '巨响',
  '亮起',
  '亮了',
  '扑来',
  '抓来',
  '扑向',
  '扑上',
  '扑出',
  '冲来',
  '冲过来',
  '冲进来',
  '堵住',
  '堵死',
  '围住',
  '围拢',
  '围死',
  '抓住',
  '扣住',
  '攥住',
  '攥紧',
  '抓向',
  '抓到',
  '触到',
  '抓下',
  '直抓',
  '带走',
  '拖倒',
  '拽向',
  '拖向',
  '拖走',
  '拖入',
  '拉向',
  '拉入',
  '抵住',
  '提起',
  '挟住',
  '掐住',
  '收紧',
  '掐紧',
  '搭在',
  '搭上',
  '吞没',
  '扑倒',
  '直扑',
  '劈落',
  '跌向',
  '砸向',
  '刺向',
  '直刺',
  '拍下',
  '拍碎',
  '笼罩',
  '踩住',
  '按在',
  '包抄',
  '退路已断',
  '举刀',
  '扒住',
  '缠住',
  '缠上',
  '缠紧',
  '勒住',
  '洞开',
  '涌出',
  '涌来',
  '闯进',
  '爬出',
  '提离',
  '钉在',
  '来了',
  '渗出',
  '渗进',
  '崩裂',
  '崩开',
  '落下',
  '掉下',
  '撕成',
  '撕碎',
  '踹开',
  '印',
  '拿走',
  '夺走',
  '抽走',
  '拽出',
  '扫飞',
  '搜',
  '搜捕',
  '踏进',
  '焦黑',
  '烧着',
  '点燃',
  '拉响',
  '敲响',
  '吹响',
  '绑死',
  '抵死',
  '捂死',
  '扼住'
] as const

const HARD_HOOK_THREAT_MARKERS = [
  '别动',
  '站住',
  '交出来',
  '拿什么来换',
  '拿来换',
  '来换她',
  '逃不掉',
  '抓到',
  '再不出来',
  '下一个就是',
  '不交',
  '陪葬',
  '抢过来',
  '都留下',
  '封印要破',
  '立刻去'
] as const

const HARD_HOOK_URGENCY_MARKERS = [
  '现在',
  '立刻',
  '今晚',
  '马上',
  '再不',
  '否则',
  '这就',
  '下一秒',
  '来不及',
  '只剩',
  '天亮前',
  '今夜',
  '所有人',
  '封印要破'
] as const

const HARD_HOOK_RESULT_MARKERS = [
  '已经',
  '当场',
  '眼前',
  '门外',
  '门口',
  '身后',
  '血',
  '退路',
  '尸体',
  '证据',
  '活口',
  '钥匙',
  '名单',
  '账本',
  '渗出',
  '渗进',
  '崩裂',
  '崩开',
  '落下',
  '掉下',
  '弯折',
  '撕裂',
  '掰开',
  '撬开',
  '拿走',
  '夺走',
  '抽走',
  '拽出',
  '搜',
  '搜捕',
  '围死',
  '扫飞',
  '踏进',
  '焦黑',
  '烧着',
  '点燃',
  '封印',
  '镇妖地',
  '抵死'
] as const

const WEAK_HOOK_PATTERNS = [
  /(只剩|只看见|回荡|残影|恢复平静|仿佛什么都没发生)/,
  /(看向|盯住|锁定|指向|笑了|伸出手|逼近|要来了)/,
  /(刚露头|刚出现|刚冒出|搭上井沿|抓住门框)/,
  /(以后再说|慢慢告诉你|总会知道|迟早知道)/
] as const

const ACTION_RESULT_PATTERNS = [
  /(门|窗|柜|链|锁)[^，。；！？\n]{0,16}(?:(?:已被|被|已)[^，。；！？\n]{0,10})?(撞开|踹开|洞开|断裂|崩开|锁死|抵死)/,
  /(门|窗|柜|链|锁)[^。；！？\n]{0,24}，(?:已被|被|已)[^，。；！？\n]{0,12}(锁死|抵死)/,
  /(刀|枪|绳|手|胳膊|人|黑影|怪物|妖物)[^，。；！？\n]{0,8}(已经|当场|直接)?(抵住|缠住|勒住|抓住|扑到|拖走|堵住|围住|按在|钉在|掐住)/,
  /(已经|当场|直接|立刻)[^，。；！？\n]{0,8}(抓|拖|扑|撞|抵|缠|勒|掐|按|堵|围|提|带|拉|刺|钉|亮)/,
  /(退路|门口|门外|身后)[^，。；！？\n]{0,8}(断了|堵死了|围住了|来了|站满了)/,
  /(字帖|纸|书|信|账册|布|衣|帘)[^，。；！？\n]{0,6}(被|已)?(撕开|撕成|撕碎|掰开|折成|折断|扭断)/,
  /(账册|字帖|纸|书|信)[^，。；！？\n]{0,6}(被|已)?(拿走|夺走|抽走|拽出)/,
  /(手|手腕|胳膊|手指|肩|腿|脚|头|颈|肋)[^，。；！？\n]{0,8}(被|已)?(扭|折|弯|撕|掰)?(弯折|折断|撕裂|扭断|脱臼)/,
  /(印|压|留|嵌)[^，。；！？\n]{0,6}(在|入|进|出|到)[^，。；！？\n]{0,10}(内侧|外侧|中|里|下|上|内|外)/,
  /(锁扣|石板|门闩|闸板)[^，。；！？\n]{0,6}(落下|掉下|合上|锁死)/,
  /(纸角|纸边|账册角|账册边|封皮角)[^，。；！？\n]{0,6}(露出|现出|显出)/,
  /(嘴角|指甲|伤口|肋部|手腕|掌心|鼻尖|额角)[^，。；！？\n]{0,8}(渗出|沁出|冒出)[^，。；！？\n]{0,6}(血|血丝)/,
  /(指甲|掌心|手背|虎口)[^，。；！？\n]{0,8}(崩裂|裂开)[^，。；！？\n]{0,6}(渗出|沁出|冒出)?[^，。；！？\n]{0,6}(血|血丝)?/,
  /(蛇尾|尾巴|黑影|人影|怪物)[^，。；！？\n]{0,10}(扫飞|掀飞|撞飞)[^，。；！？\n]{0,6}(出去|开去)?/,
  /(火苗|火舌|火)[^，。；！？\n]{0,10}(点燃|烧着)[^，。；！？\n]{0,12}(车帘|衣角|衣摆|袖口|布帘|后背)/,
  /(追兵|脚步声|人影|黑影)[^，。；！？\n]{0,12}(已|已经)?(踏进|冲进|逼进)[^，。；！？\n]{0,8}(巷口|门口|院门|门槛|屋里|宅门)/,
  /(手|黑影|人影|来人)[^，。；！？\n]{0,10}(捂住|扼住)[^，。；！？\n]{0,8}(口鼻|咽喉|喉咙)/
] as const

const DIRECT_THREAT_PATTERNS = [
  /(交出来|别动|站住|逃不掉|下一个就是|都留下|陪葬)/,
  /(现在|立刻|今晚|再不)[^，。；！？\n]{0,10}(交|滚|死|跪|放|拿|出来|还)/,
  /(不交)[^，。；！？\n]{0,8}(就|那就|你就|她就|他就)/,
  /(拿什么来换|来换她|来换他|来换你)/,
  /(下一个就是)[^，。；！？\n]{0,6}(你|她|他|孩子|你娘|她娘|他娘)/,
  /(全城搜|搜捕|围死|盯死)/,
  /(晌午之前|天亮之前|立刻去)[^，。；！？\n]{0,12}(换人|拿来换|来换)/,
  /(封印要破了|封印快破了|封印破了)/
] as const

const PRESSURE_ON_TARGET_PATTERNS = [
  /(你|他|她|孩子|你娘|她娘|他娘|命|喉咙|脖子|手腕)[^，。；！？\n]{0,8}(交出来|留下|逃不掉|保不住|活不过|来换|陪葬|抵住|勒住|掐住|带走|拖走)/,
  /(刀|枪|绳|手)[^，。；！？\n]{0,8}(抵住|架住|勒住|掐住|按住)/,
  /(门|窗|车|退路)[^，。；！？\n]{0,8}(堵住|锁死|围住|断了)/,
  /(孩子|人|命)[^，。；！？\n]{0,8}(在我手里|就在我手里|已经没了|先死|先走)/,
  /(小柔|黎明|他|她|人)[^，。；！？\n]{0,10}(吐出来|拿来换|来换人|换人)/,
  /(樵夫|他)[^，。；！？\n]{0,8}(口鼻|咽喉|喉咙)[^，。；！？\n]{0,6}(被|遭)?(捂住|扼住)/,
  /(封印|镇妖地)[^，。；！？\n]{0,8}(要破了|破了|出事了)/
] as const

const DIALOGUE_RESULT_PATTERNS = [
  /(人|孩子|东西|证据|钥匙|账本|命)[^，。；！？\n]{0,8}(已经在我手里|已经到手|就在我手里)/,
  /(门外|门口|身后)[^，。；！？\n]{0,8}(已经来了|已经到了|已经站满了)/,
  /(下一个就是)[^，。；！？\n]{0,6}(你|她|他|孩子|你娘|她娘|他娘)/,
  /(今晚就|现在就|立刻就)[^，。；！？\n]{0,8}(死|埋|烧|带走|动手)/,
  /(全城搜|搜捕|围死|盯死)/,
  /(封印要破了|封印快破了|封印破了)/,
  /(晌午之前|天亮之前)[^，。；！？\n]{0,12}(换人|拿来换|来换)/
] as const

type HardHookLineKind = 'action' | 'dialogue' | 'other'

function normalize(line: string): string {
  return line.replace(/\s+/g, '').trim()
}

function isSceneHeading(line: string): boolean {
  const trimmed = line.trim()
  return (
    /^(\d+-\d+)\s*(日|夜)\s*(内|外|内外)?\s*.+$/.test(trimmed) ||
    /^(\d+-\d+)\s+.+?[·•・]\s*(日|夜)\s*(内|外|内外)?\s*$/.test(trimmed)
  )
}

function isMetaLine(line: string): boolean {
  return /^第.+集$/.test(line) || /^人物[：:]/.test(line) || /^字幕[：:]/.test(line)
}

function isDialogueLine(line: string): boolean {
  return /^[^\s△：:（）()]{1,16}(?:（[^）]{0,8}）)?[：:]/.test(line.trim())
}

function inferLineKind(line: string): HardHookLineKind {
  const trimmed = line.trim()
  if (trimmed.startsWith('△')) return 'action'
  if (isDialogueLine(trimmed)) return 'dialogue'
  return 'other'
}

function matchMarkers(normalized: string, markers: readonly string[]): string[] {
  return markers.filter((marker) => normalized.includes(marker))
}

function matchesAny(normalized: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(normalized))
}

function hasWeakHookShape(normalized: string): boolean {
  return matchesAny(normalized, WEAK_HOOK_PATTERNS)
}

function hasConcreteResult(normalized: string): boolean {
  return (
    matchesAny(normalized, ACTION_RESULT_PATTERNS) ||
    matchesAny(normalized, DIALOGUE_RESULT_PATTERNS)
  )
}

function hasDirectThreat(normalized: string): boolean {
  return matchesAny(normalized, DIRECT_THREAT_PATTERNS)
}

function hasPressureOnTarget(normalized: string): boolean {
  return matchesAny(normalized, PRESSURE_ON_TARGET_PATTERNS)
}

function hasMarkerSupport(normalized: string): boolean {
  return (
    matchMarkers(normalized, HARD_HOOK_EVENT_MARKERS).length > 0 ||
    matchMarkers(normalized, HARD_HOOK_THREAT_MARKERS).length > 0
  )
}

function hasUrgencySupport(normalized: string): boolean {
  return matchMarkers(normalized, HARD_HOOK_URGENCY_MARKERS).length > 0
}

function hasResultMarkerSupport(normalized: string): boolean {
  return matchMarkers(normalized, HARD_HOOK_RESULT_MARKERS).length > 0
}

function scoreActionHook(normalized: string): number {
  let score = 0
  if (hasConcreteResult(normalized)) score += 3
  if (hasPressureOnTarget(normalized)) score += 2
  if (hasDirectThreat(normalized)) score += 1
  if (hasMarkerSupport(normalized)) score += 1
  if (hasUrgencySupport(normalized)) score += 1
  if (hasResultMarkerSupport(normalized)) score += 1
  return score
}

function scoreDialogueHook(normalized: string): number {
  let score = 0
  if (hasDirectThreat(normalized)) score += 3
  if (hasPressureOnTarget(normalized)) score += 2
  if (hasConcreteResult(normalized)) score += 2
  if (hasUrgencySupport(normalized)) score += 1
  if (hasMarkerSupport(normalized)) score += 1
  if (hasResultMarkerSupport(normalized)) score += 1
  return score
}

export function hasConcreteHardHook(line: string): boolean {
  const normalized = normalize(line)
  if (!normalized) return false
  if (hasWeakHookShape(normalized)) return false

  const lineKind = inferLineKind(line)
  if (lineKind === 'other') return false

  const resultReached = hasConcreteResult(normalized)
  const pressureOnTarget = hasPressureOnTarget(normalized)
  const directThreat = hasDirectThreat(normalized)
  const markerSupport = hasMarkerSupport(normalized)

  if (lineKind === 'action') {
    const score = scoreActionHook(normalized)
    return resultReached && (pressureOnTarget || markerSupport) && score >= 4
  }

  const score = scoreDialogueHook(normalized)
  return (directThreat || resultReached) && pressureOnTarget && score >= 5
}

export function pickHardHookWindow(lines: string[]): string[] {
  const normalized = lines.map((line) => line.trim()).filter(Boolean)
  const lastSceneHeadingIndex = normalized.map(isSceneHeading).lastIndexOf(true)
  const lastSceneLines =
    lastSceneHeadingIndex >= 0 ? normalized.slice(lastSceneHeadingIndex + 1) : normalized
  const effectiveLines = lastSceneLines.filter((line) => !isMetaLine(line))
  if (effectiveLines.length > 0) {
    return effectiveLines.slice(-HOOK_WINDOW_SIZE)
  }

  return normalized.filter((line) => !isMetaLine(line)).slice(-HOOK_WINDOW_SIZE)
}
