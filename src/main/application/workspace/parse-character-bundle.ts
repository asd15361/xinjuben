import type { CharacterDraftDto } from '../../../shared/contracts/workflow'

type UnknownRecord = Record<string, unknown>

function cleanJsonLikeText(text: string): string {
  return text
    .replace(/```json|```/gi, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/：/g, ':')
    .replace(/，/g, ',')
    .replace(/\u00A0/g, ' ')
    .replace(/,\s*([}\]])/g, '$1')
    .trim()
}

function tryParseObject(text: string): UnknownRecord | null {
  const normalized = cleanJsonLikeText(text)
  const firstBrace = normalized.indexOf('{')
  if (firstBrace < 0) return null

  for (let end = normalized.lastIndexOf('}'); end > firstBrace; end = normalized.lastIndexOf('}', end - 1)) {
    const slice = normalized.slice(firstBrace, end + 1)
    try {
      const parsed = JSON.parse(slice)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as UnknownRecord
      }
    } catch {
      continue
    }
  }

  return null
}

function tryParseArray(text: string): unknown[] | null {
  const normalized = cleanJsonLikeText(text)
  const firstBracket = normalized.indexOf('[')
  if (firstBracket < 0) return null

  for (
    let end = normalized.lastIndexOf(']');
    end > firstBracket;
    end = normalized.lastIndexOf(']', end - 1)
  ) {
    const slice = normalized.slice(firstBracket, end + 1)
    try {
      const parsed = JSON.parse(slice)
      if (Array.isArray(parsed)) return parsed
    } catch {
      continue
    }
  }

  return null
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

function normalizeCharacter(value: unknown): CharacterDraftDto | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as UnknownRecord
  const name = pickText(record, ['name', '姓名', '人物名', '角色名', '角色'])
  if (!name) return null

  return {
    name,
    biography: pickText(record, ['biography', '人物小传', '小传', '简介']),
    publicMask: pickText(record, ['publicMask', '表面样子', '表面身份', '外在状态']),
    hiddenPressure: pickText(record, ['hiddenPressure', '暗里压力', '隐藏压力']),
    fear: pickText(record, ['fear', '最怕失去', '害怕']),
    protectTarget: pickText(record, ['protectTarget', '最想守住', '守护对象']),
    conflictTrigger: pickText(record, ['conflictTrigger', '一碰就炸', '冲突触发点']),
    advantage: pickText(record, ['advantage', '优势']),
    weakness: pickText(record, ['weakness', '短板', '弱点']),
    goal: pickText(record, ['goal', '目标']),
    arc: pickText(record, ['arc', '弧光', '人物弧线'])
  }
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

export function parseCharacterBundleText(text: string): { characters?: CharacterDraftDto[] } | null {
  const objectPayload = tryParseObject(text)
  const arrayPayload = tryParseArray(text)
  const objectList = findCharacterList(objectPayload)
  const arrayList = findCharacterList(arrayPayload)
  const rawList = objectList.length > 0 ? objectList : arrayList
  const characters = rawList.map((item) => normalizeCharacter(item)).filter((item): item is CharacterDraftDto => Boolean(item))
  return rawList.length > 0 || characters.length > 0 ? { characters } : null
}
