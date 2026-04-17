import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import {
  migrateLegacyElectronStoreIfNeeded,
  recoverCorruptProjectStoreIfNeeded
} from './project-store-migration.ts'

test('migrateLegacyElectronStoreIfNeeded copies legacy Electron projects into empty app store', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xinjuben-store-migration-'))
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
          project_1: {
            id: 'project_1',
            name: 'legacy project'
          }
        }
      },
      null,
      2
    ),
    'utf8'
  )

  const didMigrate = await migrateLegacyElectronStoreIfNeeded(currentStorePath, root)
  const migratedRaw = await readFile(currentStorePath, 'utf8')
  const migrated = JSON.parse(migratedRaw) as { projects?: Record<string, { name?: string }> }

  assert.equal(didMigrate, true)
  assert.equal(migrated.projects?.project_1?.name, 'legacy project')
})

test('migrateLegacyElectronStoreIfNeeded keeps current store when it already has projects', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xinjuben-store-migration-'))
  const currentStorePath = join(root, 'xinjuben', 'workspace', 'projects.json')
  const legacyStorePath = join(root, 'Electron', 'workspace', 'projects.json')

  await mkdir(join(root, 'xinjuben', 'workspace'), { recursive: true })
  await mkdir(join(root, 'Electron', 'workspace'), { recursive: true })
  await writeFile(
    currentStorePath,
    JSON.stringify(
      {
        projects: {
          project_current: {
            id: 'project_current',
            name: 'current project'
          }
        }
      },
      null,
      2
    ),
    'utf8'
  )
  await writeFile(
    legacyStorePath,
    JSON.stringify(
      {
        projects: {
          project_legacy: {
            id: 'project_legacy',
            name: 'legacy project'
          }
        }
      },
      null,
      2
    ),
    'utf8'
  )

  const didMigrate = await migrateLegacyElectronStoreIfNeeded(currentStorePath, root)
  const migratedRaw = await readFile(currentStorePath, 'utf8')
  const migrated = JSON.parse(migratedRaw) as { projects?: Record<string, { name?: string }> }

  assert.equal(didMigrate, false)
  assert.equal(migrated.projects?.project_current?.name, 'current project')
  assert.equal(migrated.projects?.project_legacy, undefined)
})

test('migrateLegacyElectronStoreIfNeeded skips legacy copy when legacy migration is explicitly disabled', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xinjuben-store-migration-'))
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
            name: 'legacy project'
          }
        }
      },
      null,
      2
    ),
    'utf8'
  )

  const didMigrate = await migrateLegacyElectronStoreIfNeeded(currentStorePath, root, {
    allowLegacyElectronStore: false
  })
  const migratedRaw = await readFile(currentStorePath, 'utf8')
  const migrated = JSON.parse(migratedRaw) as { projects?: Record<string, { name?: string }> }

  assert.equal(didMigrate, false)
  assert.deepEqual(migrated.projects, {})
})

test('recoverCorruptProjectStoreIfNeeded restores richer corrupt backup over stale current store', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xinjuben-store-recovery-'))
  const currentStorePath = join(root, 'xinjuben', 'workspace', 'projects.json')
  const corruptStorePath = join(root, 'xinjuben', 'workspace', 'projects.corrupt-newer.json')

  await mkdir(join(root, 'xinjuben', 'workspace'), { recursive: true })
  await writeFile(
    currentStorePath,
    JSON.stringify(
      {
        projects: {
          project_small: {
            id: 'project_small',
            name: 'small project'
          }
        }
      },
      null,
      2
    ),
    'utf8'
  )
  await new Promise((resolve) => setTimeout(resolve, 20))
  await writeFile(
    corruptStorePath,
    JSON.stringify(
      {
        projects: {
          project_a: { id: 'project_a', name: 'A' },
          project_b: { id: 'project_b', name: 'B' },
          project_c: { id: 'project_c', name: 'C' }
        }
      },
      null,
      2
    ),
    'utf8'
  )

  const didRecover = await recoverCorruptProjectStoreIfNeeded(currentStorePath, root, {
    allowValidStoreReplacement: true
  })
  const recoveredRaw = await readFile(currentStorePath, 'utf8')
  const recovered = JSON.parse(recoveredRaw) as { projects?: Record<string, { name?: string }> }

  assert.equal(didRecover, true)
  assert.equal(Object.keys(recovered.projects || {}).length, 3)
  assert.equal(recovered.projects?.project_c?.name, 'C')
})

