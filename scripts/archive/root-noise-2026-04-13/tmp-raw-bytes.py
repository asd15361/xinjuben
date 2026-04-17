with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'rb') as f:
    rawBytes = f.read()

# Find the position of "assert.ok(!prompt.includes" for line 884
# Line 884 is at index 883 in 0-based split by \n
# But let's find it directly
idx = rawBytes.find(b"assert.ok(!prompt.includes('\xe5\xa6\x82\xe6\x9e\x9c\xe5\xba\x95\xe7\xa8\xbf\xe5\x81\x8f\xe6\x9d\x83")
if idx >= 0:
    # Show 50 bytes before and after
    start = max(0, idx - 10)
    end = min(len(rawBytes), idx + 200)
    print('Found at byte position:', idx)
    print('Before:', rawBytes[start:idx].decode('utf-8-sig', errors='replace'))
    print('Context:', rawBytes[idx:idx+100].decode('utf-8-sig', errors='replace'))
else:
    # Try with the rule part
    idx = rawBytes.find(b'\xe5\xa6\x82\xe6\x9e\x9c\xe5\xba\x95\xe7\xa8\xbf')
    print('Found rule start at byte position:', idx)
    # Show context
    if idx >= 0:
        end = idx + 50
        print('Rule context:', rawBytes[idx:end])
