import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const rendererRoot = join(process.cwd(), 'src', 'renderer', 'src')

function readRendererFile(relativePath: string): string {
  return readFileSync(join(rendererRoot, ...relativePath.split('/')), 'utf8')
}

test('main-owned generation tasks do not optimistically set local generationStatus in renderer', () => {
  const forbiddenFiles = [
    'features/chat/ui/useChatStageActions.ts',
    'app/hooks/useOutlineCharacterGeneration.ts',
    'features/detailed-outline/ui/useDetailedOutlineStageActions.ts',
    'features/seven-questions/ui/SevenQuestionsReviewPanel.tsx'
  ]

  for (const relativePath of forbiddenFiles) {
    const source = readRendererFile(relativePath)
    assert.equal(
      source.includes('setGenerationStatus('),
      false,
      `${relativePath} should rely on main broadcast instead of renderer-local generationStatus writes`
    )
  }
})

test('script start generation no longer writes local generationStatus before main broadcast', () => {
  const source = readRendererFile('features/script/ui/useScriptStageActions.ts')
  assert.equal(
    source.includes('const nextGenerationStatus ='),
    false,
    'useScriptStageActions should not build a renderer-local generationStatus for batch generation'
  )
})
