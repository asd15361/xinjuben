import fs from 'fs';

const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

const checks = [
  '禁止使用旧三段标签格式',
  '不要输出任何三段结构标签',
  '旧三段',
];

for (const s of checks) {
  const idx = content.indexOf(s);
  if (idx >= 0) {
    console.log(`IN  [${idx}]: "${s}"`);
    console.log(`    ...${content.substring(Math.max(0, idx-15), idx+s.length+30)}...`);
  } else {
    console.log(`OUT: "${s}"`);
  }
}
