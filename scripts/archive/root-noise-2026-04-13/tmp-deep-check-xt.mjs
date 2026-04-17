import fs from 'fs';

const testContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);
const promptContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// The test is FAILING on "相邻两场的推进手法必须变化"
// Let's find the EXACT string from the test
const testIdx = testContent.indexOf("'createScriptGenerationPrompt adds anti-bloat");
const afterTest = testContent.substring(testIdx);
const endTest = afterTest.indexOf("\ntest(");
const testBody = afterTest.substring(0, endTest);

// Find the specific rule
const ruleMatch = testBody.match(/assert\.ok\(!prompt\.includes\('([^']+)'\)\)/g);
// Get the 2nd one (相邻两场)
const matches = [...testBody.matchAll(/assert\.ok\(!prompt\.includes\('([^']+)'\)\)/g)];
console.log('Total matches:', matches.length);

if (matches.length > 1) {
  const rule = matches[1][1];
  console.log('\nRule:', JSON.stringify(rule));
  console.log('Length:', rule.length);
  console.log('Char codes:', [...rule].map(c => c.charCodeAt(0)));
  console.log('\nIn prompt:', promptContent.includes(rule));
  
  // Also check partial
  console.log('Partial "相邻两场" in prompt:', promptContent.includes('相邻两场'));
  console.log('Partial "推进手法" in prompt:', promptContent.includes('推进手法'));
  console.log('Partial "必须变化" in prompt:', promptContent.includes('必须变化'));
  
  // Search in prompt
  const idx = promptContent.indexOf('相邻两场');
  if (idx >= 0) {
    console.log('\nFound "相邻两场" in prompt at:', idx);
    console.log('Context:', promptContent.substring(idx-20, idx+100));
  }
}
