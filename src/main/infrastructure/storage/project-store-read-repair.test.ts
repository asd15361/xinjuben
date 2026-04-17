import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { readParsedStoreWithRepair } from './project-store-read-repair.ts'

test('readParsedStoreWithRepair tolerates transient invalid JSON and succeeds after retry', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xinjuben-read-repair-'))
  const filePath = join(root, 'workspace', 'projects.json')
  await mkdir(join(root, 'workspace'), { recursive: true })
  await writeFile(filePath, '{"projects":', 'utf8')

  setTimeout(() => {
    void writeFile(
      filePath,
      JSON.stringify({ projects: { project_1: { id: 'project_1', name: 'stable' } } }, null, 2),
      'utf8'
    )
  }, 30)

  const result = await readParsedStoreWithRepair(filePath, {
    backupSuffix: '.corrupt-test.json',
    parse: (raw) => JSON.parse(raw) as { projects: Record<string, { name: string }> },
    readAttempts: 6,
    retryDelayMs: 20
  })

  assert.equal(result.parsed.projects.project_1.name, 'stable')
  const raw = await readFile(filePath, 'utf8')
  assert.match(raw, /stable/)
})

test('readParsedStoreWithRepair quarantines persistently invalid JSON after retries', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xinjuben-read-repair-'))
  const filePath = join(root, 'workspace', 'projects.json')
  const backupPath = join(root, 'workspace', 'projects.corrupt-test.json')
  await mkdir(join(root, 'workspace'), { recursive: true })
  await writeFile(filePath, '{"projects":', 'utf8')

  await assert.rejects(
    readParsedStoreWithRepair(filePath, {
      backupSuffix: '.corrupt-test.json',
      parse: (raw) => JSON.parse(raw) as { projects: Record<string, { name: string }> },
      readAttempts: 3,
      retryDelayMs: 10
    }),
    /parse_failed/
  )

  const quarantinedRaw = await readFile(backupPath, 'utf8')
  assert.equal(quarantinedRaw, '{"projects":')
})
