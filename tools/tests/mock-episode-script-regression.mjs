import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

function loadMockModule() {
  const source = fs.readFileSync('src/main/application/ai/ai-mock-response.ts', 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`)
}

function buildPrompt(episodeNo, summary, sceneOne, sceneTwo) {
  return [
    '【前情提要】',
    '总历史摘要：[第1-2场]旧冲突推进',
    '',
    '最近两场：',
    '第1集：开场=旧场景｜收尾=旧钩子｜压力=旧代价',
    '',
    `【当前集任务】第 ${episodeNo} 集`,
    '- 当前剧本批次：第1-5集（第1批）',
    '- 当前5集批次前情：主线仍在升级',
    '- 【逐集细纲】必须严格按以下场次写：',
    `- 第1场：${sceneOne}`,
    `- 第2场：${sceneTwo}`,
    '- 每场必须包含：地点、人物、△动作、对白',
    '- 集尾必须落在最后一场的hookEnd上',
    '- 主角（少年守钥人）这集只咬住：守住钥匙与小镇少女',
    '- 当前块活跃人物：少年守钥人、小镇少女、恶霸',
    `- 这一集只干这一件事：${summary}`,
    '',
    '【输出格式】',
    `第${episodeNo}集`
  ].join('\n')
}

const prompt1 = buildPrompt(
  1,
  '少年守钥人发现恶霸拿小镇少女逼他交出钥匙。',
  '井口·夜｜少年守钥人追到井边，发现小镇少女被逼到退路尽头｜张力：恶霸拿钥匙和小镇少女同时压他表态｜钩：井下妖物突然缠住脚踝',
  '祠堂外巷·夜｜恶霸逼少年守钥人当场亮底，小镇少女反手点破他的局｜张力：主角必须在交钥匙和救人之间二选一｜钩：恶霸已经把刀抵到小镇少女喉前'
)

const prompt2 = buildPrompt(
  2,
  '少年守钥人刚救下小镇少女，山中妖物立刻顺着钥匙反扑。',
  '山道·日｜少年守钥人拖着小镇少女往山门撤，恶霸带人封住退路｜张力：山中妖物顺着钥匙异动，恶霸逼他立刻交底｜钩：山中妖物已经扑上石阶',
  '废庙内·夜｜小镇少女抢先夺灯，少年守钥人转身拦住恶霸｜张力：主角必须先挡妖物还是先压住恶霸｜钩：钥匙当场亮起，把整间庙照成惨白'
)

const { createMockResponse } = await loadMockModule()

const response1 = createMockResponse({
  task: 'episode_script',
  prompt: prompt1,
  runtimeHints: { episode: 1 }
})
const response2 = createMockResponse({
  task: 'episode_script',
  prompt: prompt2,
  runtimeHints: { episode: 2 }
})

assert.match(response1.text, /少年守钥人/)
assert.match(response1.text, /小镇少女/)
assert.match(response1.text, /恶霸/)
assert.doesNotMatch(response1.text, /人物：主角，.*对手/)
assert.match(response1.text, /^1\-1\s*(日|夜)(内|外|内外)/m)
assert.match(response1.text, /^1\-2\s*(日|夜)(内|外|内外)/m)
assert.notEqual(
  response1.text.replace(/第1集|1-1|1-2/g, ''),
  response2.text.replace(/第2集|2-1|2-2/g, '')
)

console.log('PASS mock episode script regression')
