/**
 * src/main/application/workspace/resolve-entity-names.test.ts
 *
 * Stage 0.5 单元测试：实体定名与锚定。
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveEntityNames } from './resolve-entity-names.ts'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake.ts'

function makeStoryIntent(overrides: Partial<StoryIntentPackageDto> = {}): StoryIntentPackageDto {
  return {
    titleHint: '测试项目',
    genre: '修仙',
    tone: '肃杀',
    audience: '男频',
    sellingPremise: '最该藏钥匙的人被逼亮底',
    coreDislocation: '藏锋者被迫现身',
    emotionalPayoff: '先看他忍，再看他炸',
    protagonist: '少年守钥人',
    antagonist: '反派',
    coreConflict: '藏锋vs逼底',
    endingDirection: '主角登顶',
    officialKeyCharacters: ['少年守钥人', '反派', '女主'],
    lockedCharacterNames: ['少年守钥人', '反派', '女主'],
    themeAnchors: [],
    worldAnchors: [],
    relationAnchors: [],
    dramaticMovement: [],
    ...overrides
  }
}

describe('resolveEntityNames', () => {
  it('detects fuzzy labels and generates proper names', () => {
    const intent = makeStoryIntent()
    const result = resolveEntityNames(intent)

    assert.equal(result.needed, true, 'Should detect that names need resolving')
    assert.ok(result.resolved.length >= 2, 'Should resolve at least protagonist and antagonist')

    // protagonist 应该被替换为具体名字
    assert.ok(result.updatedIntent.protagonist, 'Protagonist should have a name')
    assert.ok(
      !/少年|守钥/.test(result.updatedIntent.protagonist!),
      'Protagonist should no longer be a fuzzy label'
    )

    // antagonist 应该被替换
    assert.ok(result.updatedIntent.antagonist, 'Antagonist should have a name')
    assert.ok(!/反派/.test(result.updatedIntent.antagonist!), 'Antagonist should no longer be 反派')
  })

  it('preserves existing proper names', () => {
    const intent = makeStoryIntent({
      protagonist: '黎明',
      antagonist: '李科',
      officialKeyCharacters: ['黎明', '李科', '小柔'],
      lockedCharacterNames: ['黎明', '李科', '小柔']
    })
    const result = resolveEntityNames(intent)

    assert.equal(result.updatedIntent.protagonist, '黎明', 'Should preserve existing name 黎明')
    assert.equal(result.updatedIntent.antagonist, '李科', 'Should preserve existing name 李科')
  })

  it('replaces fuzzy labels in officialKeyCharacters', () => {
    const intent = makeStoryIntent({
      officialKeyCharacters: ['女主', '霸总', '恶毒婆婆'],
      lockedCharacterNames: ['女主', '霸总', '恶毒婆婆']
    })
    const result = resolveEntityNames(intent)

    for (const char of result.updatedIntent.officialKeyCharacters!) {
      assert.ok(
        !/女主|霸总|恶毒婆婆/.test(char),
        `${char} should be a proper name, not a fuzzy label`
      )
    }
  })

  it('replaces fuzzy labels in generationBriefText', () => {
    const intent = makeStoryIntent({
      generationBriefText: '【主角】少年守钥人\n【对手】反派\n他拿女主威胁少年守钥人',
      protagonist: '少年守钥人',
      antagonist: '反派'
    })
    const result = resolveEntityNames(intent)

    assert.ok(
      !/少年守钥人/.test(result.updatedIntent.generationBriefText!),
      'BriefText should replace fuzzy labels'
    )
    assert.ok(
      !/反派/.test(result.updatedIntent.generationBriefText!),
      'BriefText should replace 反派'
    )
  })

  it('uses genre-appropriate names', () => {
    const xianxiaIntent = makeStoryIntent({
      genre: '修仙',
      protagonist: '男主',
      antagonist: '反派'
    })
    const modernIntent = makeStoryIntent({
      genre: '现代霸总',
      protagonist: '男主',
      antagonist: '反派'
    })

    const xianxiaResult = resolveEntityNames(xianxiaIntent)
    const modernResult = resolveEntityNames(modernIntent)

    // 修仙和现代题材生成的名字应该不同
    assert.ok(
      xianxiaResult.updatedIntent.protagonist !== modernResult.updatedIntent.protagonist,
      'Different genres should produce different name pools'
    )
  })

  it('returns needed=false when all names are proper', () => {
    const intent = makeStoryIntent({
      protagonist: '黎明',
      antagonist: '李科',
      officialKeyCharacters: ['黎明', '李科', '小柔'],
      lockedCharacterNames: ['黎明', '李科', '小柔']
    })
    const result = resolveEntityNames(intent)

    assert.equal(result.needed, false, 'Should not need naming when all names are proper')
    assert.equal(result.resolved.length, 0, 'Should have no resolutions')
  })

  it('deterministic: same input produces same output', () => {
    const intent = makeStoryIntent({ protagonist: '少年守钥人', antagonist: '反派' })

    const result1 = resolveEntityNames(intent)
    const result2 = resolveEntityNames(intent)

    assert.equal(
      result1.updatedIntent.protagonist,
      result2.updatedIntent.protagonist,
      'Same input should produce same name'
    )
    assert.equal(
      result1.updatedIntent.antagonist,
      result2.updatedIntent.antagonist,
      'Same input should produce same name'
    )
  })
})
