with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts', 'r', encoding='utf-8-sig') as f:
    testContent = f.read()
with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts', 'r', encoding='utf-8-sig') as f:
    promptContent = f.read()

# The rule "相邻两场的推进手法必须变化" is NOT in the prompt exactly
# But "相邻两场换打法" IS in the prompt (it's a similar but different rule)
# So the test assertion is WRONG - it's testing for the wrong string

# Also check: "每场先找到一个戏眼" - is this in the prompt?
rule = "每场先找到一个戏眼"
print(f"'{rule}' in prompt:", rule in promptContent)

# "戏眼" in prompt?
idx = promptContent.find("戏眼")
print("戏眼 in prompt:", idx)

# Check "每场" in prompt?
idx2 = promptContent.find("每场")
print("每场 in prompt:", idx2, "Context:", promptContent[idx2:idx2+100] if idx2 >= 0 else "")

# The issue: these rules from the test don't exist in the prompt at all
# They're testing for anti-bloat rules that were REMOVED
# But the test is FAILING on "相邻两场" because a SIMILAR rule exists
# We need to update the test to match the CORRECT rule in the prompt

# Actual rule in prompt: "相邻两场换打法"
actual_rule = "相邻两场换打法"
print(f"\nActual rule: '{actual_rule}' in prompt:", actual_rule in promptContent)

# We need to:
# 1. Remove the NEGATION for "相邻两场的推进手法必须变化" 
# 2. And replace it with a POSITIVE assertion for "相邻两场换打法"
