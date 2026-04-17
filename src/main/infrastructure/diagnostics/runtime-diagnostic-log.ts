import { app } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'

const RUNTIME_DIAGNOSTIC_LOG_FILE = 'runtime-diagnostics.log'

function normalizeLogMessage(message: string): string {
  return message.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

export function getRuntimeDiagnosticLogPath(): string {
  return path.join(app.getPath('userData'), RUNTIME_DIAGNOSTIC_LOG_FILE)
}

export async function appendRuntimeDiagnosticLog(source: string, message: string): Promise<void> {
  const logPath = getRuntimeDiagnosticLogPath()
  const line = `[${new Date().toISOString()}] [${source}] ${normalizeLogMessage(message)}\n`
  await fs.mkdir(path.dirname(logPath), { recursive: true })
  await fs.appendFile(logPath, line, 'utf8')
}
