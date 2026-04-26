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
import {
  resolveVillainOppressionModeByEpisode,
  resolvePayoffTypeByEpisode,
  resolvePayoffLevelByEpisode,
  buildSignatureLineSeed,
  buildOpeningShockEventFallback,
  buildRetentionCliffhangerFallback,
  resolveViralHookTypeByEpisode
} from './viral-short-drama-policy.ts'
import {
  resolveGenerationStrategy,
  type GenerationStrategy
} from '../generation-strategy/generation-strategy.ts'

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
    protagonistActionType: normalizeProtagonistActionType(card.protagonistActionType),
    // 爆款规则字段
    viralHookType: cleanText(card.viralHookType),
    signatureLineSeed: cleanText(card.signatureLineSeed),
    payoffType: cleanText(card.payoffType),
    payoffLevel: normalizePayoffLevel(card.payoffLevel),
    villainOppressionMode: cleanText(card.villainOppressionMode),
    openingShockEvent: cleanText(card.openingShockEvent),
    retentionCliffhanger: cleanText(card.retentionCliffhanger),
    requiredProp: cleanText(card.requiredProp),
    requiredPropSource:
      card.requiredPropSource === 'extracted' || card.requiredPropSource === 'scheduled'
        ? card.requiredPropSource
        : undefined
  }
}

const PAYOFF_LEVEL_ENUM = ['normal', 'major', 'final'] as const

