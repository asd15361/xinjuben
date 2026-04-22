import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../../shared/contracts/workflow.ts'
import { getConfirmedFormalFacts } from '../../../../shared/domain/formal-fact/selectors.ts'

export function estimateEpisodeContextTokens(input: {
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  segments: DetailedOutlineSegmentDto[]
  script: ScriptSegmentDto[]
  targetEpisodes: number
  episodeNo: number
}): number {
  const confirmedFormalFacts = getConfirmedFormalFacts(input.outline)
  const outlineWeight =
    input.outline.title.length +
    input.outline.theme.length +
    input.outline.mainConflict.length +
    input.outline.protagonist.length +
    confirmedFormalFacts.reduce(
      (total, fact) => total + fact.label.length + fact.description.length,
      0
    )
  const characterWeight = input.characters.reduce(
    (total, character) =>
      total +
      character.name.length +
      character.advantage.length +
      character.weakness.length +
      character.goal.length +
      character.arc.length,
    0
  )
  const segmentWeight = input.segments.reduce(
    (total, segment) =>
      total + segment.content.length + segment.hookType.length + segment.act.length,
    0
  )
  const scriptWeight = input.script.reduce(
    (total, scene) => total + scene.action.length + scene.dialogue.length + scene.emotion.length,
    0
  )
  const episodePressure =
    input.targetEpisodes >= 20 ? 12000 : input.targetEpisodes >= 12 ? 7000 : 3500
  const lateEpisodePressure = input.episodeNo >= Math.max(3, input.targetEpisodes - 2) ? 5000 : 0
  const denseStructurePressure =
    input.segments.filter((segment) => segment.content.trim().length > 0).length >= 3 ? 4000 : 0
  const cumulativeScriptPressure = Math.min(30000, input.script.length * 1800)

  return (
    4000 +
    outlineWeight * 8 +
    characterWeight * 5 +
    segmentWeight * 4 +
    scriptWeight * 2 +
    episodePressure +
    lateEpisodePressure +
    denseStructurePressure +
    cumulativeScriptPressure
  )
}
