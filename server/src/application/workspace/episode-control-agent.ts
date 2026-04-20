import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import { generateTextWithRuntimeRouter } from '../ai/generate-text'
import { resolveAiStageTimeoutMs } from '../ai/resolve-ai-stage-timeout'
import type { StoryIntentPackageDto } from '@shared/contracts/intake'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  EpisodeControlCardDto,
  OutlineDraftDto
} from '@shared/contracts/workflow'
import { normalizeEpisodeControlCard, buildEpisodeControlCard } from '@shared/domain/short-drama/episode-control-card'
import { renderShortDramaConstitutionPromptBlock } from '@shared/domain/short-drama/short-drama-constitution'

const EPISODE_CONTROL_MAX_OUTPUT_TOKENS = 3200

type GenerateTextFn = typeof generateTextWithRuntimeRouter

function normalizeJsonEnvelope(rawText: string): string {
  return rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim()
}

async function appendEpisodeControlDiagnostic(message: string): Promise<void> {
  try {
    const { appendRuntimeDiagnosticLog } = await import(
      '../../infrastructure/diagnostics/runtime-diagnostic-log.js'
    )
    await appendRuntimeDiagnosticLog('episode_control', message)
  } catch {
    // 诊断日志只能旁路记录，不能反过来打断详细大纲生成。
  }
}

function formatSegmentEpisodeBeats(segment: DetailedOutlineSegmentDto): string {
  return (segment.episodeBeats || [])
    .map((beat) => {
      const sceneLines = (beat.sceneByScene || [])
        .map((scene) =>
          [
            `  - scene ${scene.sceneNo}`,
            `    - location=${scene.location || '待补'}`,
            `    - timeOfDay=${scene.timeOfDay || '待补'}`,
            `    - setup=${scene.setup || '待补'}`,
            `    - tension=${scene.tension || '待补'}`,
            `    - hookEnd=${scene.hookEnd || '待补'}`
          ].join('\n')
        )
        .join('\n')

      return [`- 第${beat.episodeNo}集：${beat.summary || '待补'}`, sceneLines].filter(Boolean).join('\n')
    })
    .join('\n')
}

function formatCharacterBehaviorProfiles(characters: CharacterDraftDto[]): string {
  if (!Array.isArray(characters) || characters.length === 0) return '当前未提供人物小传'

  return characters
    .slice(0, 8)
    .map((character) =>
      [
        `- ${character.name}`,
        `  - publicMask=${character.publicMask || '待补'}`,
        `  - hiddenPressure=${character.hiddenPressure || '待补'}`,
        `  - conflictTrigger=${character.conflictTrigger || '待补'}`,
        `  - goal=${character.goal || '待补'}`,
        `  - weakness=${character.weakness || '待补'}`,
        `  - arc=${character.arc || '待补'}`
      ].join('\n')
    )
    .join('\n')
}

