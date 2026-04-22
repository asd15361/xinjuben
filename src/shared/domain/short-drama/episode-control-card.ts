import type {
  DetailedOutlineEpisodeBeatDto,
  DetailedOutlineSegmentDto,
  EpisodeControlCardDto,
  OutlineDraftDto,
  ScreenplaySceneBlockDto
} from '../../contracts/workflow.ts'
import type { ShortDramaConstitutionDto, StoryIntentPackageDto } from '../../contracts/intake.ts'
import {
  buildShortDramaConstitutionFromStoryIntent,
  normalizeShortDramaConstitution
} from './short-drama-constitution.ts'

function cleanText(value: string | undefined, fallback = ''): string {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
  return text || fallback
}

function pickFirstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const text = cleanText(value)
    if (text) return text
  }
  return ''
}

function getFirstScene(
  scenes: ScreenplaySceneBlockDto[] | undefined
): ScreenplaySceneBlockDto | null {
  return Array.isArray(scenes) && scenes.length > 0 ? scenes[0] : null
}

function getLastScene(
  scenes: ScreenplaySceneBlockDto[] | undefined
): ScreenplaySceneBlockDto | null {
  return Array.isArray(scenes) && scenes.length > 0 ? scenes[scenes.length - 1] : null
}

export function normalizeEpisodeControlCard(
  card: Partial<EpisodeControlCardDto> | null | undefined
): EpisodeControlCardDto | null {
  if (!card || typeof card !== 'object') return null

  return {
    episodeMission: cleanText(card.episodeMission),
    openingBomb: cleanText(card.openingBomb),
    conflictUpgrade: cleanText(card.conflictUpgrade),
    arcBeat: cleanText(card.arcBeat),
    emotionBeat: cleanText(card.emotionBeat),
    hookLanding: cleanText(card.hookLanding),
    povConstraint: cleanText(card.povConstraint),
    forbiddenDrift: Array.isArray(card.forbiddenDrift)
      ? card.forbiddenDrift
          .filter((item): item is string => typeof item === 'string')
          .map((item) => cleanText(item))
          .filter(Boolean)
      : [],
    // 新增字段
    episodeIndex:
      typeof card.episodeIndex === 'number' && card.episodeIndex > 0
        ? card.episodeIndex
        : undefined,
    sceneCount:
      typeof card.sceneCount === 'number' && card.sceneCount > 0 ? card.sceneCount : undefined,
    coreGoal: cleanText(card.coreGoal),
    villainPressure: cleanText(card.villainPressure),
    pressureType: cleanText(card.pressureType),
    catharsisMoment: cleanText(card.catharsisMoment),
    twistPoint: cleanText(card.twistPoint),
    cliffhanger: cleanText(card.cliffhanger),
    nextEpisodeTeaser: cleanText(card.nextEpisodeTeaser),
    protagonistActionType: normalizeProtagonistActionType(card.protagonistActionType)
  }
}

const PROTAGONIST_ACTION_ENUM = ['装弱反击', '冷静对峙', '主动设局', '借力打力', '底牌碾压']

function normalizeProtagonistActionType(
  value: unknown
): '装弱反击' | '冷静对峙' | '主动设局' | '借力打力' | '底牌碾压' | undefined {
  if (typeof value === 'string' && PROTAGONIST_ACTION_ENUM.includes(value)) {
    return value as '装弱反击' | '冷静对峙' | '主动设局' | '借力打力' | '底牌碾压'
  }
  return undefined
}

export function buildEpisodeControlCard(input: {
  beat: DetailedOutlineEpisodeBeatDto
  storyIntent?: StoryIntentPackageDto | null
  constitution?: ShortDramaConstitutionDto | null
  outline?: OutlineDraftDto | null
  totalEpisodes?: number
}): EpisodeControlCardDto {
  const constitution =
    normalizeShortDramaConstitution(input.constitution) ??
    buildShortDramaConstitutionFromStoryIntent(input.storyIntent)
  const firstScene = getFirstScene(input.beat.sceneByScene)
  const lastScene = getLastScene(input.beat.sceneByScene)
  const episodeNo = input.beat.episodeNo
  const totalEpisodes = input.totalEpisodes || 0
  const summary = cleanText(input.beat.summary, `第${episodeNo}集必须继续往前推主线。`)
  const coreConflict = cleanText(input.storyIntent?.coreConflict || input.outline?.mainConflict)
  const episodeMission = summary
  const openingBomb = pickFirstNonEmpty(
    firstScene?.setup,
    firstScene?.tension,
    `${constitution.incitingIncident.timingRequirement}，开场先把“${constitution.incitingIncident.disruption || summary}”甩到脸上。`
  )
  const conflictUpgrade = pickFirstNonEmpty(
    lastScene?.tension,
    firstScene?.tension,
    coreConflict
      ? `这一集必须把“${coreConflict}”再压重一层。`
      : '这一集必须把当前主冲突再压重一层。'
  )
  const arcBeat = `主角这一集必须继续打碎“${constitution.protagonistArc.flawBelief || '旧判断'}”，并在“${constitution.protagonistArc.growthMode || '改打法'}”上往前挪一步。`
  const emotionBeat = `全剧继续稳住“${constitution.coreEmotion}”，不要中途跳情绪线。`
  const hookLanding = pickFirstNonEmpty(
    lastScene?.hookEnd,
    `${constitution.climaxPolicy.episodeHookRule} 这一集尾场必须留下下一步动作。`
  )

  const forbiddenDrift = [
    '不要先铺垫日常再起事',
    '不要脱离单主角视角乱切',
    '不要把这一集写成解释集或总结集',
    '不要让核心情绪中途跳线'
  ]

  if (episodeNo === 1) {
    forbiddenDrift.push('不要把激励事件拖到下一集')
  }

  if (totalEpisodes > 0 && episodeNo === totalEpisodes) {
    forbiddenDrift.push('不要临时引入新矛盾接管结局')
  }

  return {
    episodeMission,
    openingBomb,
    conflictUpgrade,
    arcBeat,
    emotionBeat,
    hookLanding,
    povConstraint: constitution.povPolicy.restriction,
    forbiddenDrift,
    // 新增字段 - 默认值
    episodeIndex: episodeNo,
    sceneCount: 3,
    coreGoal: summary,
    villainPressure: conflictUpgrade,
    pressureType: '规则漏洞',
    catharsisMoment: '',
    twistPoint: '',
    cliffhanger: hookLanding,
    nextEpisodeTeaser: '',
    protagonistActionType: undefined // 由控制卡 Agent 生成，默认为空
  }
}

export function attachEpisodeControlCardsToSegments(input: {
  segments: DetailedOutlineSegmentDto[]
  storyIntent?: StoryIntentPackageDto | null
  outline?: OutlineDraftDto | null
  totalEpisodes?: number
}): DetailedOutlineSegmentDto[] {
  const constitution = buildShortDramaConstitutionFromStoryIntent(input.storyIntent)

  return input.segments.map((segment) => ({
    ...segment,
    episodeBeats: Array.isArray(segment.episodeBeats)
      ? segment.episodeBeats.map((beat) => ({
          ...beat,
          episodeControlCard:
            normalizeEpisodeControlCard(beat.episodeControlCard) ??
            buildEpisodeControlCard({
              beat,
              storyIntent: input.storyIntent,
              constitution,
              outline: input.outline,
              totalEpisodes: input.totalEpisodes
            })
        }))
      : segment.episodeBeats
  }))
}
