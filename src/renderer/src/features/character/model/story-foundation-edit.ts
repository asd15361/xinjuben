import type { StoryIntentPackageDto } from '../../../../../shared/contracts/intake.ts'
import type { WorldBibleDto } from '../../../../../shared/contracts/world-building.ts'

export function mergeWorldBibleIntoStoryIntent(
  storyIntent: StoryIntentPackageDto,
  worldBible: WorldBibleDto
): StoryIntentPackageDto {
  const nextWorldBible: WorldBibleDto = {
    ...worldBible,
    source: 'user_confirmed'
  }

  return {
    ...storyIntent,
    worldBible: nextWorldBible,
    storyFoundation: storyIntent.storyFoundation
      ? {
          ...storyIntent.storyFoundation,
          worldBible: nextWorldBible
        }
      : storyIntent.characterRoster
        ? {
            worldBible: nextWorldBible,
            factionMatrix: storyIntent.factionMatrix ?? null,
            characterRoster: storyIntent.characterRoster
          }
        : storyIntent.storyFoundation
  }
}

export function splitWorldBibleListInput(value: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const item of value.split(/[\n,，、;；]/)) {
    const text = item.replace(/\s+/g, ' ').trim()
    if (!text || seen.has(text)) continue
    seen.add(text)
    result.push(text)
  }

  return result
}
