import fs from 'fs';

const testContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);
const promptContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Extract the rule from line 884
const lines = testContent.split('\n');
const line884 = lines[883];
const quoteStart = line884.indexOf("'");
const quoteEnd = line884.indexOf("'", quoteStart + 1);
const rule = line884.substring(quoteStart + 1, quoteEnd);

console.log('Rule:', JSON.stringify(rule));
console.log('In prompt:', promptContent.includes(rule));

// Maybe there's a whitespace issue?
const trimmed = rule.trim();
console.log('\nTrimmed:', JSON.stringify(trimmed));
console.log('Trimmed in prompt:', promptContent.includes(trimmed));

// What if the rule is SIMILAR but not exact?
// Let's search for the prompt rule that contains '权谋'
const idx = promptContent.indexOf('权谋');
if (idx >= 0) {
  console.log('\nPrompt rule at 权谋:');
  // Find the full rule in prompt
  const before = promptContent.lastIndexOf("'", idx);
  const after = promptContent.indexOf("'", idx);
  console.log('Context:', promptContent.substring(Math.max(0, idx-80), idx+100));
}

// Let's also check if there's a rule with "如果底稿" in the prompt
const idx2 = promptContent.indexOf('如果底稿');
if (idx2 >= 0) {
  console.log('\nFound 如果底稿 at', idx2);
  console.log('Context:', promptContent.substring(idx2-20, idx2+100));
} else {
  console.log('\n如果底稿 NOT in prompt');
}

// Check for '靠智慧' or '智慧周旋' in prompt
for (const term of ['靠智慧', '智慧周旋', '周旋', '底稿']) {
  const idx3 = promptContent.indexOf(term);
  console.log(term, 'in prompt:', idx3 >= 0);
}

// Now let's actually run the prompt builder and check
// We need to simulate the test
console.log('\n=== Simulating the test ===');

// Extract craftRules from prompt
const craftRules_match = promptContent.match(/const craftRules = \[([\s\S]*?)\];/);
if (craftRules_match) {
  console.log('craftRules found, length:', craftRules_match[1].length);
  const craftRulesContent = craftRules_match[1];
  console.log('First 200 chars:', craftRulesContent.substring(0, 200));
}
