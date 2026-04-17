import codecs

path = 'src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts'
with codecs.open(path, 'r', 'utf-8') as f:
    content = f.read()

old = """  assert.ok(prompt.includes('不要另起一行写情绪总结'))




  assert.ok(prompt.includes('如某场字数已达上限但冲突未收口'))
  assert.ok(prompt.includes('立即转入下场'))
  assert.ok(!prompt.includes('Emotion 字段必须只写本场此刻的情绪状态'))
  assert.ok(!prompt.includes('Emotion 段末句必须是具体可见动作词'))
})
test('createScriptGenerationPrompt adds season finale anti-placeholder contract for the final episode', () => {
  const input = createPromptInputForTuning()"""

new = """  assert.ok(prompt.includes('不要另起一行写情绪总结'))
  // '如某场字数已达上限但冲突未收口，立即转入下场' removed from non-compact
  assert.ok(!prompt.includes('如某场字数已达上限但冲突未收口'))
  assert.ok(!prompt.includes('立即转入下场'))
  assert.ok(!prompt.includes('Emotion 字段必须只写本场此刻的情绪状态'))
  assert.ok(!prompt.includes('Emotion 段末句必须是具体可见动作词'))
})
test('createScriptGenerationPrompt adds season finale anti-placeholder contract for the final episode', () => {
  const input = createPromptInputForTuning()"""

if old in content:
    print('FOUND')
    content = content.replace(old, new, 1)
    with codecs.open(path, 'w', 'utf-8') as f:
        f.write(content)
    print('DONE')
else:
    print('NOT FOUND')
    idx = content.find("assert.ok(prompt.includes('不要另起一行写情绪总结'))")
    print(f'Position: {idx}')
    print(repr(content[idx:idx+600]))