test('recoverCorruptProjectStoreIfNeeded does not overwrite current store with older corrupt backup', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xinjuben-store-recovery-'))
  const currentStorePath = join(root, 'xinjuben', 'workspace', 'projects.json')
  const corruptStorePath = join(root, 'xinjuben', 'workspace', 'projects.corrupt-older.json')

  await mkdir(join(root, 'xinjuben', 'workspace'), { recursive: true })
  await writeFile(
    corruptStorePath,
    JSON.stringify(
      {
        projects: {
          project_a: { id: 'project_a', name: 'A' },
          project_b: { id: 'project_b', name: 'B' }
        }
      },
      null,
      2
    ),
    'utf8'
  )
  await new Promise((resolve) => setTimeout(resolve, 20))
  await writeFile(
    currentStorePath,
    JSON.stringify(
      {
        projects: {
          project_current: {
            id: 'project_current',
            name: 'current project'
          }
        }
      },
      null,
      2
    ),
    'utf8'
  )

  const didRecover = await recoverCorruptProjectStoreIfNeeded(currentStorePath, root, {
    allowValidStoreReplacement: true
  })
  const currentRaw = await readFile(currentStorePath, 'utf8')
  const current = JSON.parse(currentRaw) as { projects?: Record<string, { name?: string }> }

  assert.equal(didRecover, false)
  assert.equal(current.projects?.project_current?.name, 'current project')
  assert.equal(current.projects?.project_a, undefined)
})

test('recoverCorruptProjectStoreIfNeeded skips backup scan when current store is already valid by default', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xinjuben-store-recovery-'))
  const currentStorePath = join(root, 'xinjuben', 'workspace', 'projects.json')
  const corruptStorePath = join(root, 'xinjuben', 'workspace', 'projects.corrupt-richer.json')

  await mkdir(join(root, 'xinjuben', 'workspace'), { recursive: true })
  await writeFile(
    corruptStorePath,
    JSON.stringify(
      {
        projects: {
          project_a: { id: 'project_a', name: 'A' },
          project_b: { id: 'project_b', name: 'B' }
        }
      },
      null,
      2
    ),
    'utf8'
  )
  await writeFile(
    currentStorePath,
    JSON.stringify(
      {
        projects: {
          project_current: {
            id: 'project_current',
            name: 'current project'
          }
        }
      },
      null,
      2
    ),
    'utf8'
  )

  const didRecover = await recoverCorruptProjectStoreIfNeeded(currentStorePath, root, {
    allowValidStoreReplacement: true
  })
  const currentRaw = await readFile(currentStorePath, 'utf8')
  const current = JSON.parse(currentRaw) as { projects?: Record<string, { name?: string }> }

  assert.equal(didRecover, false)
  assert.equal(current.projects?.project_current?.name, 'current project')
  assert.equal(current.projects?.project_a, undefined)
})

test('recoverCorruptProjectStoreIfNeeded does not pull legacy Electron store when legacy recovery is disabled', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xinjuben-store-recovery-'))
  const currentStorePath = join(root, 'xinjuben', 'workspace', 'projects.json')
  const legacyStorePath = join(root, 'Electron', 'workspace', 'projects.json')

  await mkdir(join(root, 'xinjuben', 'workspace'), { recursive: true })
  await mkdir(join(root, 'Electron', 'workspace'), { recursive: true })
  await writeFile(currentStorePath, '{ invalid json', 'utf8')
  await writeFile(
    legacyStorePath,
    JSON.stringify(
      {
        projects: {
          project_legacy: {
            id: 'project_legacy',
            name: 'legacy project'
          }
        }
      },
      null,
      2
    ),
    'utf8'
  )

  const didRecover = await recoverCorruptProjectStoreIfNeeded(currentStorePath, root, {
    allowLegacyElectronStore: false
  })

  assert.equal(didRecover, false)
})

test('recoverCorruptProjectStoreIfNeeded restores much richer backup even if current file is slightly newer', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xinjuben-store-recovery-'))
  const currentStorePath = join(root, 'xinjuben', 'workspace', 'projects.json')
  const corruptStorePath = join(root, 'xinjuben', 'workspace', 'projects.corrupt-richer.json')

  await mkdir(join(root, 'xinjuben', 'workspace'), { recursive: true })
  await writeFile(
    corruptStorePath,
    JSON.stringify(
      {
        projects: {
          project_a: { id: 'project_a', name: '111' },
          project_b: { id: 'project_b', name: '黎明' },
          project_c: { id: 'project_c', name: '修仙传' },
          project_d: { id: 'project_d', name: '11' },
          project_e: { id: 'project_e', name: '。11' },
          project_f: { id: 'project_f', name: '修仙传-备份' }
        }
      },
      null,
      2
    ),
    'utf8'
  )
  await new Promise((resolve) => setTimeout(resolve, 20))
  await writeFile(
    currentStorePath,
    JSON.stringify(
      {
        projects: {
          project_probe_1: { id: 'project_probe_1', name: 'inspect-a' },
          project_probe_2: { id: 'project_probe_2', name: 'inspect-b' },
          project_probe_3: { id: 'project_probe_3', name: 'inspect-c' }
        }
      },
      null,
      2
    ),
    'utf8'
  )

  const didRecover = await recoverCorruptProjectStoreIfNeeded(currentStorePath, root, {
    allowValidStoreReplacement: true
  })
  const recoveredRaw = await readFile(currentStorePath, 'utf8')
  const recovered = JSON.parse(recoveredRaw) as { projects?: Record<string, { name?: string }> }

  assert.equal(didRecover, true)
  assert.equal(Object.keys(recovered.projects || {}).length, 6)
  assert.equal(recovered.projects?.project_c?.name, '修仙传')
})
