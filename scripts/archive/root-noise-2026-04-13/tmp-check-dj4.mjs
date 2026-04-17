import { createPromptInputForTuning } from './src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts';
import { createScriptGenerationPrompt } from './src/main/application/script-generation/prompt/create-script-generation-prompt.ts';

const input = createPromptInputForTuning();
const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 2);

const rule = "如果底稿偏权谋、智斗或" + "\u201c靠智慧周旋\u201d";
console.log("Rule:", rule);
console.log("Rule in prompt:", prompt.includes(rule));
console.log("!prompt.includes(rule):", !prompt.includes(rule));

const rule2 = '如果底稿偏权谋、智斗或"靠智慧周旋"';
console.log("\nRule2:", rule2);
console.log("Rule2 in prompt:", prompt.includes(rule2));
