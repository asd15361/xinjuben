import fs from 'fs';

const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

const checks = [
  '耳边回响',
  '脑海中浮现',
  '不可拍心理句',
  '分析人物',
  '少年守钥人：少解释，先装后反咬',
  '少年守钥人',
  '人物情绪：',
  '预告下一场',
  '打比喻写情绪',
  '总结关系',
  '旧三段标签格式',
];

for (const s of checks) {
  const idx = content.indexOf(s);
  if (idx >= 0) {
    console.log(`IN  [${idx}]: "${s}"`);
    console.log(`    ...${content.substring(Math.max(0, idx-15), idx+s.length+15)}...`);
  } else {
    console.log(`OUT: "${s}"`);
  }
}
