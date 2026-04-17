import fs from 'fs';
const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Check '不可拍心理句' - when was it added, where did it go?
const idx = content.indexOf('不可拍');
if (idx >= 0) {
  console.log('不可拍 found:');
  console.log(content.substring(Math.max(0, idx-50), idx+200));
} else {
  console.log('不可拍 NOT found in prompt');
}

// Also search git history for when it was added
// But we can't run git. Let me check the full file to understand context
console.log('\nSearching for all instances of "心理总结":');
let pos = 0;
while ((pos = content.indexOf('心理总结', pos)) !== -1) {
  console.log(`  at ${pos}: ...${content.substring(Math.max(0, pos-20), pos+50)}...`);
  pos += 1;
}

console.log('\nSearching for "inner" or "monologue" equivalents:');
for (const s of ['耳边', '脑海', '内心', '独白', '主观']) {
  const p = content.indexOf(s);
  if (p >= 0) {
    console.log(`  FOUND: "${s}" at ${p}`);
  }
}
