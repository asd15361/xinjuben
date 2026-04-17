path = 'src/main/application/script-generation/prompt/create-script-generation-prompt.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Check various strings
strings = [
    '妖兽',
    '不相连两场',
    '每场先找到一个戏眼',
    '不准出现"人物：人物"',
]

for s in strings:
    print(f"{repr(s)}: {'FOUND' if s in content else 'NOT FOUND'}")
