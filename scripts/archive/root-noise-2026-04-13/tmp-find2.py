with open('D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts', 'r', encoding='utf-8-sig') as f:
    content = f.read()
idx = content.find("if (storyContract.requirements.requireRelationshipShift)")
if idx >= 0:
    print(f"Found at {idx}:", repr(content[idx:idx+300]))
else:
    print("Not found. Searching alternatives...")
    for keyword in ['requireRelationshipShift', 'relationshipShift', 'requireRelationship']:
        idx2 = content.find(keyword)
        if idx2 >= 0:
            print(f"Found '{keyword}' at {idx2}:", repr(content[idx2:idx2+100]))
            break
    else:
        print("None found")
