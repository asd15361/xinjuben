import type { ScriptStateLedgerDto } from '../../../../shared/contracts/script-ledger'
import type { CharacterDraftDto, OutlineDraftDto, ScriptSegmentDto } from '../../../../shared/contracts/workflow'
import { getConfirmedFormalFacts } from '../../../../shared/domain/formal-fact/selectors'

export function buildKnowledgeBoundaries(input: {
  outline: OutlineDraftDto
  script: ScriptSegmentDto[]
  characters: CharacterDraftDto[]
}): ScriptStateLedgerDto['knowledgeBoundaries'] {
  const confirmedFormalFacts = getConfirmedFormalFacts(input.outline)
  const latestScene = input.script[input.script.length - 1]
  const latestText = `${latestScene?.action || ''}\n${latestScene?.dialogue || ''}\n${latestScene?.emotion || ''}`
  const perspectiveCharacter =
    input.characters.find((character) => latestText.includes(character.name))?.name || input.characters[0]?.name || null
  const publicFacts = [
    input.outline.mainConflict,
    latestScene?.action || '',
    latestScene?.dialogue || ''
  ].filter((item) => item.trim().length > 0).slice(0, 4)
  const hiddenFacts = confirmedFormalFacts
    .map((fact) => fact.description.trim())
    .filter((item) => item.length > 0 && !publicFacts.some((publicFact) => publicFact.includes(item)))
    .slice(0, 4)

  return {
    perspectiveCharacter,
    publicFacts,
    hiddenFacts,
    forbiddenOmniscienceRules: [
      '未公开的隐藏事实不能被所有角色直接说出',
      '角色对白不得越过当前视角直接宣告全知真相',
      '下一场必须先承接当前公开冲突，再决定是否揭示隐藏信息'
    ]
  }
}