function normalizePayoffLevel(
  value: unknown
): 'normal' | 'major' | 'final' | undefined {
  if (typeof value === 'string' && PAYOFF_LEVEL_ENUM.includes(value as 'normal')) {
    return value as 'normal' | 'major' | 'final'
  }
  return undefined
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

export function extractCliffhangerFromSummary(
  summary: string,
  episodeNo: number
): string | null {
  // 跳过 generic fallback summary（如"第1集必须继续往前推主线"）
  if (summary.startsWith(`第${episodeNo}集必须继续往前推主线`)) {
    return null
  }
  const sentences = summary.split(/[。！？]/).filter((s) => s.trim().length > 0)
  if (sentences.length === 0) return null
  const last = sentences[sentences.length - 1].trim()
  if (last.length < 5 || last.length > 60) return null
  if (last.includes('概要')) return null
  return `${last}（这一集必须停在这个瞬间，最后一句台词必须扎心，不准给出解决方案）`
}

const PROP_KEYWORDS = [
  '账本','玉佩','令牌','密信','供词','契约','合同','钥匙','信件','药瓶','录音','照片','证据','数据','资料',
  '暗账','军饷','账目','书信','地图','剑','刀','锦囊','封印','灵石','铁证','毒药','解药','银针','蜡丸',
  '密函','印鉴','手谕','遗诏','脉案','药方','血书','地契','房契','借据','欠条','名册','名单','口供',
  '证词','笔录','卷宗','档案','密档','账册','腰牌','虎符','兵符','诏书','圣旨','密约','盟约','和约'
]

const PROP_ACTIONS = ['被抢','被换','被出示','被销毁','被藏','被夺','被发现','被截获']

function extractPropFromText(text: string): { prop: string; action: string } | null {
  for (const keyword of PROP_KEYWORDS) {
    if (text.includes(keyword)) {
      return { prop: keyword, action: '' }
    }
  }
  return null
}

export function buildRequiredProp(input: {
  summary: string
  firstSceneSetup?: string | null
  firstSceneTension?: string | null
  episodeNo: number
  strategy?: GenerationStrategy | null
}): { text: string; source: 'extracted' | 'scheduled' } {
  const searchText = `${input.summary} ${input.firstSceneSetup || ''} ${input.firstSceneTension || ''}`
  const found = extractPropFromText(searchText)
  const action = PROP_ACTIONS[(input.episodeNo - 1) % PROP_ACTIONS.length]
  if (found) {
    return {
      text: `本集道具【${found.prop}】已在剧情中出现，必须在冲突中${action}，不能只提一句就消失。`,
      source: 'extracted'
    }
  }
  // Fallback: deterministic prop based on episode number
  const fallbackProps =
    input.strategy?.worldLexicon.conflictObjects.length
      ? input.strategy.worldLexicon.conflictObjects
      : ['密信','令牌','账本','玉佩','供词','契约','钥匙','药瓶','证据','血书']
  const prop = fallbackProps[(input.episodeNo - 1) % fallbackProps.length]
  return {
    text: `本集需设置一个可承载信息的道具【${prop}】，请合理植入冲突中，并使其${action}。`,
    source: 'scheduled'
  }
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
  const generationStrategy = resolveGenerationStrategy({
    marketProfile: input.storyIntent?.marketProfile,
    genre: input.outline?.genre,
    storyIntentGenre: `${input.storyIntent?.genre || ''}\n${input.storyIntent?.coreConflict || ''}\n${input.outline?.mainConflict || ''}\n${input.outline?.summary || ''}`,
    title: input.outline?.title || input.storyIntent?.titleHint
  }).strategy
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

  // 爆款规则字段 fallback 生成
  const viralHookType = resolveViralHookTypeByEpisode(episodeNo, totalEpisodes)
  const signatureLineSeed = buildSignatureLineSeed({
    episodeNo,
    protagonistName: input.outline?.protagonist || input.storyIntent?.protagonist || '主角',
    antagonistName: input.storyIntent?.antagonist,
    coreItem: firstScene?.setup || lastScene?.tension || summary,
    identityAnchor: input.storyIntent?.protagonist,
    conflictCore: coreConflict || summary
  })
  const payoffType = resolvePayoffTypeByEpisode(episodeNo)
  const payoffLevel = resolvePayoffLevelByEpisode(episodeNo, totalEpisodes)
  const villainOppressionMode = resolveVillainOppressionModeByEpisode(episodeNo)
  // Use beat summary to generate specific opening shock event
  // (more effective than generic fallback when sceneByScene is thin)
  const summaryFirstSentence = summary.split(/[。！？]/)[0]?.trim() || ''
  const hasSpecificSceneData =
    (firstScene?.setup && firstScene.setup.length > 8 && firstScene.setup !== '冲突开场' && firstScene.setup !== '待补') ||
    (firstScene?.tension && firstScene.tension.length > 6 && firstScene.tension !== '施压' && firstScene.tension !== '待补')
  const openingShockEvent = hasSpecificSceneData
    ? pickFirstNonEmpty(firstScene?.setup, firstScene?.tension, buildOpeningShockEventFallback({
        episodeNo,
        protagonistName: input.outline?.protagonist || input.storyIntent?.protagonist,
        antagonistName: input.storyIntent?.antagonist
      }))
    : summaryFirstSentence.length > 8 && !summaryFirstSentence.includes('概要')
      ? `${summaryFirstSentence}（第一场必须从这一瞬间直接开场，不准铺垫）`
      : buildOpeningShockEventFallback({
          episodeNo,
          protagonistName: input.outline?.protagonist || input.storyIntent?.protagonist,
          antagonistName: input.storyIntent?.antagonist
        })
  const retentionCliffhanger =
    extractCliffhangerFromSummary(summary, episodeNo) ??
    buildRetentionCliffhangerFallback({ episodeNo })
  const { text: requiredProp, source: requiredPropSource } = buildRequiredProp({
    summary,
    firstSceneSetup: firstScene?.setup,
    firstSceneTension: firstScene?.tension,
    episodeNo,
    strategy: generationStrategy
  })

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
    protagonistActionType: undefined, // 由控制卡 Agent 生成，默认为空
    // 爆款规则字段
    viralHookType,
    signatureLineSeed,
    payoffType,
    payoffLevel,
    villainOppressionMode,
    openingShockEvent,
    retentionCliffhanger,
    requiredProp,
    requiredPropSource
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
