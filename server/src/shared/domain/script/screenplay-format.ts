import {
  ensureScreenplaySceneBlockDefaults,
  type ScreenplaySceneBlockDto,
  type ScriptSegmentDto
} from '../../contracts/workflow'

const EPISODE_HEADING = /^第[一二三四五六七八九十百零\d]+集$/m
const DIALOGUE_LINE = /^[^\s△：:（）()]{1,16}[：:]/m
const ASSISTANT_EXPLANATION_MARKERS =
  /(改写说明|修补说明|修补要点核对|当前钩子|如果需要我可以继续调整|如果需要我可以继续优化|如需调整|以下为改写|说明[:：]|^#\s*剧本修补|^##\s*修补说明|^---$|^✅)/
const EMOTION_MARKERS =
  /(惊|怒|恨|怕|慌|痛|酸|冷|颤|抖|压|愣|红了眼|哽|喘|疼|发紧|发麻|决绝|恐惧|愤怒|委屈|崩|窒息|发烫)/
const SCENE_TIME_MARKER_SOURCE =
  '清早|清晨|拂晓|破晓前|破晓|黎明前|黎明|凌晨|早晨|早间|晨|上午|正午|中午|午间|午后|下午|白天|白日|傍晚|日暮|黄昏|入夜|夜晚|夜|夜里|夜间|深夜|后半夜|半夜|夜半|日'
const SCENE_TIME_MARKERS = new RegExp(`^(${SCENE_TIME_MARKER_SOURCE})(内|外|内外)?$`)
const PLACEHOLDER_MARKERS = /(待补|未定场景|未定地点|未定人物|待定)/
const TEMPLATE_MARKERS = /(人物A|人物B|具体场景|角色名：对白内容|如无必要可省略)/
const VO_MARKERS = /(画外音|画外|旁白|OS|O\.S\.|V\.O\.)/i

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, '')
    .replace(/(第[一二三四五六七八九十百零\d]+集)\s+(\d+-\d+)/g, '$1\n\n$2')
    .replace(/([^\n])\s+(\d+-\d+\s+)/g, '$1\n$2')
    .replace(/([^\n])\s+(人物[：:])/g, '$1\n$2')
    .replace(/([^\n])\s+(△)/g, '$1\n$2')
    .replace(/([。！？!?…）)])\s*([^\s△：:（）()]{1,16}[：:])/g, '$1\n$2')
    .replace(/([^\n])\s*(人物[：:])/g, '$1\n$2')
    .replace(/([^\n])\s*(字幕[：:])/g, '$1\n$2')
    .replace(/([^\n])\s*(△)/g, '$1\n$2')
    .trim()
}

