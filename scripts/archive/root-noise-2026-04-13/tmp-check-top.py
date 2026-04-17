# -*- coding: utf-8 -*-
with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()
print(f"Total lines: {len(lines)}")
# Show first 10 lines
for i, line in enumerate(lines[:10]):
    print(f"  {i+1}: {repr(line)}")
