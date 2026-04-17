import fs from 'fs';

const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);

// Find createPromptInputForTuning function
const funcIdx = content.indexOf('function createPromptInputForTuning()');
if (funcIdx >= 0) {
  // Get a big chunk of the function
  const chunk = content.substring(funcIdx, funcIdx + 8000);
  
  // Find shouldCompactContextFirst
  const compactIdx = chunk.indexOf('shouldCompactContextFirst');
  if (compactIdx >= 0) {
    console.log('Found shouldCompactContextFirst:');
    console.log(chunk.substring(Math.max(0, compactIdx-20), compactIdx+100));
  } else {
    console.log('shouldCompactContextFirst NOT FOUND in fixture');
  }
  
  // Find profileLabel
  const labelIdx = chunk.indexOf('profileLabel');
  if (labelIdx >= 0) {
    console.log('\nprofileLabel:');
    console.log(chunk.substring(Math.max(0, labelIdx-20), labelIdx+100));
  }
}
