import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import { generateTextWithRuntimeRouter } from '../ai/generate-text'
import { normalizeChatTranscriptForGeneration } from './normalize-chat-transcript'
import {
  normalizeSummaryPayload,
  parseStructuredGenerationBrief,
  tryParseObject
} from './summarize-chat-for-generation-support'

const SUMMARY_STAGE_TIMEOUT_MS = 35_000

export async function summarizeChatForGeneration(input: {
  chatTranscript: string
  runtimeConfig: RuntimeProviderConfig
}): Promise<{
  generationBriefText: string
  storyIntent: Partial<StoryIntentPackageDto>
}> {
  const normalizedTranscript = normalizeChatTranscriptForGeneration(input.chatTranscript)
  const structured = parseStructuredGenerationBrief(normalizedTranscript)
  if (structured) {
    return normalizeSummaryPayload(structured, normalizedTranscript)
  }

  const prompt = [
    '你是第一板块的创作底稿整理助手。',
    '你的任务不是继续聊天，而是把整段对话整理成一份正式创作底稿。',
    '要求：',
    '1. 只保留已经比较明确的信息，不要把闲聊、追问、废话原样带下去。',
    '2. 如果用户说了很多人物，就尽量整理进角色卡和关系梳理。',
    '3. 如果有没完全确认的地方，放进 pendingConfirmations，不要混进已确认内容。',
    '4. sellingPremise 必须写成“一听就懂、会想点开的一句话卖点”，不要写成故事简介。',
    '5. coreDislocation 必须写成“最反常、最抓眼的关系/身份/处境反差句”，不要写成“身份错位/关系错位”这类标签。',
    '6. emotionalPayoff 必须写成“观众最先吃到的那口爽、痛、护人、翻盘情绪”，不要写成情绪总结或概念词。',
    '7. 这三句都要尽量用大白话，优先写人、关系、硬选择和代价，少写抽象解释。',
    '8. 禁止写法示例：',
    '   - sellingPremise: “少年守钥人卷入异变，必须在守约和救人之间做选择”',
    '   - coreDislocation: “关系/身份错位”',
    '   - emotionalPayoff: “护人成功后的情绪兑现”',
    '9. 推荐写法示例：',
    '   - sellingPremise: “他明明只想藏住那把钥匙，偏偏对方拿她的命逼他当街亮底”',
    '   - coreDislocation: “最该躲事的藏锋少年，偏偏被逼成全镇第一个站出来的人”',
    '   - emotionalPayoff: “先让观众吃到他宁可把自己暴露，也要把她护下来的那口气”',
    '10. 输出严格 JSON，不要 markdown，不要解释。',
    'JSON 结构：',
    '{',
    '  "generationBrief": {',
    '    "projectTitle": string,',
    '    "episodeCount": number,',
    '    "genreAndStyle": string,',
    '    "sellingPremise": string,',
    '    "coreDislocation": string,',
    '    "emotionalPayoff": string,',
    '    "worldAndBackground": string,',
    '    "protagonist": string,',
    '    "antagonist": string,',
    '    "coreConflict": string,',
    '    "endingDirection": string,',
    '    "keyCharacters": string[],',
    '    "chainSynopsis": string,',
    '    "characterCards": [{"name": string, "summary": string}],',
    '    "characterLayers": [{"name": string, "layer": string, "duty": string}],',
    '    "seasonDesireLine": string,',
    '    "seasonResistanceLine": string,',
    '    "seasonCostLine": string,',
    '    "relationshipLeverLine": string,',
    '    "hookChainLine": string,',
    '    "relationSummary": string[],',
    '    "softUnderstanding": string[],',
    '    "pendingConfirmations": string[]',
    '  },',
    '  "storyIntent": {',
    '    "titleHint": string, "genre": string, "tone": string, "audience": string,',
    '    "sellingPremise": string, "coreDislocation": string, "emotionalPayoff": string,',
    '    "protagonist": string, "antagonist": string, "coreConflict": string, "endingDirection": string,',
    '    "officialKeyCharacters": string[], "lockedCharacterNames": string[],',
    '    "themeAnchors": string[], "worldAnchors": string[], "relationAnchors": string[], "dramaticMovement": string[],',
    '    "manualRequirementNotes": string, "freeChatFinalSummary": string',
    '  }',
    '}',
    '',
    '完整聊天记录：',
    normalizedTranscript
  ].join('\n')

  try {
    const result = await generateTextWithRuntimeRouter(
      {
        task: 'decision_assist',
        prompt,
        allowFallback: true,
        temperature: 0.3,
        timeoutMs: SUMMARY_STAGE_TIMEOUT_MS
      },
      input.runtimeConfig
    )
    const parsed = tryParseObject(result.text)
    return normalizeSummaryPayload(parsed, normalizedTranscript)
  } catch {
    return normalizeSummaryPayload(null, normalizedTranscript)
  }
}
