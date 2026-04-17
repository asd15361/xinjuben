with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'r', encoding='utf-8-sig') as f:
    testContent = f.read()

# The rule is NOT in the prompt, so the negation assert will always pass
# But the test is FAILING on this assertion - meaning the assertion itself is failing
# Wait, if the rule is NOT in the prompt, then !prompt.includes() should return TRUE
# So why is it failing? Unless the negation was applied incorrectly...

# Let me check what actually happened
idx = testContent.find('如果底稿偏权谋')
if idx >= 0:
    print('Found at:', idx)
    print('Context:', repr(testContent[idx-50:idx+200]))
else:
    print('NOT FOUND in test file at all')

# Check if the line was already removed or changed
idx2 = testContent.find('assert.ok(!prompt.includes')
print('\nAll !includes assertions in test:')
start = 0
while True:
    idx = testContent.find('assert.ok(!prompt.includes', start)
    if idx < 0:
        break
    end = testContent.find('\n', idx)
    print(repr(testContent[idx:end+1]))
    start = idx + 1
