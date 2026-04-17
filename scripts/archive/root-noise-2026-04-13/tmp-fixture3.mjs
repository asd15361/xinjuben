import fs from 'fs';

const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);

// Search for shouldCompactContextFirst anywhere in the file
const idx = content.indexOf('shouldCompactContextFirst');
if (idx >= 0) {
  console.log('Found shouldCompactContextFirst at', idx);
  console.log(content.substring(Math.max(0, idx-30), idx+200));
} else {
  console.log('shouldCompactContextFirst NOT FOUND anywhere in test file');
}

// Search for profileLabel
const labelIdx = content.indexOf('profileLabel');
if (labelIdx >= 0) {
  console.log('\nFound profileLabel at', labelIdx);
  console.log(content.substring(Math.max(0, labelIdx-30), labelIdx+200));
}
