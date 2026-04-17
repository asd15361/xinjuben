import fs from 'fs';

// Read prompt file
const promptContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Read test file
const testContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);

// The anti-bloat test asserts that ALL these rules are NOT in the prompt
// (the test was changed to assert.ok(!prompt.includes(...)))
const rulesShouldBeAbsent = [
  '如果底稿偏权谋、智斗或"靠智慧周旋"',
  '每场先找到一个戏眼',
  '相邻两场的推进手法必须变化',
  '妖兽、灾变、高手外压只能放大人祸',
  '最后三场优先收人账、证据账、规则账、关系账',
  '师父、长老、高手若出场，只能改规则、压时限、给条件、逼表态',
  '不能直接执行"废修为、收钥匙、投入炼炉、当众宣判"这类终局动作',
  '情感杠杆角色不能只做人质或陪跑',
  '情感杠杆角色至少主动完成一次传信、藏证、换条件、自救、反咬或拖时间',
  '关键收账动作必须先由主角或情感杠杆角色完成',
  '公审、议事、对质类场景只保留最能改局的 4-6 句发言',
  '同一集制度场最多 1 场',
  '当前 5 集批次若其他道观、使者、长老或新上位者出场，他们只能拿旧账加压',
  '接任、宣判、认罚、废修为、宗门表态只能做结果确认',
  '前 1-6 集不要让人物把"谦卦""不争""大道""真镇守"直接讲出口',
  '第6集以后每集第一场优先从搜屋、门外堵截、押送路上、医庐换药、地窖取物、暗巷换手、山林追逃、潭边毁契这些私人动作开',
  '第4集以后，scene1 禁止落在堂上流程、关押问话或盖章程序里',
  '师父、执事、长老只能验真、截停、压时限、改规则',
  '不准突然带着新账册、新记录、新证词进门直接替主角揭底',
  '当前 5 集批次如果程序场必须出现，只准做过门：收证、定时限、转身离场',
  '别把台词、动作或场尾写成"争证据、争站队、争时间、主导权、推进、升级、收束"这类策划词',
  '当前批次末集第一场必须从上一集留下的伤势、血契、碎钥匙、残党动作或未完追压起手',
  '不准从宗门合议、代表宣判、卷轴宣读、长老落锤或侧殿静室听处分开场',
  '当前批次末两集不准临时引入堂兄、师叔、新残党头子、新长老名号等新名字接管尾声',
  '当前 5 集批次如果必须碰"守空/不争/师父教诲"这类主题',
  '不准写"师父说……所以……""守空才能不争""空的，才是真的"这类问答式定义句',
  '包扎、换药、歇脚、潭边喘气这类场也必须继续推进',
  '当前 5 集批次每场只写一个推进回合；公审、议事、对质场最多 4-6 句对白',
  '当前批次末集整集最多只允许 1 场制度确认',
  '不要写"象征意义、话语权、势力格局、内部分裂"这类抽象推进词',
  '"被带去问话"不算推进',
];

console.log('Checking anti-bloat rules (should be absent from prompt):');
for (const rule of rulesShouldBeAbsent) {
  const inPrompt = promptContent.includes(rule);
  // Check if test has assert.ok(!prompt.includes(...))
  const inTestAsNegated = testContent.includes(`assert.ok(!prompt.includes('${rule}')`);
  const inTestAsPositive = testContent.includes(`assert.ok(prompt.includes('${rule}')`);
  console.log(`  ${inPrompt ? 'PRESENT' : 'absent'} | test neg:${inTestAsNegated} pos:${inTestAsPositive} | ${rule.substring(0, 40)}`);
}

console.log('\nOther missing rules:');
const other = [
  ['耳边回响', 'test at 630'],
  ['不可拍心理句', 'test at 847'],
  ['分析人物', 'test at 1400'],
  ['少年守钥人：少解释，先装后反咬', 'test at 1330'],
];
for (const [rule, note] of other) {
  const inPrompt = promptContent.includes(rule);
  console.log(`  ${inPrompt ? 'IN' : 'OUT'} prompt | ${note} | ${rule}`);
}
