import { beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { ProjectSummaryDto } from '../../../../../shared/contracts/project.ts'
import {
  readCachedProjectSummaries,
  writeCachedProjectSummaries
} from './project-summary-cache.ts'

class MemoryStorage {
  private values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

const storage = new MemoryStorage()

function sampleProject(id: string): ProjectSummaryDto {
  return {
    id,
    name: `项目 ${id}`,
    workflowType: 'ai_write',
    stage: 'chat',
    genre: '男频玄幻修仙',
    marketProfile: {
      audienceLane: 'male',
      subgenre: '男频玄幻修仙'
    },
    updatedAt: '2026-04-26T00:00:00.000Z'
  }
}

describe('project-summary-cache', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage
    })
    storage.clear()
  })

  it('persists project summaries per user', () => {
    const projects = [sampleProject('a'), sampleProject('b')]

    writeCachedProjectSummaries('user-1', projects)

    assert.deepEqual(readCachedProjectSummaries('user-1'), projects)
  })

  it('keeps different user caches isolated', () => {
    writeCachedProjectSummaries('user-1', [sampleProject('a')])
    writeCachedProjectSummaries('user-2', [sampleProject('b')])

    assert.equal(readCachedProjectSummaries('user-1')[0]?.id, 'a')
    assert.equal(readCachedProjectSummaries('user-2')[0]?.id, 'b')
  })

  it('returns an empty list for corrupt cache data', () => {
    storage.setItem('xinjuben_project_summaries:user-1', '{bad json')

    assert.deepEqual(readCachedProjectSummaries('user-1'), [])
  })
})
