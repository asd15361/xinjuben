with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'r', encoding='utf-8-sig') as f:
    testContent = f.read()

# The rule at line 884 has U+3000 (fullwidth space) between 谋 and 、:
# 如果底稿偏权谋<U+3000>、智斗或"靠智慧周旋"
# Fix: replace this specific pattern with the correct version
bad_rule = "如果底稿偏权谋\u3000、智斗或" + "\u201c靠智慧周旋\u201d"
good_rule = "如果底稿偏权谋、智斗或" + "\u201c靠智慧周旋\u201d"

print('Bad rule in test:', bad_rule in testContent)
print('Good rule in test:', good_rule in testContent)

if bad_rule in testContent:
    testContent = testContent.replace(bad_rule, good_rule)
    with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'w', encoding='utf-8') as f:
        f.write(testContent)
    print('FIXED')
else:
    print('Bad rule not found - checking raw bytes')
    idx = testContent.find("如果底稿偏权谋")
    if idx >= 0:
        for i in range(idx, idx + 20):
            print('  ', i, repr(testContent[i]), hex(ord(testContent[i])))
