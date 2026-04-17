import fs from 'fs';

const testContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);
const promptContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// The test is FAILING on !includes - meaning includes() returns true
// Let's find WHY in the actual prompt

// Extract the rule from line 884
const lines = testContent.split('\n');
const line884 = lines[883];
const quoteStart = line884.indexOf("'");
const quoteEnd = line884.indexOf("'", quoteStart + 1);
const rule = line884.substring(quoteStart + 1, quoteEnd);

// Now let's search the PROMPT for anything containing part of this rule
const parts = ['偏权谋', '智斗或', '靠智慧', '周旋', '智慧周旋'];
for (const part of parts) {
  const idx = promptContent.indexOf(part);
  if (idx >= 0) {
    console.log('Found', JSON.stringify(part), 'at', idx);
    console.log('Context:', promptContent.substring(idx-50, idx+100));
    console.log('---');
  }
}

// Also search for the FULL rule exactly
console.log('\nFull rule in prompt:', promptContent.includes(rule));

// Maybe there's a SIMILAR rule in the prompt
// Let's search for anything with '底稿' or '权谋' or '周旋'
const searchTerms = ['底稿', '权谋', '周旋', '偏权'];
for (const term of searchTerms) {
  const idx = promptContent.indexOf(term);
  if (idx >= 0) {
    console.log('Term', JSON.stringify(term), 'found at', idx);
    console.log('Context:', promptContent.substring(idx-20, idx+100));
    console.log('---');
  }
}
