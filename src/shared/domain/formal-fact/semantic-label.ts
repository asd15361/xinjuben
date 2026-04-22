import type { FormalFact } from '../../contracts/workflow.ts'

function normalizeLabel(value: string | undefined): string {
  return (value || '').trim().replace(/^draft_/, '')
}

function normalizeDescription(value: string | undefined): string {
  return (value || '').trim()
}

export function getFormalFactSemanticLabel(
  fact: Pick<FormalFact, 'label' | 'description'>
): string {
  const label = normalizeLabel(fact.label)
  const description = normalizeDescription(fact.description)
  const combined = `${label} ${description}`

  if (label === '对手压力' || label.endsWith('施压线')) {
    return '对手压力'
  }

  if (label === '师父角色' || /师父|师傅|道长|交代|规矩|旧话|托付|钥匙/.test(combined)) {
    return '师父角色'
  }

  if (label === '关键关系' || label === '关键人物关系') {
    return '关键关系'
  }

  if (label === '关键道具' || /钥匙|密库|秘宝|法器|玉佩|令牌/.test(combined)) {
    return '关键道具'
  }

  return label
}

export function isFormalFactSemanticLabel(
  fact: Pick<FormalFact, 'label' | 'description'>,
  expectedLabel: string
): boolean {
  return getFormalFactSemanticLabel(fact) === expectedLabel
}
