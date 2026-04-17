import fs from 'fs';

const promptContent = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

// Check if "相邻两场换打法" is in craftRules
const craftRulesIdx = promptContent.indexOf('const craftRules');
if (craftRulesIdx >= 0) {
  const afterCraft = promptContent.substring(craftRulesIdx);
  const endCraft = afterCraft.indexOf('];');
  const craftRulesSection = afterCraft.substring(0, endCraft + 2);
  console.log('craftRules found, length:', craftRulesSection.length);
  console.log('Contains 相邻两场换打法:', craftRulesSection.includes('相邻两场换打法'));
  
  if (craftRulesSection.includes('相邻两场换打法')) {
    const idx = craftRulesSection.indexOf('相邻两场换打法');
    console.log('Context:', craftRulesSection.substring(idx-20, idx+100));
  }
}

// Check SCREENPLAY_NO_VO_RULE
const voIdx = promptContent.indexOf('SCREENPLAY_NO_VO_RULE');
if (voIdx >= 0) {
  const before = promptContent.substring(voIdx - 200, voIdx);
  const after = promptContent.substring(voIdx, voIdx + 500);
  console.log('\nSCREENPLAY_NO_VO_RULE context:');
  console.log('Before:', before);
  console.log('Rule:', after.substring(0, 200));
}

// Check how craftRules is used in the function
const craftUsageIdx = promptContent.indexOf('craftRules');
console.log('\ncraftRules usage at:', craftUsageIdx);
const usageAfter = promptContent.substring(craftUsageIdx, craftUsageIdx + 500);
console.log('Context:', usageAfter.substring(0, 500));
