import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(currentDir, 'AppSidebar.tsx'), 'utf8')

describe('AppSidebar performance guard', () => {
  it('does not refetch the current stage when the active nav item is clicked again', () => {
    assert.match(
      source,
      /targetStage\s*===\s*currentStage/,
      'handleStageChange should return early when the user clicks the active stage'
    )
  })
})
