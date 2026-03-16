import type { ScriptSegmentDto } from '../../../../shared/contracts/workflow'

function compactScene(scene: ScriptSegmentDto | undefined): string {
  if (!scene) return '上一场待补'
  return [scene.action, scene.dialogue, scene.emotion]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildSceneProgressionDirectives(input: {
  existingScript: ScriptSegmentDto[]
  episodeNo: number
}): string[] {
  if (input.episodeNo <= 1) return []

  const latestScene = input.existingScript[input.existingScript.length - 1]
  const previousScene = input.existingScript[input.existingScript.length - 2]
  const latestSummary = compactScene(latestScene)
  const previousSummary = compactScene(previousScene)

  return [
    '这不是重新讲上一场；这是一场新的戏，必须把上一场逼出来的后果继续往前推。',
    `上一场刚发生的戏：${latestSummary}`,
    `上一场之前那场戏：${previousSummary}`,
    '本场开头前 30% 必须直接承接上一场留下的动作或代价，不能跳回背景解释。',
    '本场必须至少新增一个不能回退的新变化：新动作、新受伤、新暴露、新站队、新代价、新决定里至少一种。',
    '本场必须让局面更难、更重、更窄：人物可选空间要比上一场更少，不能只是多说几句狠话。',
    '本场至少要把下面三件事里的两件真正写出来：局势升级、关系改位、代价变实；少一件都不算真推进。',
    '如果人物这一场没有被逼到新的选择口，或者没有因为选择付出新代价，就说明这一场还在原地打转，继续改。',
    '如果上一场已经公开对质、揭露旧案、亮出伤口或放出钩子，本场禁止把同一句判断、同一组动作、同一轮对骂原样再写一遍。',
    '本场结尾必须把局势往下一格推进，不能停在和上一场一样的站位、一样的话头、一样的情绪收口。',
    '结尾不能只是“他更紧张了”“她更难受了”；必须留下已经发生或下一秒就会发生的新动作、新逼压或新后果。',
    '禁止复用上一场的核心动作链、核心对白链、核心情绪链；就算地点不变，也必须让局面发生实质变化。'
  ]
}
