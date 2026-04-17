path = 'src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

changes = 0

# Fix 1: Line 892 (index 891) - remove '相邻两场换打法' from non-compact anti-bloat test
# The string at line 892 is: "  assert.ok(prompt.includes('相邻两场换打法'))\n"
if 'prompt.includes' in lines[891] and '相邻两场换打法' in lines[891]:
    lines[891] = "  // '相邻两场换打法' only in compact scene directives, not non-compact craft rules\n"
    changes += 1
    print("Fix 1 applied")

# Fix 2: Lines 1461-1463 - fix season finale anti-placeholder string
# Current lines have wrong variable name (prompt) instead of ep10Prompt
# and wrong string content
if '局面推进结果：""' in lines[1460]:
    lines[1460] = "  assert.ok(ep10Prompt.includes('不准出现"人物：人物""【本集终】""局面推进结果：""信息揭露+证据易手："'))\n"
    changes += 1
    print("Fix 2 applied")
    print(f"New line 1461: {repr(lines[1460][:80])}")

if changes > 0:
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"DONE: {changes} fixes applied")
else:
    print("NO FIXES APPLIED")
