/**
 * 粗纲+人物生成服务（简化版）
 *
 * 职责：
 * 1. 调用七问 Agent（已迁移）
 * 2. 调用势力拆解表 Agent（待迁移）
 * 3. 调用五维人物 Agent（待迁移）
 * 4. 组装粗纲结果
 *
 * 当前状态：仅支持简化版人物生成，后续逐步迁移完整 Agent
 */

import { loadRuntimeProviderConfig, hasValidApiKey } from '../../infrastructure/runtime-env/provider-config'
import { generateTextWithRouter } from '../ai/generate-text'
import {
  buildSevenQuestionsPrompt,
  parseSevenQuestionsResponse
} from './seven-questions-agent'
import type { StoryIntentPackageDto } from '../../shared/contracts/intake'
import type {
  CharacterDraftDto,
  SevenQuestionsResultDto,
  OutlineDraftDto
} from '../../shared/contracts/workflow'
import { mapV2ToLegacyCharacterDraft, type CharacterProfileV2Dto } from '../../shared/contracts/character-profile-v2'

export interface OutlineAndCharactersRequest {
  storyIntent: StoryIntentPackageDto
  sevenQuestions: SevenQuestionsResultDto
  totalEpisodes: number
}

export interface OutlineAndCharactersResponse {
  outlineDraft: OutlineDraftDto
  characterDrafts: CharacterDraftDto[]
  success: boolean
}

/**
 * 简化版：直接生成人物小传（不走势力拆解）
 *
 * 用于跑通最小闭环，后续替换为完整 Agent 调用
 */
export async function generateOutlineAndCharactersSimple(
  request: OutlineAndCharactersRequest
): Promise<OutlineAndCharactersResponse> {
  const runtimeConfig = loadRuntimeProviderConfig()

  if (!hasValidApiKey(runtimeConfig)) {
    throw new Error('ai_not_configured: 请配置 DEEPSEEK_API_KEY')
  }

  const { storyIntent, sevenQuestions, totalEpisodes } = request

  // Step 1: 生成简化版人物（直接从 storyIntent 提取主角+对手）
  const protagonistName = storyIntent.protagonist || '主角'
  const antagonistName = storyIntent.antagonist || '反派'

  // 构建人物生成 Prompt
  const characterPrompt = buildSimpleCharacterPrompt({
    storyIntent,
    protagonistName,
    antagonistName,
    totalEpisodes
  })

  // 调用 AI 生成人物
  const characterResult = await generateTextWithRouter(
    {
      task: 'character_profile_simple',
      prompt: characterPrompt,
      temperature: 0.5,
      maxOutputTokens: 3000,
      responseFormat: 'json_object',
      timeoutMs: 60000
    },
    runtimeConfig
  )

  // 解析人物结果
  const characters = parseSimpleCharacterResponse(characterResult.text, protagonistName, antagonistName)

  // Step 2: 生成简化版粗纲（基于七问）
  // 安全获取 sections，处理可能为 undefined 的情况
  const sections = sevenQuestions?.sections || []

  const outlineDraft: OutlineDraftDto = {
    title: storyIntent.titleHint || '',
    genre: storyIntent.genre || '',
    theme: storyIntent.themeAnchors?.[0] || '',
    protagonist: protagonistName,
    mainConflict: storyIntent.coreConflict || '',
    summary: '',
    summaryEpisodes: [],
    outlineBlocks: sections.map((section, index) => ({
      blockNo: index + 1,
      label: section.sectionTitle || `篇章${index + 1}`,
      startEpisode: section.startEpisode,
      endEpisode: section.endEpisode,
      summary: '',
      episodes: [],
      sectionTitle: section.sectionTitle,
      sevenQuestions: section.sevenQuestions
    })),
    facts: []
  }

  // 生成剧集摘要
  const episodeSummaryPrompt = buildEpisodeSummaryPrompt({
    storyIntent,
    sevenQuestions,
    totalEpisodes
  })

  const episodeResult = await generateTextWithRouter(
    {
      task: 'episode_summary',
      prompt: episodeSummaryPrompt,
      temperature: 0.6,
      maxOutputTokens: 2000,
      timeoutMs: 45000
    },
    runtimeConfig
  )

  outlineDraft.summary = episodeResult.text.slice(0, 500)

  return {
    outlineDraft,
    characterDrafts: characters,
    success: true
  }
}

