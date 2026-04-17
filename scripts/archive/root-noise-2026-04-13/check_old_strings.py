path_in = 'src/main/application/script-generation/prompt/create-script-generation-prompt.ts'
with open(path_in, 'r', encoding='utf-8') as f:
    content = f.read()

# Check various strings from the failing test
strings = [
    '妖兽',
    '灾变',
    '外压只能',
    '不相连两场',
    '每场先找到一个戏眼',
    '情感杠杆',
    '关键收账',
    '公审、议事',
    '制度场最多',
    '接任、宣判',
    '前 1-6 集',
    '搜屋',
    'scene1',
    '师父、执事',
    '新账册',
]

for s in strings:
    print(f"{repr(s)}: {'FOUND' if s in content else 'NOT FOUND'}")