function matchSceneHeading(line: string): RegExpMatchArray | null {
  const normalized = line.trim()
  const timeBeforeLocationDividerMatch = normalized.match(
    new RegExp(
      `^(\\d+-\\d+)\\s+(${SCENE_TIME_MARKER_SOURCE})(内|外|内外)?\\s*[｜|]\\s*(?:地点[:：]\\s*)?(.+)$`
    )
  )
  if (timeBeforeLocationDividerMatch) {
    return [
      normalized,
      timeBeforeLocationDividerMatch[1],
      timeBeforeLocationDividerMatch[4].trim(),
      timeBeforeLocationDividerMatch[2],
      timeBeforeLocationDividerMatch[3] || '',
      ''
    ]
  }
  const bracketedMatch = normalized.match(
    new RegExp(`^(\\d+-\\d+)\\s+(.+?)［(内|外|内外)］［(${SCENE_TIME_MARKER_SOURCE})］$`)
  )
  if (bracketedMatch) {
    return [
      normalized,
      bracketedMatch[1],
      bracketedMatch[2].trim(),
      bracketedMatch[4],
      bracketedMatch[3],
      ''
    ]
  }
  const directMatch =
    normalized.match(/^(\d+-\d+)\s*(日|夜)(内|外|内外)?([^\n]*)$/) ||
    normalized.match(/^(\d+-\d+)\s+([^\n·•・]+?)(?:[·•・]\s*|\s+)(日|夜)(内|外|内外)?([^\n]*)$/)
  if (directMatch) return directMatch

  const headingMatch = normalized.match(/^(\d+-\d+)\s+(.+)$/)
  if (!headingMatch) return null

  const sceneCode = headingMatch[1]
  const rest = headingMatch[2].trim()
  const segments = rest
    .split(/[·•・]/)
    .map((item) => item.trim())
    .filter(Boolean)

  if (segments.length >= 2) {
    const last = segments[segments.length - 1]
    if (SCENE_TIME_MARKERS.test(last)) {
      const timeMatch = last.match(SCENE_TIME_MARKERS)
      const location = segments.slice(0, -1).join('·')
      if (location) {
        return [normalized, sceneCode, location, timeMatch?.[1] || last, timeMatch?.[2] || '', '']
      }
    }
  }

  const spaced = rest.match(new RegExp(`^(.+?)\\s+(${SCENE_TIME_MARKER_SOURCE})(内|外|内外)?$`))
  if (spaced) {
    return [normalized, sceneCode, spaced[1].trim(), spaced[2], spaced[3] || '', '']
  }

  const prefixed = rest.match(new RegExp(`^(${SCENE_TIME_MARKER_SOURCE})(内|外|内外)?\\s+(.+)$`))
  if (prefixed) {
    return [normalized, sceneCode, prefixed[3].trim(), prefixed[1], prefixed[2] || '', '']
  }

  // Fallback: bare time marker with no location, e.g. "2-3 晨" or "2-3 夜"
  // Covers single-segment rest that IS a time marker but had no location component.
  if (SCENE_TIME_MARKERS.test(rest)) {
    return [normalized, sceneCode, '', rest, '', '']
  }

  // Recovery: allow location-only headings like "10-1 医庐内室".
  // Real model output occasionally drops the time marker on early scenes while
  // still keeping a valid scene code + roster/body structure underneath.
  if (rest && !/[：:]/.test(rest)) {
    return [normalized, sceneCode, rest, '', '', '']
  }

  return null
}

function normalizeLines(text: string): string[] {
  return normalizeText(text)
    .split('\n')
    .map((line) => line.trim())
}

