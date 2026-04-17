import fs from 'fs';

const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);

const lines = content.split('\n');

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

// Check lines around 1308-1330
console.log('\nLines 1308-1330:');
for (let i = 1307; i < 1330; i++) {
  if (lines[i]) {
    console.log(`  ${i+1}: ${lines[i]}`);
  }
}

// Check lines around 1390-1410
console.log('\nLines 1390-1410:');
for (let i = 1389; i < 1411; i++) {
  if (lines[i]) {
    console.log(`  ${i+1}: ${lines[i]}`);
  }
}
