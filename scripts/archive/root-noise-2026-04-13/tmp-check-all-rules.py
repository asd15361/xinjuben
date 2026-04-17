with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'r', encoding='utf-8-sig') as f:
    content = f.read()
with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts', 'r', encoding='utf-8-sig') as f:
    promptContent = f.read()

changes = []

def should_negate(rule):
    """Returns True if rule is NOT in prompt (negation is correct)"""
    return rule not in promptContent

def should_positive(rule):
    """Returns True if rule IS in prompt (remove negation)"""
    return rule in promptContent

# Rules confirmed NOT in prompt (from earlier check) - negations are CORRECT
# Rule: 如果底稿偏权谋 - ALREADY REMOVED
# Rules confirmed IS in prompt - need to remove negation
# Rule: 不准从宗门合议 - ALREADY FIXED
# Rule: 同一场只保留 - ALREADY FIXED
# Rule: 同类动作 - ALREADY FIXED
# Rule: 每场只保留 - ALREADY FIXED

# Rules that need checking:
# "相邻两场的推进手法必须变化" - need to check
# "妖兽、灾变、高手外压只能放大人祸" - need to check
# "最后三场优先收人账" - need to check
# "师父、长老、高手若出场" - need to check

rules_to_check = [
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
    '接任、宣判、认罚、废修为、宗门表态只能做结果确认',
    '前 1-6 集不要让人物把"谦卦""不争""大道""真镇守"直接讲出口',
    '第4集以后，scene1 禁止落在堂上流程、关押问话或盖章程序里',
    '师父、执事、长老只能验真、截停、压时限、改规则',
    '不准突然带着新账册、新记录、新证词进门直接替主角揭底',
    '当前 5 集批次如果程序场必须出现，只准做过门：收证、定时限、转身离场',
    '当前 5 集批次如果必须碰"守空/不争/师父教诲"这类主题',
    '包扎、换药、歇脚、潭边喘气这类场也必须继续推进',
    '当前 5 集批次每场只写一个推进回合；公审、议事、对质场最多 4-6 句对白',
    '当前批次末集整集最多只允许 1 场制度确认',
    '潜入、搜屋、尾随、躲藏、包扎、换药这类场也不能整场默剧',
]

for rule in rules_to_check:
    in_prompt = rule in promptContent
    status = 'IS in prompt' if in_prompt else 'NOT in prompt'
    print(f'{status}: {rule[:40]}...')
    if in_prompt:
        changes.append(f'IS in prompt: {rule[:40]}')
    else:
        changes.append(f'NOT in prompt: {rule[:40]}')

print(f'\nTotal: {len(changes)} rules checked')
print('\nRules IS in prompt (should remove negation):')
for c in changes:
    if c.startswith('IS'):
        print(' ', c)
print('\nRules NOT in prompt (negation is correct):')
for c in changes:
    if c.startswith('NOT'):
        print(' ', c)
