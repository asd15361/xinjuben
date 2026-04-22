import type {
  ShortDramaConstitutionDto,
  StoryIntentPackageDto
} from '../../../shared/contracts/intake.ts'
import { normalizeShortDramaConstitution } from '../../../shared/domain/short-drama/short-drama-constitution.ts'
import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config.ts'
import { generateTextWithRuntimeRouter } from '../ai/generate-text.ts'
import { resolveAiStageTimeoutMs } from '../ai/resolve-ai-stage-timeout.ts'

const SHORT_DRAMA_SHOWRUNNER_MAX_OUTPUT_TOKENS = 2200

type GenerateTextFn = typeof generateTextWithRuntimeRouter

function normalizeJsonEnvelope(rawText: string): string {
  return rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim()
}

async function appendShortDramaShowrunnerDiagnostic(message: string): Promise<void> {
  try {
    const { appendRuntimeDiagnosticLog } =
      await import('../../infrastructure/diagnostics/runtime-diagnostic-log.ts')
    await appendRuntimeDiagnosticLog('short_drama_showrunner', message)
  } catch {
    // 诊断日志只能旁路记录，不能反过来打断 confirm_story_intent。
  }
}

export function buildShortDramaShowrunnerAgentPrompt(input: {
  storyIntent: Partial<StoryIntentPackageDto>
  generationBriefText: string
  chatTranscript: string
}): string {
  const storyIntent = input.storyIntent

  return [
    '【短剧总控Showrunner-Agent · 项目级宪法生成指令】',
    '你现在是顶级短剧制片人。你的任务是根据用户的原始创意，生成一份极具商业爆发力的“项目级宪法”。',
    '必须严格输出JSON，无任何解释、无多余文本。',
    '',
    '【短剧爆款黄金铁律 · 注入要求】',
    '1. 主角底牌（protagonistHiddenTrumpCard）：必须设计一个让反派绝对预想不到、能一锤定音的致命优势。',
    '2. 核心道具（macGuffinDefinition）：必须是全剧抢夺的焦点，具备稀缺性、威力和致命吸引力。',
    '3. 冲突与动机：反派动机必须是生死攸关的（权力/复仇/永生），主角退让必须是战略性的。',
    '',
    '【项目级宪法必须回答】',
    '1. worldViewBrief：一句话讲清世界观（势力、等级、核心规则）',
    '2. coreConflict：全剧贯穿的核心矛盾（必须是”利益+生死”）',
    '3. macGuffinDefinition：核心道具/钥匙/信物的终极定义——必须讲清它的真实作用、威力、稀缺性、谁在抢、抢到能获得什么、失去会毁灭什么。必须具体、可感知、有压迫感。',
    '4. villainCoreMotivation：反派终极动机（必须是权力/永生/复仇/颠覆宗门）',
    '5. protagonistHiddenTrumpCard：主角隐藏底牌/金手指——掌握反派绝对不知道的致命优势：隐藏身份、封印权限、祖传秘力、信息差碾压等。',
    '6. themeAndValue：全剧主题（正义/隐忍/翻盘/守护）',
    '7. episodeTotal：总集数（默认60集，除非用户另有要求）',
    '8. pacingLevel：节奏等级（极高/高/中）',
    '9. forbiddenContent：禁止出现的内容（根据审核指南：禁真杀人、禁血腥、禁辱国/宗、禁涉黑政黄、反派必败）',
    '',
    '【核心商业法则 · 强制遵守】',
    '1. 主角绝不窝囊：所有退让都是”战略性布局”，不是无能。',
    '2. 每3集必须出现一次”底牌亮闪”，让观众预判爽点。',
    '3. 核心设定必须讲透：观众看不懂=直接划走。',
    '4. 反派必须高智商：不靠吼、不靠蠢，靠权术、规则、布局、暗杀。',
    '5. 苦情只能用于铺垫，不能成为主线。',
    '',
    '【当前已确认创作信息】',
    `- 设定成交句：${storyIntent.sellingPremise || '待补'}`,
    `- 核心错位：${storyIntent.coreDislocation || '待补'}`,
    `- 情绪兑现：${storyIntent.emotionalPayoff || '待补'}`,
    `- 主角：${storyIntent.protagonist || '待补'}`,
    `- 对手：${storyIntent.antagonist || '待补'}`,
    `- 核心冲突：${storyIntent.coreConflict || '待补'}`,
    `- 结局方向：${storyIntent.endingDirection || '待补'}`,
    `- 主题锚点：${(storyIntent.themeAnchors || []).join('；') || '待补'}`,
    `- 关系锚点：${(storyIntent.relationAnchors || []).join('；') || '待补'}`,
    `- 叙事动力：${(storyIntent.dramaticMovement || []).join('；') || '待补'}`,
    '',
    '【确认信息整理稿】',
    input.generationBriefText,
    '',
    '【用户原始聊天】',
    input.chatTranscript,
    '',
    '【输出格式】',
    '严格输出 JSON，不要 markdown，不要解释：',
    '{',
    '  "corePrinciple": string,',
    '  "coreEmotion": string,',
    '  "worldViewBrief": string,',
    '  "coreConflict": string,',
    '  "macGuffinDefinition": string,',
    '  "villainCoreMotivation": string,',
    '  "protagonistHiddenTrumpCard": string,',
    '  "themeAndValue": string,',
    '  "episodeTotal": number,',
    '  "pacingLevel": "极高" | "高" | "中",',
    '  "forbiddenContent": string,',
    '  "incitingIncident": {',
    '    "timingRequirement": string,',
    '    "disruption": string,',
    '    "mainLine": string',
    '  },',
    '  "protagonistArc": {',
    '    "flawBelief": string,',
    '    "growthMode": string,',
    '    "payoff": string',
    '  },',
    '  "povPolicy": {',
    '    "mode": "single_protagonist" | "controlled_multi",',
    '    "allowedAuxiliaryViewpoints": string[],',
    '    "restriction": string',
    '  },',
    '  "climaxPolicy": {',
    '    "episodeHookRule": string,',
    '    "finalePayoffRule": string,',
    '    "callbackRequirement": string',
    '  },',
    '  "characterPolicy": {',
    '    "stateDrivenConflictRule": string,',
    '    "noForcedStupidityRule": string,',
    '    "noAbruptMutationRule": string',
    '  },',
    '  "forbiddenContent": string',
    '}'
  ].join('\n')
}

