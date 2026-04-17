path = 'src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the season finale test
start = None
end = None
for i, line in enumerate(lines):
    if "adds season finale anti-placeholder" in line:
        start = i
    if start is not None and "puts current-episode task" in line:
        end = i
        break

print(f"Season finale test spans lines {start+1} to {end} (indices {start}-{end-1})")
print(f"Total lines to replace: {end - start}")

# New test content
new_lines = [
    "test('createScriptGenerationPrompt adds season finale anti-placeholder contract for the final episode', () => {\n",
    "  const input = createPromptInputForTuning()\n",
    "  input.plan.targetEpisodes = 30\n",
    "  input.outline.summaryEpisodes = Array.from({ length: 30 }, (_, i) => ({\n",
    "    episodeNo: i + 1,\n",
    "    summary: `第${i + 1}集摘要`\n",
    "  }))\n",
    "  input.detailedOutlineBlocks = [\n",
    "    {\n",
    "      blockNo: 3,\n",
    "      startEpisode: 21,\n",
    "      endEpisode: 30,\n",
    "      summary: '第21-30集块',\n",
    "      sections: [\n",
    "        {\n",
    "          sectionNo: 1,\n",
    "          title: '第28-30集段',\n",
    "          act: 'ending',\n",
    "          startEpisode: 28,\n",
    "          endEpisode: 30,\n",
    "          summary: '收尾',\n",
    "          hookType: '收束',\n",
    "          episodeBeats: [\n",
    "            {\n",
    "              episodeNo: 30,\n",
    "              summary: '末集收尾',\n",
    "              sceneByScene: [\n",
    "                {\n",
    "                  sceneNo: 1,\n",
    "                  location: '玄玉宫正门外',\n",
    "                  timeOfDay: '夜',\n",
    "                  setup: '黎明攥着血契冲出宫门',\n",
    "                  tension: '郡守逼宫，小柔伤势未稳',\n",
    "                  hookEnd: '残党混在人群里抬起弩箭\n",
    "                },\n",
    "                {\n",
    "                  sceneNo: 2,\n",
    "                  location: '玄玉宫正门外',\n",
    "                  timeOfDay: '夜',\n",
    "                  setup: '小柔扑开黎明，毒箭擦肩而过',\n",
    "                  tension: '旧账未了，残党退入夜色',\n",
    "                  hookEnd: '箭头上的四个字让黎明彻底停住'\n",
    "                }\n",
    "              ]\n",
    "            }\n",
    "          ]\n",
    "        }\n",
    "      ],\n",
    "      episodeBeats: []\n",
    "    }\n",
    "  ]\n",
    "\n",
    "  const ep30Prompt = createScriptGenerationPrompt(input as never, input.outline as never, input.characters as never, 30)\n",
    "\n",
    "  assert.ok(ep30Prompt.includes('【整季末集收口合同】'))\n",
    "  assert.ok(ep30Prompt.includes('必须把本集给定的全部场次完整写完'))\n",
    "  assert.ok(ep30Prompt.includes('禁止占位稿'))\n",
    "  assert.ok(ep30Prompt.includes('写完末场后直接停在剧本场面里'))\n",
    "})\n",
]

# Replace lines[start:end] with new_lines
lines[start:end] = new_lines

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f'DONE: replaced {end - start} lines with {len(new_lines)} lines')
