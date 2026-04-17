with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'rb') as f:
    raw = f.read()

# Find line 885 by counting newlines
lines = raw.split(b'\n')
print('Line 885 (bytes):', lines[884][:100])
print('Line 885 (decoded):', lines[884].decode('utf-8-sig', errors='replace'))

# Check if there's a special character in the rule
line = lines[884]
rule_start = line.find(b"'")
rule_end = line.find(b"'", rule_start + 1)
rule = line[rule_start+1:rule_end]
print('\nRule bytes:', rule)
print('Rule decoded:', rule.decode('utf-8-sig', errors='replace'))
print('Rule hex:', rule.hex())

# Check each byte
print('\nByte analysis:')
for i, b in enumerate(rule):
    print(f'  {i}: 0x{b:02x} ({chr(b) if 32 <= b < 127 else "?"})')
