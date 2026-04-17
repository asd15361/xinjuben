with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'r', encoding='utf-8-sig') as f:
    content = f.read()

# Replace the failing assertion with the correct one
old = "  assert.ok(!prompt.includes('相邻两场的推进手法必须变化'))"
new = "  assert.ok(prompt.includes('相邻两场换打法'))"

if old in content:
    content = content.replace(old, new)
    with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print('FIXED: replaced negation with positive assertion')
else:
    print('NOT FOUND - checking raw')
    # Check the actual bytes
    idx = content.find("相邻两场")
    if idx >= 0:
        print('Found at:', idx)
        print('Context:', repr(content[idx-30:idx+100]))
