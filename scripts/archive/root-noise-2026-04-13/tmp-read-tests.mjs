import fs from 'fs';

// Read the actual test file with Node.js to avoid encoding issues
const testContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);

// Read prompt file
const promptContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Get exact text of the problematic assertions
// Find test at line 630 (0-based: 629) - using line number from error
const lines = testContent.split('\n');

// Show lines around 625-635
console.log('Lines 625-635 of test file:');
for (let i = 624; i < 636; i++) {
  if (lines[i]) {
    console.log(`  ${i+1}: ${lines[i]}`);
  }
}

// Also find lines around 847
console.log('\nLines 842-852 of test file:');
for (let i = 841; i < 853; i++) {
  if (lines[i]) {
    console.log(`  ${i+1}: ${lines[i]}`);
  }
}

// Find lines around 895
console.log('\nLines 890-900 of test file:');
for (let i = 889; i < 901; i++) {
  if (lines[i]) {
    console.log(`  ${i+1}: ${lines[i]}`);
  }
}

// Find lines around 1325
console.log('\nLines 1320-1330 of test file:');
for (let i = 1319; i < 1331; i++) {
  if (lines[i]) {
    console.log(`  ${i+1}: ${lines[i]}`);
  }
}

// Find lines around 1400
console.log('\nLines 1395-1405 of test file:');
for (let i = 1394; i < 1406; i++) {
  if (lines[i]) {
    console.log(`  ${i+1}: ${lines[i]}`);
  }
}

// Now check if the exact strings from these lines are in the prompt
console.log('\nChecking exact strings in prompt:');
const checks = [
  '耳边回响',
  '脑海中浮现',
  '不可拍心理句',
  '分析人物',
  '少年守钥人：少解释，先装后反咬',
];
for (const s of checks) {
  console.log(`  ${promptContent.includes(s) ? 'IN' : 'OUT'}: ${s}`);
}
