import fs from 'fs';

const testContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);
const promptContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Find the "adds anti-bloat" test
const testIdx = testContent.indexOf("'createScriptGenerationPrompt adds anti-bloat");
if (testIdx < 0) { console.log('TEST NOT FOUND'); process.exit(1); }

const afterTest = testContent.substring(testIdx);
const endTest = afterTest.indexOf("\ntest(");
const testBody = afterTest.substring(0, endTest);

// Get ALL !prompt.includes() assertions
const regex = /assert\.ok\(!prompt\.includes\('([^']+)'\)\)/g;
let match;
const results = [];

while ((match = regex.exec(testBody)) !== null) {
  const rule = match[1];
  const inPrompt = promptContent.includes(rule);
  results.push({
    rule: rule.substring(0, 50),
    inPrompt,
    shouldPass: !inPrompt,
    actual: inPrompt ? 'FAIL (rule IS in prompt)' : 'PASS (rule NOT in prompt)'
  });
}

console.log(`Total assertions: ${results.length}`);
console.log('\nAll assertions and their status:');
results.forEach((r, i) => {
  console.log(`${i+1}. ${r.actual} | ${r.rule}`);
});

// Show the ones that will FAIL
const failing = results.filter(r => r.shouldPass === false);
if (failing.length > 0) {
  console.log('\n=== FAILING ASSERTIONS ===');
  failing.forEach((r, i) => {
    console.log(`${i+1}. ${r.rule}`);
  });
}
