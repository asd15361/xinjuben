import fs from 'fs';

const testContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);
const promptContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Extract the exact rule from line 884
const lines = testContent.split('\n');
const line884 = lines[883];
const quoteStart = line884.indexOf("'");
const quoteEnd = line884.indexOf("'", quoteStart + 1);
const rule = line884.substring(quoteStart + 1, quoteEnd);

console.log('Rule:', JSON.stringify(rule));
console.log('In prompt:', promptContent.includes(rule));

// Now let's check if the rule is actually in the PROMPT file
// by searching for the bytes directly
const enc = new TextEncoder();
const ruleBytes = enc.encode(rule);
console.log('\nRule bytes:', Array.from(ruleBytes).map(b => '0x' + b.toString(16)));

// Search for each byte sequence in the prompt
const promptBytes = enc.encode(promptContent);

// Search for partial matches
let found = false;
for (let i = 0; i < promptBytes.length - ruleBytes.length; i++) {
  let match = true;
  for (let j = 0; j < ruleBytes.length; j++) {
    if (promptBytes[i+j] !== ruleBytes[j]) {
      match = false;
      break;
    }
  }
  if (match) {
    console.log('\nFOUND at byte position:', i);
    found = true;
    break;
  }
}

if (!found) {
  console.log('\nNOT found via byte search');
  // Check partial
  for (const part of ['偏权谋', '智斗或', '靠智慧周旋']) {
    const partBytes = enc.encode(part);
    let partFound = false;
    for (let i = 0; i < promptBytes.length - partBytes.length; i++) {
      let match = true;
      for (let j = 0; j < partBytes.length; j++) {
        if (promptBytes[i+j] !== partBytes[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        console.log('Part', part, 'found at byte', i);
        partFound = true;
        break;
      }
    }
    if (!partFound) {
      console.log('Part', part, 'NOT found');
    }
  }
}
