import fs from 'fs';
const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Find the exact text around each missing rule
const checks = [
  { keyword: '耳边回响', note: 'test at 630' },
  { keyword: '不可拍心理句', note: 'test at 847' },
  { keyword: '分析人物', note: 'test at 1400' },
  { keyword: '少年守钥人', note: 'test at 1330 (character dialogue voice)' },
  { keyword: 'SCREENPLAY_INSTITUTION_PASSING', note: 'test at 432 - offscreen dialogue' },
  { keyword: 'SCREENPLAY_NO_NEW_TAKEOVER', note: 'test at 432' },
];

for (const { keyword, note } of checks) {
  const idx = content.indexOf(keyword);
  if (idx >= 0) {
    const surrounding = content.substring(Math.max(0, idx - 30), idx + keyword.length + 30);
    console.log(`FOUND "${keyword}" at ${idx} [${note}]: ...${surrounding}...`);
  } else {
    console.log(`MISSING: "${keyword}" [${note}]`);
  }
}

// Also search for what replaced '分析人物'
const emotionBlock = content.indexOf('情绪只能藏在');
if (emotionBlock >= 0) {
  console.log('\nEmotion block:');
  console.log(content.substring(emotionBlock, emotionBlock + 200));
}
