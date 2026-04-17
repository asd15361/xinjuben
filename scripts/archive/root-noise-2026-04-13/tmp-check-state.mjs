import fs from 'fs';

let testContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);

const lines = testContent.split('\n');

// Check lines around 625-635
console.log('Lines 625-635:');
for (let i = 624; i < 636; i++) {
  if (lines[i]) {
    console.log(`  ${i+1}: ${lines[i]}`);
  }
}

// Check lines around 893-910
console.log('\nLines 893-910:');
for (let i = 892; i < 912; i++) {
  if (lines[i]) {
    console.log(`  ${i+1}: ${lines[i]}`);
  }
}

// Check lines around 1320-1330
console.log('\nLines 1320-1330:');
for (let i = 1319; i < 1331; i++) {
  if (lines[i]) {
    console.log(`  ${i+1}: ${lines[i]}`);
  }
}

// Check lines around 1395-1410
console.log('\nLines 1395-1410:');
for (let i = 1394; i < 1411; i++) {
  if (lines[i]) {
    console.log(`  ${i+1}: ${lines[i]}`);
  }
}
