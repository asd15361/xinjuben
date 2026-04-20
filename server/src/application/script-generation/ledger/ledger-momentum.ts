import type { ScriptStateLedgerDto } from '@shared/contracts/script-ledger'
import type { OutlineDraftDto, ScriptSegmentDto } from '@shared/contracts/workflow'
import { hasMemoryEchoSignal } from '@shared/domain/script-generation/signal-policy'
import { summarizeSceneFragment } from './ledger-scene-summary'

function collectMemoryEchoes(script: ScriptSegmentDto[]): string[] {
  return script
    .flatMap((scene) =>
      `${scene.action}\n${scene.dialogue}\n${scene.emotion}`.split(/[。！？!?；\n]/)
    )
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => hasMemoryEchoSignal(line))
    .slice(-3)
}

function collectHardAnchors(outline: OutlineDraftDto, script: ScriptSegmentDto[]): string[] {
  const latestScenes = script
    .slice(-2)
    .map((scene) => `${scene.action} ${scene.dialogue} ${scene.emotion}`)
    .join('\n')
  return [outline.theme, outline.mainConflict, outline.protagonist]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item) => !latestScenes.includes(item))
    .slice(0, 3)
}

export function buildStoryMomentum(input: {
  outline: OutlineDraftDto
  script: ScriptSegmentDto[]
  unresolvedSignals: string[]
  latestHook: string
}): ScriptStateLedgerDto['storyMomentum'] {
  const latestScene = input.script[input.script.length - 1]
  const memoryEchoes = collectMemoryEchoes(input.script)
  const hardAnchors = collectHardAnchors(input.outline, input.script)
  const latestSummary = summarizeSceneFragment(latestScene, {
    maxLength: 120,
    sentenceLimit: 3,
    fallback: input.outline.mainConflict || '待补'
  })
  const latestCostSummary = summarizeSceneFragment(latestScene, {
    maxLength: 80,
    sentenceLimit: 2,
    fallback: '上一场动作带来的代价尚待兑现'
  })

  return {
    previousCliffhanger: input.latestHook,
    nextRequiredBridge: input.unresolvedSignals[0] || '承接上一场的未解信号并继续推进核心冲突',
    activeConflictLine: latestSummary,
    pendingCost: latestCostSummary,
    memoryEchoes,
    hardAnchors
  }
}
