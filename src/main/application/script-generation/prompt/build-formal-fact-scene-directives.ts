import type { OutlineDraftDto } from '../../../../shared/contracts/workflow'
import { isFormalFactSemanticLabel } from '../../../../shared/domain/formal-fact/semantic-label.ts'

function getConfirmedFact(outline: OutlineDraftDto, label: string) {
  return outline.facts.find(
    (fact) => fact.status === 'confirmed' && isFormalFactSemanticLabel(fact, label)
  )
}

function pickName(description: string): string {
  const hit = description.match(/([一-龥]{2,4})/)
  return hit?.[1] || '关键人物'
}

export function buildFormalFactSceneDirectives(outline: OutlineDraftDto, episodeNo: number): string[] {
  if (episodeNo !== 1) return []

  const lines: string[] = []
  const antagonistPressure = getConfirmedFact(outline, '对手压力')
  const masterRole = getConfirmedFact(outline, '师父角色')

  if (antagonistPressure) {
    const opponent = pickName(antagonistPressure.description)
    lines.push(`首场戏里，${opponent}不能只被提到，必须亲自出手压人，而且要把主角逼到当场吃亏。`)
    lines.push(`首场戏里，${opponent}至少要说出一句带威胁的硬话，直接冲着主角要守的人或要守的东西去。`)
  }

  if (masterRole) {
    const master = pickName(masterRole.description)
    lines.push(`首场戏里，${master}不能只当背景设定，必须通过旧话、旧规矩、旧交代、旧物件中的至少一种，直接卡住主角当场的选择。`)
    lines.push(`首场戏里，观众必须看见主角不是单纯不敢动，而是被${master}留下的规矩或交代硬压着不动。`)
  }

  if (antagonistPressure && masterRole) {
    const opponent = pickName(antagonistPressure.description)
    const master = pickName(masterRole.description)
    lines.push(`首场戏里，要让${opponent}的逼压和${master}留下的规矩正面撞上，形成“外面逼、心里也被旧规矩卡住”的双重压强。`)
  }

  return lines
}
