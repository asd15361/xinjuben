# -*- coding: utf-8 -*-
import codecs
with codecs.open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'r', encoding='utf-8-sig') as f:
    testContent = f.read()
# Check line ending
lines_crlf = testContent.split('\r\n')
lines_lf = testContent.split('\n')
print('Number of lines (LF):', len(lines_lf))
print('Number of lines (CRLF):', len(lines_crlf))
if len(lines_lf) > 1316:
    print('Line 1317 (LF):', repr(lines_lf[1316]))
    print('Line 1318 (LF):', repr(lines_lf[1317]))
    print('Line 1319 (LF):', repr(lines_lf[1318]))
    idx = testContent.find("assert.ok(\n    prompt.includes('反例")
    print('Found at:', idx)
    if idx >= 0:
        print('Context:', repr(testContent[idx-10:idx+100]))
