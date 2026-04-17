# -*- coding: utf-8 -*-
with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'r', encoding='utf-8-sig') as f:
    testContent = f.read()

# The rule has U+3000 (fullwidth space) at position 7
# Fix: replace U+3000 with normal space (U+0020) in the test file
if '\u3000' in testContent:
    testContent = testContent.replace('\u3000', ' ')
    with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'w', encoding='utf-8') as f:
        f.write(testContent)
    print('REPLACED U+3000 with space')
else:
    print('No U+3000 found')

# Verify the fix
lines = testContent.split('\n')
line884 = lines[883]
quoteStart = line884.indexOf("'")
quoteEnd = line884.indexOf("'", quoteStart + 1)
rule = line884[quoteStart + 1:quoteEnd]
print('New rule:', repr(rule[:50]))
print('Has U+3000:', '\u3000' in rule)
print('Char codes:', [ord(c) for c in rule[:10]])
