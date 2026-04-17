import fs from 'fs';

let content = fs.readFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  'utf8'
);

const changes = [];

// 1. Negate line 893 - 如果底稿偏权谋
const marker893 = "assert.ok(prompt.includes('如果底稿偏权谋";
if (content.includes(marker893)) {
  content = content.replace(marker893, "assert.ok(!prompt.includes('如果底稿偏权谋");
  changes.push("893: negated 如果底稿偏权谋");
} else {
  changes.push("893: SKIP");
}

// 2. Negate line 899 - 不能直接执行
const marker899 = "assert.ok(prompt.includes('不能直接执行";
if (content.includes(marker899)) {
  content = content.replace(marker899, "assert.ok(!prompt.includes('不能直接执行");
  changes.push("899: negated 不能直接执行");
} else {
  changes.push("899: SKIP");
}

// 3. Negate lines 905-907 multi-line - 只能拿旧账加压
const old906 = `assert.ok(
    prompt.includes('当前 5 集批次若其他道观、使者、长老或新上位者出场，他们只能拿旧账加压')
  )`;
const new906 = `assert.ok(
    !prompt.includes('当前 5 集批次若其他道观、使者、长老或新上位者出场，他们只能拿旧账加压')
  )`;
if (content.includes(old906)) {
  content = content.replace(old906, new906);
  changes.push("905-907: negated 只能拿旧账加压");
} else {
  changes.push("905-907: SKIP");
}

// 4. Negate line 909 - 前 1-6 集不要
const marker909 = "assert.ok(prompt.includes('前 1-6 集不要让人物把";
if (content.includes(marker909)) {
  content = content.replace(marker909, "assert.ok(!prompt.includes('前 1-6 集不要让人物把");
  changes.push("909: negated 前 1-6 集不要");
} else {
  changes.push("909: SKIP");
}

// 5. Negate lines 910-914 multi-line - 第6集以后搜屋
const old910 = `assert.ok(
    prompt.includes(
      '第6集以后每集第一场优先从搜屋、门外堵截、押送路上、医庐换药、地窖取物，暗巷换手、山林追逃、潭边毁契这些私人动作开'
    )
  )`;
const new910 = `assert.ok(
    !prompt.includes(
      '第6集以后每集第一场优先从搜屋、门外堵截、押送路上、医庐换药、地窖取物，暗巷换手、山林追逃、潭边毁契这些私人动作开'
    )
  )`;
if (content.includes(old910)) {
  content = content.replace(old910, new910);
  changes.push("910-914: negated 第6集以后搜屋");
} else {
  changes.push("910-914: SKIP");
}

// 6. Negate line 918-920 - 不准从宗门合议
const marker918 = "assert.ok(prompt.includes('不准从宗门合议、代表宣判、卷轴宣读、长老落锤或侧殿静室听处分开场'))";
const new918 = "assert.ok(!prompt.includes('不准从宗门合议、代表宣判、卷轴宣读、长老落锤或侧殿静室听处分开场'))";
if (content.includes(marker918)) {
  content = content.replace(marker918, new918);
  changes.push("918: negated 不准从宗门合议");
} else {
  changes.push("918: SKIP");
}

// 7. Negate line 921 - 别把台词策划词
const marker921 = "assert.ok(prompt.includes('别把台词、动作或场尾写成";
if (content.includes(marker921)) {
  content = content.replace(marker921, "assert.ok(!prompt.includes('别把台词、动作或场尾写成");
  changes.push("921: negated 别把台词策划词");
} else {
  changes.push("921: SKIP");
}

// 8. Negate line 923-925 - 当前批次末集第一场必须
const marker923 = "assert.ok(prompt.includes('当前批次末集第一场必须从上一集";
if (content.includes(marker923)) {
  content = content.replace(marker923, "assert.ok(!prompt.includes('当前批次末集第一场必须从上一集");
  changes.push("923: negated 末集第一场必须");
} else {
  changes.push("923: SKIP");
}

