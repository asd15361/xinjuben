import type { ScriptStateLedgerDto } from '../../../shared/contracts/script-ledger'
import type { CharacterDraftDto, ScriptSegmentDto } from '../../../shared/contracts/workflow'

function createStableHookId(sceneNo: number, hookText: string): string {
  const normalized = hookText
    .replace(/\s+/g, '')
    .replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, '')
    .slice(0, 24)

  return `hook-${sceneNo}-${normalized || 'empty'}`
}

function inferHookUrgency(sceneNo: number, latestSceneNo: number): 'high' | 'medium' | 'low' {
  if (sceneNo >= latestSceneNo - 1) return 'high'
  if (sceneNo >= latestSceneNo - 3) return 'medium'
  return 'low'
}

function inferPayoffType(text: string): 'reveal' | 'conflict' | 'emotion' | 'twist' {
  if (/真相|身份|秘密|到底是谁|为什么/i.test(text)) return 'reveal'
  if (/反转|居然|竟然|原来|没想到/i.test(text)) return 'twist'
  if (/爱不爱|恨|原谅|背叛|痛苦/i.test(text)) return 'emotion'
  return 'conflict'
}

export function buildOpenHooks(
  script: ScriptSegmentDto[],
  characters: CharacterDraftDto[]
): ScriptStateLedgerDto['openHooks'] {
  const latestSceneNo = script[script.length - 1]?.sceneNo ?? 0
  return script
    .filter((scene) => /[？?]|\b为什么\b|\b怎么会\b|秘密|真相|下落/i.test(scene.dialogue + scene.action + scene.emotion))
    .slice(-5)
    .map((scene) => {
      const hookText = scene.dialogue.trim() || scene.action.trim() || scene.emotion.trim()
      const relatedCharacters = characters
        .filter((character) => hookText.includes(character.name))
        .map((character) => character.name)
      const anchorRefs = [
        ...relatedCharacters.map((name) => `char:${name}`),
        ...((hookText.match(/青铜钥匙|锁心钥|断鳞刃|虎符|兵符|令牌|祭器|密信|地图|玉钥|铜钥|钥匙/g) || []).map(
          (item) => `artifact:${item}`
        ))
      ]

      return {
        id: createStableHookId(scene.sceneNo, hookText),
        sourceSceneNo: scene.sceneNo,
        hookText,
        urgency: inferHookUrgency(scene.sceneNo, latestSceneNo),
        expectedPayoffType: inferPayoffType(hookText),
        relatedCharacters,
        anchorRefs
      }
    })
}
