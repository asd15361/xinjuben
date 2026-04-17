# -*- coding: utf-8 -*-
with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Check the anti-bloat test area
for i in range(891, 970):
    if i < len(lines):
        print(f"  {i+1}: {repr(lines[i])}")
