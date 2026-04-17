path = 'src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line "assert.ok(prompt.includes('不要另起一行写情绪总结'))" near the season finale test
for i, line in enumerate(lines):
    if "不要另起一行写情绪总结" in line and i > 1300:
        print(f"Found at line {i+1}: {repr(line)}")
        print(f"Next 10 lines:")
        for j in range(i, min(i+12, len(lines))):
            print(f"  {j+1}: {repr(lines[j])}")
        break
