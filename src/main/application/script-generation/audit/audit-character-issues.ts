import type { ScriptAuditReportDto } from '../../../../shared/contracts/script-audit'
import type { CharacterDraftDto } from '../../../../shared/contracts/workflow'
import { hasTraitBindingSignal } from './audit-helpers'
import { hasMemoryEchoSignal } from '../../../../shared/domain/script-generation/signal-policy'

export function collectCharacterAuditIssues(
  characters: CharacterDraftDto[],
  mergedScript: string
): ScriptAuditReportDto['issues'] {
  const issues: ScriptAuditReportDto['issues'] = []

  characters.slice(0, 3).forEach((character) => {
    if (!hasTraitBindingSignal(mergedScript, character.name)) {
      issues.push({
        code: `character_${character.name}_trait_binding_weak`,
        severity: 'low',
        message: `角色“${character.name}”当前还缺少把特质落进行为或记忆触发的具体证据。`
      })
    }
  })

  if (!hasMemoryEchoSignal(mergedScript)) {
    issues.push({
      code: 'memory_echo_missing',
      severity: 'low',
      message: '当前剧本还没有形成稳定的记忆回声，跨批次连续性偏弱。'
    })
  }

  return issues
}
