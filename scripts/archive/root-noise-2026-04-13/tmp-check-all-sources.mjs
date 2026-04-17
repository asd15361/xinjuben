import fs from 'fs';

const testContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);

// Extract the rule with curly quotes
const rule = "如果底稿偏权谋、智斗或\u201c靠智慧周旋\u201d";
console.log('Rule:', JSON.stringify(rule));

// Search for this rule IN THE TEST FILE
const idx_in_test = testContent.indexOf(rule);
console.log('In test file:', idx_in_test);

// Search for partial matches
const parts = ['偏权谋', '智斗或', '靠智慧', '周旋'];
for (const part of parts) {
  console.log('Partial', JSON.stringify(part), 'in test:', testContent.includes(part));
}

// Now check the PROMPT file
const promptContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Search for partial matches in prompt
console.log('\nIn PROMPT file:');
console.log('偏权谋:', promptContent.includes('偏权谋'));
console.log('智斗或:', promptContent.includes('智斗或'));
console.log('靠智慧:', promptContent.includes('靠智慧'));
console.log('周旋:', promptContent.includes('周旋'));

// Search the WHOLE prompt for each part
for (const part of parts) {
  const idx = promptContent.indexOf(part);
  if (idx >= 0) {
    console.log('FOUND', JSON.stringify(part), 'at', idx);
    console.log('Context:', promptContent.substring(idx-20, idx+80));
  }
}
