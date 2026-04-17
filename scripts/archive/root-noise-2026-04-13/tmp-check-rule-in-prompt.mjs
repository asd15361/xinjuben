import fs from 'fs';

const testContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);
const promptContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Extract the rule with curly quotes
const rule = "如果底稿偏权谋、智斗或\u201c靠智慧周旋\u201d";
console.log('Rule:', JSON.stringify(rule));
console.log('In prompt:', promptContent.includes(rule));

// Also check with straight quotes
const rule2 = '如果底稿偏权谋、智斗或"靠智慧周旋"';
console.log('\nRule2 (straight):', JSON.stringify(rule2));
console.log('In prompt:', promptContent.includes(rule2));

// Check the raw bytes
const idx = promptContent.indexOf('底稿偏权谋');
console.log('\nPrompt search for 底稿偏权谋:', idx);
