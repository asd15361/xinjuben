import type { CharacterDraftDto, DetailedOutlineSegmentDto, OutlineDraftDto } from '../../contracts/workflow'

interface EpisodeStageWindow {
  act: DetailedOutlineSegmentDto['act']
  startEpisode: number
  endEpisode: number
  content: string
  hookType: string
}

function getActiveSegments(segments: DetailedOutlineSegmentDto[]): DetailedOutlineSegmentDto[] {
  return segments.filter((segment) => segment.content.trim().length > 0)
}

function buildEpisodeStageWindows(segments: DetailedOutlineSegmentDto[], totalEpisodes: number): EpisodeStageWindow[] {
  const activeSegments = getActiveSegments(segments)
  if (activeSegments.length === 0) return []

  const windows: EpisodeStageWindow[] = []
  let startEpisode = 1

  activeSegments.forEach((segment, index) => {
    const remainingSegments = activeSegments.length - index
    const remainingEpisodes = totalEpisodes - startEpisode + 1
    const width = index === activeSegments.length - 1 ? remainingEpisodes : Math.max(1, Math.floor(remainingEpisodes / remainingSegments))
    const endEpisode = Math.min(totalEpisodes, startEpisode + width - 1)

    windows.push({
      act: segment.act,
      startEpisode,
      endEpisode,
      content: segment.content.trim(),
      hookType: segment.hookType.trim(),
    })

    startEpisode = endEpisode + 1
  })

  return windows
}

function formatCharacterAnchor(character: CharacterDraftDto): string {
  const cues = [
    character.advantage.trim() ? `优势=${character.advantage.trim()}` : '',
    character.weakness.trim() ? `短板=${character.weakness.trim()}` : '',
    character.goal.trim() ? `目标=${character.goal.trim()}` : '',
    character.arc.trim() ? `弧光=${character.arc.trim()}` : '',
  ].filter(Boolean)

  return cues.length > 0 ? `- ${character.name}：${cues.join('｜')}` : `- ${character.name}：当前人物锚点待补齐`
}

function buildThemeActionHint(outline: OutlineDraftDto, act: DetailedOutlineSegmentDto['act']): string {
  const theme = `${outline.theme} ${outline.mainConflict}`.trim()
  if (/(谦卦|空意|钥匙)/.test(theme)) {
    if (act === 'opening') return '本段开场先让反派当场拿走一件东西或一个人，主角只能吃亏应对；用一句短狠对白收口，不准先讲懂人物。'
    if (act === 'midpoint') return '本段要把“守”和“失去代价”同时推高，让主题开始咬住人物；人物每次开口都要带着当下难堪、压抑或硬撑，不要只会解释立场，还要让这种负担落进停顿、嘴硬和让步。'
    if (act === 'climax') return '本段允许冲突爆顶，但胜负要回到主题兑现，而不是纯靠硬碰硬；关键对白要听得出嘴硬、反咬、退不下去的情绪压强，而且这种压强要带出失手、反咬或硬撑的代价。'
    return '收束段要先把这一轮的决定、代价和新局面钉死，再留一条余波；不要靠继续抛新设定冒充收口，同时要把人物说出口时的情绪负担写实，让难堪、心虚和硬撑落到动作与代价里，不要只剩结论。'
  }

  if (act === 'opening') return '开局段先让角色当场受压、当场失去一点东西，再补人物姿态；不要先讲明白人物，先让难堪、嘴硬和护短先露出来，还要让这些反应带出实际动作。'
  if (act === 'midpoint') return '中段要用更高代价逼角色行动，不能只是重复前情；对白要带着压抑、心虚、反咬或硬撑的负担往前走，这种负担要落进停顿、让步、失手或反顶里。'
  if (act === 'climax') return '高潮段必须让冲突升级到不可回避，逼出真正选择；关键句不能只剩站位，还要听得出退不下去的情绪压强，并看见这种硬撑马上带来的代价。'
  return '结尾段要先回收前面埋下的压力，把这一轮的决定、代价和局面变化写实，再留一条明确余波；不要边收边继续开新口，也不要把情绪写成空结论，要让情绪负担落到动作、停顿和让步里。'
}

export function buildEpisodePromptGuidance(input: {
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  segments: DetailedOutlineSegmentDto[]
  episodeNo: number
  totalEpisodes: number
}): string {
  const windows = buildEpisodeStageWindows(input.segments, input.totalEpisodes)
  const lastWindow = windows[windows.length - 1]
  const currentWindow =
    windows.find((window) => input.episodeNo >= window.startEpisode && input.episodeNo <= window.endEpisode) ||
    (lastWindow && input.episodeNo > lastWindow.endEpisode ? lastWindow : undefined)
  const characterLines = input.characters.slice(0, 6).map(formatCharacterAnchor)

  const lines = ['【阶段引导】']
  if (currentWindow) {
    lines.push(
      `- 当前集处于 ${currentWindow.act} 段（第 ${currentWindow.startEpisode}-${currentWindow.endEpisode} 集）。`,
      `- 本段主任务：${currentWindow.content}`,
      currentWindow.hookType ? `- 本段钩子偏向：${currentWindow.hookType}` : '- 本段钩子偏向：延续当前冲突势能。',
      `- 阶段动作建议：${buildThemeActionHint(input.outline, currentWindow.act)}`
    )
    if (lastWindow && currentWindow === lastWindow && input.episodeNo > lastWindow.endEpisode) {
      lines.push('- 当前已经越过原定终局场次，后续场次仍按收束段执行：先把这一轮决定、代价和新局面写实，不要重新退回只顾着开新口。')
    }
  } else {
    lines.push('- 当前缺少可用的详纲分段，禁止模型自行补全整季骨架，只能围绕现有冲突稳态推进。')
  }

  lines.push('【人物锚点】')
  if (characterLines.length > 0) {
    lines.push(...characterLines)
  } else {
    lines.push('- 当前没有可用人物锚点，禁止凭空扩写新主角关系。')
  }

  return lines.join('\n')
}
