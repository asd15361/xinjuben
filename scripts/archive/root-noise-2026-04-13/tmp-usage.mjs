import fs from 'fs';

const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Second occurrence at 28013 - this is where craftRules is used
const start = 27900;
const end = 28300;
console.log('Around craftRules usage (27900-28300):');
console.log(content.substring(start, end));
