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

const prompt = [
  'sceneByScene 规则：',
  '剧本名称：守钥人',
  '题材：古风悬疑成长',
  '主题：人在压力里被逼亮底',
  '主角：少年守钥人',
  '核心冲突：少年守钥人必须在守住钥匙与救下小镇少女之间做选择，恶霸和山中妖物都在逼近。',
  '当前规划块：第1块（第1-5集）',
  '粗纲逐集：',
  '第1集：少年守钥人发现恶霸拿小镇少女逼他交出钥匙。',
  '第2集：恶霸把小镇少女押到井口，山中妖物顺着钥匙异动。',
  '人物行动抓手：',
  '少年守钥人：被迫守住钥匙和小镇少女',
  '已确认设定（必须在详细大纲中承接）：',
  '【恶霸施压线】恶霸会持续拿小镇少女和钥匙逼少年守钥人亮底。'
].join('\n')

const { createMockResponse } = await loadMockModule()
const response = createMockResponse({ task: 'decision_assist', prompt })
const payload = JSON.parse(response.text)

assert.equal(payload.episodes.length, 2)
assert.match(payload.episodes[0].summary, /恶霸/)
assert.match(payload.episodes[0].summary, /小镇少女/)
assert.match(payload.episodes[1].summary, /山中妖物/)
assert.match(payload.episodes[0].sceneByScene[0].tension, /恶霸/)
assert.match(payload.episodes[0].sceneByScene[0].tension, /小镇少女/)
assert.doesNotMatch(payload.episodes[0].sceneByScene[0].tension, /对手|主角/)
assert.match(payload.episodes[0].sceneByScene[1].hookEnd, /已经/)
assert.doesNotMatch(payload.episodes[0].sceneByScene[1].hookEnd, /继续点挂出来|逼住/)
assert.notEqual(
  JSON.stringify(payload.episodes[0].sceneByScene),
  JSON.stringify(payload.episodes[1].sceneByScene)
)

console.log('PASS mock detailed outline regression')