export function buildEpisodeControlAgentPrompt(input: {
  storyIntent: StoryIntentPackageDto
  outline: OutlineDraftDto
  segment: DetailedOutlineSegmentDto
  characters: CharacterDraftDto[]
  usedTactics?: string[]
}): string {
  const usedTacticsBlock = input.usedTactics && input.usedTactics.length > 0
    ? [
        '',
        '【计谋黑名单 · 本批禁止重复】',
        `以下施压手段已在之前集使用过，本批次绝对禁止重复，必须切换施压维度：${input.usedTactics.join('、')}`,
        '可切换维度：硬夺类→规则类→关系类→信息类→时空类。必须从黑名单外的维度中选择。'
      ].join('\n')
    : ''

  return [
    '【单集控制Agent · 集级调度指令】',
    '输出严格JSON，无文本、无解释。',
    '',
    '【控制卡字段 · 全部必填】',
    '1. episodeIndex：当前集数',
    '2. sceneCount：本场次数量（固定3幕/集）',
    '3. coreGoal：本集主角核心目标（必须具体）',
    '4. villainPressure：反派施加的致命压力（必须是真实生存威胁）',
    '5. pressureType：施压类型（四选一：武力胁迫 / 人质要挟 / 规则漏洞 / 利益分化）',
    '6. catharsisMoment：【强制新增】本集打脸爽点——必须是主角利用信息差/隐藏底牌/布局陷阱，让反派当众吃瘪、损失、破防、社死、计划落空。必须有画面感、有爽感、有反转。',
    '7. twistPoint：本集反转点',
    '8. cliffhanger：结尾钩子（留期待）',
    '9. nextEpisodeTeaser：下集预告方向',
    '10. protagonistActionType：【强制新增】本集主角核心行动类型（五选一枚举，数据结构上切断窝囊可能）：',
    '   - "装弱反击"：表面退让，实则暗中布局后手',
    '   - "冷静对峙"：不跪不求，用证据/底牌/规则直接反击',
    '   - "主动设局"：布局陷阱、设局引敌、制造假象反咬',
    '   - "借力打力"：利用对手的攻击/规则/势力反制对手',
    '   - "底牌碾压"：亮出隐藏实力/真相/关键证据，一击制胜',
    '   注意：绝对禁止出现"求饶"、"逃跑"、"示弱超1分钟"等窝囊选项。主角每集必须选择以上五种之一作为核心行动。',
    '',
    '【硬约束 · 绝对禁止】',
    '1. 禁止连续3集使用同一种施压手段（必须轮换四类施压）。',
    '2. 禁止反派只靠辱骂、吼叫、无脑栽赃体现压迫。',
    '3. 禁止主角全程挨打、吐血、示弱超过1分钟戏份。',
    '4. 禁止无爽点结尾：有压迫必有反击，有陷害必有打脸。',
    '5. 禁止逻辑漏洞：所有反转必须有前置伏笔。',
    '6. protagonistActionType 不准为空，必须在五种枚举中选择一个。',
    '',
    '【危机冷却机制】',
    '同一类"栽赃/搜身/污蔑"手段，连续使用不得超过2集，必须轮换施压方式，避免审美疲劳。',
    '',
    '【项目级短剧创作宪法】',
    renderShortDramaConstitutionPromptBlock(input.storyIntent.shortDramaConstitution),
    '',
    '【当前剧项目】',
    `- 剧名：${input.outline.title || '待补'}`,
    `- 主题：${input.outline.theme || '待补'}`,
    `- 主角：${input.outline.protagonist || '待补'}`,
    `- 核心冲突：${input.outline.mainConflict || '待补'}`,
    '',
    '【当前人物小传】',
    formatCharacterBehaviorProfiles(input.characters),
    '',
    `【当前批次】第${input.segment.startEpisode || 0}-${input.segment.endEpisode || 0}集`,
    formatSegmentEpisodeBeats(input.segment),
    usedTacticsBlock,
    '',
    '【输出格式】',
    '严格输出 JSON，不要 markdown，不要解释：',
    '{',
    '  "cards": [',
    '    {',
    '      "episodeNo": number,',
    '      "episodeIndex": number,',
    '      "sceneCount": number,',
    '      "coreGoal": string,',
    '      "villainPressure": string,',
    '      "pressureType": "武力胁迫" | "人质要挟" | "规则漏洞" | "利益分化",',
    '      "catharsisMoment": string,',
    '      "twistPoint": string,',
    '      "cliffhanger": string,',
    '      "nextEpisodeTeaser": string,',
    '      "protagonistActionType": "装弱反击" | "冷静对峙" | "主动设局" | "借力打力" | "底牌碾压"',
    '    }',
    '  ]',
    '}',
    '',
    '【⚠️ 致命约束 · 必须遵守】',
    `你必须为传入的【每一集】都生成对应的控制卡，绝不允许遗漏！`,
    `当前批次共传入 ${input.segment.episodeBeats?.length || 0} 集，你必须输出 ${input.segment.episodeBeats?.length || 0} 张卡！`,
    `缺少任何一集的控制卡都将被视为失败！`,
    `传入集号：${(input.segment.episodeBeats || []).map(b => b.episodeNo).join('、')}`,
    `你输出的 cards 数组长度必须等于 ${input.segment.episodeBeats?.length || 0}！`
  ].join('\n')
}

export function parseEpisodeControlAgentResponse(
  rawText: string
): Map<number, EpisodeControlCardDto> | null {
  try {
    const parsed = JSON.parse(normalizeJsonEnvelope(rawText))
    if (!Array.isArray(parsed.cards)) return null

    const cards = new Map<number, EpisodeControlCardDto>()
    for (const item of parsed.cards) {
      const episodeNo = Number(item?.episodeNo)
      if (!Number.isFinite(episodeNo) || episodeNo <= 0) return null
      const normalized = normalizeEpisodeControlCard(item)
      if (!normalized) return null
      cards.set(Math.floor(episodeNo), normalized)
    }
    return cards
  } catch {
    return null
  }
}

