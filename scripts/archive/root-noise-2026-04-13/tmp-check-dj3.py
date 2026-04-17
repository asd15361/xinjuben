with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts', 'r', encoding='utf-8-sig') as f:
    promptContent = f.read()

# Check the failing rule using Unicode
rule = "如果底稿偏权谋、智斗或\u201c靠智慧周旋\u201d"
inPrompt = rule in promptContent
print('Rule:', repr(rule))
print('In prompt:', inPrompt)

# Also search partial strings
for partial in ['偏权谋', '智斗或', '靠智慧']:
    print('Partial', repr(partial), ':', partial in promptContent)

# Also search the original text from the test output
rule2 = "如果底稿偏权谋、智斗或" + "靠智慧周旋"
print('Rule2:', repr(rule2))
print('In prompt2:', rule2 in promptContent)
