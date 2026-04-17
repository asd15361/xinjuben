# -*- coding: utf-8 -*-
filepath = 'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts'

with open(filepath, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

# Find lines 630, 847, 895, 1325, 1400 (0-based: 629, 846, 894, 1324, 1399)
for idx in [629, 846, 894, 1324, 1399]:
    if idx < len(lines):
        print(f"Line {idx+1}: {repr(lines[idx])}")
    else:
        print(f"Line {idx+1}: OUT OF RANGE (total {len(lines)})")
