import { createScriptGenerationPrompt } from './src/main/application/script-generation/prompt/create-script-generation-prompt.ts';

const testContent = `  assert.ok(!prompt.includes('如果底稿偏权谋、智斗或"靠智慧周旋"'))`;

// Extract the rule from line 884
const lines = testContent.split('\n');
const line884 = lines[0];
const quoteStart = line884.indexOf("'");
const quoteEnd = line884.indexOf("'", quoteStart + 1);
const rule = line884.substring(quoteStart + 1, quoteEnd);

console.log('Rule:', JSON.stringify(rule));

// Now let's run the actual prompt builder
// We need to simulate the createPromptInputForTuning function
const input = {
  plan: {
    mode: 'fresh_start',
    ready: true,
    blockedBy: [],
    contract: {
      ready: true,
      targetEpisodes: 10,
      structuralActs: [],
      missingActs: [],
      confirmedFormalFacts: [],
    },
  },
  storyIntent: {
    shortDramaConstitution: {
      title: '测试剧本',
      genre: '权谋',
      coreConflict: '测试冲突',
      protagonist: '测试主角',
      protagonistGoal: '测试目标',
      emotionalTone: '测试情绪',
      style: '测试风格',
      rules: [],
    },
  },
  outline: {
    title: '测试大纲',
    mainConflict: '测试主冲突',
    theme: '测试主题',
    protagonist: '测试主角',
    summary: '测试摘要',
  },
  characters: [],
  episodeBeats: [],
  detailedOutlineBlocks: [],
};

const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 2);

console.log('Prompt length:', prompt.length);

// Check if the rule is in the prompt
console.log('\nRule in prompt:', prompt.includes(rule));

// Also check each part
const parts = ['如果底稿', '偏权谋', '智斗或', '靠智慧周旋', '智慧周旋', '周旋', '靠智慧', '权谋'];
for (const part of parts) {
  console.log('Part', JSON.stringify(part), 'in prompt:', prompt.includes(part));
}

// Also try with curly quotes
const curlyRule = '如果底稿偏权谋、智斗或\u201c靠智慧周旋\u201d';
console.log('\nWith curly quotes:', JSON.stringify(curlyRule));
console.log('In prompt:', prompt.includes(curlyRule));
