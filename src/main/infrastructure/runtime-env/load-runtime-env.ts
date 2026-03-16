import fs from 'node:fs'
import path from 'node:path'

function tryLoadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return

  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(filePath)
    return
  }

  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const equalsIndex = trimmed.indexOf('=')
    if (equalsIndex <= 0) continue
    const key = trimmed.slice(0, equalsIndex).trim()
    if (!key || process.env[key]) continue
    process.env[key] = trimmed.slice(equalsIndex + 1)
  }
}

export function loadRuntimeEnv(): void {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../../.env')
  ]

  for (const candidate of candidates) {
    tryLoadEnvFile(candidate)
  }
}
