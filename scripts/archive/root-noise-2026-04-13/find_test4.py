path = 'src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the season finale test assertion for anti-placeholder
idx = content.find('不准出现"人物：人物""【本集终】""局面推进结果："')
print(f"Found at char {idx}")
if idx >= 0:
    print(repr(content[max(0,idx-50):idx+100]))
