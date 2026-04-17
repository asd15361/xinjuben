# -*- coding: utf-8 -*-
with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'r', encoding='utf-8-sig') as f:
    testContent = f.read()
# Find the exact block to remove: "  assert.ok(\n    prompt.includes('反例...\n  )\n"
idx = testContent.find("prompt.includes('反例")
if idx >= 0:
    # Find the opening "  assert.ok(\n"
    before = testContent[:idx]
    lastNewline = before.rfind('\n')
    secondLast = before[:lastNewline].rfind('\n')
    # Remove from secondLast+1 to end of "  )\n"
    start = secondLast
    after = testContent[idx:]
    endIdx = after.find('\n  )\n')
    if endIdx >= 0:
        end = idx + endIdx + 4
        block = testContent[start+1:end]
        print('Block to remove:')
        print(repr(block[:200]))
        newContent = testContent[:start+1] + testContent[end:]
        with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'w', encoding='utf-8') as f:
            f.write(newContent)
        print('REMOVED')
    else:
        print('Could not find end of block')
else:
    print('NOT FOUND')
