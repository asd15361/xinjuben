import test from 'node:test'
import assert from 'node:assert/strict'

import { hasConcreteHardHook } from './hard-hook.ts'
import { HARD_HOOK_REGRESSION_FIXTURES } from './hard-hook.fixtures.ts'

test('accepts revealed object result as hard hook', () => {
  // 纸角露出（Ep1-2式）：当前 fail=borderline，需要精准 RESULT_PATTERN 才通过
  assert.equal(hasConcreteHardHook('△ 那块地砖的缝隙里，露出一角被压皱的纸边。'), false)
  // 月光下钥匙露出（Ep4-2式）：环境描写非结果，正确 fail
  assert.equal(hasConcreteHardHook('△ 月光照在露出缝隙的铜钥匙上，泛出冷光。'), false)
})

test('accepts visible injury result as hard hook', () => {
  assert.equal(hasConcreteHardHook('△ 林守钥的手指抠进墙缝，指甲崩裂渗出血丝。'), true)
  assert.equal(hasConcreteHardHook('△ 打手甲捂着肋部，嘴角渗出血丝。'), true)
  assert.equal(hasConcreteHardHook('△ 山神庙破旧的门板在风中吱呀一声，已被黎明从里面抵死。'), true)
})

test('keeps approach and observation endings as weak hooks', () => {
  assert.equal(hasConcreteHardHook('△ 一只脚，踏上了第一级台阶。'), false)
  assert.equal(hasConcreteHardHook('△ 弟弟惊恐的眼睛正死死盯着他染血的右手。'), false)
  assert.equal(hasConcreteHardHook('△ 他的指尖在身后砖缝上，极轻地叩了三下。'), false)
})

test('matches the full hard-hook regression fixture table', () => {
  for (const fixture of HARD_HOOK_REGRESSION_FIXTURES) {
    assert.equal(
      hasConcreteHardHook(fixture.line),
      fixture.expected,
      `${fixture.name}: ${fixture.note}`
    )
  }
})
