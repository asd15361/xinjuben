import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildPreview, buildSceneSignature, buildSceneSummary } from '../ui/useScriptSceneIndex'

describe('buildPreview', () => {
  it('returns placeholder for empty screenplay', () => {
    const result = buildPreview('')
    assert.strictEqual(result, '这一集还没有可预览的剧本内容。')
  })

  it('returns placeholder for whitespace-only screenplay', () => {
    const result = buildPreview('   \n\t\n  ')
    assert.strictEqual(result, '这一集还没有可预览的剧本内容。')
  })

  it('returns episode title line if no other content', () => {
    const result = buildPreview('第1集')
    assert.strictEqual(result, '这一集还没有可预览的剧本内容。')
  })

  it('returns first useful line for single line screenplay', () => {
    const result = buildPreview('这是第一句对白')
    assert.strictEqual(result, '这是第一句对白')
  })

  it('skips episode title and returns first useful line', () => {
    const result = buildPreview('第1集\n这是第一句对白')
    assert.strictEqual(result, '这是第一句对白')
  })

  it('skips multiple episode title lines', () => {
    const result = buildPreview('第1集\n第2集\n实际对白内容')
    assert.strictEqual(result, '实际对白内容')
  })

  it('truncates lines longer than 80 characters', () => {
    // Build a string definitely > 80 chars
    const longLine = '这是第一句对白内容。' + '这是第二句对白内容。'.repeat(10)
    assert.ok(longLine.length > 80, `Test string should be > 80 chars, got ${longLine.length}`)
    const result = buildPreview(longLine)
    assert.ok(result.length <= 83, `Should be <= 80 + 3 = 83 chars, got ${result.length}`)
    assert.ok(result.endsWith('...'), `Should end with ..., got: ${result}`)
  })

  it('returns line under 80 chars as-is', () => {
    const shortLine = '短的对话内容'
    const result = buildPreview(shortLine)
    assert.strictEqual(result, shortLine)
  })
})

describe('buildSceneSignature', () => {
  it('produces stable signature for same input', () => {
    const scene = {
      sceneNo: 1,
      action: '动作描写',
      dialogue: '对白内容',
      emotion: '情绪',
      screenplay: '剧本正文',
      screenplayScenes: [],
      legacyFormat: false
    } as any

    const sig1 = buildSceneSignature(scene)
    const sig2 = buildSceneSignature(scene)

    assert.strictEqual(sig1, sig2, 'Signature should be stable')
  })

  it('produces different signature for different sceneNo', () => {
    const scene1 = {
      sceneNo: 1,
      action: '',
      dialogue: '',
      emotion: '',
      screenplay: '',
      screenplayScenes: [],
      legacyFormat: false
    } as any
    const scene2 = {
      sceneNo: 2,
      action: '',
      dialogue: '',
      emotion: '',
      screenplay: '',
      screenplayScenes: [],
      legacyFormat: false
    } as any

    const sig1 = buildSceneSignature(scene1)
    const sig2 = buildSceneSignature(scene2)

    assert.notStrictEqual(sig1, sig2, 'Different sceneNo should produce different signature')
  })

  it('produces different signature for different screenplay', () => {
    const scene1 = {
      sceneNo: 1,
      action: '',
      dialogue: '',
      emotion: '',
      screenplay: '剧本A',
      screenplayScenes: [],
      legacyFormat: false
    } as any
    const scene2 = {
      sceneNo: 1,
      action: '',
      dialogue: '',
      emotion: '',
      screenplay: '剧本B',
      screenplayScenes: [],
      legacyFormat: false
    } as any

    const sig1 = buildSceneSignature(scene1)
    const sig2 = buildSceneSignature(scene2)

    assert.notStrictEqual(sig1, sig2, 'Different screenplay should produce different signature')
  })

  it('produces different signature for legacy vs non-legacy', () => {
    const scene1 = {
      sceneNo: 1,
      action: '',
      dialogue: '',
      emotion: '',
      screenplay: '',
      screenplayScenes: [],
      legacyFormat: false
    } as any
    const scene2 = {
      sceneNo: 1,
      action: '',
      dialogue: '',
      emotion: '',
      screenplay: '',
      screenplayScenes: [],
      legacyFormat: true
    } as any

    const sig1 = buildSceneSignature(scene1)
    const sig2 = buildSceneSignature(scene2)

    assert.notStrictEqual(sig1, sig2, 'Different legacyFormat should produce different signature')
  })

  it('includes screenplayScenes length in signature', () => {
    const scene1 = {
      sceneNo: 1,
      action: '',
      dialogue: '',
      emotion: '',
      screenplay: '',
      screenplayScenes: [],
      legacyFormat: false
    } as any
    const scene2 = {
      sceneNo: 1,
      action: '',
      dialogue: '',
      emotion: '',
      screenplay: '',
      screenplayScenes: [{}],
      legacyFormat: false
    } as any

    const sig1 = buildSceneSignature(scene1)
    const sig2 = buildSceneSignature(scene2)

    assert.notStrictEqual(
      sig1,
      sig2,
      'Different screenplayScenes length should produce different signature'
    )
  })

  it('handles empty/optional fields gracefully', () => {
    const scene = { sceneNo: 1 } as any
    const sig = buildSceneSignature(scene)
    assert.ok(typeof sig === 'string', 'Should return a string')
    assert.ok(sig.includes('1'), 'Should include sceneNo')
  })
})

