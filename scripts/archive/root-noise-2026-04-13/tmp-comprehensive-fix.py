# -*- coding: utf-8 -*-
filepath = 'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts'

with open(filepath, 'r', encoding='utf-8-sig') as f:
    content = f.read()

changes = []

# ----------------------------------------------------------------
# Fix 1: Line 630 - inner monologue ban
# Remove the whole block including comment
# ----------------------------------------------------------------
old1 = """  // Inner-monologue ban remains, but no legacy Emotion field wording
  assert.ok(prompt.includes('耳边回响') || prompt.includes('脑海中浮现'))
  assert.ok(prompt.includes('不准写进△动作、对白括号或任何总结句'))"""

new1 = """  assert.ok(prompt.includes('不准写进△动作、对白括号或任何总结句'))"""

if old1 in content:
    content = content.replace(old1, new1)
    changes.append("Fix1: removed inner monologue assertion")
else:
    changes.append("Fix1 SKIP")

# ----------------------------------------------------------------
# Fix 2: Line 893 - 如果底稿偏权谋 (positive -> negate)
# ----------------------------------------------------------------
old2 = "assert.ok(prompt.includes('如果底稿偏权谋、智斗或"靠智慧周旋"'))"
new2 = "assert.ok(!prompt.includes('如果底稿偏权谋、智斗或"靠智慧周旋"'))"
if old2 in content:
    content = content.replace(old2, new2)
    changes.append("Fix2: negated 如果底稿偏权谋")
else:
    changes.append("Fix2 SKIP")

# ----------------------------------------------------------------
# Fix 3: Lines 905-907 - multi-line assert with 只能拿旧账加压
# ----------------------------------------------------------------
old3 = """  assert.ok(
    prompt.includes('当前 5 集批次若其他道观、使者、长老或新上位者出场，他们只能拿旧账加压')
  )"""
new3 = """  assert.ok(
    !prompt.includes('当前 5 集批次若其他道观、使者、长老或新上位者出场，他们只能拿旧账加压')
  )"""
if old3 in content:
    content = content.replace(old3, new3)
    changes.append("Fix3: negated 只能拿旧账加压")
else:
    changes.append("Fix3 SKIP")

# ----------------------------------------------------------------
# Fix 4: Line 909 - 前 1-6 集不要 (positive -> negate)
# ----------------------------------------------------------------
old4 = "assert.ok(prompt.includes('前 1-6 集不要让人物把"谦卦""不争""大道""真镇守"直接讲出口'))"
new4 = "assert.ok(!prompt.includes('前 1-6 集不要让人物把"谦卦""不争""大道""真镇守"直接讲出口'))"
if old4 in content:
    content = content.replace(old4, new4)
    changes.append("Fix4: negated 前 1-6 集不要")
else:
    changes.append("Fix4 SKIP")

# ----------------------------------------------------------------
# Fix 5: Lines 910-915 - multi-line assert with 第6集以后
# ----------------------------------------------------------------
old5 = """  assert.ok(
    prompt.includes(
      '第6集以后每集第一场优先从搜屋、门外堵截、押送路上、医庐换药、地窖取物、暗巷换手、山林追逃、潭边毁契这些私人动作开'
    )
  )"""
new5 = """  assert.ok(
    !prompt.includes(
      '第6集以后每集第一场优先从搜屋、门外堵截、押送路上、医庐换药、地窖取物、暗巷换手、山林追逃、潭边毁契这些私人动作开'
    )
  )"""
if old5 in content:
    content = content.replace(old5, new5)
    changes.append("Fix5: negated 第6集以后搜屋")
else:
    changes.append("Fix5 SKIP")

# ----------------------------------------------------------------
# Fix 6: Line 899 - 不能直接执行 (positive -> negate)
# ----------------------------------------------------------------
old6 = "assert.ok(prompt.includes('不能直接执行"废修为、收钥匙、投入炼炉、当众宣判"这类终局动作'))"
new6 = "assert.ok(!prompt.includes('不能直接执行"废修为、收钥匙、投入炼炉、当众宣判"这类终局动作'))"
if old6 in content:
    content = content.replace(old6, new6)
    changes.append("Fix6: negated 不能直接执行")
else:
    changes.append("Fix6 SKIP")

# ----------------------------------------------------------------
# Fix 7: Lines 917-925 area - 不准从宗门合议 (positive -> negate)
# ----------------------------------------------------------------
old7 = "assert.ok(prompt.includes('不准从宗门合议、代表宣判、卷轴宣读、长老落锤或侧殿静室听处分开场'))"
new7 = "assert.ok(!prompt.includes('不准从宗门合议、代表宣判、卷轴宣读、长老落锤或侧殿静室听处分开场'))"
if old7 in content:
    content = content.replace(old7, new7)
    changes.append("Fix7: negated 不准从宗门合议")
else:
    changes.append("Fix7 SKIP")

# ----------------------------------------------------------------
# Fix 8: Lines around 920 area - 别把台词 (positive -> negate)
# ----------------------------------------------------------------
old8 = "assert.ok(prompt.includes('别把台词、动作或场尾写成"争证据、争站队、争时间、主导权、推进、升级、收束"这类策划词'))"
new8 = "assert.ok(!prompt.includes('别把台词、动作或场尾写成"争证据、争站队、争时间、主导权、推进、升级、收束"这类策划词'))"
if old8 in content:
    content = content.replace(old8, new8)
    changes.append("Fix8: negated 别把台词策划词")
