import fs from 'fs';

const testContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);

// The failing rule has a FULLWIDTH SPACE (U+3000 = 12289) inside it
// This is invisible but causes the string to NOT match the prompt
// Let's find it and replace the rule with the correct version

// The rule currently has: 如果底稿偏权谋、智斗或"靠智慧周旋"
// But there's a U+3000 (fullwidth space) in it somewhere

// Let's find the position of the U+3000
const rule = "如果底稿偏权谋、智斗或\u201c靠智慧周旋\u201d";
const idx = testContent.indexOf(rule);
console.log('Rule idx in test:', idx);

if (idx >= 0) {
  // We found the correct rule with curly quotes but fullwidth space
  // Replace with the CORRECT version (without fullwidth space)
  const correctRule = "如果底稿偏权谋、智斗或\u201c靠智慧周旋\u201d";
  // Actually the rule itself should be correct...
  // The issue is there's a U+3000 somewhere in the middle
  
  // Let me find the exact byte position
  const line884_idx = testContent.indexOf("如果底稿偏权谋、智斗或");
  if (line884_idx >= 0) {
    // Check each character
    let s = "";
    for (let i = line884_idx; i < line884_idx + 50 && i < testContent.length; i++) {
      const c = testContent[i];
      if (c === "'") break;
      s += c;
      if (c.charCodeAt(0) === 12289) {
        console.log('FOUND U+3000 at position', s.length - 1, 'in string');
        console.log('Context:', JSON.stringify(s));
      }
    }
  }
}
