import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(currentDir, 'useHomePageActions.ts'), 'utf8')

describe('useHomePageActions hook stability guard', () => {
  it('keeps auth store subscription to a single hook to avoid HMR hook-count crashes', () => {
    const matches = source.match(/useAuthStore\(\(state\)\s*=>/g) ?? []

    assert.equal(
      matches.length,
      1,
      'useHomePageActions should not add multiple auth hooks for project-list cache metadata'
    )
  })
})
