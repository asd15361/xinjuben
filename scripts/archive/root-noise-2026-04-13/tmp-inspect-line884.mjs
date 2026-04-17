import fs from 'fs';

const testContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);

// Get line 884
const lines = testContent.split('\n');
console.log('Line 884:', JSON.stringify(lines[883]));
console.log('Line 885:', JSON.stringify(lines[884]));

// Also check char codes
const line = lines[883];
const quoteStart = line.indexOf("'");
const quoteEnd = line.indexOf("'", quoteStart + 1);
const rule = line.substring(quoteStart + 1, quoteEnd);
console.log('\nRule:', JSON.stringify(rule));
console.log('Char codes:', [...rule].map(c => c.charCodeAt(0)));
