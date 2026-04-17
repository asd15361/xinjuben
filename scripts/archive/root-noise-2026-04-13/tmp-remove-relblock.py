# -*- coding: utf-8 -*-
import re
import sys

filepath = 'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts'

with open(filepath, 'r', encoding='utf-8-sig') as f:
    content = f.read()

# The exact relationship shift block to remove (lines 401-414)
old_block = '''  if (storyContract.requirements.requireRelationshipShift) {
    const heroine = storyContract.characterSlots.heroine || '情感对象'
    const relationshipShift = storyContract.eventSlots.relationshipShift || '当前关系锚点'
    lines.push('【故事合同落地】')
    lines.push(
      `- 本集必须让"${heroine}"亲自卷入当前冲突，不准只被提一句、喊一句、等着被救，或只当人质背景。`
    )
    lines.push(
      `- 本集必须让这条关系发生一次可见改位，直接承接"${relationshipShift}"：护在身前、顶嘴翻脸、换条件、递证、隐瞒、试探、反咬、站队变化至少一种成立。`
    )
    lines.push(
      '- 关系推进必须落成动作、对白和即时后果，不准只写"更在意了/心头一紧/关系更近了"这种感受句。'
    )
  }

  const hardFacts'''

# The replacement: just start with hardFacts, no lines.length === 0 check needed anymore
new_block = '''  const hardFacts'''

if old_block in content:
    content = content.replace(old_block, new_block)
    print("OK: Relationship shift block removed")
else:
    print("FAIL: Block not found, trying regex...")
    sys.exit(1)

# Now also remove the redundant `if (lines.length === 0)` check
old_check = '''  if (hardFacts.length > 0) {
    if (lines.length === 0) {
      lines.push('【故事合同落地】')
    }
    lines.push('- 本集至少兑现 1 条硬锚点'''

new_check = '''  if (hardFacts.length > 0) {
    lines.push('【故事合同落地】')
    lines.push('- 本集至少兑现 1 条硬锚点'''

if old_check in content:
    content = content.replace(old_check, new_check)
    print("OK: Redundant lines.length === 0 check removed")
else:
    print("SKIP: lines.length === 0 check already gone or not found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("DONE")
