with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'r', encoding='utf-8-sig') as f:
    content = f.read()

# Check line 884
lines = content.split('\n')
print('Line 884:', lines[883])
print()

# Find all occurrences of the rule and show the full context
idx = content.find("如果底稿偏权谋")
while idx >= 0:
    # Show the full line containing this
    before = content[:idx]
    ln = before.rfind('\n')
    after = content[idx:]
    ln_end = after.find('\n')
    full_line = content[ln+1:idx+ln_end]
    print('Full line:', full_line[:200])
    print()
    idx = content.find("如果底稿偏权谋", idx + 1)