// 9. Negate lines 926-928 multi-line - 末两集不准临时引入
const old926 = `assert.ok(
    prompt.includes('当前批次末两集不准临时引入堂兄、师叔、新残党头子、新长老名号等新名字接管尾声')
  )`;
const new926 = `assert.ok(
    !prompt.includes('当前批次末两集不准临时引入堂兄、师叔、新残党头子、新长老名号等新名字接管尾声')
  )`;
if (content.includes(old926)) {
  content = content.replace(old926, new926);
  changes.push("926-928: negated 末两集不准临时引入");
} else {
  changes.push("926-928: SKIP");
}

// 10. Negate line 930 - 必须碰守空主题
const marker930 = "assert.ok(prompt.includes('当前 5 集批次如果必须碰";
if (content.includes(marker930)) {
  content = content.replace(marker930, "assert.ok(!prompt.includes('当前 5 集批次如果必须碰");
  changes.push("930: negated 必须碰守空主题");
} else {
  changes.push("930: SKIP");
}

// 11. Negate line 931 - 不准写师父说
const marker931 = "assert.ok(prompt.includes('不准写\"师父说……所以……";
if (content.includes(marker931)) {
  content = content.replace(marker931, "assert.ok(!prompt.includes('不准写\"师父说……所以……");
  changes.push("931: negated 不准写师父说");
} else {
  changes.push("931: SKIP");
}

// 12. Negate line 933 - 不要写象征意义
const marker933 = "assert.ok(prompt.includes('不要写\"象征意义";
if (content.includes(marker933)) {
  content = content.replace(marker933, "assert.ok(!prompt.includes('不要写\"象征意义");
  changes.push("933: negated 不要写象征意义");
} else {
  changes.push("933: SKIP");
}

// 13. Negate line 935 - 包扎换药
const marker935 = "assert.ok(prompt.includes('包扎、换药、歇脚、潭边喘气这类场也必须继续推进'))";
if (content.includes(marker935)) {
  content = content.replace(marker935, "assert.ok(!prompt.includes('包扎、换药、歇脚、潭边喘气这类场也必须继续推进'))");
  changes.push("935: negated 包扎换药");
} else {
  changes.push("935: SKIP");
}

// 14. Negate line 937 - 每场只写一个推进回合
const marker937 = "assert.ok(prompt.includes('当前 5 集批次每场只写一个推进回合；公审、议事、对质场最多 4-6 句对白'))";
if (content.includes(marker937)) {
  content = content.replace(marker937, "assert.ok(!prompt.includes('当前 5 集批次每场只写一个推进回合；公审、议事、对质场最多 4-6 句对白'))");
  changes.push("937: negated 每场只写一个推进回合");
} else {
  changes.push("937: SKIP");
}

// 15. Negate line 938 - 末集整集最多只允许1场制度确认
const marker938 = "assert.ok(prompt.includes('当前批次末集整集最多只允许 1 场制度确认'))";
if (content.includes(marker938)) {
  content = content.replace(marker938, "assert.ok(!prompt.includes('当前批次末集整集最多只允许 1 场制度确认'))");
  changes.push("938: negated 末集整集最多只允许1场制度确认");
} else {
  changes.push("938: SKIP");
}

// 16. Negate line 940 - 不要写画外音旁白OS
const marker940 = "assert.ok(prompt.includes('不要写\"象征意义、话语权、势力格局、内部分裂\"这类抽象推进词'))";
if (content.includes(marker940)) {
  content = content.replace(marker940, "assert.ok(!prompt.includes('不要写\"象征意义、话语权、势力格局、内部分裂\"这类抽象推进词'))");
  changes.push("940: negated 不要写象征意义话语权");
} else {
  changes.push("940: SKIP");
}

