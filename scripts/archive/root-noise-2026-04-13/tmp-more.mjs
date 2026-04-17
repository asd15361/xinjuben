import fs from 'fs';
const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// The test wants: assert.ok(prompt.includes('分析人物'))
// Is there any equivalent? Let's search
const related = [
  '分析人物',
  '分析句',
  '策划词',
  '占位词',
  '总结句',
];
for (const s of related) {
  const idx = content.indexOf(s);
  if (idx >= 0) {
    console.log(`FOUND "${s}" at ${idx}:`);
    console.log(`  ...${content.substring(Math.max(0, idx-10), idx+s.length+30)}...`);
  } else {
    console.log(`MISSING: "${s}"`);
  }
}

// The test wants: assert.ok(prompt.includes('耳边回响') || prompt.includes('脑海中浮现'))
// These are specific inner monologue prohibition examples. Are there equivalents?
const mono = [
  '耳边回响',
  '脑海中浮现',
  '心想',
  '心里想',
  '内心独白',
  '独白',
];
console.log('\nInner monologue related:');
for (const s of mono) {
  const idx = content.indexOf(s);
  if (idx >= 0) {
    console.log(`FOUND: "${s}"`);
  } else {
    console.log(`MISSING: "${s}"`);
  }
}
