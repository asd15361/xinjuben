# -*- coding: utf-8 -*-
filepath = 'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts'

with open(filepath, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Check line 625-635
print("\nLines 625-635:")
for i in range(624, 636):
    if i < len(lines):
        print(f"  {i+1}: {repr(lines[i])}")

# Check line 847
print("\nLine 847:")
if 846 < len(lines):
    print(f"  {847}: {repr(lines[846])}")

# Check line 893-910
print("\nLines 893-910:")
for i in range(892, 910):
    if i < len(lines):
        print(f"  {i+1}: {repr(lines[i])}")
