import test from 'node:test'
import assert from 'node:assert/strict'
import { renderChineseCharacterNamingGuidelines } from './character-naming-guidelines.ts'

test('Chinese character naming guidelines require real surnames and delegated naming', () => {
  const text = renderChineseCharacterNamingGuidelines()

  assert.match(text, /用户不会取名/)
  assert.match(text, /真实中文姓氏/)
  assert.match(text, /赵、钱、孙、李/)
  assert.match(text, /不要把乾、坤、临/)
  assert.match(text, /同一批角色不能重名/)
})
