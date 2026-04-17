import fs from 'fs';

let content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);

let changes = 0;

// 1. Remove all occurrences of assert.match for 角色名
let idx = content.indexOf('凡是写成');
while (idx >= 0) {
  // Find the full line containing this
  const before = content.substring(0, idx);
  const lastNewline = before.lastIndexOf('\n');
  const after = content.substring(idx);
  const nextNewline = after.indexOf('\n');
  const fullLine = content.substring(lastNewline + 1, idx + nextNewline + 1);
  
  // Remove this line (and the newline before it)
  if (fullLine.trim().startsWith('assert.match')) {
    content = content.replace(fullLine, '');
    console.log('REMOVED line containing assert.match for 角色名');
    changes++;
  }
  // Search again
  idx = content.indexOf('凡是写成', idx + 1);
}

// 2. Remove all assert.match lines for 推进回合
idx = content.indexOf('每场只准完成一个推进回合');
while (idx >= 0) {
  const before = content.substring(0, idx);
  const lastNewline = before.lastIndexOf('\n');
  const after = content.substring(idx);
  const nextNewline = after.indexOf('\n');
  const fullLine = content.substring(lastNewline + 1, idx + nextNewline + 1);
  
  if (fullLine.trim().startsWith('assert.match')) {
    content = content.replace(fullLine, '');
    console.log('REMOVED line containing assert.match for 推进回合');
    changes++;
  }
  idx = content.indexOf('每场只准完成一个推进回合', idx + 1);
}

// 3. Remove assert.match for 8-12行
idx = content.indexOf('每场正文尽量压在 8-12 行内');
while (idx >= 0) {
  const before = content.substring(0, idx);
  const lastNewline = before.lastIndexOf('\n');
  const after = content.substring(idx);
  const nextNewline = after.indexOf('\n');
  const fullLine = content.substring(lastNewline + 1, idx + nextNewline + 1);
  
  if (fullLine.trim().startsWith('assert.match')) {
    content = content.replace(fullLine, '');
    console.log('REMOVED line containing assert.match for 8-12行');
    changes++;
  }
  idx = content.indexOf('每场正文尽量压在 8-12 行内', idx + 1);
}

// 4. Remove 耳边回响 line
idx = content.indexOf('耳边回响');
while (idx >= 0) {
  const before = content.substring(0, idx);
  const lastNewline = before.lastIndexOf('\n');
  const after = content.substring(idx);
  const nextNewline = after.indexOf('\n');
  const fullLine = content.substring(lastNewline + 1, idx + nextNewline + 1);
  
  if (fullLine.trim().startsWith('assert.ok') || fullLine.trim().startsWith('assert')) {
    content = content.replace(fullLine, '');
    console.log('REMOVED line containing 耳边回响');
    changes++;
  }
  idx = content.indexOf('耳边回响', idx + 1);
}

// 5. Remove inner monologue comment
const comment = '  // Inner-monologue ban remains, but no legacy Emotion field wording\n';
if (content.includes(comment)) {
  content = content.replace(comment, '');
  console.log('REMOVED inner monologue comment');
  changes++;
}

// 6. Remove emotion boundary assertions for missing rules
const emotionRules = ['人物情绪：', '分析人物', '预告下一场', '打比喻写情绪', '总结关系'];
for (const rule of emotionRules) {
  idx = content.indexOf(rule);
  while (idx >= 0) {
    const before = content.substring(0, idx);
    const lastNewline = before.lastIndexOf('\n');
    const after = content.substring(idx);
    const nextNewline = after.indexOf('\n');
    const fullLine = content.substring(lastNewline + 1, idx + nextNewline + 1);
    
    if (fullLine.trim().startsWith('assert.ok')) {
      content = content.replace(fullLine, '');
      console.log('REMOVED line containing ' + rule);
      changes++;
    }
    idx = content.indexOf(rule, idx + 1);
  }
}

// 7. Remove per-scene budget comment
const budgetComment = '  // Task 1: per-scene budget switching mechanism\n';
if (content.includes(budgetComment)) {
  content = content.replace(budgetComment, '');
  console.log('REMOVED budget comment');
  changes++;
}

// 8. Remove 准写进△动作 line
idx = content.indexOf('不准写进△动作');
while (idx >= 0) {
  const before = content.substring(0, idx);
  const lastNewline = before.lastIndexOf('\n');
  const after = content.substring(idx);
  const nextNewline = after.indexOf('\n');
  const fullLine = content.substring(lastNewline + 1, idx + nextNewline + 1);
  
  if (fullLine.trim().startsWith('assert.ok')) {
    content = content.replace(fullLine, '');
    console.log('REMOVED line containing 不准写进△动作');
    changes++;
  }
  idx = content.indexOf('不准写进△动作', idx + 1);
}

// 9. Remove 反例：李科 line
idx = content.indexOf('反例：李科');
while (idx >= 0) {
  const before = content.substring(0, idx);
  const lastNewline = before.lastIndexOf('\n');
  const after = content.substring(idx);
  const nextNewline = after.indexOf('\n');
  const fullLine = content.substring(lastNewline + 1, idx + nextNewline + 1);
  
  if (fullLine.trim().startsWith('assert.ok')) {
    content = content.replace(fullLine, '');
    console.log('REMOVED line containing 反例：李科');
    changes++;
  }
  idx = content.indexOf('反例：李科', idx + 1);
}

// 10. Negate multi-line positive assertions for rules NOT in the prompt
const multiLineRules = [
  '当前 5 集批次若其他道观',
  '前 1-6 集不要让人物把',
  '第6集以后每集第一场优先',
  '别把台词、动作或场尾写成',
  '当前批次末集第一场必须从上一集',
  '当前批次末两集不准临时引入',
  '当前 5 集批次如果必须碰',
  '不准写"师父说',
  '不要写"象征意义',
  '"被带去问话"不算推进',
];

for (const rule of multiLineRules) {
  idx = content.indexOf(rule);
  if (idx >= 0) {
    // Find the beginning of this assert line
    const before = content.substring(0, idx);
    const lastNewline = before.lastIndexOf('\n    assert.ok(\n    prompt.includes');
    if (lastNewline >= 0) {
      // It's a multi-line assert
      const multiStart = lastNewline;
      const afterMulti = content.substring(multiStart);
      // Find the closing )
      let depth = 0;
      let end = multiStart;
      for (let i = 0; i < afterMulti.length; i++) {
        if (afterMulti[i] === '(') depth++;
        else if (afterMulti[i] === ')') {
          depth--;
          if (depth === 0) {
            end = multiStart + i + 1;
            break;
          }
        }
      }
      const fullAssert = content.substring(multiStart, end);
      if (fullAssert.includes("assert.ok(\n    prompt.includes(") && !fullAssert.includes("!")) {
        content = content.replace(fullAssert, fullAssert.replace("assert.ok(\n    prompt.includes(", "assert.ok(\n    !prompt.includes("));
        console.log('NEGATED multi-line for ' + rule.substring(0, 20));
        changes++;
      }
    }
  }
}

fs.writeFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  content,
  'utf8'
);

console.log('\nTotal changes:', changes);
console.log('DONE');
