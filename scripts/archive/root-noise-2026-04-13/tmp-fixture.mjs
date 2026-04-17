import fs from 'fs';

const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);

// Find createPromptInputForTuning function
const funcIdx = content.indexOf('function createPromptInputForTuning()');
if (funcIdx >= 0) {
  // Get the next 200 chars
  const chunk = content.substring(funcIdx, funcIdx + 3000);
  // Find shouldCompactContextFirst
  const compactIdx = chunk.indexOf('shouldCompactContextFirst');
  if (compactIdx >= 0) {
    console.log('Found shouldCompactContextFirst:');
    console.log(chunk.substring(Math.max(0, compactIdx-50), compactIdx+100));
  } else {
    console.log('shouldCompactContextFirst NOT FOUND in fixture');
    console.log('First 500 chars of fixture:');
    console.log(chunk.substring(0, 500));
  }
}