function buildSimpleCharacterPrompt(input: {
  storyIntent: StoryIntentPackageDto
  protagonistName: string
  antagonistName: string
  totalEpisodes: number
}): string {
  const lines: string[] = []

  lines.push('【五维人物小传生成指令】')
  lines.push('输出严格JSON，无文本、无解释。')
  lines.push('')
  lines.push('【核心铁律】')
  lines.push('每个人物必须包含五维字段：appearance / personality / identity / values / plotFunction')
  lines.push('核心人物还必须包含：hiddenPressure / fear / protectTarget / conflictTrigger / advantage / weakness / goal / arc / publicMask')
  lines.push('')
  lines.push('【故事信息】')
  lines.push(`- 剧名：${input.storyIntent.titleHint || '待补'}`)
  lines.push(`- 题材：${input.storyIntent.genre || '短剧'}`)
  lines.push(`- 基调：${input.storyIntent.tone || '待补'}`)
  lines.push(`- 主角：${input.protagonistName}`)
  lines.push(`- 对手：${input.antagonistName}`)
  lines.push(`- 核心冲突：${input.storyIntent.coreConflict || '待补'}`)
  lines.push(`- 结局方向：${input.storyIntent.endingDirection || '待补'}`)
  lines.push(`- 总集数：${input.totalEpisodes}`)
  lines.push('')
  lines.push('【输出格式】')
  lines.push('{')
  lines.push('  "characters": [')
  lines.push('    {')
  lines.push('      "id": "char_01",')
  lines.push('      "name": "string",')
  lines.push('      "depthLevel": "core",')
  lines.push('      "appearance": "string",')
  lines.push('      "personality": "string",')
  lines.push('      "identity": "string",')
  lines.push('      "values": "string",')
  lines.push('      "plotFunction": "string",')
  lines.push('      "hiddenPressure": "string",')
  lines.push('      "fear": "string",')
  lines.push('      "protectTarget": "string",')
  lines.push('      "conflictTrigger": "string",')
  lines.push('      "advantage": "string",')
  lines.push('      "weakness": "string",')
  lines.push('      "goal": "string",')
  lines.push('      "arc": "string",')
  lines.push('      "publicMask": "string",')
  lines.push('      "biography": "string"')
  lines.push('    }')
  lines.push('  ]')
  lines.push('}')

  return lines.join('\n')
}

function parseSimpleCharacterResponse(
  rawText: string,
  protagonistName: string,
  antagonistName: string
): CharacterDraftDto[] {
  try {
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```$/i, '')
      .trim()

    const parsed = JSON.parse(cleaned)

    if (!Array.isArray(parsed.characters)) {
      // 创建默认人物
      return createDefaultCharacters(protagonistName, antagonistName)
    }

    return parsed.characters.map((char: any) => {
      const v2Profile: CharacterProfileV2Dto = {
        id: char.id || `char_${Math.random().toString(36).slice(2)}`,
        name: char.name || protagonistName,
        depthLevel: char.depthLevel || 'core',
        appearance: char.appearance || '',
        personality: char.personality || '',
        identity: char.identity || '',
        values: char.values || '',
        plotFunction: char.plotFunction || '',
        hiddenPressure: char.hiddenPressure,
        fear: char.fear,
        protectTarget: char.protectTarget,
        conflictTrigger: char.conflictTrigger,
        advantage: char.advantage,
        weakness: char.weakness,
        goal: char.goal,
        arc: char.arc,
        publicMask: char.publicMask,
        biography: char.biography
      }

      return mapV2ToLegacyCharacterDraft(v2Profile)
    })
  } catch {
    return createDefaultCharacters(protagonistName, antagonistName)
  }
}

function createDefaultCharacters(protagonistName: string, antagonistName: string): CharacterDraftDto[] {
  const protagonist: CharacterDraftDto = {
    name: protagonistName,
    biography: '主角',
    goal: '逆袭成功',
    advantage: '坚韧',
    weakness: '初始实力不足',
    arc: '从底层到巅峰',
    publicMask: '表面低调',
    hiddenPressure: '暗中积蓄力量',
    fear: '失去机会',
    protectTarget: '自己的尊严',
    conflictTrigger: '被压迫',
    appearance: '',
    personality: '',
    identity: '',
    values: '',
    plotFunction: '',
    depthLevel: 'core',
    roleLayer: 'core'
  }

  const antagonist: CharacterDraftDto = {
    name: antagonistName,
    biography: '反派',
    goal: '打压主角',
    advantage: '资源丰富',
    weakness: '傲慢',
    arc: '从强势到失败',
    publicMask: '表面光鲜',
    hiddenPressure: '害怕失去地位',
    fear: '被主角超越',
    protectTarget: '自己的权势',
    conflictTrigger: '主角崛起',
    appearance: '',
    personality: '',
    identity: '',
    values: '',
    plotFunction: '',
    depthLevel: 'core',
    roleLayer: 'core'
  }

  return [protagonist, antagonist]
}

function buildEpisodeSummaryPrompt(input: {
  storyIntent: StoryIntentPackageDto
  sevenQuestions: SevenQuestionsResultDto
  totalEpisodes: number
}): string {
  const sections = input.sevenQuestions?.sections || []
  const sectionsSummary = sections
    .map((s, i) => `篇章${i + 1}（第${s.startEpisode}-${s.endEpisode}集）：${s.sectionTitle}`)
    .join('\n')

  return [
    '请为以下剧本生成一段简短的整体摘要（200字以内）：',
    '',
    `剧名：${input.storyIntent.titleHint || '待命名'}`,
    `题材：${input.storyIntent.genre || '短剧'}`,
    `主角：${input.storyIntent.protagonist || '主角'}`,
    `对手：${input.storyIntent.antagonist || '反派'}`,
    `核心冲突：${input.storyIntent.coreConflict || '待补'}`,
    `总集数：${input.totalEpisodes}`,
    '',
    '篇章划分：',
    sectionsSummary,
    '',
    '只输出摘要文本，不要其他内容。'
  ].join('\n')
}