import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

async function resolvePocketBaseBinary(cwd: string): Promise<string> {
  const localExe = path.join(cwd, 'pocketbase.exe')
  try {
    await access(localExe, constants.F_OK)
    return localExe
  } catch {
    return 'pocketbase'
  }
}

async function main(): Promise<void> {
  const command = process.argv[2] || 'up'
  const cwd = path.resolve(__dirname, '..')
  const binary = await resolvePocketBaseBinary(cwd)

  await new Promise<void>((resolve, reject) => {
    const child = spawn(binary, ['migrate', command], {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`pocketbase_migrate_failed:${code ?? 'unknown'}`))
    })
    child.on('error', reject)
  })
}

main().catch((error) => {
  console.error('[PocketBase] migration failed:', error)
  process.exit(1)
})
