import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareE2EOutDir } from '../utils/e2e-output.mjs'
import { readSeedProject, SEED_VERSION } from '../seeds/p0-real-regression-v1/index.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function buildSeedStore(project) {
  const next = clone(project)
  next.chatMessages = []
  next.generationStatus = null
  next.scriptProgressBoard = null
  next.scriptFailureResolution = null
  next.scriptRuntimeFailureHistory = []
  next.scriptStateLedger = null
  return {
    projects: {
      [next.id]: next
    }
  }
}

export async function hydrateP0RealRegressionSeed(options = {}) {
  const repoRoot = options.repoRoot || path.resolve(__dirname, '..', '..')
  const family = options.userDataPrefix || 'p0-real-regression'
  const project = await readSeedProject()
  const { outDir, userDataDir } = await prepareE2EOutDir(repoRoot, family, {
    keepLatestPerFamily: 12,
    keepLatestFiles: 20
  })
  const workspaceDir = path.join(userDataDir, 'workspace')
  const storePath = path.join(workspaceDir, 'projects.json')
  await fs.mkdir(workspaceDir, { recursive: true })
  await fs.writeFile(storePath, JSON.stringify(buildSeedStore(project), null, 2), 'utf8')
  return {
    seedVersion: SEED_VERSION,
    outDir,
    userDataDir,
    storePath,
    projectId: project.id,
    projectName: project.name,
    baselineScriptCount: Array.isArray(project.scriptDraft) ? project.scriptDraft.length : 0
  }
}

async function main() {
  const result = await hydrateP0RealRegressionSeed()
  console.log(JSON.stringify(result, null, 2))
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

