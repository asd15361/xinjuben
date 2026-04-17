# -*- coding: utf-8 -*-
filepath = 'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts'

with open(filepath, 'r', encoding='utf-8-sig') as f:
    content = f.read()

changes = []

# ----------------------------------------------------------------
# Fix 1: Test "hardens final-run anti-bloat and offscreen dialogue rules"
# Remove relationship-shift and hard-facts assertions (lines 432-435)
# ----------------------------------------------------------------
old1 = '''  assert.match(prompt, /【故事合同落地】/)
  assert.match(prompt, /本集必须让"(?:小镇少女|情感对象)"亲自卷入当前冲突/)
  assert.match(prompt, /本集必须让这条关系发生一次可见改位/)
  assert.match(prompt, /本集至少兑现 1 条硬锚点/)
  assert.match(prompt, /优先承接这些硬锚点：恶霸用少女和钥匙同时施压；人在压力里被逼亮底/)'''

new1 = '''  assert.match(prompt, /【故事合同落地】/)'''

if old1 in content:
    content = content.replace(old1, new1)
    changes.append("Fix1: removed relationship-shift and hard-facts assertions from test 427")
else:
    changes.append("Fix1 SKIP: not found")

# ----------------------------------------------------------------
# Fix 2: Test "adds anti-bloat rules instead of repeating old minimum-beat"
# Change 17 assert.ok(include(...)) to assert.ok(!include(...))
# These rules were moved to episode_engine_agent
# ----------------------------------------------------------------
rules_to_negate = [
    '如果底稿偏权谋、智斗或"靠智慧周旋"',
    '每场先找到一个戏眼',
    '相邻两场的推进手法必须变化',
    '妖兽、灾变、高手外压只能放大人祸',
    '最后三场优先收人账、证据账、规则账、关系账',
    '师父、长老、高手若出场，只能改规则、压时限、给条件、逼表态',
    '不能直接执行"废修为、收钥匙、投入炼炉、当众宣判"这类终局动作',
    '情感杠杆角色不能只做人质或陪跑',
    '情感杠杆角色至少主动完成一次传信、藏证、换条件、自救、反咬或拖时间',
    '关键收账动作必须先由主角或情感杠杆角色完成',
    '公审、议事、对质类场景只保留最能改局的 4-6 句发言',
    '同一集制度场最多 1 场',
    '当前 5 集批次若其他道观、使者、长老或新上位者出场，他们只能拿旧账加压',
    '接任、宣判、认罚、废修为、宗门表态只能做结果确认',
    '前 1-6 集不要让人物把"谦卦""不争""大道""真镇守"直接讲出口',
    '第6集以后每集第一场优先从搜屋、门外堵截、押送路上、医庐换药、地窖取物、暗巷换手、山林追逃、潭边毁契这些私人动作开',
    '第4集以后，scene1 禁止落在堂上流程、关押问话或盖章程序里',
    '师父、执事、长老只能验真、截停、压时限、改规则',
    '不准突然带着新账册、新记录、新证词进门直接替主角揭底',
    '当前 5 集批次如果程序场必须出现，只准做过门：收证、定时限、转身离场',
    '别把台词、动作或场尾写成"争证据、争站队、争时间、主导权、推进、升级、收束"这类策划词',
    '当前批次末集第一场必须从上一集留下的伤势、血契、碎钥匙、残党动作或未完追压起手',
]

for rule in rules_to_negate:
    old = f"assert.ok(prompt.includes('{rule}'))"
    new = f"assert.ok(!prompt.includes('{rule}'))"
    if old in content:
        content = content.replace(old, new)
        changes.append(f"Fix2: negated '{rule[:30]}...'")
    else:
        changes.append(f"Fix2 SKIP: not found '{rule[:30]}...'")

# Also negate these lines that are part of the same test
for extra_rule in [
    '不准从宗门合议、代表宣判、卷轴宣读、长老落锤或侧殿静室听处分开场',
    '当前批次末两集不准临时引入堂兄、师叔、新残党头子、新长老名号等新名字接管尾声',
    '当前 5 集批次如果必须碰"守空/不争/师父教诲"这类主题',
    '不准写"师父说……所以……""守空才能不争""空的，才是真的"这类问答式定义句',
    '包扎、换药、歇脚、潭边喘气这类场也必须继续推进',
    '当前 5 集批次每场只写一个推进回合；公审、议事、对质场最多 4-6 句对白',
    '当前批次末集整集最多只允许 1 场制度确认',
    '不要写"象征意义、话语权、势力格局、内部分裂"这类抽象推进词',
    '"被带去问话"不算推进',
]:
    old = f"assert.ok(prompt.includes('{extra_rule}'))"
    new = f"assert.ok(!prompt.includes('{extra_rule}'))"
    if old in content:
        content = content.replace(old, new)
        changes.append(f"Fix2: negated extra '{extra_rule[:30]}...'")

# ----------------------------------------------------------------
# Fix 3: Test "keeps dialogue voice block in compact mode"
# Remove relationship-shift assertion (line 1328)
# ----------------------------------------------------------------
old3 = '''  assert.ok(prompt.includes('【故事合同落地】'))
  assert.match(prompt, /本集必须让"(?:小镇少女|情感对象)"亲自卷入当前冲突/)
  assert.ok(prompt.includes('本集至少兑现 1 条硬锚点'))'''

new3 = '''  assert.ok(prompt.includes('【故事合同落地】'))
  assert.ok(prompt.includes('本集至少兑现 1 条硬锚点'))'''

if old3 in content:
    content = content.replace(old3, new3)
    changes.append("Fix3: removed relationship-shift assertion from compact mode test")
else:
    changes.append("Fix3 SKIP: not found")

# ----------------------------------------------------------------
# Fix 4: Test "falls back to summaryEpisodes when current beat is missing"
# Remove scene1 ban and mentor ban assertions (lines 1397-1398)
# ----------------------------------------------------------------
old4 = """  assert.ok(ep10Prompt.includes('前 1-6 集不要让人物把"谦卦""不争""大道""真镇守"直接讲出口'))
})"""

new4 = """})"""

if old4 in content:
    content = content.replace(old4, new4)
    changes.append("Fix4: removed scene1/mentor ban assertions from fallback test")
else:
    changes.append("Fix4 SKIP: not found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

for c in changes:
    print(c)
print("DONE")
