import type { FormalFact } from '../../contracts/workflow'
import { matchFormalFactLandingHeuristic } from './landing-heuristics'

const GENERIC_ANCHORS = new Set([
  '正式',
  '事实',
  '关键',
  '角色',
  '关系',
  '压力',
  '道具',
  '世界',
  '设定',
  '当前',
  '继续',
  '推进',
  '升格',
  '主角',
  '故事',
  '终局',
  '开局',
  '中段',
  '高潮',
  '危机',
  '线索',
  '内容',
  '结构',
  '反转',
  '情感',
  '秘密'
])

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[，。、“”‘’：；！？（）()【】\[\],.!?;:'"`~\-_/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function pushAnchor(target: Set<string>, token: string): void {
  const normalized = token.trim()
  if (normalized.length < 2) return
  if (GENERIC_ANCHORS.has(normalized)) return
  target.add(normalized)
}

function extractAnchors(value: string): string[] {
  const normalized = normalizeText(value)
  const anchors = new Set<string>()
  const chunks = normalized.match(/[\u4e00-\u9fff]{2,12}|[a-z0-9]{2,}/g) || []

  for (const chunk of chunks) {
    pushAnchor(anchors, chunk)
    if (/^[\u4e00-\u9fff]+$/.test(chunk)) {
      const maxLength = Math.min(chunk.length, 6)
      for (let size = 2; size <= maxLength; size += 1) {
        for (let index = 0; index <= chunk.length - size; index += 1) {
          pushAnchor(anchors, chunk.slice(index, index + size))
        }
      }
    }
  }

  return [...anchors]
}

export function matchFormalFactLanding(fact: FormalFact, segmentText: string): boolean {
  const normalizedSegments = normalizeText(segmentText)
  if (!normalizedSegments) return false

  if (matchFormalFactLandingHeuristic(fact, normalizedSegments)) return true

  const normalizedLabel = normalizeText(fact.label)
  const normalizedDescription = normalizeText(fact.description)
  if (normalizedLabel && normalizedSegments.includes(normalizedLabel)) return true
  if (normalizedDescription && normalizedSegments.includes(normalizedDescription)) return true

  const anchors = extractAnchors(`${fact.label} ${fact.description}`)
  let hitCount = 0
  for (const anchor of anchors) {
    if (normalizedSegments.includes(anchor)) {
      hitCount += 1
      if (hitCount >= 2) return true
    }
  }

  return false
}
