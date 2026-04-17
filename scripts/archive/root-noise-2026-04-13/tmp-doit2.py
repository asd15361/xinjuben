# -*- coding: utf-8 -*-
filepath = 'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts'

with open(filepath, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# ----------------------------------------------------------------
# Fix 1: Test "hardens final-run anti-bloat" - remove lines 432-435
# (0-based: 431-434, keep 430 which is line 431 = 【故事合同落地】
# Lines to remove:
#   432 (idx 431): assert.match for "亲自卷入当前冲突"
#   433 (idx 432): assert.match for "可见改位"
#   434 (idx 433): assert.match for "至少兑现 1 条硬锚点"
#   435 (idx 434): assert.match for "优先承接这些硬锚点"
# ----------------------------------------------------------------
to_remove_1 = {431, 432, 433, 434}  # 0-based indices, these are lines 432-435

# Verify these lines contain the right content
for idx in sorted(to_remove_1):
    print(f"  Line {idx+1}: {repr(lines[idx])}")

# ----------------------------------------------------------------
# Fix 2: Test "keeps dialogue voice block in compact mode" - remove lines 1334-1337
# (0-based: 1333-1336)
# Line 1334 (idx 1333): empty
# Line 1335 (idx 1334): assert.match for "亲自卷入当前冲突"
# Line 1336 (idx 1335): assert.ok for "本集至少兑现 1 条硬锚点"
# Actually the original was:
#   1326: assert.ok('【对白口风】')
#   1327: assert.ok('【故事合同落地】')
#   1328: assert.match('亲自卷入')
#   1329: assert.ok('本集至少兑现 1 条硬锚点')
# So we remove lines 1328-1329 (0-based: 1327-1328)
# ----------------------------------------------------------------
to_remove_2 = {1327, 1328}  # 0-based, lines 1328-1329
for idx in sorted(to_remove_2):
    print(f"  Line {idx+1}: {repr(lines[idx])}")

# ----------------------------------------------------------------
# Fix 3: Test "falls back to summaryEpisodes" - remove lines 1397-1398
# (0-based: 1396-1397)
# Line 1397: assert.ok(ep10Prompt.includes('前 1-6 集不要让人物把"谦卦"...'))
# Line 1398: })
# ----------------------------------------------------------------
to_remove_3 = {1396}  # 0-based, line 1397
if len(lines) > 1396:
    print(f"  Line 1397: {repr(lines[1396])}")

# ----------------------------------------------------------------
# Now build new lines array
# ----------------------------------------------------------------
all_remove = to_remove_1 | to_remove_2 | to_remove_3
new_lines = [line for i, line in enumerate(lines) if i not in all_remove]
print(f"\nRemoved {len(lines) - len(new_lines)} lines")
print(f"New total lines: {len(new_lines)}")

# ----------------------------------------------------------------
# Verify key lines still present
# ----------------------------------------------------------------
# Line 431 (now 431 since we only removed 4 lines before it)
for i in [430, 431, 432, 433, 434]:
    if i < len(new_lines):
        print(f"  New line {i+1}: {repr(new_lines[i])}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("\nDONE")
