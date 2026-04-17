import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const SEED_VERSION = 'p0-real-regression-v1'
export const SEED_PATH = path.join(__dirname, 'seed.json')

export async function readSeedProject() {
  const raw = await fs.readFile(SEED_PATH, 'utf8')
  return JSON.parse(raw)
}