export function parseShortDramaShowrunnerResponse(
  rawText: string
): ShortDramaConstitutionDto | null {
  try {
    const parsed = JSON.parse(normalizeJsonEnvelope(rawText))
    return normalizeShortDramaConstitution(parsed)
  } catch {
    return null
  }
}

export async function draftShortDramaConstitution(input: {
  storyIntent: Partial<StoryIntentPackageDto>
  generationBriefText: string
  chatTranscript: string
  runtimeConfig: RuntimeProviderConfig
  signal?: AbortSignal
  invokeText?: GenerateTextFn
}): Promise<ShortDramaConstitutionDto> {
  if (!input.generationBriefText.trim()) {
    throw new Error('short_drama_showrunner_generation_brief_missing')
  }

  const prompt = buildShortDramaShowrunnerAgentPrompt({
    storyIntent: input.storyIntent,
    generationBriefText: input.generationBriefText,
    chatTranscript: input.chatTranscript
  })
  const timeoutMs = resolveAiStageTimeoutMs('short_drama_showrunner')
  const startedAt = Date.now()
  const invokeText = input.invokeText || generateTextWithRuntimeRouter

  await appendShortDramaShowrunnerDiagnostic(
    `draft_start briefChars=${input.generationBriefText.length} promptChars=${prompt.length} timeoutMs=${timeoutMs}`
  )

  try {
    const result = await invokeText(
      {
        task: 'short_drama_showrunner',
        prompt,
        allowFallback: false,
        responseFormat: 'json_object',
        temperature: 0.3,
        timeoutMs,
        maxOutputTokens: SHORT_DRAMA_SHOWRUNNER_MAX_OUTPUT_TOKENS,
        runtimeHints: {
          strictness: 'strict'
        }
      },
      input.runtimeConfig,
      { signal: input.signal }
    )

    const parsed = parseShortDramaShowrunnerResponse(result.text)
    if (!parsed) {
      throw new Error('short_drama_showrunner_parse_failed')
    }

    await appendShortDramaShowrunnerDiagnostic(
      `draft_finish elapsedMs=${Date.now() - startedAt} lane=${result.lane} model=${result.model} principle=${parsed.corePrinciple} emotion=${parsed.coreEmotion}`
    )

    return parsed
  } catch (error) {
    await appendShortDramaShowrunnerDiagnostic(
      `draft_fail elapsedMs=${Date.now() - startedAt} error=${error instanceof Error ? error.message : String(error)}`
    )
    throw error instanceof Error
      ? error
      : new Error(String(error || 'short_drama_showrunner_failed'))
  }
}
