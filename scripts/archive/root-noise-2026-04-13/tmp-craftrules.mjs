import fs from 'fs';

const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Check what craftRules contains for non-compact mode
const craftIdx = content.indexOf('const craftRules');
if (craftIdx >= 0) {
  console.log('craftRules:');
  console.log(content.substring(craftIdx, craftIdx + 2000));
}
