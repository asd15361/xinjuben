import type { ScriptSegmentDto } from '../../../shared/contracts/workflow'

function clipText(value: string, maxLength: number): string {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(20, maxLength - 1)).trim()}…`
}

function compactScene(scene: ScriptSegmentDto | undefined): string {
  if (!scene) return '上一场待补'

  const structuredSummary = (scene.screenplayScenes || [])
    .slice(0, 3)
    .map((item) => {
      const heading = String(item.sceneCode || '').replace(/\s+/g, ' ').trim()
      const body = clipText(String(item.body || '').replace(/\s+/g, ' ').trim(), 42)
      return [heading, body].filter(Boolean).join('｜')
    })
    .filter(Boolean)
    .join('；')
  if (structuredSummary) return clipText(structuredSummary, 180)

  const screenplayLines = String(scene.screenplay || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^第[一二三四五六七八九十百零\d]+集$/.test(line))
    .filter((line) => !/^\d+-\d+\s/.test(line))
    .filter((line) => !/^人物[:：]/.test(line))
  if (screenplayLines.length > 0) {
    return clipText(screenplayLines.slice(0, 6).join('｜'), 180)
  }

  const structuredBody = (scene.screenplayScenes || [])
    .map((item) => String(item.body || '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (structuredBody) return clipText(structuredBody, 180)

  return clipText(
    [scene.action, scene.dialogue, scene.emotion].join(' ').replace(/\s+/g, ' ').trim(),
    180
  )
}

function resolveEpisodeNo(scene: ScriptSegmentDto & { episodeNo?: number }): number | null {
  if (Number.isFinite(scene.episodeNo)) return Number(scene.episodeNo)
  if (Number.isFinite(scene.sceneNo)) return Number(scene.sceneNo)
  return null
}

/**
 * Find a scene in script by its episode number.
 * When multiple versions of the same episodeNo exist (e.g. [旧1, 旧2, 新1, 新2]),
 * returns the LAST one — the most recently written version.
 * Ignores overflow episodes (episodeNo > targetEpisodes).
 */
function findSceneByEpisode(
  script: Array<ScriptSegmentDto & { episodeNo?: number }>,
  targetEp: number,
  targetEpisodes: number
): ScriptSegmentDto | undefined {
  const result = script.filter((s: ScriptSegmentDto & { episodeNo?: number }) => resolveEpisodeNo(s) === targetEp && targetEp <= targetEpisodes)
  return result[result.length - 1]
}

/**
 * Look up previous episode from generatedScenes first (newest in batch),
 * then fall back to existingScript.
 * In rewrite mode, if both have the same episodeNo, generatedScenes wins (newest).
 */
function resolvePreviousScene(
  episodeNo: number,
  targetEpisodes: number,
  generatedScenes: ScriptSegmentDto[],
  existingScript: ScriptSegmentDto[]
): ScriptSegmentDto | undefined {
  // generatedScenes is the current batch output — always fresher
  return (
    findSceneByEpisode(generatedScenes, episodeNo - 1, targetEpisodes) ??
    findSceneByEpisode(existingScript, episodeNo - 1, targetEpisodes)
  )
}

export function buildSceneProgressionDirectives(input: {
  existingScript: ScriptSegmentDto[]
  episodeNo: number
  targetEpisodes: number
  /** Newer episodes from the current batch — take precedence over existingScript for same episodeNo */
  generatedScenes?: ScriptSegmentDto[]
}): string[] {
  if (input.episodeNo <= 1) return []

  const { existingScript, episodeNo, targetEpisodes, generatedScenes = [] } = input

  // Resolve previous two episodes: generatedScenes (newest) first, then existingScript fallback
  const latestScene = resolvePreviousScene(
    episodeNo,
    targetEpisodes,
    generatedScenes,
    existingScript
  )
  const previousScene = resolvePreviousScene(
    episodeNo - 1,
    targetEpisodes,
    generatedScenes,
    existingScript
  )
  const latestSummary = compactScene(latestScene)
  const previousSummary = compactScene(previousScene)

  return [
    '这集不是上一集的重写稿。就算承接同一麻烦，也必须同时更换地点、争夺对象、主动作、结果中的至少两项；如果只是把上一集换个集号再写一遍，直接视为失败。',
    '这不是重新讲上一场；这是一场新的戏，必须把上一场逼出来的后果继续往前推。',
    `上一场刚发生的戏：${latestSummary}`,
    `上一场之前那场戏：${previousSummary}`,
    '本场开头前 30% 必须直接承接上一场留下的动作或代价，不能跳回背景解释。',
    '本场必须至少新增一个不能回退的新变化：新动作、新受伤、新暴露、新站队、新代价、新决定里至少一种。',
    '本场必须让局面更难、更重、更窄：人物可选空间要比上一场更少，不能只是多说几句狠话。',
    '本场至少要把下面三件事里的两件真正写出来：局势升级、关系改位、代价变实；少一件都不算真推进。',
    '本场还必须新增一个更强的续命理由：新误会、新翻盘口、新伤口、新危险、新站队里至少一种，要让人自然想继续看。',
    '如果人物这一场没有被逼到新的选择口，或者没有因为选择付出新代价，就说明这一场还在原地打转，继续改。',
    '如果上一场已经公开对质、揭露旧案、亮出伤口或放出钩子，本场禁止把同一句判断、同一组动作、同一轮对骂原样再写一遍。',
    '如果上一场核心压法已经是绑人、刀抵喉、当众逼交钥匙，本场主推进就换成证据、旧规、伤势、残党、交易、问责或调包中的至少一种，不准原样再逼一次。',
    '如果上一场已经在合议、押送、对质或问责里落锤，本场主戏眼必须转去外场动作、私下交易、抢证、追逃、伤势处理或拦人，不准再开一场同味的制度戏。',
    '如果上一场刚是执事、长老、公审或合议落锤，本场第一句不准再由他们开口；先让伤口、追兵、钥匙、证据或残党动作闯进来。',
    '如果本场是包扎、换药、躲藏、歇脚或潭边喘口气，也必须顺手推进账册、钥匙、碎片、追兵、换路或伤势代价之一；不要把这种场写成互问"为什么藏到现在/为什么不争"的讲理戏。',
    '本场结尾必须把局势往下一格推进，不能停在和上一场一样的站位、一样的话头、一样的情绪收口。',
    '结尾不能只是"他更紧张了""她更难受了"；必须留下已经发生或下一秒就会发生的新动作、新逼压或新后果。',
    '如果结尾只是把危险续上，却没有把"下一场更想点"的理由变得更强，说明续命还没成立，继续改。',
    '禁止复用上一场的核心动作链、核心对白链、核心情绪链；就算地点不变，也必须让局面发生实质变化。'
  ]
}