describe('buildSceneSummary', () => {
  it('produces object with expected shape', () => {
    const scene = {
      sceneNo: 1,
      action: '动作',
      dialogue: '对白',
      emotion: '情绪',
      screenplay: '剧本内容',
      screenplayScenes: [],
      legacyFormat: false
    } as any

    const summary = buildSceneSummary(scene)

    assert.strictEqual(typeof summary.signature, 'string', 'signature should be string')
    assert.strictEqual(summary.sceneNo, 1, 'sceneNo should match')
    assert.strictEqual(typeof summary.preview, 'string', 'preview should be string')
    assert.strictEqual(typeof summary.searchText, 'string', 'searchText should be string')
    assert.ok(Array.isArray(summary.missing), 'missing should be array')
    assert.strictEqual(typeof summary.legacyFormat, 'boolean', 'legacyFormat should be boolean')
    assert.strictEqual(
      typeof summary.structuredSceneGap,
      'boolean',
      'structuredSceneGap should be boolean'
    )
  })

  it('sets structuredSceneGap true when screenplay is empty', () => {
    const scene = {
      sceneNo: 1,
      action: '',
      dialogue: '',
      emotion: '',
      screenplay: '',
      screenplayScenes: [],
      legacyFormat: false
    } as any

    const summary = buildSceneSummary(scene)

    assert.strictEqual(summary.structuredSceneGap, true)
  })

  it('sets structuredSceneGap true when screenplayScenes is empty array', () => {
    const scene = {
      sceneNo: 1,
      action: '动作',
      dialogue: '',
      emotion: '',
      screenplay: 'some content',
      screenplayScenes: [],
      legacyFormat: false
    } as any

    const summary = buildSceneSummary(scene)

    assert.strictEqual(summary.structuredSceneGap, true)
  })

  it('sets structuredSceneGap false when screenplay has content and screenplayScenes exists', () => {
    const scene = {
      sceneNo: 1,
      action: '动作',
      dialogue: '',
      emotion: '',
      screenplay: 'some content',
      screenplayScenes: [{}],
      legacyFormat: false
    } as any

    const summary = buildSceneSummary(scene)

    assert.strictEqual(summary.structuredSceneGap, false)
  })

  it('preview contains screenplay content', () => {
    const screenplayContent = '这是预览的内容'
    const scene = {
      sceneNo: 1,
      action: '',
      dialogue: '',
      emotion: '',
      screenplay: screenplayContent,
      screenplayScenes: [],
      legacyFormat: false
    } as any

    const summary = buildSceneSummary(scene)

    assert.ok(
      summary.preview.includes(screenplayContent) || summary.preview.includes('...'),
      'preview should contain screenplay content or be truncated'
    )
  })

  it('searchText includes sceneNo and screenplay', () => {
    const scene = {
      sceneNo: 42,
      action: '',
      dialogue: '',
      emotion: '',
      screenplay: 'searchable content',
      screenplayScenes: [],
      legacyFormat: false
    } as any

    const summary = buildSceneSummary(scene)

    assert.ok(summary.searchText.includes('42'), 'searchText should include sceneNo')
    assert.ok(
      summary.searchText.includes('searchable content'),
      'searchText should include screenplay content'
    )
  })

  it('missing is empty when screenplay is empty but fallback is built', () => {
    // When screenplay is empty but action/dialogue/emotion are also empty,
    // buildScreenplayFromStructuredScene still builds fallback content
    // so missing won't contain '剧本正文'
    const scene = {
      sceneNo: 1,
      action: '',
      dialogue: '',
      emotion: '',
      screenplay: '',
      screenplayScenes: [],
      legacyFormat: false
    } as any

    const summary = buildSceneSummary(scene)

    assert.ok(
      !summary.missing.includes('剧本正文'),
      'missing should not include 剧本正文 when fallback is used'
    )
  })

  it('sets legacyFormat based on scene.legacyFormat', () => {
    const scene = {
      sceneNo: 1,
      action: '',
      dialogue: '',
      emotion: '',
      screenplay: '',
      screenplayScenes: [],
      legacyFormat: true
    } as any

    const summary = buildSceneSummary(scene)

    assert.strictEqual(summary.legacyFormat, true)
  })
})