function clipText(text: string, maxChars: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(8, maxChars - 1))}…`
}

function buildFallbackDialogueLine(dialogue: string): string {
  const normalized = dialogue.trim()
  if (!normalized) return ''
  if (isMetaOrPlaceholderLine(normalized)) return ''
  if (isDialogueBodyLine(normalized)) return normalized
  return `人物：${normalized}`
}

function isRosterLine(line: string): boolean {
  return /^(人物|字幕)[：:]/.test(line)
}

function hasDialoguePayload(line: string): boolean {
  const match = line.match(/^[^\s△：:（）()]{1,16}[：:]\s*(.+)$/)
  const payload = match?.[1]?.trim() || ''
  return Boolean(payload) && !PLACEHOLDER_MARKERS.test(payload) && !TEMPLATE_MARKERS.test(payload)
}

function hasActionPayload(line: string): boolean {
  if (isPlaceholderActionLine(line)) return false
  const payload = line.replace(/^△+/, '').trim()
  return (
    Boolean(payload) &&
    !EPISODE_HEADING.test(payload) &&
    !matchSceneHeading(payload) &&
    !isRosterLine(payload) &&
    !PLACEHOLDER_MARKERS.test(payload) &&
    !TEMPLATE_MARKERS.test(payload)
  )
}

function isPseudoRosterLine(line: string): boolean {
  return /^(人物|字幕)[：:]\s*(第[一二三四五六七八九十百零\d]+集|\d+-\d+)/.test(line.trim())
}

function isPlaceholderActionLine(line: string): boolean {
  return /^△#?\s*第[一二三四五六七八九十百零\d]+集$/.test(line.trim())
}

function isFakeRosterValue(item: string): boolean {
  const normalized = item.trim()
  return !normalized || /^(人物|场景)$/.test(normalized)
}

function parseRosterValues(line: string): string[] {
  const match = line.trim().match(/^(人物|字幕)[：:]\s*(.+)$/)
  if (!match) return []
  return match[2]
    .split(/[，,、]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function hasRawPlaceholderStubLeak(screenplay: string): boolean {
  const normalized = normalizeText(screenplay)
  if (!normalized) return false

  return normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .some((line) => {
      if (isPlaceholderActionLine(line)) return true
      if (!isRosterLine(line)) return false
      const roster = parseRosterValues(line)
      return roster.length > 0 && roster.some((item) => isFakeRosterValue(item))
    })
}

export function isMetaOrPlaceholderLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  return (
    EPISODE_HEADING.test(trimmed) ||
    Boolean(matchSceneHeading(trimmed)) ||
    isRosterLine(trimmed) ||
    isPseudoRosterLine(trimmed) ||
    isPlaceholderActionLine(trimmed) ||
    PLACEHOLDER_MARKERS.test(trimmed) ||
    TEMPLATE_MARKERS.test(trimmed) ||
    ASSISTANT_EXPLANATION_MARKERS.test(trimmed)
  )
}

export function isDialogueBodyLine(line: string): boolean {
  return DIALOGUE_LINE.test(line) && !isRosterLine(line) && hasDialoguePayload(line)
}

export function isMeaningfulActionLine(line: string): boolean {
  return line.trim().startsWith('△') && hasActionPayload(line)
}

export function hasVoiceOverLeak(text: string): boolean {
  const normalized = normalizeText(text)
  if (!normalized) return false
  return normalized
    .split('\n')
    .map((line) => line.trim())
    .some((line) => VO_MARKERS.test(line))
}

export function hasMeaningfulCharacterRoster(roster: string[]): boolean {
  return (
    roster.length > 0 &&
    roster.every(
      (item) =>
        Boolean(item.trim()) &&
        !isFakeRosterValue(item) &&
        !PLACEHOLDER_MARKERS.test(item) &&
        !TEMPLATE_MARKERS.test(item) &&
        !EPISODE_HEADING.test(item) &&
        !matchSceneHeading(item)
    )
  )
}

export function hasStructurallyUsableScreenplay(screenplay: string): boolean {
  const normalized = normalizeText(screenplay)
  if (!normalized) return false
  if (PLACEHOLDER_MARKERS.test(normalized) || TEMPLATE_MARKERS.test(normalized)) return false
  if (hasVoiceOverLeak(normalized)) return false
  if (hasPollutedScreenplayContent(normalized)) return false

  const scenes = parseScreenplayScenes(normalized)
  if (scenes.length === 0) return false

  return (
    scenes.every((scene) => {
      const normalizedScene = ensureScreenplaySceneBlockDefaults(scene)
      if (!hasMeaningfulCharacterRoster(normalizedScene.characterRoster)) return false
      const contentLines = normalizedScene.body
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
      const actionCount = contentLines.filter((line) => isMeaningfulActionLine(line)).length
      return actionCount >= 1
    }) &&
    scenes.some((scene) => {
      const normalizedScene = ensureScreenplaySceneBlockDefaults(scene)
      const contentLines = normalizedScene.body
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
      return contentLines.some((line) => isDialogueBodyLine(line))
    })
  )
}

export function hasPollutedScreenplayContent(screenplay: string): boolean {
  const normalized = normalizeText(screenplay)
  if (!normalized) return true
  if (hasVoiceOverLeak(normalized)) return true
  if (hasRawPlaceholderStubLeak(normalized)) return true
  if (
    PLACEHOLDER_MARKERS.test(normalized) ||
    TEMPLATE_MARKERS.test(normalized) ||
    ASSISTANT_EXPLANATION_MARKERS.test(normalized)
  ) {
    return true
  }

  const scenes = parseScreenplayScenes(normalized)
  if (scenes.length === 0) return true

  return scenes.some((scene) => {
    const normalizedScene = ensureScreenplaySceneBlockDefaults(scene)
    if (!hasMeaningfulCharacterRoster(normalizedScene.characterRoster)) return true
    const bodyLines = normalizedScene.body
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const contentLines = bodyLines.filter((line) => !isRosterLine(line))

    if (contentLines.some((line) => isMetaOrPlaceholderLine(line))) return true

    const actionCount = contentLines.filter((line) => isMeaningfulActionLine(line)).length
    return actionCount < 1
  })
}

export function looksLikeScreenplayFormat(text: string): boolean {
  const normalized = normalizeText(text)
  if (!normalized) return false
  const screenplayScenes = parseScreenplayScenes(normalized)
  const lines = normalizeLines(normalized)
  const hasPollutedContent = hasPollutedScreenplayContent(normalized)
  const hasPlaceholderLeak =
    screenplayScenes.some(
      (scene) =>
        PLACEHOLDER_MARKERS.test(scene.sceneHeading || '') ||
        (scene.characterRoster || []).some((item) => PLACEHOLDER_MARKERS.test(item)) ||
        !hasMeaningfulCharacterRoster(scene.characterRoster || [])
    ) || lines.some((line) => /^△第[一二三四五六七八九十百零\d]+集$/.test(line))

  return (
    EPISODE_HEADING.test(normalized) &&
    screenplayScenes.length > 0 &&
    !hasPollutedContent &&
    !hasPlaceholderLeak &&
    lines.some((line) => Boolean(matchSceneHeading(line))) &&
    lines.some((line) => line.startsWith('△')) &&
    lines.some((line) => isDialogueBodyLine(line))
  )
}

export function parseScreenplayScenes(screenplay: string): ScreenplaySceneBlockDto[] {
  const normalized = normalizeText(screenplay)
  if (!normalized) return []

  const lines = normalized.split('\n')
  const scenes: ScreenplaySceneBlockDto[] = []
  let current: ScreenplaySceneBlockDto | null = null

  const pushCurrent = (): void => {
    if (!current) return
    current.body = (current.body || '').trim()
    scenes.push(current)
    current = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      if (current) current.body += '\n'
      continue
    }

    if (EPISODE_HEADING.test(line)) {
      continue
    }

    const sceneMatch = matchSceneHeading(line)
    if (sceneMatch) {
      pushCurrent()
      current = {
        sceneCode: sceneMatch[1],
        sceneHeading: line,
        characterRoster: [],
        body: ''
      }
      continue
    }

    if (!current) continue

    const rosterMatch = line.match(/^人物[：:]\s*(.+)$/)
    if (rosterMatch) {
      current.characterRoster = rosterMatch[1]
        .split(/[，,、]/)
        .map((item) => item.trim().replace(/[。.]$/, ''))
        .filter(Boolean)
      current.body += `${line}\n`
      continue
    }

    current.body += `${line}\n`
  }

  pushCurrent()
  return dropLeadingPlaceholderSceneStubs(scenes)
}

function dropLeadingPlaceholderSceneStubs(
  scenes: ScreenplaySceneBlockDto[]
): ScreenplaySceneBlockDto[] {
  if (scenes.length < 2) return scenes

  return scenes.filter((scene, index) => {
    const next = scenes[index + 1]
    if (!next) return true
    if ((scene.sceneCode || '').trim() !== (next.sceneCode || '').trim()) return true
    if (!isPlaceholderSceneStub(scene)) return true
    return false
  })
}

function isPlaceholderSceneStub(scene: ScreenplaySceneBlockDto): boolean {
  const roster = scene.characterRoster || []
  const lines = (scene.body || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return true

  const hasFakeRoster = roster.length === 0 || roster.every((item) => isFakeRosterValue(item))
  const hasMeaningfulRoster = !hasFakeRoster && hasMeaningfulCharacterRoster(roster)
  const hasActionLine = lines.some((line) => isMeaningfulActionLine(line))
  const hasDialogueLine = lines.some((line) => isDialogueBodyLine(line))
  const hasOnlyMetaLines = lines.every(
    (line) =>
      isMetaOrPlaceholderLine(line) ||
      isPlaceholderActionLine(line) ||
      /^人物[：:]\s*人物(?:、场景)?$/.test(line)
  )

  return !hasMeaningfulRoster && !hasActionLine && !hasDialogueLine && hasOnlyMetaLines
}

export function buildScreenplayFromStructuredScene(
  scene: Pick<
    ScriptSegmentDto,
    'sceneNo' | 'action' | 'dialogue' | 'emotion' | 'screenplay' | 'screenplayScenes'
  >
): string {
  if (scene.screenplay?.trim()) return scene.screenplay.trim()

  const heading = `${scene.sceneNo}-1 日`
  const blocks = [`第${scene.sceneNo}集`, '', heading, '人物：待补']

  if (scene.action?.trim()) blocks.push('', `△${scene.action.trim()}`)
  if (scene.dialogue?.trim()) {
    blocks.push(
      '',
      ...scene.dialogue
        .split('\n')
        .map((line) => buildFallbackDialogueLine(line))
        .filter(Boolean)
    )
  }
  if (scene.emotion?.trim()) blocks.push('', `△人物情绪：${scene.emotion.trim()}`)

  return blocks.join('\n').trim()
}

export function extractStructuredSceneFromScreenplay(
  screenplay: string,
  sceneNo: number
): Pick<
  ScriptSegmentDto,
  'action' | 'dialogue' | 'emotion' | 'screenplay' | 'screenplayScenes' | 'legacyFormat'
> {
  const normalized = normalizeText(screenplay)
  const lines = normalizeLines(normalized).filter(Boolean)
  const actionLines: string[] = []
  const dialogueLines: string[] = []
  const emotionLines: string[] = []
  const screenplayScenes = parseScreenplayScenes(normalized)

  for (const line of lines) {
    const isMetaLine =
      /^第.+集$/.test(line) || Boolean(matchSceneHeading(line)) || isRosterLine(line)
    const isActionLine = line.startsWith('△')
    const isDialogueLine = isDialogueBodyLine(line)

    if (isMetaLine) {
      continue
    }

    if (isActionLine) {
      if (hasActionPayload(line)) actionLines.push(line.replace(/^△/, '').trim())
      if (EMOTION_MARKERS.test(line)) emotionLines.push(line.replace(/^△/, '').trim())
      continue
    }

    if (isDialogueLine) {
      dialogueLines.push(line)
      const match = line.match(/[（(][^)）]+[)）]/)
      if (match) emotionLines.push(match[0].replace(/[（）()]/g, '').trim())
      if (EMOTION_MARKERS.test(line)) emotionLines.push(line)
      continue
    }

    if (!isMetaOrPlaceholderLine(line)) actionLines.push(line)
    if (EMOTION_MARKERS.test(line)) emotionLines.push(line)
  }

  const action = actionLines.join('\n').trim()
  const dialogue = dialogueLines.join('\n').trim()
  const emotion =
    emotionLines.join('\n').trim() ||
    clipText(`${actionLines.slice(-2).join(' ')} ${dialogueLines.slice(-1).join(' ')}`, 180) ||
    `第${sceneNo}集人物情绪和压力待补`

  return {
    screenplay: normalized,
    screenplayScenes,
    legacyFormat: false,
    action,
    dialogue,
    emotion
  }
}
