# -*- coding: utf-8 -*-
import codecs
with codecs.open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'r', encoding='utf-8-sig') as f:
    testContent = f.read()
lines = testContent.split('\n')
print('Number of lines:', len(lines))
if len(lines) > 1316:
    print('Line 1317:', repr(lines[1316]))
    print('Line 1318:', repr(lines[1317]))
    print('Line 1319:', repr(lines[1318]))
    idx = testContent.find("assert.ok(\n    prompt.includes('反例")
    print('Found at:', idx)
    if idx >= 0:
        print('Context:', repr(testContent[idx-10:idx+100]))
