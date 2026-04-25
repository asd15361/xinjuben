import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const SOURCE_PATH = join(process.cwd(), 'src/renderer/src/components/CopyTextButton.tsx')

test('CopyTextButton does not allocate React state for every rendered copy action', () => {
  const source = readFileSync(SOURCE_PATH, 'utf8')

  assert.equal(source.includes('useState'), false)
  assert.equal(source.includes('setCopied'), false)
})
