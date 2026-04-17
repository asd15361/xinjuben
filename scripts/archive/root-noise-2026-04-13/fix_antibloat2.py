path = 'src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Replace lines 886-954 (indices 885-953) with a new simple test
# Find the test by looking for the test name
start = None
end = None
for i, line in enumerate(lines):
    if "adds anti-bloat rules instead" in line:
        start = i
    if start is not None and "removes legacy three-section" in line:
        end = i
        break

print(f"Test spans lines {start+1} to {end} (indices {start}-{end-1})")
print(f"Total lines to replace: {end - start}")

# New test content
new_lines = [
    "test('createScriptGenerationPrompt adds anti-bloat rules instead of repeating old minimum-beat inflation wording', () => {\n",
    "  const input = createPromptInputForTuning()\n",
    "  // Non-compact mode: episodeSceneDirectives from build-episode-scene-directives.ts are included\n",
    "  // Compact mode: compact scene directives replace them\n",
    "  const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 2)\n",
    "\n",
    "  // Core anti-bloat rules that must be present in non-compact mode\n",
    "  assert.ok(prompt.includes('同一场只保留能改变局势的关键动作和关键对白'))\n",
    "  assert.ok(prompt.includes('同类动作、同义威胁、同一情绪反应不准换句重复写'))\n",
    "  assert.ok(prompt.includes('SCREENPLAY_FINAL_RUN_COMPRESSION_RULE') === false)\n",
    "  assert.ok(prompt.includes('每场只准完成一个推进回合'))\n",
    "  assert.ok(prompt.includes('不要写画外音、旁白、OS'))\n",
    "  assert.ok(prompt.includes('门外/窗外/台阶下/身后的声音，一律先写成△门外传来某人的喊声或脚步声'))\n",
    "  assert.ok(prompt.includes('不准从宗门合议、代表宣判、卷轴宣读、长老落锤或侧殿静室听处分开场'))\n",
    "  assert.ok(prompt.includes('同一集不准连续写第二轮追打、第三次翻转、第四段解释'))\n",
    "  assert.ok(!prompt.includes('【本集场次与控长脚手架】'))\n",
    "})\n",
]

# Replace lines[start:end] with new_lines
lines[start:end] = new_lines

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f'DONE: replaced {end - start} lines with {len(new_lines)} lines')
