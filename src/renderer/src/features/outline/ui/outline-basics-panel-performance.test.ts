import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const SOURCE_PATH = join(
  process.cwd(),
  'src/renderer/src/features/outline/ui/OutlineBasicsPanel.tsx'
)

test('OutlineBasicsPanel memoizes episode cards so typing one episode does not rerender every card', () => {
  const source = readFileSync(SOURCE_PATH, 'utf8')

  assert.match(source, /memo\(function OutlineEpisodeCard/)
  assert.match(source, /useLayoutEffect/)
  assert.match(source, /useRef/)
})
