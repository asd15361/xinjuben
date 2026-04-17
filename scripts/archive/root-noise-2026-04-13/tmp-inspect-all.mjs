import fs from 'fs';

const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);

const lines = content.split('\n');

// Check lines 427-440
console.log('Lines 427-440 (test hardens final-run):');
for (let i = 426; i < 440; i++) {
  if (lines[i]) {
    console.log(`  ${i+1}: ${lines[i]}`);
  }
}

// Check lines 625-635
console.log('\nLines 625-635 (encodes scene quotas):');
for (let i = 624; i < 636; i++) {
  if (lines[i]) {
    console.log(`  ${i+1}: ${lines[i]}`);
  }
}

// Check lines 888-960 (adds anti-bloat)
console.log('\nLines 888-960 (adds anti-bloat):');
for (let i = 887; i < 960; i++) {
  if (lines[i]) {
    console.log(`  ${i+1}: ${lines[i]}`);
  }
}

// Check lines 1300-1340 (keeps dialogue voice)
console.log('\nLines 1300-1340 (keeps dialogue voice):');
for (let i = 1299; i < 1341; i++) {
  if (lines[i]) {
    console.log(`  ${i+1}: ${lines[i]}`);
  }
}

// Check lines 1388-1415 (keeps emotion)
console.log('\nLines 1388-1415 (keeps emotion):');
for (let i = 1387; i < 1416; i++) {
  if (lines[i]) {
    console.log(`  ${i+1}: ${lines[i]}`);
  }
}
