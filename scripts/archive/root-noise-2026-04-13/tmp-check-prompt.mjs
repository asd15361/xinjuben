import fs from 'fs';
const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

const rules = [
  '相邻两场的推进手法必须变化',
  '耳边回响',
  '不可拍心理句',
  '分析人物',
  '少年守钥人：少解释，先装后反咬',
];

for (const rule of rules) {
  console.log(`  ${content.includes(rule) ? 'FOUND' : 'MISSING'}: ${rule}`);
}

const screenplayRules = [
  'SCREENPLAY_INSTITUTION_PASSING',
  'SCREENPLAY_NO_NEW_TAKEOVER',
  'SCREENPLAY_NO_OFFSCREEN_DIALOGUE',
];
for (const r of screenplayRules) {
  console.log(`  ${content.includes(r) ? 'FOUND' : 'MISSING'}: ${r}`);
}
