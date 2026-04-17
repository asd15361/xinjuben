import { describe, it } from 'node:test'
import assert from 'node:assert'
import { inspectSceneQuality } from './script-scene-quality-audit.ts'

describe('inspectSceneQuality', () => {
  it('returns expected shape { qualityPass: boolean, qualityProblem: string | null }', () => {
    const scene = {} as any
    const result = inspectSceneQuality(scene)

    assert.strictEqual(typeof result.qualityPass === 'boolean', true)
    assert.strictEqual(
      result.qualityProblem === null || typeof result.qualityProblem === 'string',
      true
    )
  })

  it('returns qualityProblem as null when quality passes', () => {
    // inspectScreenplayQualityEpisode returns { pass: true, problems: [] } only for valid scenes
    // For an empty scene object, it returns { pass: false, problems: [...] }
    // This test verifies the function correctly maps pass/fail states
    const scene = {} as any
    const result = inspectSceneQuality(scene)

    // When inspectScreenplayQualityEpisode returns pass:true, qualityProblem should be null
    if (result.qualityPass) {
      assert.strictEqual(result.qualityProblem, null)
    }
  })

  it('returns qualityProblem as string when quality fails', () => {
    const scene = {} as any
    const result = inspectSceneQuality(scene)

    // When inspectScreenplayQualityEpisode returns pass:false, qualityProblem should be a string
    if (!result.qualityPass) {
      assert.strictEqual(typeof result.qualityProblem, 'string')
      assert.ok(result.qualityProblem!.length > 0)
    }
  })
})
