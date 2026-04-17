# -*- coding: utf-8 -*-
with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts', 'r', encoding='utf-8-sig') as f:
    content = f.read()

# Find start and end of the relationship shift block
start_marker = 'if (storyContract.requirements.requireRelationshipShift)'
end_marker = '  const hardFacts = ['

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx < 0:
    print("START not found")
else:
    print("Start found at", start_idx)
    print("End found at", end_idx)
    
    # Remove everything from the blank line before the if block to the blank line before hardFacts
    # The block spans from the blank line before the if to the blank line before hardFacts
    # Let's find the blank line before start_idx
    before = content[:start_idx]
    last_newline_before = before.rfind('\n\n')
    
    # And find the \n\n before hardFacts (after the closing brace)
    after_hardfacts = content[end_idx:]
    first_newline_after_end = after_hardfacts.find('\n\n')
    
    new_content = content[:last_newline_before+1] + '\n' + content[end_idx:]
    
    with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("DONE: relationship shift block removed")
