path = 'src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Line 893: {repr(lines[892])}")
print(f"Line 893 length: {len(lines[892])}")
# Find what the assertion checks
import re
# Extract the string being tested
match = re.search(r"prompt\.includes\('([^']+)'\)", lines[892])
if match:
    test_str = match.group(1)
    print(f"Test string: {repr(test_str)}")
    # Check if it's in the prompt
    prompt_path = 'src/main/application/script-generation/prompt/create-script-generation-prompt.ts'
    with open(prompt_path, 'r', encoding='utf-8') as f2:
        prompt_content = f2.read()
    if test_str in prompt_content:
        print(f"FOUND in prompt!")
    else:
        print(f"NOT FOUND in prompt")
        # Try to find partial matches
        for i in range(len(test_str)):
            partial = test_str[:i+10]
            if partial in prompt_content:
                print(f"  Partial: {repr(partial)}")
                break
