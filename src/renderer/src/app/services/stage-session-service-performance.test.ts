import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))
const sourcePath = resolve(currentDir, 'stage-session-service.ts')
const source = readFileSync(sourcePath, 'utf8')

function switchStageSessionSource(): string {
  const start = source.indexOf('export async function switchStageSession')
  const end = source.indexOf('function hydrateStagePayload')
  assert.ok(start >= 0, 'switchStageSession must exist')
  assert.ok(end > start, 'hydrateStagePayload must appear after switchStageSession')
  return source.slice(start, end)
}

describe('stage-session-service performance guard', () => {
  it('optimistically updates visible stage before waiting for project snapshot fetch', () => {
    const body = switchStageSessionSource()
    const optimisticStageIndex = body.indexOf('setStage(targetStage)')
    const fetchIndex = body.indexOf('await apiGetProject(projectId)')

    assert.ok(optimisticStageIndex >= 0, 'switchStageSession should set visible stage optimistically')
    assert.ok(fetchIndex >= 0, 'switchStageSession should still refresh the project snapshot')
    assert.ok(
      optimisticStageIndex < fetchIndex,
      'visible stage update must happen before awaiting apiGetProject'
    )
  })
})
