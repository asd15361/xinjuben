with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'r', encoding='utf-8-sig') as f:
    c = f.read()
idx = c.find('如果底稿偏权谋')
print('idx:', idx)
if idx >= 0:
    print('Context:', repr(c[idx-100:idx+100]))
