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
    '4. 输出严格 JSON，不要 markdown，不要解释。',
    'JSON 结构：',
    '{',
    '  "generationBrief": {',
    '    "projectTitle": string,',
    '    "episodeCount": number,',
    '    "genreAndStyle": string,',
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
