import type { ProjectEntityStoreDto } from '../../../shared/contracts/entities.ts'
import type {
  ShortDramaConstitutionDto,
  StoryIntentPackageDto
} from '../../../shared/contracts/intake.ts'
import { buildConfirmedStoryIntent } from '../../../shared/domain/workflow/confirmed-story-intent.ts'
import { buildEntityStoreFromDecomposition } from '../../../shared/domain/entities/build-entity-store-from-decomposition.ts'
import { resolveEntityNamesOrPassThrough } from './resolve-entity-names.ts'
import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config.ts'

type SummarizeChatFn = (input: {
  chatTranscript: string
  runtimeConfig: RuntimeProviderConfig
  signal?: AbortSignal
}) => Promise<{
  generationBriefText: string
  storyIntent: Partial<StoryIntentPackageDto>
}>

type DraftShortDramaConstitutionFn = (input: {
  storyIntent: Partial<StoryIntentPackageDto>
  generationBriefText: string
  chatTranscript: string
  runtimeConfig: RuntimeProviderConfig
  signal?: AbortSignal
}) => Promise<ShortDramaConstitutionDto>

export async function confirmStoryIntentFromChat(input: {
  projectId: string
  chatTranscript: string
  existingEntityStore?: ProjectEntityStoreDto | null
  runtimeConfig: RuntimeProviderConfig
  signal?: AbortSignal
  summarizeChat?: SummarizeChatFn
  draftShortDramaConstitution?: DraftShortDramaConstitutionFn
}): Promise<{
  generationBriefText: string
  storyIntent: StoryIntentPackageDto
  entityStore: ProjectEntityStoreDto
}> {
  const summarizeChat =
    input.summarizeChat ||
    (await import('./summarize-chat-for-generation.ts')).summarizeChatForGeneration
  const draftShortDramaConstitution =
    input.draftShortDramaConstitution ||
    (await import('./short-drama-showrunner-agent.ts')).draftShortDramaConstitution

  const summarized = await summarizeChat({
    chatTranscript: input.chatTranscript,
    runtimeConfig: input.runtimeConfig,
    signal: input.signal
  })

  const shortDramaConstitution = await draftShortDramaConstitution({
    storyIntent: summarized.storyIntent,
    generationBriefText: summarized.generationBriefText,
    chatTranscript: input.chatTranscript,
    runtimeConfig: input.runtimeConfig,
    signal: input.signal
  })

  const storyIntent = buildConfirmedStoryIntent({
    storyIntent: {
      ...summarized.storyIntent,
      shortDramaConstitution
    },
    generationBriefText: summarized.generationBriefText,
    chatTranscript: input.chatTranscript
  })

  // ── Stage 0.5: 实体定名与锚定 ──
  // 如果用户没用具体名字（如只说"女主""霸总"），自动起名并全局锁定
  const resolvedStoryIntent = resolveEntityNamesOrPassThrough(storyIntent)

  const entityStore = buildEntityStoreFromDecomposition({
    projectId: input.projectId,
    decomposition: (await import('./decompose-chat-for-generation.ts')).decomposeFreeformInput({
      text: summarized.generationBriefText,
      provenanceTier: 'user_declared'
    }),
    existingStore: input.existingEntityStore
  })

  return {
    generationBriefText: resolvedStoryIntent.generationBriefText || summarized.generationBriefText,
    storyIntent: resolvedStoryIntent,
    entityStore
  }
}
