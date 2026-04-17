import fs from 'fs';

let testContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);

// The rule has U+3000 (fullwidth space) at position 7 (between 谋 and 、)
// Fix: replace U+3000 with normal space (U+0020) in the test file
if (testContent.includes('\u3000')) {
  testContent = testContent.replace(/\u3000/g, ' ');
  fs.writeFileSync(
    'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
    testContent,
    'utf8'
  );
  console.log('REPLACED U+3000 with space');
} else {
  console.log('No U+3000 found');
}

// Verify the fix
const lines = testContent.split('\n');
const line884 = lines[883];
const quoteStart = line884.indexOf("'");
const quoteEnd = line884.indexOf("'", quoteStart + 1);
const rule = line884.substring(quoteStart + 1, quoteEnd);
console.log('New rule:', JSON.stringify(rule));
console.log('Char codes:', [...rule].map(c => c.charCodeAt(0)));
