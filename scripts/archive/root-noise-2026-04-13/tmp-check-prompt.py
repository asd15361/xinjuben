# -*- coding: utf-8 -*-
with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts', 'r', encoding='utf-8-sig') as f:
    content = f.read()

rules_to_check = [
    '相邻两场的推进手法必须变化',
    '耳边回响',
    '不可拍心理句',
    '分析人物',
    '少年守钥人：少解释，先装后反咬',
    'SCREENPLAY_INSTITUTION_PASSING',
    'SCREENPLAY_NO_NEW_TAKEOVER',
]

for rule in rules_to_check:
    found = rule in content
    print(f"  {'FOUND' if found else 'MISSING'}: {rule}")
