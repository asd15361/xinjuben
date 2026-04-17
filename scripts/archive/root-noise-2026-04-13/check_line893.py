path = 'src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Line 893: {repr(lines[892])}")
print(f"Line 893 length: {len(lines[892])}")
