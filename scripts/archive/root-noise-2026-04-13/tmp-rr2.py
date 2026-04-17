with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'r', encoding='utf-8-sig') as f:
    c = f.read()
# Check for \r\n vs \n
idx_lf = c.find("prompt.includes('\u53cd\u4f8b\uff1a\u674e\u79d1")
print('idx_lf:', idx_lf)
# Check for \r\n ending
idx_crlf = c.find("prompt.includes('\u53cd\u4f8b\uff1a\u674e\u79d1".replace('\n', '\r\n'))
print('idx_crlf:', idx_crlf)
if idx_lf >= 0:
    before = c[:idx_lf]
    ln = before.rfind('\n')
    ln2 = before[:ln].rfind('\n')
    start = ln2
    after = c[idx_lf:]
    e = after.find('\n  )\n')
    print('e:', e)
    end = idx_lf + e + 4
    block = c[start+1:end]
    print('Block:', repr(block[:200]))
    nc = c[:start+1] + c[end:]
    open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'w', encoding='utf-8').write(nc)
    print('REMOVED')
else:
    print('NOT FOUND')
