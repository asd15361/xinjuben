import fs from 'fs';

const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Check SCREENPLAY_NO_OFFSCREEN_DIALOGUE_RULE
const idx = content.indexOf('SCREENPLAY_NO_OFFSCREEN_DIALOGUE_RULE');
if (idx >= 0) {
  console.log('SCREENPLAY_NO_OFFSCREEN_DIALOGUE_RULE:');
  console.log(content.substring(idx, idx + 300));
}

// Check SCREENPLAY_EMOTION_RULE
const emotionIdx = content.indexOf('SCREENPLAY_EMOTION_RULE');
if (emotionIdx >= 0) {
  console.log('\nSCREENPLAY_EMOTION_RULE:');
  console.log(content.substring(emotionIdx, emotionIdx + 200));
}

// Check SCREENPLAY_RESULT_LANDING_RULE
const resultIdx = content.indexOf('SCREENPLAY_RESULT_LANDING_RULE');
if (resultIdx >= 0) {
  console.log('\nSCREENPLAY_RESULT_LANDING_RULE:');
  console.log(content.substring(resultIdx, resultIdx + 200));
}

// Check SCREENPLAY_ANTI_BLOAT_RULE
const antiIdx = content.indexOf('SCREENPLAY_ANTI_BLOAT_RULE');
if (antiIdx >= 0) {
  console.log('\nSCREENPLAY_ANTI_BLOAT_RULE:');
  console.log(content.substring(antiIdx, antiIdx + 200));
}

// Check SCREENPLAY_CONCISE_LINE_RULE
const conciseIdx = content.indexOf('SCREENPLAY_CONCISE_LINE_RULE');
if (conciseIdx >= 0) {
  console.log('\nSCREENPLAY_CONCISE_LINE_RULE:');
  console.log(content.substring(conciseIdx, conciseIdx + 300));
}

// Check '禁止停在' related
const forbidIdx = content.indexOf('禁止停在');
if (forbidIdx >= 0) {
  console.log('\n禁止停在:');
  console.log(content.substring(forbidIdx, forbidIdx + 200));
}

// Check '每场最后一条' related
const eachSceneIdx = content.indexOf('每场最后一条');
if (eachSceneIdx >= 0) {
  console.log('\n每场最后一条:');
  console.log(content.substring(eachSceneIdx, eachSceneIdx + 200));
}

// Check if '耳边回响' is in the file anywhere
const耳边Idx = content.indexOf('耳边回响');
if (耳边Idx >= 0) {
  console.log('\n耳边回响 FOUND:');
  console.log(content.substring(耳边Idx-30, 耳边Idx+100));
}

// Check SCREENPLAY_RESULT_LANDING_RULE content
const RL = content.indexOf('const SCREENPLAY_RESULT_LANDING_RULE');
if (RL >= 0) {
  console.log('\nSCREENPLAY_RESULT_LANDING_RULE FULL:');
  console.log(content.substring(RL, RL + 500));
}

// Check SCREENPLAY_CONCISE_LINE_RULE FULL
const SC = content.indexOf('const SCREENPLAY_CONCISE_LINE_RULE');
if (SC >= 0) {
  console.log('\nSCREENPLAY_CONCISE_LINE_RULE FULL:');
  console.log(content.substring(SC, SC + 500));
}