export async function generateEpisodeControlCardsForSegment(input: {
  storyIntent?: StoryIntentPackageDto | null
  outline: OutlineDraftDto
  segment: DetailedOutlineSegmentDto
  characters: CharacterDraftDto[]
  runtimeConfig: RuntimeProviderConfig
  signal?: AbortSignal
  invokeText?: GenerateTextFn
}): Promise<DetailedOutlineSegmentDto> {
  const episodeBeats = input.segment.episodeBeats || []
  if (episodeBeats.length === 0) return input.segment

  if (!input.storyIntent?.shortDramaConstitution) {
    throw new Error('episode_control_requires_short_drama_constitution')
  }

  const prompt = buildEpisodeControlAgentPrompt({
    storyIntent: input.storyIntent,
    outline: input.outline,
    segment: input.segment,
    characters: input.characters
  })
  const timeoutMs = resolveAiStageTimeoutMs('episode_control')
  const startedAt = Date.now()
  const invokeText = input.invokeText || generateTextWithRuntimeRouter

  await appendEpisodeControlDiagnostic(
    `batch_start range=${input.segment.startEpisode || 0}-${input.segment.endEpisode || 0} beatCount=${episodeBeats.length} promptChars=${prompt.length} timeoutMs=${timeoutMs}`
  )

  try {
    const result = await invokeText(
      {
        task: 'episode_control',
        prompt,
        allowFallback: false,
        responseFormat: 'json_object',
        temperature: 0.35,
        timeoutMs,
        maxOutputTokens: EPISODE_CONTROL_MAX_OUTPUT_TOKENS,
        runtimeHints: {
          strictness: 'strict',
          totalEpisodes: input.outline.summaryEpisodes.length || input.segment.endEpisode,
          episode: input.segment.startEpisode
        }
      },
      input.runtimeConfig,
      { signal: input.signal }
    )

    const parsed = parseEpisodeControlAgentResponse(result.text)
    if (!parsed) {
      throw new Error('episode_control_parse_failed')
    }

    // 检查是否有缺失的集数，使用 fallback 兜底而非阻断
    const missingEpisodes: number[] = []
    for (const beat of episodeBeats) {
      if (!parsed.has(beat.episodeNo)) {
        missingEpisodes.push(beat.episodeNo)
      }
    }

    if (missingEpisodes.length > 0) {
      await appendEpisodeControlDiagnostic(
        `episode_control_fallback range=${input.segment.startEpisode || 0}-${input.segment.endEpisode || 0} missingEpisodes=${missingEpisodes.join(',')} usingFallback=true`
      )
      // 为缺失集数生成 fallback 控制卡
      for (const episodeNo of missingEpisodes) {
        const beat = episodeBeats.find(b => b.episodeNo === episodeNo)
        if (beat) {
          const fallbackCard = buildEpisodeControlCard({
            beat,
            storyIntent: input.storyIntent,
            outline: input.outline,
            totalEpisodes: input.outline.summaryEpisodes.length || input.segment.endEpisode
          })
          parsed.set(episodeNo, fallbackCard)
        }
      }
    }

    const nextSegment: DetailedOutlineSegmentDto = {
      ...input.segment,
      episodeBeats: episodeBeats.map((beat) => ({
        ...beat,
        episodeControlCard: parsed.get(beat.episodeNo)
      }))
    }

    await appendEpisodeControlDiagnostic(
      `batch_finish elapsedMs=${Date.now() - startedAt} lane=${result.lane} model=${result.model} range=${input.segment.startEpisode || 0}-${input.segment.endEpisode || 0}`
    )

    return nextSegment
  } catch (error) {
    await appendEpisodeControlDiagnostic(
      `batch_fail elapsedMs=${Date.now() - startedAt} range=${input.segment.startEpisode || 0}-${input.segment.endEpisode || 0} error=${error instanceof Error ? error.message : String(error)}`
    )
    throw error instanceof Error ? error : new Error(String(error || 'episode_control_failed'))
  }
}