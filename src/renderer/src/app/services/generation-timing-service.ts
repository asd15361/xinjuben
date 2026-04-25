import type { ProjectGenerationTaskDto } from '../../../../shared/contracts/generation.ts'

type GenerationStageType = ProjectGenerationTaskDto

interface TimingRecord {
  durationMs: number
  timestamp: number
}

interface StageTimingBucket {
  records: TimingRecord[]
}

interface GenerationTimingStore {
  version: 1
  buckets: Partial<Record<GenerationStageType, StageTimingBucket>>
}

const STORAGE_KEY = 'xinjuben_generation_timing_v1'
const MAX_RECORDS_PER_STAGE = 10

function readStore(): GenerationTimingStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { version: 1, buckets: {} }
    }
    const parsed = JSON.parse(raw) as unknown
    if (
      parsed &&
      typeof parsed === 'object' &&
      'version' in parsed &&
      (parsed as Record<string, unknown>).version === 1 &&
      'buckets' in parsed
    ) {
      return parsed as GenerationTimingStore
    }
  } catch {
    // ignore parse errors
  }
  return { version: 1, buckets: {} }
}

function writeStore(store: GenerationTimingStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // ignore storage errors (e.g. quota exceeded)
  }
}

export function recordGenerationDuration(
  stage: GenerationStageType,
  durationMs: number
): void {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return
  }

  const store = readStore()
  const bucket = store.buckets[stage] ?? { records: [] }

  bucket.records.push({
    durationMs: Math.round(durationMs),
    timestamp: Date.now()
  })

  if (bucket.records.length > MAX_RECORDS_PER_STAGE) {
    bucket.records = bucket.records.slice(-MAX_RECORDS_PER_STAGE)
  }

  store.buckets[stage] = bucket
  writeStore(store)
}

export function getEstimatedSeconds(
  stage: GenerationStageType,
  fallbackSeconds: number
): number {
  const store = readStore()
  const bucket = store.buckets[stage]

  if (!bucket || bucket.records.length === 0) {
    return Math.max(1, Math.floor(fallbackSeconds || 0))
  }

  const avgMs =
    bucket.records.reduce((sum, r) => sum + r.durationMs, 0) /
    bucket.records.length

  return Math.max(1, Math.floor(avgMs / 1000))
}

export function getTimingStats(stage: GenerationStageType): {
  count: number
  avgSeconds: number | null
} {
  const store = readStore()
  const bucket = store.buckets[stage]

  if (!bucket || bucket.records.length === 0) {
    return { count: 0, avgSeconds: null }
  }

  const avgMs =
    bucket.records.reduce((sum, r) => sum + r.durationMs, 0) /
    bucket.records.length

  return {
    count: bucket.records.length,
    avgSeconds: Math.round(avgMs / 1000)
  }
}

export function getGenerationTimingLabel(stage: GenerationStageType): string {
  const stats = getTimingStats(stage)
  if (stats.count === 0 || stats.avgSeconds == null) {
    return '首次生成，暂无本地均值；完成后会记录本次耗时'
  }

  return `本地均值 ${stats.avgSeconds} 秒，来自最近 ${stats.count} 次`
}
