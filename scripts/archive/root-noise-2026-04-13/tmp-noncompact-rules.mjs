import fs from 'fs';

const promptContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Find the non-compact mode (else branch of craftRules)
const compactIdx = promptContent.indexOf('craftRules = compactMode');
if (compactIdx >= 0) {
  // Find the else branch
  const after = promptContent.substring(compactIdx);
  const colonIdx = after.indexOf(':');
  const elseStart = after.indexOf('[', colonIdx);
  
  // Find the closing ]
  let depth = 0;
  let end = elseStart;
  for (let i = elseStart; i < after.length; i++) {
    if (after[i] === '[') depth++;
    else if (after[i] === ']') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  
  const nonCompactRules = after.substring(elseStart, end);
  console.log('Non-compact rules length:', nonCompactRules.length);
  console.log('\nNon-compact rules:');
  console.log(nonCompactRules);
}
