# -*- coding: utf-8 -*-
with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'r', encoding='utf-8-sig') as f:
    testContent = f.read()
# Check line 1316-1319
lines = testContent.split('\n')
for i in range(1314, 1320):
    if i < len(lines):
        print(i+1, ':', repr(lines[i]))
# Search for the 反例 assert
idx = testContent.find("assert.ok(\n    prompt.includes('反例")
print('Search for assert.ok(\\n    prompt.includes 反例:', idx)
# Try without the leading spaces
idx2 = testContent.find("prompt.includes('反例")
print('Search for prompt.includes(反例:', idx2)
if idx2 >= 0:
    # Show context
    print('Context:', repr(testContent[idx2-50:idx2+150]))
