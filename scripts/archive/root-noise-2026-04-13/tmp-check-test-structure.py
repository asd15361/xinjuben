# -*- coding: utf-8 -*-
filepath = 'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts'

with open(filepath, 'r', encoding='utf-8-sig') as f:
    content = f.read()

# Check for describe( and test(
import re
describes = re.findall(r"describe\s*\(['\"]", content)
tests = re.findall(r"test\s*\(['\"]", content)
print(f"describe count: {len(describes)}")
print(f"test count: {len(tests)}")

# Also check for import of test framework
for i, line in enumerate(content.split('\n')[:10]):
    print(f"  {i+1}: {repr(line)}")
