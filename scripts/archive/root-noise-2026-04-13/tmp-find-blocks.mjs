import fs from 'fs';
const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Find the 【对白口风】 block
const dialogueIdx = content.indexOf('【对白口风】');
if (dialogueIdx >= 0) {
  console.log('=== 对白口风 block ===');
  console.log(content.substring(dialogueIdx, dialogueIdx + 500));
  console.log();
}

// Find the emotion block (after '情绪只能藏在')
const emotionIdx = content.indexOf('情绪只能藏在');
if (emotionIdx >= 0) {
  console.log('=== 情绪 block ===');
  console.log(content.substring(emotionIdx, emotionIdx + 300));
  console.log();
}

// Find SCREENPLAY_EMOTION_RULE
const emotionRuleIdx = content.indexOf('SCREENPLAY_EMOTION_RULE');
if (emotionRuleIdx >= 0) {
  console.log('=== SCREENPLAY_EMOTION_RULE ===');
  console.log(content.substring(emotionRuleIdx, emotionRuleIdx + 300));
}
