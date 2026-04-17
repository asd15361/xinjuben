import type {
  ScriptLedgerCharacterStateDto,
  ScriptStateLedgerDto
} from '../../../../shared/contracts/script-ledger'
import type {
  StoryContractDto,
  UserAnchorLedgerDto
} from '../../../../shared/contracts/story-contract'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto
} from '../../../../shared/contracts/workflow'

interface EpisodeStageWindow {
  act: DetailedOutlineSegmentDto['act']
  startEpisode: number
  endEpisode: number
  content: string
  hookType: string
}

function clipText(value: string, maxLength: number): string {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(20, maxLength - 1)).trim()}…`
}

function unique(values: string[]): string[] {
  const used = new Set<string>()
  return values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .filter((value) => {
      if (used.has(value)) return false
      used.add(value)
      return true
    })
}

function joinList(values: string[], fallback: string, maxItems: number, maxLength: number): string {
  if (values.length === 0) return fallback
  return clipText(values.slice(0, maxItems).join('；'), maxLength)
}

function getActiveSegments(segments: DetailedOutlineSegmentDto[]): DetailedOutlineSegmentDto[] {
  return segments.filter((segment) => segment.content.trim().length > 0)
}

function buildEpisodeStageWindows(
  segments: DetailedOutlineSegmentDto[],
  totalEpisodes: number
): EpisodeStageWindow[] {
  const activeSegments = getActiveSegments(segments)
  if (activeSegments.length === 0) return []

  const windows: EpisodeStageWindow[] = []
  let startEpisode = 1

  activeSegments.forEach((segment, index) => {
    const remainingSegments = activeSegments.length - index
    const remainingEpisodes = totalEpisodes - startEpisode + 1
    const width =
      index === activeSegments.length - 1
        ? remainingEpisodes
        : Math.max(1, Math.floor(remainingEpisodes / remainingSegments))
    const endEpisode = Math.min(totalEpisodes, startEpisode + width - 1)

    windows.push({
      act: segment.act,
      startEpisode,
      endEpisode,
      content: segment.content.trim(),
      hookType: segment.hookType.trim()
    })

    startEpisode = endEpisode + 1
  })

  return windows
}

export function buildCurrentBatchTaskCard(input: {
  segments: DetailedOutlineSegmentDto[]
  episodeNo: number
  totalEpisodes: number
  batchSize: number
}): string {
  const normalizedBatchSize = Math.max(1, input.batchSize)
  const batchStartEpisode =
    Math.floor((input.episodeNo - 1) / normalizedBatchSize) * normalizedBatchSize + 1
  const batchEndEpisode = Math.min(batchStartEpisode + normalizedBatchSize - 1, input.totalEpisodes)
  const windows = buildEpisodeStageWindows(input.segments, input.totalEpisodes)
  const currentWindow =
    windows.find(
      (window) => input.episodeNo >= window.startEpisode && input.episodeNo <= window.endEpisode
    ) || windows[windows.length - 1]
  const batchBeatLines = unique(
    input.segments
      .flatMap((segment) => segment.episodeBeats ?? [])
      .filter((beat) => beat.episodeNo >= batchStartEpisode && beat.episodeNo <= batchEndEpisode)
      .map((beat) => `第${beat.episodeNo}集：${beat.summary}`)
  )
  const currentEpisodeTask =
    input.segments
      .flatMap((segment) => segment.episodeBeats ?? [])
      .find((beat) => beat.episodeNo === input.episodeNo)
      ?.summary?.trim() || ''

  return [
    '【当前批次任务卡】',
    `- 当前批次：第 ${batchStartEpisode}-${batchEndEpisode} 集`,
    currentWindow
      ? `- 这批所在大段：${currentWindow.act}（第 ${currentWindow.startEpisode}-${currentWindow.endEpisode} 集）`
      : '- 这批所在大段：当前待补',
    `- 这批总任务：${clipText(currentWindow?.content || '先把当前主冲突往前推一格。', 100)}`,
    `- 这批钩子方向：${clipText(currentWindow?.hookType || '延续当前冲突势能。', 80)}`,
    `- 这一集要完成：${clipText(currentEpisodeTask || '只把这一集该兑现的那一步写实，不替整季补课。', 100)}`,
    `- 这批关键节点：${joinList(batchBeatLines, '当前待补', 3, 120)}`
  ].join('\n')
}

export function buildGlobalTruthCard(input: {
  projectTitle: string
  theme: string
  mainConflict: string
  sellingPremise: string
  coreDislocation: string
  emotionalPayoff: string
  storyContract: StoryContractDto
  anchorLedger: UserAnchorLedgerDto
}): string {
  return [
    '【全局真相卡】',
    `- 项目：${input.projectTitle || '未命名项目'}`,
    `- 主题：${input.theme || '待补主题'}`,
    `- 当前硬冲突：${input.mainConflict || '待补核心冲突'}`,
    `- 设定成交句：${input.sellingPremise || '待补'}`,
    `- 核心错位：${input.coreDislocation || '待补'}`,
    `- 优先兑现情绪：${input.emotionalPayoff || '待补'}`,
    `- 主角/对手：${input.storyContract.characterSlots.protagonist || '待定义'} / ${input.storyContract.characterSlots.antagonist || '待定义'}`,
    `- 必守硬事实：${joinList(input.anchorLedger.protectedFacts || [], '当前待补', 6, 120)}`,
    `- 用户锚点名册：${joinList(input.anchorLedger.anchorNames || [], '当前待补', 8, 120)}`
  ].join('\n')
}

function buildCharacterEngineLine(
  character: CharacterDraftDto | undefined,
  ledgerCharacter: ScriptLedgerCharacterStateDto | undefined,
  fallbackName: string
): string {
  const name = character?.name?.trim() || ledgerCharacter?.name?.trim() || fallbackName || '待补'
  const goal = clipText(character?.goal || ledgerCharacter?.lastKnownGoal || '当前目标待补', 36)
  const protectTarget = clipText(character?.protectTarget || '当前守护对象待补', 28)
  const fear = clipText(character?.fear || ledgerCharacter?.latestEmotion || '当前最怕失去待补', 28)
  const weakness = clipText(character?.weakness || '当前短板待补', 28)
  return `${name}：要=${goal}；护=${protectTarget}；怕=${fear}；短板=${weakness}`
}

export function buildCharacterEngineCard(input: {
  characters: CharacterDraftDto[]
  storyContract: StoryContractDto
  ledger: ScriptStateLedgerDto
}): string {
  const charactersByName = new Map(
    input.characters.map((character) => [String(character.name || '').trim(), character] as const)
  )
  const ledgerCharactersByName = new Map(
    input.ledger.characters.map(
      (character) => [String(character.name || '').trim(), character] as const
    )
  )
  const preferredNames = unique([
    input.storyContract.characterSlots.protagonist,
    input.storyContract.characterSlots.antagonist,
    input.storyContract.characterSlots.heroine,
    input.storyContract.characterSlots.mentor,
    ...input.characters.map((character) => character.name),
    ...input.ledger.characters.map((character) => character.name)
  ]).slice(0, 4)

  const engineLines = preferredNames.map((name) =>
    buildCharacterEngineLine(charactersByName.get(name), ledgerCharactersByName.get(name), name)
  )

  return [
    '【人物发动机卡】',
    `- 当前主视角：${input.ledger.knowledgeBoundaries.perspectiveCharacter || '未锁定'}`,
    `- 主角发动机：${engineLines[0] || '待补'}`,
    `- 对手发动机：${engineLines[1] || '待补'}`,
    `- 其余关键人：${joinList(engineLines.slice(2), '当前待补', 2, 120)}`,
    `- 当前关系压强：${joinList(
      input.ledger.characters.flatMap((character) =>
        character.relationshipPressure.map(
          (pressure) =>
            `${character.name}->${pressure.targetName}：${pressure.currentTension || pressure.leveragePoint}`
        )
      ),
      '当前待补',
      3,
      120
    )}`
  ].join('\n')
}

export function buildCurrentEpisodeTaskCard(input: {
  segments: DetailedOutlineSegmentDto[]
  episodeNo: number
  totalEpisodes: number
}): string {
  const windows = buildEpisodeStageWindows(input.segments, input.totalEpisodes)
  const currentWindow =
    windows.find(
      (window) => input.episodeNo >= window.startEpisode && input.episodeNo <= window.endEpisode
    ) || windows[windows.length - 1]
  const currentEpisodeTask =
    input.segments
      .flatMap((segment) => segment.episodeBeats ?? [])
      .find((beat) => beat.episodeNo === input.episodeNo)
      ?.summary?.trim() || ''

  return [
    '【当前单集任务卡】',
    `- 当前集数：第 ${input.episodeNo} 集`,
    currentWindow
      ? `- 所属大段：${currentWindow.act}（第 ${currentWindow.startEpisode}-${currentWindow.endEpisode} 集）`
      : '- 所属大段：当前待补',
    `- 这一集必须完成：${clipText(currentEpisodeTask || '只把这一集该兑现的那一步写实，不替整季补课。', 100)}`,
    `- 这一集承接重点：${clipText(currentWindow?.hookType || '延续当前冲突势能。', 80)}`,
    '- 这一集只管把当集该落地的冲突、代价和钩子写实，不额外替前后集补课。'
  ].join('\n')
}

export function buildDebtCard(ledger: ScriptStateLedgerDto): string {
  const unresolvedForeshadows = unique([
    ...ledger.storyMomentum.hardAnchors,
    ...ledger.openHooks.map((hook) => `第${hook.sourceSceneNo}场：${hook.hookText}`)
  ])
  const mustContinueConsequences = unique([
    ledger.storyMomentum.pendingCost,
    ledger.storyMomentum.nextRequiredBridge
  ])

  return [
    '【欠账卡】',
    `- 未兑现的伏笔：${joinList(unresolvedForeshadows, '当前待补', 3, 120)}`,
    `- 已改局但必须续处理的后果：${joinList(mustContinueConsequences, '当前待补', 3, 120)}`,
    '- 这张卡只认上面两类，别的历史信息不要往这里塞。'
  ].join('\n')
}
