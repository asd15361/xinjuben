import fs from 'node:fs'

function normalize(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .trim()
}

function loadMarkerList(constName) {
  const source = fs.readFileSync(
    'D:/project/xinjuben/src/shared/domain/script/hard-hook.ts',
    'utf8'
  )
  const pattern = `const ${constName} = \\[([\\s\\S]*?)\\] as const`
  const match = source.match(new RegExp(pattern))
  if (!match) return []
  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith("'"))
    .map((line) => line.replace(/['",]/g, '').trim())
}

const EVENT_MARKERS = loadMarkerList('HARD_HOOK_EVENT_MARKERS')
const THREAT_MARKERS = loadMarkerList('HARD_HOOK_THREAT_MARKERS')
const HARD_HOOK_WINDOW_SIZE = 5

function getScreenplay(scene) {
  const screenplay = normalize(scene?.screenplay || '')
  if (screenplay) return screenplay
  return normalize([scene?.action || '', scene?.dialogue || '', scene?.emotion || ''].join('\n'))
}

function getScreenplayLines(screenplay) {
  return normalize(screenplay)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseEpisode(screenplay) {
  const lines = getScreenplayLines(screenplay)
  const sceneHeadingPatterns = [
    /^(\d+\-\d+)\s*(日|夜)\s*(内|外|内外)?\s*.+$/,
    /^(\d+\-\d+)\s+.+?[·•・]\s*(日|夜)\s*(内|外|内外)?\s*$/
  ]
  const dialoguePattern = /^[^\s△：:（）()]{1,16}[：:]/
  let sceneCount = 0
  let rosterCount = 0
  let actionCount = 0
  let dialogueCount = 0
  let currentDialogue = 0
  let currentAction = 0
  const perScene = []

  for (const line of lines) {
    if (/^第[一二三四五六七八九十百零\d]+集$/.test(line)) continue
    if (sceneHeadingPatterns.some((pattern) => pattern.test(line))) {
      if (sceneCount > 0)
        perScene.push({ dialogueCount: currentDialogue, actionCount: currentAction })
      sceneCount += 1
      currentDialogue = 0
      currentAction = 0
      continue
    }
    if (/^人物[：:]/.test(line)) {
      rosterCount += 1
      continue
    }
    if (line.startsWith('△')) {
      actionCount += 1
      currentAction += 1
      continue
    }
    if (dialoguePattern.test(line)) {
      dialogueCount += 1
      currentDialogue += 1
    }
  }

  if (sceneCount > 0) perScene.push({ dialogueCount: currentDialogue, actionCount: currentAction })

  const lastSceneHeadingIndex = lines
    .map((line) =>
      /^(\d+\-\d+)\s*(日|夜)\s*(内|外|内外)?\s*.+$/.test(line) ||
      /^(\d+\-\d+)\s+.+?[·•・]\s*(日|夜)\s*(内|外|内外)?\s*$/.test(line)
    )
    .lastIndexOf(true)
  const lastSceneLines = lastSceneHeadingIndex >= 0 ? lines.slice(lastSceneHeadingIndex + 1) : lines
  const bodyLines = lastSceneLines.filter(
    (line) => !/^第.+集$/.test(line) && !/^人物[：:]/.test(line) && !/^字幕[：:]/.test(line)
  )
  const hookWindow = bodyLines.slice(-HARD_HOOK_WINDOW_SIZE)
  const hookLine = hookWindow.at(-1) || ''

  return {
    charCount: normalize(screenplay).replace(/\s+/g, '').length,
    hasEpisodeHeading: /^第[一二三四五六七八九十百零\d]+集$/m.test(screenplay),
    hasLegacyMarkers: /Action[:：]|Dialogue[:：]|Emotion[:：]/i.test(screenplay),
    sceneCount,
    rosterCount,
    actionCount,
    dialogueCount,
    perScene,
    hookWindow,
    hookLine
  }
}

function hasHook(line) {
  const normalized = String(line || '').replace(/\s+/g, '')
  if (!normalized) return false

  const hasEvent = EVENT_MARKERS.some((marker) => normalized.includes(marker))
  const hasThreat = THREAT_MARKERS.some((marker) => normalized.includes(marker))
  const isActionLine = normalized.startsWith('△')
  const isDialogueThreat =
    /^[^\s△：:（）()]{1,16}(?:（[^）]{0,8}）)?[：:]/.test(String(line || '').trim()) && hasThreat

  return (isActionLine && hasEvent) || isDialogueThreat
}

export function inspectEpisode(scene) {
  const screenplay = getScreenplay(scene)
  const parsed = parseEpisode(screenplay)
  const problems = []

  if (!parsed.hasEpisodeHeading) problems.push('缺少第X集标题')
if (parsed.sceneCount < 2 || parsed.sceneCount > 4) problems.push('场次数不在2-4场')
  if (parsed.rosterCount < parsed.sceneCount) problems.push('至少有一场缺人物表')
  if (parsed.actionCount < parsed.sceneCount) problems.push('至少有一场缺△动作')
  if (parsed.perScene.some((item) => item.dialogueCount < 2)) problems.push('至少有一场对白不足2句')
if (parsed.charCount < 800) problems.push('字数低于800字合同')
if (parsed.charCount > 1200) problems.push('字数超过1200字合同')
  if (parsed.hasLegacyMarkers) problems.push('残留Action/Dialogue/Emotion标记')
  if (!parsed.hookWindow.some((line) => hasHook(line))) problems.push('集尾钩子偏弱')

  return {
    sceneNo: scene?.sceneNo || null,
    screenplay,
    ...parsed,
    pass: problems.length === 0,
    problems
  }
}

export function inspectProjectScreenplay(project) {
  const episodes = (project?.scriptDraft || []).map((scene) => inspectEpisode(scene))
  const passedEpisodes = episodes.filter((item) => item.pass).length
  const averageCharCount =
    episodes.length > 0
      ? Math.round(episodes.reduce((sum, item) => sum + item.charCount, 0) / episodes.length)
      : 0
  const legacyEpisodes = episodes
    .filter((item) => item.hasLegacyMarkers)
    .map((item) => item.sceneNo)
  const weakEpisodes = episodes.filter((item) => !item.pass)
  const repeatedOpeningEpisodes = []

  for (let index = 1; index < episodes.length; index += 1) {
    const previous =
      getScreenplayLines(episodes[index - 1].screenplay).find((line) => line.startsWith('△')) || ''
    const current =
      getScreenplayLines(episodes[index].screenplay).find((line) => line.startsWith('△')) || ''
    if (previous && current && previous === current) {
      repeatedOpeningEpisodes.push([episodes[index - 1].sceneNo, episodes[index].sceneNo])
    }
  }

  return {
    episodeCount: episodes.length,
    passedEpisodes,
    averageCharCount,
    legacyEpisodes,
    repeatedOpeningEpisodes,
    weakEpisodes,
    episodes,
    pass:
      episodes.length > 0 &&
      weakEpisodes.length === 0 &&
      legacyEpisodes.length === 0 &&
      repeatedOpeningEpisodes.length === 0
  }
}
