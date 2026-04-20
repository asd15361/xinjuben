import type {
  ScriptEpisodeControlPlanDto,
  ScriptGenerationControlPackageDto
} from '../../contracts/script-generation'
import type { StoryIntentPackageDto } from '../../contracts/intake'
import type {
  DetailedOutlineBlockDto,
  DetailedOutlineEpisodeBeatDto,
  DetailedOutlineSegmentDto,
  EpisodeControlCardDto
} from '../../contracts/workflow'
import { normalizeEpisodeControlCard } from '../short-drama/episode-control-card'
import { normalizeShortDramaConstitution } from '../short-drama/short-drama-constitution'

function collectEpisodeBeatsFromBlocks(
  blocks: DetailedOutlineBlockDto[] | undefined
): DetailedOutlineEpisodeBeatDto[] {
  if (!Array.isArray(blocks)) return []

  return blocks.flatMap((block) => [
    ...(block.episodeBeats || []),
    ...(block.sections || []).flatMap((section) => section.episodeBeats || [])
  ])
}

function upsertEpisodeControlCard(
  map: Map<number, EpisodeControlCardDto | null>,
  beat: DetailedOutlineEpisodeBeatDto
): void {
  if (!Number.isFinite(beat.episodeNo) || beat.episodeNo <= 0) return
  const normalized = normalizeEpisodeControlCard(beat.episodeControlCard)
  if (!normalized && map.has(beat.episodeNo)) return
  map.set(beat.episodeNo, normalized)
}

export function buildScriptGenerationControlPackage(input: {
  storyIntent?: StoryIntentPackageDto | null
  segments?: DetailedOutlineSegmentDto[]
  detailedOutlineBlocks?: DetailedOutlineBlockDto[]
  targetEpisodes?: number
}): ScriptGenerationControlPackageDto {
  const episodeControlMap = new Map<number, EpisodeControlCardDto | null>()
  const normalizedConstitution = normalizeShortDramaConstitution(
    input.storyIntent?.shortDramaConstitution
  )

  for (const segment of input.segments || []) {
    for (const beat of segment.episodeBeats || []) {
      upsertEpisodeControlCard(episodeControlMap, beat)
    }
  }

  for (const beat of collectEpisodeBeatsFromBlocks(input.detailedOutlineBlocks)) {
    upsertEpisodeControlCard(episodeControlMap, beat)
  }

  const episodeControlPlans: ScriptEpisodeControlPlanDto[] = [...episodeControlMap.entries()]
    .sort((left, right) => left[0] - right[0])
    .filter(([episodeNo]) => !input.targetEpisodes || episodeNo <= input.targetEpisodes)
    .map(([episodeNo, episodeControlCard]) => ({
      episodeNo,
      episodeControlCard
    }))

  return {
    shortDramaConstitution: normalizedConstitution,
    episodeControlPlans
  }
}

export function resolveEpisodeControlCardFromPackage(
  controlPackage: ScriptGenerationControlPackageDto | null | undefined,
  episodeNo: number
): EpisodeControlCardDto | null {
  if (!controlPackage) return null
  return (
    controlPackage.episodeControlPlans.find((item) => item.episodeNo === episodeNo)
      ?.episodeControlCard || null
  )
}
