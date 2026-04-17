# -*- coding: utf-8 -*-
filepath = 'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts'

with open(filepath, 'r', encoding='utf-8-sig') as f:
    content = f.read()

idx = content.find("test('createScriptGenerationPrompt hardens final-run")
if idx >= 0:
    print(f"Found at {idx}")
    chunk = content[idx:idx+600]
    print(repr(chunk))
else:
    print("Not found")
