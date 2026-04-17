path = 'src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
# Check line 1461 (0-indexed: 1460)
if len(lines) > 1460:
    print(f"Line 1461: {repr(lines[1460][:100])}")
    print(f"Line 1462: {repr(lines[1461][:100])}")
    print(f"Line 1463: {repr(lines[1462][:100])}")

# Check line 892 (0-indexed: 891)
if len(lines) > 891:
    print(f"Line 892: {repr(lines[891][:100])}")
