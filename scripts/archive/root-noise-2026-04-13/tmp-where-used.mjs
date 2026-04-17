import fs from 'fs';

const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Find where craftRules is used (not just defined)
const allOccurrences = [];
let idx = 0;
while ((idx = content.indexOf('craftRules', idx)) !== -1) {
  allOccurrences.push(idx);
  idx += 1;
}
console.log('craftRules occurrences:', allOccurrences);

// Find where craftRules is referenced in the return statement
const returnIdx = content.indexOf('return buildPrompt');
if (returnIdx >= 0) {
  console.log('\nReturn statement area:');
  console.log(content.substring(returnIdx, returnIdx + 500));
}
