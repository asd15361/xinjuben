import fs from 'fs';

const promptContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Find where craftRules is DEFINED (not just declared)
const craftIdx = promptContent.indexOf('const craftRules = ');
console.log('First craftRules definition at:', craftIdx);

const craftIdx2 = promptContent.indexOf('let craftRules = ');
console.log('Let craftRules definition at:', craftIdx2);

// Find ALL occurrences
let searchFrom = 0;
console.log('\nAll craftRules occurrences:');
while (true) {
  const idx = promptContent.indexOf('craftRules', searchFrom);
  if (idx < 0) break;
  console.log('  At', idx, ':', promptContent.substring(idx, idx+60));
  searchFrom = idx + 1;
}

// Find where the NON-COMPACT craftRules is defined
const nonCompactIdx = promptContent.indexOf('const craftRules = [\n');
if (nonCompactIdx >= 0) {
  console.log('\nNon-compact craftRules at:', nonCompactIdx);
  const after = promptContent.substring(nonCompactIdx);
  console.log('First 300 chars:', after.substring(0, 300));
}
