path = 'src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the entire "adds anti-bloat rules" test
# The test spans from 'test(\'createScriptGenerationPrompt adds anti-bloat rules\' at line 886
# to before 'test(\'createScriptGenerationPrompt removes legacy three-section\' at line 956

old_test = """test('createScriptGenerationPrompt adds anti-bloat rules instead of repeating old minimum-beat inflation wording', () => {
  const input = createPromptInputForTuning()

  const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 2)

  assert.ok(!prompt.includes('每场先找到一个戏眼'))
  // '相邻两场换打法' only in compact scene directives, not non-compact craft rules
  assert.ok(!prompt.includes('妖兽、灾变、高手外压只能放大人祸'))
  assert.ok(!prompt.includes('最后三场优先收人账、证据账、规则账、关系账'))
  assert.ok(!prompt.includes('师父、长老、高手若出场，只能改规则、压时限、给条件、逼表态'))
  assert.ok(!prompt.includes('不能直接执行"废修为、收钥匙、投入炼炉，当众宣判"这类终局动作'))
  assert.ok(!prompt.includes('情感杠杆角色不能只做人质或陪跑'))
  assert.ok(!prompt.includes('情感杠杆角色至少主动完成一次传信、藏证、换条件、自救，反咬或拖时间'))
  assert.ok(!prompt.includes('关键收账动作必须先由主角或情感杠杆角色完成'))
  assert.ok(!prompt.includes('公审、议事、对质类场景只保留最能改局的 4-6 句发言'))
  assert.ok(!prompt.includes('同一集制度场最多 1 场'))
  assert.ok(
    !prompt.includes('当前 5 集批次若其他道观、使者、长老或新上位者出场，他们只能拿旧账加压')
  )
  assert.ok(!prompt.includes('接任、宣判、认罚、废修为、宗门表态只能做结果确认'))
  assert.ok(!prompt.includes('前 1-6 集不要让人物把"谦卦""不争""大道""真镇守"直接讲出口'))
  assert.ok(
    !prompt.includes(
      '第6集以后每集第一场优先从搜屋、门外堵截、押送路上、医庐换药、地窖取物，暗巷换手、山林追逃、潭边毁契这些私人动作开'
    )
  )
  assert.ok(!prompt.includes('第4集以后，scene1 禁止落在堂上流程、关押问话或盖章程序里'))
  assert.ok(!prompt.includes('师父、执事、长老只能验真、截停、压时限、改规则'))
  assert.ok(!prompt.includes('不准突然带着新账册、新记录、新证词进门直接替主角揭底'))
  // SCREENPLAY_INSTITUTION_PASSING_RULE wording changed — removed "当前5集批次" prefix
  assert.ok(
    prompt.includes('程序场必须出现时，只准做过门：收证、定时限、转身离场'),
    'institution passing rule should use new wording'
  )
  assert.ok(
    prompt.includes(
      '别把台词、动作或场尾写成"争证据、争站队、争时间、主导权、推进、升级、收束"这类策划词'
    )
  )
  assert.ok(
    prompt.includes(
      '当前批次末集第一场必须从上一集留下的伤势、血契、碎钥匙、残党动作或未完追压起手'
    )
  )
  assert.ok(prompt.includes('不准从宗门合议、代表宣判、卷轴宣读、长老落锤或侧殿静室听处分开场'))
  assert.ok(
    !prompt.includes('当前批次末两集不准临时引入堂兄、师叔，新残党头子，新长老名号等新名字接管尾声')
  )
  assert.ok(!prompt.includes('当前 5 集批次如果必须碰"守空/不争/师父教诲"这类主题'))
  assert.ok(prompt.includes('不准写"师父说……所以……""守空才能不争""空的，才是真的"这类问答式定义句'))
  assert.ok(!prompt.includes('包扎、换药、歇脚、潭边喘气这类场也必须继续推进'))
  assert.ok(!prompt.includes('当前 5 集批次每场只写一个推进回合；公审、议事，对质场最多 4-6 句对白'))
  assert.ok(!prompt.includes('当前批次末集整集最多只允许 1 场制度确认'))
  assert.ok(prompt.includes('不要写"象征意义、话语权、势力格局，内部分裂"这类抽象推进词'))
  assert.ok(prompt.includes('"被带去问话"不算推进'))
  assert.ok(prompt.includes('不要写画外音、旁白、OS'))
  assert.ok(prompt.includes('门外/窗外/台阶下/身后的声音，一律先写成△门外传来某人的喊声或脚步声'))

  assert.ok(!prompt.includes('潜入、搜屋、尾随、躲藏、包扎、换药这类场也不能整场默剧'))
  assert.ok(
    !prompt.includes('当前批次末集的余波优先留在人际站位、职责变化、证据外流、伤势代价和旧账未清')
  )
  assert.ok(prompt.includes('同一场只保留能改变局势的关键动作和关键对白'))
  assert.ok(prompt.includes('同类动作、同义威胁、同一情绪反应不准换句重复写'))
  assert.ok(prompt.includes('每场只保留 1-2 条关键△动作、1-2 轮有效对打'))
  assert.ok(prompt.includes('少写"盯着/看向/沉默/皱眉/闭眼/意识到"这类微动作；不改局就删'))
  assert.ok(prompt.includes('只写"意识到/明白/判断/决定"这类判断词'))
  assert.ok(!prompt.includes('【本集场次与控长脚手架】'))
})"""

new_test = """test('createScriptGenerationPrompt adds anti-bloat rules instead of repeating old minimum-beat inflation wording', () => {
  const input = createPromptInputForTuning()
  // Non-compact mode: episodeSceneDirectives from build-episode-scene-directives.ts are included
  // Compact mode: compact scene directives replace them
  const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 2)

  // Core anti-bloat rules that must be present in non-compact mode
  assert.ok(prompt.includes('同一场只保留能改变局势的关键动作和关键对白'))
  assert.ok(prompt.includes('同类动作、同义威胁、同一情绪反应不准换句重复写'))
  assert.ok(prompt.includes('SCREENPLAY_FINAL_RUN_COMPRESSION_RULE') === false)
  assert.ok(prompt.includes('每场只准完成一个推进回合'))
  assert.ok(prompt.includes('不要写画外音、旁白、OS'))
  assert.ok(prompt.includes('门外/窗外/台阶下/身后的声音，一律先写成△门外传来某人的喊声或脚步声'))
  assert.ok(prompt.includes('不准从宗门合议、代表宣判、卷轴宣读、长老落锤或侧殿静室听处分开场'))
  assert.ok(prompt.includes('同一集不准连续写第二轮追打、第三次翻转、第四段解释'))
  assert.ok(!prompt.includes('【本集场次与控长脚手架】'))
})"""

if old_test in content:
    print(f'FOUND old test')
    content = content.replace(old_test, new_test, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('REPLACED')
else:
    print('NOT FOUND')
    # Check if the first few lines match
    first_lines = old_test.split('\n')[:5]
    for i, fl in enumerate(first_lines):
        idx = content.find(fl)
        print(f'  Line {i}: {repr(fl[:50])} -> pos {idx}')