else:
    changes.append("Fix8 SKIP")

# ----------------------------------------------------------------
# Fix 9: 当前批次末集第一场必须 (positive -> negate)
# ----------------------------------------------------------------
old9 = "assert.ok(prompt.includes('当前批次末集第一场必须从上一集留下的伤势、血契、碎钥匙、残党动作或未完追压起手'))"
new9 = "assert.ok(!prompt.includes('当前批次末集第一场必须从上一集留下的伤势、血契、碎钥匙、残党动作或未完追压起手'))"
if old9 in content:
    content = content.replace(old9, new9)
    changes.append("Fix9: negated 末集第一场必须")
else:
    changes.append("Fix9 SKIP")

# ----------------------------------------------------------------
# Fix 10: Lines around 929 area - 当前批次末两集不准临时引入 (positive -> negate)
# ----------------------------------------------------------------
old10 = """  assert.ok(
    prompt.includes('当前批次末两集不准临时引入堂兄、师叔、新残党头子、新长老名号等新名字接管尾声')
  )"""
new10 = """  assert.ok(
    !prompt.includes('当前批次末两集不准临时引入堂兄、师叔、新残党头子、新长老名号等新名字接管尾声')
  )"""
if old10 in content:
    content = content.replace(old10, new10)
    changes.append("Fix10: negated 末两集不准临时引入")
else:
    changes.append("Fix10 SKIP")

# ----------------------------------------------------------------
# Fix 11: 当前 5 集批次如果必须碰 (positive -> negate)
# ----------------------------------------------------------------
old11 = "assert.ok(prompt.includes('当前 5 集批次如果必须碰"守空/不争/师父教诲"这类主题'))"
new11 = "assert.ok(!prompt.includes('当前 5 集批次如果必须碰"守空/不争/师父教诲"这类主题'))"
if old11 in content:
    content = content.replace(old11, new11)
    changes.append("Fix11: negated 必须碰守空主题")
else:
    changes.append("Fix11 SKIP")

# ----------------------------------------------------------------
# Fix 12: 不准写"师父说…… (positive -> negate)
# ----------------------------------------------------------------
old12 = "assert.ok(prompt.includes('不准写"师父说……所以……""守空才能不争""空的，才是真的"这类问答式定义句'))"
new12 = "assert.ok(!prompt.includes('不准写"师父说……所以……""守空才能不争""空的，才是真的"这类问答式定义句'))"
if old12 in content:
    content = content.replace(old12, new12)
    changes.append("Fix12: negated 师父说问答式定义句")
else:
    changes.append("Fix12 SKIP")

# ----------------------------------------------------------------
# Fix 13: 不要写"象征意义 (positive -> negate)
# ----------------------------------------------------------------
old13 = "assert.ok(prompt.includes('不要写"象征意义、话语权、势力格局、内部分裂"这类抽象推进词'))"
new13 = "assert.ok(!prompt.includes('不要写"象征意义、话语权、势力格局、内部分裂"这类抽象推进词'))"
if old13 in content:
    content = content.replace(old13, new13)
    changes.append("Fix13: negated 象征意义抽象推进词")
else:
    changes.append("Fix13 SKIP")

# ----------------------------------------------------------------
# Fix 14: "被带去问话"不算推进 (positive -> negate)
# ----------------------------------------------------------------
old14 = 'assert.ok(prompt.includes(\'"被带去问话"不算推进\'))'
new14 = 'assert.ok(!prompt.includes(\'"被带去问话"不算推进\'))'
if old14 in content:
    content = content.replace(old14, new14)
    changes.append("Fix14: negated 被带去问话")
else:
    changes.append("Fix14 SKIP")

# ----------------------------------------------------------------
# Fix 15: Remove 不可拍心理句 assertion
# ----------------------------------------------------------------
old15 = "  assert.ok(prompt.includes('不可拍心理句'))"
if old15 in content:
    content = content.replace(old15, '')
    changes.append("Fix15: removed 不可拍心理句")
else:
    changes.append("Fix15 SKIP")

# ----------------------------------------------------------------
# Fix 16: Remove 少年守钥人 dialogue voice
# ----------------------------------------------------------------
old16 = "  assert.ok(prompt.includes('少年守钥人：少解释，先装后反咬'))"
if old16 in content:
    content = content.replace(old16, '')
    changes.append("Fix16: removed 少年守钥人 dialogue")
else:
    changes.append("Fix16 SKIP")

# ----------------------------------------------------------------
# Fix 17: Remove 人物情绪： and 分析人物 and 预告下一场 and 打比喻 and 总结关系
# from the emotion boundaries test
# ----------------------------------------------------------------
for rule in ['人物情绪：', '分析人物', '预告下一场', '打比喻写情绪', '总结关系']:
    old17 = f"  assert.ok(prompt.includes('{rule}'))"
    if old17 in content:
        content = content.replace(old17, '')
        changes.append(f"Fix17: removed {rule}")
    else:
        changes.append(f"Fix17 SKIP: {rule}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

for c in changes:
    print(c)
print(f"\nTotal: {len(changes)} changes")
print("DONE")
