import fs from 'fs';

const promptContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Check the exact string
const rule1 = "相邻两场换打法";
const rule2 = "相邻两场换打法；";
const rule3 = "相邻两场换打法；制度场不连开，外场动作接管。";

console.log('Rule 1 (exact):', rule1, '-> in prompt:', promptContent.includes(rule1));
console.log('Rule 2 (with semicolon):', rule2, '-> in prompt:', promptContent.includes(rule2));
console.log('Rule 3 (full):', rule3, '-> in prompt:', promptContent.includes(rule3));

// Search for "相邻两场"
const idx = promptContent.indexOf('相邻两场');
if (idx >= 0) {
  console.log('\nFound "相邻两场" at', idx);
  console.log('Context:', promptContent.substring(idx-10, idx+100));
  
  // Extract the actual rule
  const after = promptContent.substring(idx);
  const end = after.indexOf("'") !== -1 ? after.indexOf("'") : 200;
  const actualRule = after.substring(0, Math.min(100, after.indexOf("',") !== -1 ? after.indexOf("',") : 100));
  console.log('Actual rule excerpt:', actualRule.substring(0, 100));
}
