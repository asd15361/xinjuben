import fs from 'fs';

const testContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);

// Find the line with "如果底稿偏权谋"
const testIdx = testContent.indexOf('adds anti-bloat');
if (testIdx >= 0) {
  const after = testContent.substring(testIdx);
  const end = after.indexOf("\ntest(");
  const body = after.substring(0, end);
  
  // Find the first assert line
  const assertIdx = body.indexOf("assert.ok(!prompt.includes");
  if (assertIdx >= 0) {
    const lineStart = body.lastIndexOf('\n', assertIdx);
    const lineEnd = body.indexOf('\n', assertIdx + 1);
    const line = body.substring(lineStart, lineEnd);
    console.log('Line:', JSON.stringify(line));
    
    // Extract the rule
    const quoteStart = line.indexOf("'");
    const quoteEnd = line.indexOf("'", quoteStart + 1);
    const rule = line.substring(quoteStart + 1, quoteEnd);
    console.log('\nRule:', JSON.stringify(rule));
    console.log('Length:', rule.length);
    console.log('Char codes:', [...rule].map(c => c.charCodeAt(0)));
  }
}
