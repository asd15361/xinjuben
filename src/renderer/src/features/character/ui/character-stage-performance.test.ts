import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const SOURCE_PATH = join(
  process.cwd(),
  'src/renderer/src/features/character/ui/CharacterStage.tsx'
)

test('CharacterStage keeps card rendering off framer-motion layout animation', () => {
  const source = readFileSync(SOURCE_PATH, 'utf8')

  assert.equal(source.includes('framer-motion'), false)
  assert.equal(source.includes('<motion.'), false)
  assert.equal(source.includes('AnimatePresence'), false)
})
