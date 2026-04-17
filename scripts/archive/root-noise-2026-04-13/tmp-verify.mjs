import fs from 'fs';

const content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.ts',
  'utf8'
);

const rules = [
  '如果底稿偏权谋、智斗或"靠智慧周旋"',
  '不能直接执行"废修为、收钥匙、投入炼炉、当众宣判"这类终局动作',
  '当前 5 集批次若其他道观、使者、长老或新上位者出场，他们只能拿旧账加压',
  '前 1-6 集不要让人物把"谦卦""不争""大道""真镇守"直接讲出口',
  '别把台词、动作或场尾写成"争证据、争站队、争时间、主导权、推进、升级、收束"这类策划词',
  '不准从宗门合议、代表宣判、卷轴宣读、长老落锤或侧殿静室听处分开场',
  '不准写"师父说……所以……""守空才能不争""空的，才是真的"这类问答式定义句',
];

console.log('Checking rules in prompt:');
for (const r of rules) {
  const idx = content.indexOf(r);
  console.log(`  ${idx >= 0 ? 'IN' : 'OUT'}: ${r.substring(0, 50)}`);
}
