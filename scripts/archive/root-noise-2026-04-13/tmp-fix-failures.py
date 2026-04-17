with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'r', encoding='utf-8-sig') as f:
    testContent = f.read()
changes = []
def fix(s):
    global testContent, changes
    if s in testContent:
        testContent = testContent.replace(s, s.replace("!prompt.includes(", "prompt.includes("))
        changes.append('FIXED: ' + repr(s[20:60]))
    else:
        changes.append('SKIP: ' + repr(s[20:60]))

# Fix the 4 incorrectly negated rules (they ARE in the prompt)
fix("assert.ok(!prompt.includes('不准从宗门合议、代表宣判、卷轴宣读、长老落锤或侧殿静室听处分开场'))")
fix("assert.ok(!prompt.includes('同一场只保留能改变局势的关键动作和关键对白'))")
fix("assert.ok(!prompt.includes('同类动作、同义威胁、同一情绪反应不准换句重复写'))")
fix("assert.ok(!prompt.includes('每场只保留 1-2 条关键△动作、1-2 轮有效对打'))")

open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'w', encoding='utf-8').write(testContent)
for c in changes:
    print(c)
print('\nTotal:', len(changes))
