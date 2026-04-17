import fs from 'fs';
const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Find the emotion rule
const idx = content.indexOf('const SCREENPLAY_EMOTION_RULE');
if (idx >= 0) {
  console.log('SCREENPLAY_EMOTION_RULE:');
  console.log(content.substring(idx, idx + 300));
}

// Find where '不可拍心理句' might appear
const badIdx = content.indexOf('不可拍');
if (badIdx >= 0) {
  console.log('\n不可拍附近:');
  console.log(content.substring(Math.max(0, badIdx-50), badIdx+100));
}

// Find the craftRules area for compact mode
const craftIdx = content.indexOf("SCREENPLAY_FIRST_DRAFT_BAN_RULE");
if (craftIdx >= 0) {
  console.log('\ncraftRules after FIRST_DRAFT_BAN_RULE:');
  console.log(content.substring(craftIdx, craftIdx + 500));
}
