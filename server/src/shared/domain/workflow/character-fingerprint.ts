import type { CharacterDraftDto } from '../../contracts/workflow'

function cleanText(value: string | undefined): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function computeHash(input: string): string {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function buildCharacterFingerprint(characters: CharacterDraftDto[]): string {
  const normalized = (Array.isArray(characters) ? characters : [])
    .map((character) => ({
      name: cleanText(character.name),
      biography: cleanText(character.biography),
      publicMask: cleanText(character.publicMask),
      hiddenPressure: cleanText(character.hiddenPressure),
      fear: cleanText(character.fear),
      protectTarget: cleanText(character.protectTarget),
      conflictTrigger: cleanText(character.conflictTrigger),
      advantage: cleanText(character.advantage),
      weakness: cleanText(character.weakness),
      goal: cleanText(character.goal),
      arc: cleanText(character.arc),
      roleLayer: character.roleLayer || 'active',
      activeBlockNos: [...(character.activeBlockNos || [])].sort((left, right) => left - right),
      masterEntityId: cleanText(character.masterEntityId)
    }))
    .sort((left, right) => {
      const nameDelta = left.name.localeCompare(right.name, 'zh-Hans-CN')
      if (nameDelta !== 0) return nameDelta
      return left.masterEntityId.localeCompare(right.masterEntityId, 'zh-Hans-CN')
    })

  return `charfp_${computeHash(JSON.stringify(normalized))}`
}