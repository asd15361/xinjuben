path = 'src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix: lines are 0-indexed, found at line 1396 which is index 1395
# The test body spans from line 1396 to 1406 (indexes 1395-1405)
# We want to replace indexes 1395-1404 (lines 1396-1405) with new assertions
# Keep the closing "})" at line 1406 (index 1405)
new_body = [
    "  assert.ok(prompt.includes('不要另起一行写情绪总结'))\n",
    "  // '如某场字数已达上限但冲突未收口，立即转入下场' removed from non-compact\n",
    "  assert.ok(!prompt.includes('如某场字数已达上限但冲突未收口'))\n",
    "  assert.ok(!prompt.includes('立即转入下场'))\n",
    "  assert.ok(!prompt.includes('Emotion 字段必须只写本场此刻的情绪状态'))\n",
    "  assert.ok(!prompt.includes('Emotion 段末句必须是具体可见动作词'))\n",
    "})\n",
]

# Replace lines 1396-1406 (indexes 1395-1405) — includes 11 lines of old content with 7 lines of new content
lines[1395:1406] = new_body

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('DONE')
# Verify
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
idx = content.find("不要另起一行写情绪总结")
print(repr(content[idx:idx+400]))
