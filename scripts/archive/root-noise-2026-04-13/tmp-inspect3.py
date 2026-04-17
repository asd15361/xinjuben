# -*- coding: utf-8 -*-
filepath = 'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts'

with open(filepath, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Check test at line 427 (hardens final-run)
test1_start = None
for i, line in enumerate(lines):
    if "hardens final-run anti-bloat" in line:
        test1_start = i
        break
if test1_start is not None:
    print(f"\nTest 1 (hardens final-run) starts at line {test1_start+1}")
    for i in range(429, 442):
        if i < len(lines):
            print(f"  {i+1}: {repr(lines[i])}")

# Check test at line 640 (prefers concrete sceneByScene)
test2_start = None
for i, line in enumerate(lines):
    if "prefers concrete sceneByScene" in line:
        test2_start = i
        break
if test2_start is not None:
    print(f"\nTest 2 (prefers concrete sceneByScene) starts at line {test2_start+1}")
    for i in range(test2_start, test2_start+15):
        if i < len(lines):
            print(f"  {i+1}: {repr(lines[i][:100])}")

# Check test at line 1309 (keeps dialogue voice block in compact mode)
test3_start = None
for i, line in enumerate(lines):
    if "keeps dialogue voice block in compact mode" in line:
        test3_start = i
        break
if test3_start is not None:
    print(f"\nTest 3 (compact dialogue) starts at line {test3_start+1}")
    for i in range(test3_start, test3_start+15):
        if i < len(lines):
            print(f"  {i+1}: {repr(lines[i][:100])}")

# Check test at line 1336 (falls back to summaryEpisodes)
test4_start = None
for i, line in enumerate(lines):
    if "falls back to summaryEpisodes" in line:
        test4_start = i
        break
if test4_start is not None:
    print(f"\nTest 4 (falls back to summary) starts at line {test4_start+1}")
    for i in range(test4_start, test4_start+15):
        if i < len(lines):
            print(f"  {i+1}: {repr(lines[i][:100])}")

# Check test at line 893 (adds anti-bloat rules)
test5_start = None
for i, line in enumerate(lines):
    if "adds anti-bloat rules" in line:
        test5_start = i
        break
if test5_start is not None:
    print(f"\nTest 5 (adds anti-bloat rules) starts at line {test5_start+1}")
    for i in range(test5_start, test5_start+10):
        if i < len(lines):
            print(f"  {i+1}: {repr(lines[i][:100])}")
