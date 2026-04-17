import fs from 'fs';

const promptContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Find the compact mode rules
const compactIdx = promptContent.indexOf('craftRules = compactMode');
if (compactIdx >= 0) {
  const after = promptContent.substring(compactIdx);
  const ifIdx = after.indexOf('?');
  const openBracket = after.indexOf('[', ifIdx);
  
  // Find the closing ]
  let depth = 0;
  let end = openBracket;
  for (let i = openBracket; i < after.length; i++) {
    if (after[i] === '[') depth++;
    else if (after[i] === ']') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  
  const compactRules = after.substring(openBracket, end);
  console.log('Compact rules length:', compactRules.length);
  console.log('\nCompact rules:');
  console.log(compactRules);
  
  console.log('\n=== Checking if "相邻两场换打法" is in compact rules ===');
  console.log('In compact rules:', compactRules.includes('相邻两场换打法'));
}
