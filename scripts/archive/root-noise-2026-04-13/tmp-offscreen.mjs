import fs from 'fs';

const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// The non-compact mode uses SCREENPLAY_NO_OFFSCREEN_DIALOGUE
// which should contain the rule about "角色名：对白" and character must be in the scene
// Let me check if it does
const idx = content.indexOf('SCREENPLAY_NO_OFFSCREEN_DIALOGUE_RULE');
if (idx >= 0) {
  console.log('SCREENPLAY_NO_OFFSCREEN_DIALOGUE_RULE:');
  console.log(content.substring(idx, idx + 500));
}
