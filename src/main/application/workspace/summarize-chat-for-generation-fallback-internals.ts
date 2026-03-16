import { normalizeNameList, uniqueList } from './summarize-chat-for-generation-shared'

export { normalizeNameList, uniqueList }

export function pickFirstKeyword(text: string, keywords: string[]): string {
  return keywords.find((keyword) => text.includes(keyword)) || ''
}

export function pickFirstPattern(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const matched = text.match(pattern)?.[1]?.trim()
    if (matched) return matched
  }
  return ''
}
