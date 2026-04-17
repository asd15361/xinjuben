import fs from 'fs';

const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

const keywords = [
  '耳边回响',
  '脑海中浮现',
  '不可拍心理句',
  '分析人物',
  '少年守钥人',
  '旧三段',
];

for (const kw of keywords) {
  const idx = content.indexOf(kw);
  if (idx >= 0) {
    console.log(`FOUND "${kw}" at ${idx}:`);
    console.log(`  ...${content.substring(Math.max(0, idx-20), idx+kw.length+20)}...`);
    console.log();
  } else {
    console.log(`MISSING: "${kw}"`);
  }
}
