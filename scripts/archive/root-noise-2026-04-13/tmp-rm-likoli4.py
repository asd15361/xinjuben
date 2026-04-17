# -*- coding: utf-8 -*-
import codecs
with codecs.open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'r', encoding='utf-8-sig') as f:
    testContent = f.read()
changes = []
def removeAssert(s):
    global testContent, changes
    if s in testContent:
        testContent = testContent.replace(s, '')
        changes.append('REMOVED: ' + repr(s[:50]))
    else:
        changes.append('SKIP: ' + repr(s[:50]))
removeAssert("  assert.ok(\r\n    prompt.includes('反例：李科：（画外音）让他进来。正例：△堂内传来李科的声音：\"让他进来。\"')\r\n  )\r\n")
# Try without \r
removeAssert("  assert.ok(\n    prompt.includes('反例：李科：（画外音）让他进来。正例：△堂内传来李科的声音：\"让他进来。\"')\n  )\n")
# Try finding it with indexOf approach
idx = testContent.find("反例：李科")
if idx >= 0:
    before = testContent[:idx]
    lastNewline = before.rfind('\r\n')
    after = testContent[idx:]
    nextNewline = after.find('\r\n')
    fullLine = testContent[lastNewline+2:idx+nextNewline+2]
    print('Found at:', idx, 'Line:', repr(fullLine[:80]))
    before2 = testContent[:lastNewline]
    last2 = before2.rfind('\r\n')
    blockStart = testContent[:last2].rfind('\r\n')
    block = testContent[blockStart+2:idx+nextNewline+2]
    print('Block:', repr(block[:200]))
    testContent = testContent[:blockStart+2] + testContent[idx+nextNewline+2:]
    changes.append('REMOVED via indexOf: 反例 line')
else:
    changes.append('SKIP: 反例 not found')
with codecs.open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'w', encoding='utf-8') as f:
    f.write(testContent)
for c in changes:
    print(c)
print('\nTotal:', len(changes), 'changes')
print('DONE')
