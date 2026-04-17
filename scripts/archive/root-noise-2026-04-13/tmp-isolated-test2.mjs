import { createScriptGenerationPrompt } from './src/main/application/script-generation/prompt/create-script-generation-prompt.ts';
import { createPromptInputForTuning } from './src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts';

// Run just the failing test
const input = createPromptInputForTuning();
const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 2);

console.log('Prompt length:', prompt.length);

// Extract the rule from line 884
const lines = testContent.split('\n');
const line884 = lines[883];
const quoteStart = line884.indexOf("'");
const quoteEnd = line884.indexOf("'", quoteStart + 1);
const rule = line884.substring(quoteStart + 1, quoteEnd);

// Actually, let's just use the exact string from the error message
const ruleFromError = '如果底稿偏权谋、智斗或"靠智慧周旋"';

console.log('Rule from error:', JSON.stringify(ruleFromError));
console.log('Rule includes curly quotes:', ruleFromError.includes('\u201c'));

// Check if the rule is in the prompt
console.log('\nRule in prompt:', prompt.includes(ruleFromError));

// Also check each part
const parts = ['如果底稿', '偏权谋', '智斗或', '靠智慧周旋', '智慧周旋', '周旋', '靠智慧', '权谋'];
for (const part of parts) {
  console.log('Part', JSON.stringify(part), 'in prompt:', prompt.includes(part));
}

// Also try with curly quotes
const curlyRule = '如果底稿偏权谋、智斗或\u201c靠智慧周旋\u201d';
console.log('\nWith curly quotes:', JSON.stringify(curlyRule));
console.log('In prompt:', prompt.includes(curlyRule));
