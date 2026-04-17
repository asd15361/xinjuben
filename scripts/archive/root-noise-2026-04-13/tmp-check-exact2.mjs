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
const testIdx = testContent.indexOf('\u5982\u679c\u5e95\u7a3f\u504f\u6743\u8c08\u3001\u667a\u6597\u6216');
console.log('testIdx:', testIdx);

if (testIdx >= 0) {
  // Get the exact 25 chars around it
  const start = testContent.lastIndexOf("'", testIdx);
  const end = testContent.indexOf("'", testIdx + 1);
  const rule = testContent.substring(start + 1, end);
  console.log('Rule from test:', JSON.stringify(rule));
  console.log('In prompt:', promptContent.includes(rule));
  console.log('Length:', rule.length);
  console.log('Char codes:', [...rule].map(c => c.charCodeAt(0)));
} else {
  console.log('Rule NOT found in test');
  // Check if the whole test exists
  const testIdx2 = testContent.indexOf('adds anti-bloat');
  console.log('Test found at:', testIdx2);
  if (testIdx2 >= 0) {
    const after = testContent.substring(testIdx2);
    const end = after.indexOf("\ntest(");
    const body = after.substring(0, end);
    console.log('Body preview:', body.substring(0, 500));
  }
}
