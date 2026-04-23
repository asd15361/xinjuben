export type JsonRecord = Record<string, unknown>

function stripJsonFences(text: string): string {
  return text
    .replace(/```json|```/gi, '')
    .replace(/\u00A0/g, ' ')
    .trim()
}

function loosenJsonLikeText(text: string): string {
  return text
    .replace(/：/g, ':')
    .replace(/，/g, ',')
    .replace(/,\s*([}\]])/g, '$1')
    .trim()
}

function tryParseObjectFromText(text: string): JsonRecord | null {
  const firstBrace = text.indexOf('{')
  if (firstBrace < 0) return null

  for (let end = text.lastIndexOf('}'); end > firstBrace; end = text.lastIndexOf('}', end - 1)) {
    const slice = text.slice(firstBrace, end + 1)
    try {
      const parsed = JSON.parse(slice)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as JsonRecord
      }
    } catch {
      continue
    }
  }

  return null
}

function tryParseArrayFromText(text: string): unknown[] | null {
  const firstBracket = text.indexOf('[')
  if (firstBracket < 0) return null

  for (let end = text.lastIndexOf(']'); end > firstBracket; end = text.lastIndexOf(']', end - 1)) {
    const slice = text.slice(firstBracket, end + 1)
    try {
      const parsed = JSON.parse(slice)
      if (Array.isArray(parsed)) return parsed
    } catch {
      continue
    }
  }

  return null
}

export function tryParseObject(text: string): JsonRecord | null {
  const raw = stripJsonFences(text)
  return tryParseObjectFromText(raw) || tryParseObjectFromText(loosenJsonLikeText(raw))
}

export function tryParseArray(text: string): unknown[] | null {
  const raw = stripJsonFences(text)
  return tryParseArrayFromText(raw) || tryParseArrayFromText(loosenJsonLikeText(raw))
}
