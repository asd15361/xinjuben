import type { AuditScriptInputDto } from '../../../../shared/contracts/script-audit'
import { hasTraitBindingSignal as hasUnifiedTraitBindingSignal } from '../../../../shared/domain/script-generation/signal-policy'

export function buildMergedScript(script: AuditScriptInputDto['script']): string {
  return script.map((scene) => `${scene.action} ${scene.dialogue} ${scene.emotion}`).join('\n')
}

export function hasRelationshipVerbs(text: string): boolean {
  return /(爱|恨|护|救|弃|逼婚|夺走|抢走|依赖|背叛|试探|联手|反目|牵制|利用|守住)/.test(text)
}

export function hasTraitBindingSignal(text: string, name: string): boolean {
  return hasUnifiedTraitBindingSignal(text, name)
}
