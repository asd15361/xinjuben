path = 'src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Line 1460: {repr(lines[1460])}")
print(f"Line 1460 char count: {len(lines[1460])}")
print(f"Line 1460 quote count: {lines[1460].count(chr(0x22))}")
# Show hex of each character around the quote
for j, c in enumerate(lines[1460]):
    if ord(c) > 127 or c == '"':
        print(f"  pos {j}: U+{ord(c):04X} '{c}'")
    if j > 60:
        break
