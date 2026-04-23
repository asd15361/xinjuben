import type { CharacterDraftDto } from '@shared/contracts/workflow'
import { normalizeCharacterLikeName } from '@shared/domain/workflow/character-draft-normalization'
import { tryParseArray, tryParseObject } from './summarize-chat-for-generation-json'

type UnknownRecord = Record<string, unknown>
type ParsedCharacterDraftDto = Omit<CharacterDraftDto, 'roleLayer'> & {
  roleLayer?: string
  activeBlockNos?: number[]
}

const NAME_KEYS = ['name', '姓名', '人物名', '角色名', '角色']
const BIOGRAPHY_KEYS = ['biography', '人物小传', '小传', '简介']
const PUBLIC_MASK_KEYS = ['publicMask', '表面样子', '表面身份', '外在状态']
const HIDDEN_PRESSURE_KEYS = ['hiddenPressure', '暗里压力', '隐藏压力']
const FEAR_KEYS = ['fear', '最怕失去', '害怕']
const PROTECT_TARGET_KEYS = ['protectTarget', '最想守住', '守护对象']
const CONFLICT_TRIGGER_KEYS = ['conflictTrigger', '一碰就炸', '冲突触发点']
const ADVANTAGE_KEYS = ['advantage', '优势']
const WEAKNESS_KEYS = ['weakness', '短板', '弱点']
const GOAL_KEYS = ['goal', '目标']
const ARC_KEYS = ['arc', '弧光', '人物弧线']
const ROLE_LAYER_KEYS = [
  'roleLayer',
  'characterLayer',
  'layer',
  'tier',
  '角色层',
  '人物层',
  '角色分层',
  '人物分层',
  '层级'
]
const ACTIVE_BLOCK_KEYS = [
  'activeBlockNos',
  'activeBlocks',
  'activeBlockNumbers',
  'blockNos',
  'blocks',
  '出场板块',
  '登场板块',
  '活跃板块',
  '活跃区块',
  '活跃分块'
]

function pickValue(record: UnknownRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key]
    }
  }
  return undefined
}

function pickText(record: UnknownRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

function normalizeCharacterRoleLayer(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.trim()) {
        return item.trim()
      }
    }
  }
  return ''
}

function collectBlockNoCandidates(value: unknown, bucket: number[]): void {
  if (typeof value === 'number') {
    bucket.push(value)
    return
  }

  if (typeof value === 'string') {
    const matches = value.match(/\d+/g)
    if (matches) {
      bucket.push(...matches.map((item) => Number(item)))
    }
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectBlockNoCandidates(item, bucket))
    return
  }

  if (!value || typeof value !== 'object') return

  const record = value as UnknownRecord
  for (const key of ['activeBlockNos', 'activeBlocks', 'blockNos', 'blocks', 'items', 'list']) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      collectBlockNoCandidates(record[key], bucket)
    }
  }
}

function normalizeCharacterActiveBlockNos(value: unknown): number[] {
  const bucket: number[] = []
  collectBlockNoCandidates(value, bucket)
  return [...new Set(bucket.filter((item) => Number.isInteger(item) && item > 0))].sort(
    (a, b) => a - b
  )
}

function stripLinePrefix(line: string): string {
  return line.replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/, '').trim()
}

function parseLineBasedCharacters(text: string): UnknownRecord[] {
  const lines = text
    .replace(/```json|```/gi, '')
    .replace(/\u00A0/g, ' ')
    .trim()
    .split(/\r?\n/)
    .map((line) => stripLinePrefix(line))
    .filter(Boolean)

  const records: UnknownRecord[] = []
  let current: UnknownRecord = {}
  let lastKey = ''

  const pushCurrent = (): void => {
    if (normalizeCharacter(current)) {
      records.push(current)
    }
    current = {}
    lastKey = ''
  }

  for (const line of lines) {
    if (/^(characters?|人物|角色)\s*[:：]?\s*$/i.test(line)) continue
    if (/^(?:人物|角色|character)\s*\d+\s*$/i.test(line)) {
      pushCurrent()
      continue
    }

    const entry = line.match(/^([^:：]{1,24})[:：]\s*(.*)$/)
    if (entry) {
      const key = entry[1].trim()
      const value = entry[2].trim()
      if (NAME_KEYS.includes(key) && pickText(current, NAME_KEYS)) {
        pushCurrent()
      }
      current[key] = value
      lastKey = key
      continue
    }

    if (lastKey && typeof current[lastKey] === 'string') {
      current[lastKey] = `${current[lastKey]}\n${line}`.trim()
    }
  }

  pushCurrent()
  return records
}

function normalizeCharacter(value: unknown): ParsedCharacterDraftDto | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as UnknownRecord
  const name = normalizeCharacterLikeName(pickText(record, NAME_KEYS))
  if (!name) return null
  const hasRoleLayer = ROLE_LAYER_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(record, key)
  )
  const hasActiveBlockNos = ACTIVE_BLOCK_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(record, key)
  )
  const roleLayer = normalizeCharacterRoleLayer(pickValue(record, ROLE_LAYER_KEYS))
  const activeBlockNos = normalizeCharacterActiveBlockNos(pickValue(record, ACTIVE_BLOCK_KEYS))

  return {
    name,
    biography: pickText(record, BIOGRAPHY_KEYS),
    publicMask: pickText(record, PUBLIC_MASK_KEYS),
    hiddenPressure: pickText(record, HIDDEN_PRESSURE_KEYS),
    fear: pickText(record, FEAR_KEYS),
    protectTarget: pickText(record, PROTECT_TARGET_KEYS),
    conflictTrigger: pickText(record, CONFLICT_TRIGGER_KEYS),
    advantage: pickText(record, ADVANTAGE_KEYS),
    weakness: pickText(record, WEAKNESS_KEYS),
    goal: pickText(record, GOAL_KEYS),
    arc: pickText(record, ARC_KEYS),
    ...(hasRoleLayer || roleLayer ? { roleLayer: roleLayer || '' } : {}),
    ...(hasActiveBlockNos || activeBlockNos.length > 0 ? { activeBlockNos: activeBlockNos } : {})
  } satisfies ParsedCharacterDraftDto
}

function findCharacterList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []

  const record = payload as UnknownRecord
  const keys = ['characters', 'characterDrafts', 'roles', 'people', '人物', '人物小传', '角色']
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as unknown[]
  }

  const nested = record.data
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return findCharacterList(nested)
  }

  const single = normalizeCharacter(record)
  return single ? [record] : []
}

export function parseCharacterBundleText(
  text: string
): { characters?: CharacterDraftDto[] } | null {
  const objectPayload = tryParseObject(text)
  const arrayPayload = tryParseArray(text)
  const objectList = findCharacterList(objectPayload)
  const arrayList = findCharacterList(arrayPayload)
  const textList = parseLineBasedCharacters(text)
  const rawList = objectList.length > 0 ? objectList : arrayList.length > 0 ? arrayList : textList
  const characters = rawList
    .map((item) => normalizeCharacter(item))
    .filter((item): item is ParsedCharacterDraftDto => Boolean(item)) as CharacterDraftDto[]
  return rawList.length > 0 || characters.length > 0 ? { characters } : null
}
