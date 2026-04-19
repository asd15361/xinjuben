const MEMORY_ECHO_PATTERN =
  /(回忆|想起|记得|当年|过去|旧疤|曾经|前史|旧事|旧话|告诫|叮嘱|规矩|低语|耳边响起|师父的声音|声音在脑中炸开)/

const PRESSURE_SCENE_PATTERN =
  /(攥拳|握紧|指节发白|摩挲|旧疤|咬牙|咬唇|皱眉|压住怒意|隐忍|克制|压回|按着|按在怀里|手指一僵|拳头发紧)/

const CONFLICT_ACTION_PATTERN =
  /(守护|阻止|对抗|争夺|保护|救我|救下|夺回|反击|查明|挡在|护在|逼近|围住|堵死|绑了|押走|搜身|施压|威胁)/

const OTHER_TRAIT_PATTERN =
  /(贪婪|狠厉|嗤笑|冷笑|狞笑|惊惧|失望|恐惧|发抖|挣扎|钝痛|盯着|凑近|扑上|抓住|拖走|围压|逼压|目光|贪婪地停留)/

function normalizeRows(text: string): string[] {
  return text
    .split(/[。！？!?；\n]/)
    .map((row) => row.trim())
    .filter(Boolean)
}

export function hasMemoryEchoSignal(text: string): boolean {
  return MEMORY_ECHO_PATTERN.test(text)
}

export function findMemoryEchoEvidence(text: string): string {
  return normalizeRows(text).find((row) => hasMemoryEchoSignal(row)) || ''
}

export function findTraitBindingEvidence(
  text: string,
  landingType: 'pressure-scene' | 'memory-echo' | 'conflict-action' | 'other'
): string {
  const rows = normalizeRows(text)
  const pattern =
    landingType === 'pressure-scene'
      ? PRESSURE_SCENE_PATTERN
      : landingType === 'memory-echo'
        ? MEMORY_ECHO_PATTERN
        : landingType === 'conflict-action'
          ? CONFLICT_ACTION_PATTERN
          : OTHER_TRAIT_PATTERN

  return rows.find((row) => pattern.test(row)) || ''
}

export function hasTraitBindingSignal(text: string, name?: string): boolean {
  const rows = normalizeRows(text).filter((row) => (!name ? true : row.includes(name)))
  return rows.some(
    (row) =>
      PRESSURE_SCENE_PATTERN.test(row) ||
      MEMORY_ECHO_PATTERN.test(row) ||
      CONFLICT_ACTION_PATTERN.test(row) ||
      OTHER_TRAIT_PATTERN.test(row)
  )
}