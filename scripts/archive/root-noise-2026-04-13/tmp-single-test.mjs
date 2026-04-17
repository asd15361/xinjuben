
import { createPromptInputForTuning } from './src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts';
import { createScriptGenerationPrompt } from './src/main/application/script-generation/prompt/create-script-generation-prompt.ts';

const input = createPromptInputForTuning();
const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 2);

const rule = "相邻两场的推进手法必须变化";
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