// 17. Negate line 941 - "被带去问话"不算推进
const marker941 = "assert.ok(prompt.includes('\"被带去问话\"不算推进'))";
if (content.includes(marker941)) {
  content = content.replace(marker941, "assert.ok(!prompt.includes('\"被带去问话\"不算推进'))");
  changes.push("941: negated 被带去问话");
} else {
  changes.push("941: SKIP");
}

// 18. Negate line 945 - 潜入搜屋包扎换药不能默剧
const marker945 = "assert.ok(prompt.includes('潜入、搜屋、尾随、躲藏、包扎、换药这类场也不能整场默剧'))";
if (content.includes(marker945)) {
  content = content.replace(marker945, "assert.ok(!prompt.includes('潜入、搜屋、尾随、躲藏、包扎、换药这类场也不能整场默剧'))");
  changes.push("945: negated 潜入搜屋默剧");
} else {
  changes.push("945: SKIP");
}

// 19. Negate line 948 - 末集余波
const marker948 = "assert.ok(prompt.includes('当前批次末集的余波优先留在人际站位、职责变化、证据外流、伤势代价和旧账未清'))";
if (content.includes(marker948)) {
  content = content.replace(marker948, "assert.ok(!prompt.includes('当前批次末集的余波优先留在人际站位、职责变化、证据外流、伤势代价和旧账未清'))");
  changes.push("948: negated 末集余波");
} else {
  changes.push("948: SKIP");
}

// 20. Negate line 949 - 同一场只保留关键动作
const marker949 = "assert.ok(prompt.includes('同一场只保留能改变局势的关键动作和关键对白'))";
if (content.includes(marker949)) {
  content = content.replace(marker949, "assert.ok(!prompt.includes('同一场只保留能改变局势的关键动作和关键对白'))");
  changes.push("949: negated 同一场只保留关键动作");
} else {
  changes.push("949: SKIP");
}

// 21. Negate line 950 - 同类动作同义威胁
const marker950 = "assert.ok(prompt.includes('同类动作、同义威胁、同一情绪反应不准换句重复写'))";
if (content.includes(marker950)) {
  content = content.replace(marker950, "assert.ok(!prompt.includes('同类动作、同义威胁、同一情绪反应不准换句重复写'))");
  changes.push("950: negated 同类动作同义威胁");
} else {
  changes.push("950: SKIP");
}

// 22. Negate line 951 - 每场只保留1-2条
const marker951 = "assert.ok(prompt.includes('每场只保留 1-2 条关键△动作、1-2 轮有效对打'))";
if (content.includes(marker951)) {
  content = content.replace(marker951, "assert.ok(!prompt.includes('每场只保留 1-2 条关键△动作、1-2 轮有效对打'))");
  changes.push("951: negated 每场只保留1-2条");
} else {
  changes.push("951: SKIP");
}

// 23. Negate line 952 - 少写盯着
const marker952 = "assert.ok(prompt.includes('少写\"盯着/看向/沉默/皱眉/闭眼/意识到\"这类微动作'))";
if (content.includes(marker952)) {
  content = content.replace(marker952, "assert.ok(!prompt.includes('少写\"盯着/看向/沉默/皱眉/闭眼/意识到\"这类微动作'))");
  changes.push("952: negated 少写盯着");
} else {
  changes.push("952: SKIP");
}

// 24. Negate line 953 - 只写意识到判断决定
const marker953 = "assert.ok(prompt.includes('只写\"意识到/明白/判断/决定\"这类判断词'))";
if (content.includes(marker953)) {
  content = content.replace(marker953, "assert.ok(!prompt.includes('只写\"意识到/明白/判断/决定\"这类判断词'))");
  changes.push("953: negated 只写意识到判断决定");
} else {
  changes.push("953: SKIP");
}

fs.writeFileSync(
  'D:/project/xinjuben/src/main/application/script-generation/prompt/create-script-generation-prompt.test.ts',
  content,
  'utf8'
);

for (const c of changes) {
  console.log(c);
}
console.log(`\nTotal: ${changes.length} changes`);
console.log("DONE");
