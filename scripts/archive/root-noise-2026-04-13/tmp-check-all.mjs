import fs from 'fs';

const testContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);
const promptContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Get all !prompt.includes() assertions from the "adds anti-bloat" test
const testIdx = testContent.indexOf("'createScriptGenerationPrompt adds anti-bloat");
if (testIdx < 0) { console.log('TEST NOT FOUND'); process.exit(1); }

const afterTest = testContent.substring(testIdx);
const endTest = afterTest.indexOf("\ntest(");
const testBody = afterTest.substring(0, endTest);

let passed = 0;
let failed = 0;
let unexpectedPass = 0;
let unexpectedFail = 0;

const lines = testBody.split('\n');
for (const line of lines) {
  const match = line.match(/assert\.ok\(!prompt\.includes\('([^']+)'\)\)/);
  if (!match) continue;
  const rule = match[1];
  const inPrompt = promptContent.includes(rule);
  const assertionResult = !inPrompt; // !prompt.includes() = !inPrompt, assertion passes if this is true
  
  if (assertionResult) {
    passed++;
    console.log(`PASS: !includes('${rule.substring(0,30)}...') -> rule NOT in prompt (correct)`);
  } else {
    failed++;
    console.log(`FAIL: !includes('${rule.substring(0,30)}...') -> rule IS in prompt (should negate or remove)`);
  }
}

console.log(`\nTotal: ${passed} pass, ${failed} fail`);
