import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { readStoreFromPath } from './project-store-reader.ts'

test('readStoreFromPath migrates legacy Electron store into the current store before parsing', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xinjuben-store-core-'))
  const currentStorePath = join(root, 'xinjuben', 'workspace', 'projects.json')
  const legacyStorePath = join(root, 'Electron', 'workspace', 'projects.json')

  await mkdir(join(root, 'xinjuben', 'workspace'), { recursive: true })
  await mkdir(join(root, 'Electron', 'workspace'), { recursive: true })
  await writeFile(currentStorePath, JSON.stringify({ projects: {} }, null, 2), 'utf8')
  await writeFile(
    legacyStorePath,
    JSON.stringify(
      {
        projects: {
          project_legacy: {
            id: 'project_legacy',
            name: 'legacy project',
            updatedAt: '2026-03-26T00:00:00.000Z'
          }
        }
      },
      null,
      2
    ),
    'utf8'
  )

  const store = await readStoreFromPath(currentStorePath, root)

  assert.equal(store.projects.project_legacy?.name, 'legacy project')
})

test('readStoreFromPath restores a quarantined backup instead of overwriting the store with empty defaults', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xinjuben-store-core-'))
  const currentStorePath = join(root, 'xinjuben', 'workspace', 'projects.json')
  const corruptBackupPath = join(root, 'xinjuben', 'workspace', 'projects.corrupt-rich.json')

  await mkdir(join(root, 'xinjuben', 'workspace'), { recursive: true })
  await writeFile(currentStorePath, '{"projects":', 'utf8')
  await writeFile(
    corruptBackupPath,
    JSON.stringify(
      {
        projects: {
          project_restored: {
            id: 'project_restored',
            name: 'restored project',
            updatedAt: '2026-03-26T00:00:00.000Z'
          }
        }
      },
      null,
      2
    ),
    'utf8'
  )

  const store = await readStoreFromPath(currentStorePath, root)
  const restoredRaw = await readFile(currentStorePath, 'utf8')

  assert.equal(store.projects.project_restored?.name, 'restored project')
  assert.match(restoredRaw, /restored project/)
  assert.doesNotMatch(restoredRaw, /"projects":\s*\{\s*\}/)
})
