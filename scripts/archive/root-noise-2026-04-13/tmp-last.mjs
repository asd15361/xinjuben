import fs from 'fs';

const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// The test checks: assert.ok(prompt.includes('旧三段标签格式'))
// And also: assert.ok(prompt.includes('旧三段标签格式'))
// The test does NOT check for '禁止使用' before it

const allOld = [
  '禁止使用旧三段标签格式',
  '旧三段标签格式',
  '旧三段',
  '只保留三段正文',
  '不要输出任何三段结构标签',
  '三段结构标签',
];

for (const s of allOld) {
  const idx = content.indexOf(s);
  if (idx >= 0) {
    console.log(`IN  [${idx}]: "${s}"`);
    console.log(`    ...${content.substring(Math.max(0, idx-10), idx+s.length+20)}...`);
  } else {
    console.log(`OUT: "${s}"`);
  }
}
