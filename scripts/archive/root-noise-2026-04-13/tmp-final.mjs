import fs from 'fs';

const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

const checks = [
  ['assert.ok(prompt.includes(\'耳边回响\') || prompt.includes(\'脑海中浮现\'))', 'test 630'],
  ['assert.ok(prompt.includes(\'不可拍心理句\'))', 'test 847'],
  ['assert.ok(!prompt.includes(\'相邻两场的推进手法必须变化\'))', 'test 895'],
  ['assert.ok(prompt.includes(\'少年守钥人：少解释，先装后反咬\'))', 'test 1325'],
  ['assert.ok(prompt.includes(\'分析人物\'))', 'test 1400'],
  ['assert.ok(prompt.includes(\'旧三段标签格式\'))', 'test 847 part 2'],
  ['assert.ok(prompt.includes(\'人物情绪：\'))', 'test 1400 part 2'],
];

for (const [expr, note] of checks) {
  // Check the inner strings
  const innerMatch = expr.match(/includes\(['"](.+?)['"]\)/);
  if (innerMatch) {
    const str = innerMatch[1];
    const inPrompt = content.includes(str);
    console.log(`  ${note}: ${inPrompt ? 'PASS' : 'FAIL'} - ${str.substring(0, 30)}`);
  }
}

// Also check: test 895 negated rule
console.log('\nChecking anti-bloat negated rules:');
const negRules = [
  '每场先找到一个戏眼',
  '相邻两场的推进手法必须变化',
  '妖兽、灾变、高手外压只能放大人祸',
  '最后三场优先收人账、证据账、规则账、关系账',
  '师父、长老、高手若出场，只能改规则、压时限、给条件、逼表态',
  '情感杠杆角色不能只做人质或陪跑',
  '情感杠杆角色至少主动完成一次传信、藏证、换条件、自救、反咬或拖时间',
  '关键收账动作必须先由主角或情感杠杆角色完成',
  '公审、议事、对质类场景只保留最能改局的 4-6 句发言',
  '同一集制度场最多 1 场',
  '接任、宣判、认罚、废修为、宗门表态只能做结果确认',
  '第4集以后，scene1 禁止落在堂上流程、关押问话或盖章程序里',
  '师父、执事、长老只能验真、截停、压时限、改规则',
  '不准突然带着新账册、新记录、新证词进门直接替主角揭底',
  '当前 5 集批次如果程序场必须出现，只准做过门：收证、定时限、转身离场',
  '包扎、换药、歇脚、潭边喘气这类场也必须继续推进',
  '当前 5 集批次每场只写一个推进回合；公审、议事、对质场最多 4-6 句对白',
  '当前批次末集整集最多只允许 1 场制度确认',
];
for (const rule of negRules) {
  console.log(`  ${content.includes(rule) ? 'IN PROMPT (FAIL)' : 'NOT IN PROMPT (PASS)'}: ${rule.substring(0, 30)}`);
}
