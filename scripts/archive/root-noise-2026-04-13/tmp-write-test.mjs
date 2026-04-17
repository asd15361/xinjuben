import fs from 'fs';
import { execSync } from 'child_process';

const testContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);

// Get the exact line 885
const testLines = testContent.split('\n');
const line885 = testLines[884];
console.log('Line 885:', line885);

// Extract the rule
const quoteStart = line885.indexOf("'");
const quoteEnd = line885.indexOf("'", quoteStart + 1);
const rule = line885.substring(quoteStart + 1, quoteEnd);
console.log('\nRule:', JSON.stringify(rule));

// Write a test file that runs just this assertion
const testCode = `
import { createPromptInputForTuning } from './src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts';
import { createScriptGenerationPrompt } from './src/main/application/script-generation/prompt/create-script-generation-prompt.ts';

const input = createPromptInputForTuning();
const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 2);

const rule = ${JSON.stringify(rule)};
console.log('Rule:', JSON.stringify(rule));
console.log('Rule in prompt:', prompt.includes(rule));
console.log('!prompt.includes(rule):', !prompt.includes(rule));

// Also search the prompt for partial matches
const parts = ['相邻两场', '推进手法', '必须变化', '换打法'];
for (const part of parts) {
  console.log('Part', JSON.stringify(part), 'in prompt:', prompt.includes(part));
  if (prompt.includes(part)) {
    const idx = prompt.indexOf(part);
    console.log('  Context:', prompt.substring(idx-10, idx+50));
  }
}
`;

fs.writeFileSync('D:/project/xinjuben/tmp-single-test.mjs', testCode);
console.log('\nTest file written to tmp-single-test.mjs');
