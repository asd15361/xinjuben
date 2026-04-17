# -*- coding: utf-8 -*-
filepath = 'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts'

with open(filepath, 'r', encoding='utf-8-sig') as f:
    content = f.read()

changes = []

# ----------------------------------------------------------------
# 1. Negate 13 rules in test at line 893 (adds anti-bloat rules)
# These rules are NOT in the prompt, so the test should check !includes
# ----------------------------------------------------------------
positive_rules_to_negate = [
    '如果底稿偏权谋、智斗或"靠智慧周旋"',
    '不能直接执行"废修为、收钥匙、投入炼炉、当众宣判"这类终局动作',
    '当前 5 集批次若其他道观、使者、长老或新上位者出场，他们只能拿旧账加压',
    '前 1-6 集不要让人物把"谦卦""不争""大道""真镇守"直接讲出口',
    '第6集以后每集第一场优先从搜屋、门外堵截、押送路上、医庐换药、地窖取物、暗巷换手、山林追逃、潭边毁契这些私人动作开',
    '别把台词、动作或场尾写成"争证据、争站队、争时间、主导权、推进、升级、收束"这类策划词',
    '当前批次末集第一场必须从上一集留下的伤势、血契、碎钥匙、残党动作或未完追压起手',
    '不准从宗门合议、代表宣判、卷轴宣读、长老落锤或侧殿静室听处分开场',
    '当前批次末两集不准临时引入堂兄、师叔、新残党头子、新长老名号等新名字接管尾声',
    '当前 5 集批次如果必须碰"守空/不争/师父教诲"这类主题',
    '不准写"师父说……所以……""守空才能不争""空的，才是真的"这类问答式定义句',
    '不要写"象征意义、话语权、势力格局、内部分裂"这类抽象推进词',
    '"被带去问话"不算推进',
]

for rule in positive_rules_to_negate:
    old_ok = f"assert.ok(prompt.includes('{rule}'))"
    new_not_ok = f"assert.ok(!prompt.includes('{rule}'))"
    if old_ok in content:
        content = content.replace(old_ok, new_not_ok)
        changes.append(f"NEGATE: {rule[:40]}")
    else:
        changes.append(f"SKIP/ALREADY: {rule[:40]}")

# ----------------------------------------------------------------
# 2. Remove failing assertions in other tests
# ----------------------------------------------------------------

# Test "encodes scene quotas" - remove line 630: assert for '耳边回响' or '脑海中浮现'
# This tests that the prompt contains inner-monologue ban examples - NO LONGER NEEDED
# Remove the assert and its comment above it
old_mono = """  // Inner-monologue ban remains, but no legacy Emotion field wording
  assert.ok(prompt.includes('耳边回响') || prompt.includes('脑海中浮现'))
  assert.ok(prompt.includes('不准写进△动作、对白括号或任何总结句'))"""

new_mono = """  assert.ok(prompt.includes('不准写进△动作、对白括号或任何总结句'))"""

if old_mono in content:
    content = content.replace(old_mono, new_mono)
    changes.append("REMOVED: inner-monologue ban assertion")
else:
    changes.append("SKIP: inner-monologue removal (not found)")

# Test "prefers concrete sceneByScene" - remove line 847: '不可拍心理句'
old_unfilm = "  assert.ok(prompt.includes('不可拍心理句'))"
if old_unfilm in content:
    content = content.replace(old_unfilm, '')
    changes.append("REMOVED: 不可拍心理句 assertion")
else:
    changes.append("SKIP: 不可拍心理句 removal")

# Test "keeps dialogue voice block in compact mode" - remove '少年守钥人：少解释，先装后反咬'
old_voice = "  assert.ok(prompt.includes('少年守钥人：少解释，先装后反咬'))"
if old_voice in content:
    content = content.replace(old_voice, '')
    changes.append("REMOVED: 少年守钥人 dialogue voice assertion")
else:
    changes.append("SKIP: 少年守钥人 voice removal")

# Test "keeps screenplay-first emotion boundaries" - remove '分析人物'
old_analysis = "  assert.ok(prompt.includes('分析人物'))"
if old_analysis in content:
    content = content.replace(old_analysis, '')
    changes.append("REMOVED: 分析人物 assertion")
else:
    changes.append("SKIP: 分析人物 removal")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

for c in changes:
    print(c)
print(f"\nTotal changes: {len(changes)}")
print("DONE")
