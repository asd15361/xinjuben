import type { StoryIntentPackageDto } from '../../../shared/contracts/intake.ts'
import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config.ts'
import { appendRuntimeDiagnosticLog } from '../../infrastructure/diagnostics/runtime-diagnostic-log.ts'
import { generateTextWithRuntimeRouter } from '../ai/generate-text.ts'
import { resolveAiStageTimeoutMs } from '../ai/resolve-ai-stage-timeout.ts'
import { normalizeChatTranscriptForGeneration } from './normalize-chat-transcript.ts'
import {
  isSummaryPayloadComplete,
  normalizeSummaryPayload,
  tryParseObject
} from './summarize-chat-for-generation-support.ts'

const STORY_INTAKE_MAX_OUTPUT_TOKENS = 2600

async function appendStoryIntakeDiagnostic(message: string): Promise<void> {
  try {
    await appendRuntimeDiagnosticLog('story_intake', message)
  } catch {
    // Diagnostic logging must not become a new blocker for confirm flow.
  }
}

export async function summarizeChatForGeneration(input: {
  chatTranscript: string
  runtimeConfig: RuntimeProviderConfig
  signal?: AbortSignal
}): Promise<{
  generationBriefText: string
  storyIntent: Partial<StoryIntentPackageDto>
}> {
  const normalizedTranscript = normalizeChatTranscriptForGeneration(input.chatTranscript)
  const timeoutMs = resolveAiStageTimeoutMs('story_intake')

  const prompt = [
    '你是第一板块的创作底稿整理助手。',
    '你的任务不是继续聊天，而是把整段对话整理成一份正式创作底稿。',
    '这一步必须重新总结，不允许沿用历史总结结果做局部修补。',
    '如果用户后面推翻了前面的说法，必须以后说的为准。',
    '如果旧总结和用户最后表达冲突，旧总结必须作废，不能继续混进正式结果。',
    '输出时必须保证整份结果前后一致，不能前面写30集、后面还残留10集。',
    '要求：',
    '1. 只保留已经比较明确的信息，不要把闲聊、追问、废话原样带下去。',
    '2. 不要输出两套结构，不要同时写 generationBrief 和 storyIntent。',
    '3. 所有字段尽量简洁，单个字符串优先 1 到 2 句，别写成长段解释。',
    '4. 如果用户说了很多人物，就尽量整理进角色卡和关系梳理。',
    '5. 如果有没完全确认的地方，放进 pendingConfirmations，不要混进已确认内容。',
    '6. sellingPremise 必须写成“一听就懂、会想点开的一句话卖点”，不要写成故事简介。',
    '7. coreDislocation 必须写成“最反常、最抓眼的关系/身份/处境反差句”，不要写成“身份错位/关系错位”这类标签。',
    '8. emotionalPayoff 必须写成“观众最先吃到的那口爽、痛、护人、翻盘情绪”，不要写成情绪总结或概念词。',
    '9. 这三句都要尽量用大白话，优先写人、关系、硬选择和代价，少写抽象解释。',
    '10. 数组控制：keyCharacters 最多 8 个，characterCards 最多 6 个，characterLayers 最多 6 个，themeAnchors/worldAnchors/relationAnchors/softUnderstanding/pendingConfirmations 最多 6 个。',
    '11. dramaticMovement 固定输出 5 条，顺序必须是：主线欲望线、总阻力线、代价升级线、关系杠杆线、钩子承接线。',
    '12. 输出严格 JSON，不要 markdown，不要解释。',
    '13. 【新增】必须同时输出 creativeSummary 和 storySynopsis。两者是不同层级的东西，不能混为一谈。',
    '14. creativeSummary：只总结用户在聊天中已经表达的内容，不要编造用户没说过的东西。',
    '15. storySynopsis：必须是“可以交给编剧直接写七问和粗纲”的故事梗概，不是“创作信息总结”。',
    '16. storySynopsis 必须包含具体场面和事件，不能只有设定。至少要有：开局压迫事件、第一场打脸、主角当前困境、核心反派/势力、反派压迫方式、主角阶段目标、核心爽点、结局方向。',
    '17. 如果用户聊天中没提到某一项，你可以基于题材和男频/女频规则给出推荐方案，但必须写具体，不能空。',
    'JSON 结构：',
    '{',
    '  "projectTitle": string,',
    '  "episodeCount": number,',
    '  "genreAndStyle": string,',
    '  "tone": string,',
    '  "audience": string,',
    '  "sellingPremise": string,',
    '  "coreDislocation": string,',
    '  "emotionalPayoff": string,',
    '  "worldAndBackground": string,',
    '  "protagonist": string,',
    '  "antagonist": string,',
    '  "coreConflict": string,',
    '  "endingDirection": string,',
    '  "keyCharacters": string[],',
    '  "chainSynopsis": string,',
    '  "characterCards": [{"name": string, "summary": string}],',
    '  "characterLayers": [{"name": string, "layer": string, "duty": string}],',
    '  "themeAnchors": string[],',
    '  "worldAnchors": string[],',
    '  "relationAnchors": string[],',
    '  "dramaticMovement": string[],',
    '  "relationSummary": string[],',
    '  "softUnderstanding": string[],',
    '  "pendingConfirmations": string[],',
    '  "creativeSummary": string,',
    '  "storySynopsis": {',
    '    "logline": string,',
    '    "openingPressureEvent": string,',
    '    "protagonistCurrentDilemma": string,',
    '    "firstFaceSlapEvent": string,',
    '    "antagonistForce": string,',
    '    "antagonistPressureMethod": string,',
    '    "corePayoff": string,',
    '    "stageGoal": string,',
    '    "keyFemaleCharacterFunction": string,',
    '    "episodePlanHint": string,',
    '    "finaleDirection": string',
    '  }',
    '}',
    '',
    '完整聊天记录：',
    normalizedTranscript
  ].join('\n')

  const startedAt = Date.now()
  await appendStoryIntakeDiagnostic(
    `start transcriptChars=${normalizedTranscript.length} promptChars=${prompt.length} timeoutMs=${timeoutMs} maxOutputTokens=${STORY_INTAKE_MAX_OUTPUT_TOKENS}`
  )

  try {
    const result = await generateTextWithRuntimeRouter(
      {
        task: 'story_intake',
        prompt,
        allowFallback: false,
        responseFormat: 'json_object',
        temperature: 0.3,
        timeoutMs,
        maxOutputTokens: STORY_INTAKE_MAX_OUTPUT_TOKENS
      },
      input.runtimeConfig,
      { signal: input.signal }
    )
    const parsed = tryParseObject(result.text)
    const parsedOk = Boolean(parsed)
    const complete = isSummaryPayloadComplete(parsed)
    const normalizedResponsePreview = result.text.replace(/\s+/g, ' ').trim()
    await appendStoryIntakeDiagnostic(
      `finish elapsedMs=${Date.now() - startedAt} lane=${result.lane} model=${result.model} finishReason=${result.finishReason || 'unknown'} responseChars=${result.text.length} parsed=${parsedOk ? 'yes' : 'no'} complete=${complete ? 'yes' : 'no'} responseHead=${normalizedResponsePreview.slice(0, 240)} responseTail=${normalizedResponsePreview.slice(-240)}`
    )
    if (!parsedOk) {
      throw new Error('summary_payload_parse_failed')
    }
    if (!complete) {
      throw new Error('summary_payload_incomplete')
    }
    return normalizeSummaryPayload(parsed, normalizedTranscript)
  } catch (error) {
    await appendStoryIntakeDiagnostic(
      `fail elapsedMs=${Date.now() - startedAt} error=${error instanceof Error ? error.message : String(error)}`
    )
    throw new Error(
      `summary_generation_failed:${error instanceof Error ? error.message : String(error)}`
    )
  }
}
