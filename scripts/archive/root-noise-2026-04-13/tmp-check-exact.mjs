import fs from 'fs';

const testContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);
const promptContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Test the exact string from the test file
const testIdx = testContent.indexOf('如果底稿偏权谋、智斗或"靠智慧周旋"');
if (testIdx >= 0) {
  // Get the exact 25 chars around it
  const start = testContent.lastIndexOf("'", testIdx);
  const end = testContent.indexOf("'", testIdx + 1);
  const rule = testContent.substring(start + 1, end);
  console.log('Rule from test:', JSON.stringify(rule));
  console.log('In prompt:', promptContent.includes(rule));
  console.log('Length:', rule.length);
  console.log('Char codes:', [...rule].map(c => c.charCodeAt(0)));
}
