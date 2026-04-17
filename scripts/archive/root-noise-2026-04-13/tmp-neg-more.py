with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'r', encoding='utf-8-sig') as f:
    c = f.read()
changes = []

def neg(s):
    global c, changes
    if s in c:
        c = c.replace(s, s.replace("prompt.includes(", "!prompt.includes("))
        changes.append('NEG: ' + repr(s[20:60]))
    else:
        changes.append('SKIP: ' + repr(s[20:60]))

# Lines 896-898: pos -> neg
neg("  assert.ok(\n    prompt.includes('当前 5 集批次若其他道观、使者、长老或新上位者出场，他们只能拿旧账加压')\n  )")

# Line 900: currently neg - verify
# Line 900: neg is CORRECT (rule not in prompt)
# Lines 901-904: pos -> neg
neg("  assert.ok(\n    prompt.includes(\n      '第6集以后每集第一场优先从搜屋、门外堵截、押送路上、医庐换药、地窖取物、暗巷换手、山林追逃、潭边毁契这些私人动作开'\n    )\n  )")

# Lines 910-914: pos -> neg
neg("  assert.ok(\n    prompt.includes(\n      '别把台词、动作或场尾写成\"争证据、争站队、争时间、主导权、推进、升级、收束\"这类策划词'\n    )\n  )")

# Lines 921-922: pos -> neg
neg("  assert.ok(\n    prompt.includes('当前批次末两集不准临时引入堂兄、师叔、新残党头子、新长老名号等新名字接管尾声')\n  )")

# Line 924: neg is CORRECT (rule not in prompt)

# Line 925: pos -> neg (rule not in prompt)
neg("  assert.ok(prompt.includes('不准写\"师父说……所以……\"\"守空才能不争\"\"空的，才是真的\"这类问答式定义句'))")

# Line 929: pos -> neg
neg("  assert.ok(prompt.includes('不要写\"象征意义、话语权、势力格局、内部分裂\"这类抽象推进词'))")

# Line 930: pos -> neg
neg("  assert.ok(prompt.includes('\"被带去问话\"不算推进'))")

# Line 935-937: pos -> neg
neg("  assert.ok(\n    prompt.includes('当前批次末集的余波优先留在人际站位、职责变化、证据外流、伤势代价和旧账未清')\n  )")

open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'w', encoding='utf-8').write(c)
for x in changes:
    print(x)
print('\nTotal:', len(changes))
