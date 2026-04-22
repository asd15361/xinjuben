import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  hasRawPlaceholderStubLeak,
  hasVoiceOverLeak,
  hasPollutedScreenplayContent,
  looksLikeScreenplayFormat,
  parseScreenplayScenes
} from './screenplay-format.ts'
import { inspectScreenplayQualityEpisode } from './screenplay-quality.ts'
// import { parseGeneratedScene } from '../../../main/application/script-generation/runtime/parse-generated-scene.ts'

const QUALITY_CODEX_SAMPLE = readFileSync(
  new URL('../../../../.codex/script-parse-failure-scene-1.txt', import.meta.url),
  'utf-8'
)

const FRESH_RUNTIME_FAILURE_SAMPLE = readFileSync(
  new URL('../../../../.codex/script-parse-failure-scene-1.txt', import.meta.url),
  'utf-8'
)

test('looksLikeScreenplayFormat accepts fresh runtime screenplay sample on main predicate', () => {
  assert.equal(looksLikeScreenplayFormat(FRESH_RUNTIME_FAILURE_SAMPLE), true)
})

test('parseScreenplayScenes keeps both scenes and meaningful roster for fresh runtime sample', () => {
  const scenes = parseScreenplayScenes(FRESH_RUNTIME_FAILURE_SAMPLE)

  assert.equal(scenes.length, 2)
  assert.equal(scenes[0]?.sceneCode, '1-1')
  assert.deepEqual(scenes[0]?.characterRoster, [
    '黎明',
    '小柔',
    '小柔父',
    '李科',
    '李科手下甲',
    '乙',
    '围观人群'
  ])
  assert.equal(scenes[1]?.sceneCode, '1-2')
  assert.deepEqual(scenes[1]?.characterRoster, ['黎明', '小柔', '小柔父', '李科手下丙'])
})

test('hasPollutedScreenplayContent does not reject fresh runtime screenplay sample', () => {
  assert.equal(hasPollutedScreenplayContent(FRESH_RUNTIME_FAILURE_SAMPLE), false)
})

test('parseScreenplayScenes accepts bold scene heading and bold role names', () => {
  const screenplay = `**第1集**

**1-1 商场［内］［夜］**
人物：林暖，张岩
△林暖推门而入，目光冰冷。
**林暖**：（冷笑）你以为我会退？
**张岩**：（压低声音）今天你退也得退。
△张岩抬手拦住去路。`

  const scenes = parseScreenplayScenes(screenplay)

  assert.equal(scenes.length, 1)
  assert.equal(scenes[0]?.sceneCode, '1-1')
  assert.equal(scenes[0]?.characterRoster?.[0], '林暖')
})

test('parseScreenplayScenes accepts time-first headings with and without location label', () => {
  const screenplay = `第1集

1-1 傍晚｜地点：闹市街口
人物：黎明，李科
△李科将刀架在黎明肩头。
李科：交出来。

1-2 入夜｜地点：破屋外巷
人物：黎明，小柔
△黎明贴着墙根逼近木门。
小柔：他们还在外面。

1-3 黎明前｜水潭边石滩
人物：黎明，小柔
△黎明伸手去解绳结。
黎明：先别出声。

1-4 破晓前｜地点：医庐后院
人物：黎明，小柔
△药柜暗格半开，玉简露出一角。
黎明：先把它藏好。`

  const scenes = parseScreenplayScenes(screenplay)

  assert.equal(scenes.length, 4)
  assert.equal(scenes[0]?.sceneHeading, '1-1 傍晚｜地点：闹市街口')
  assert.equal(scenes[0]?.sceneCode, '1-1')
  assert.deepEqual(scenes[0]?.characterRoster, ['黎明', '李科'])
  assert.equal(scenes[1]?.sceneHeading, '1-2 入夜｜地点：破屋外巷')
  assert.equal(scenes[1]?.sceneCode, '1-2')
  assert.equal(scenes[2]?.sceneHeading, '1-3 黎明前｜水潭边石滩')
  assert.equal(scenes[2]?.sceneCode, '1-3')
  assert.equal(scenes[3]?.sceneHeading, '1-4 破晓前｜地点：医庐后院')
  assert.equal(scenes[3]?.sceneCode, '1-4')
})

test('parseScreenplayScenes accepts location-only headings when model omits time marker', () => {
  const screenplay = `第10集

10-1 玄玉宫山门外石阶
人物：黎明，残党丙，小柔
△残党丙把断簪扔到黎明脚边。
残党丙：拿碎片来换人。

10-2 医庐内室
人物：黎明，李诚阳
△李诚阳把令牌放到榻边。
李诚阳：三日内报备异动。

10-3 午后 医庐外潭边小径
人物：黎明，残党头目
△残党头目从树后走出。
残党头目：账册副本在我手里。`

  const scenes = parseScreenplayScenes(screenplay)

  assert.equal(scenes.length, 3)
  assert.equal(scenes[0]?.sceneCode, '10-1')
  assert.equal(scenes[0]?.sceneHeading, '10-1 玄玉宫山门外石阶')
  assert.equal(scenes[1]?.sceneCode, '10-2')
  assert.equal(scenes[1]?.sceneHeading, '10-2 医庐内室')
  assert.equal(scenes[2]?.sceneCode, '10-3')
})

test('hasPollutedScreenplayContent rejects assistant-style explanation leakage', () => {
  const contaminated = `第12集

12-1夜内 废弃磨坊
人物：恶霸，少年守钥人，小镇少女

△恶霸扣住少女手腕，将她按在石磨边缘。
恶霸：钥匙给我，不然拧断她这只手。
少年守钥人：你先放人。
△恶霸趁机一把扯下他腰间皮囊！

12-2日外 山崖边
人物：恶霸，少年守钥人，小镇少女

△恶霸举着皮囊站在崖边。
恶霸：现在它是我的了。

**改写说明**：
△- 如果需要我可以继续调整。`

  assert.equal(hasPollutedScreenplayContent(contaminated), true)
})

test('hasRawPlaceholderStubLeak catches markdown placeholder stub before real scene', () => {
  const contaminated = `第28集

## 28-1 深夜｜地点：医庐内室
人物：**人物**
△# 第28集

## 28-1 深夜｜地点：医庐内室
人物：黎明，李诚阳
△药炉余烬泛红，墙缝里还压着潮气。
李诚阳：有人提前翻过这里。
黎明：不是翻过，是在等我回来。`

  assert.equal(hasRawPlaceholderStubLeak(contaminated), true)
  assert.equal(hasPollutedScreenplayContent(contaminated), true)
})

// ─────────────────────────────────────────────────────────────────────────────
// Quality passing sample — codex sample with 2 properly headed scenes passes quality
// ─────────────────────────────────────────────────────────────────────────────

test('codex sample: 2 scenes → passes SCENE_COUNT_QUALITY 2-4 gate', () => {
  // The codex sample (used in existing tests) has scene headings 1-1 and 1-2
  // and passes quality — this is the reference "good" output.
  const scenes = parseScreenplayScenes(QUALITY_CODEX_SAMPLE)
  assert.equal(scenes.length, 2, 'codex sample should have 2 scenes')
  assert.equal(scenes[0]?.sceneCode, '1-1')
  assert.equal(scenes[1]?.sceneCode, '1-2')

  // Quality evaluation: 2 scenes is within 2-4 range → no scene count problem
  const report = inspectScreenplayQualityEpisode({
    sceneNo: 1,
    screenplay: QUALITY_CODEX_SAMPLE,
    action: '',
    dialogue: '',
    emotion: ''
  })
  assert.equal(report.sceneCount, 2, 'quality report should show 2 scenes')
  const sceneCountProblem = report.problems.find((p) => p.includes('场次数'))
  assert.equal(
    sceneCountProblem,
    undefined,
    '2 scenes should NOT trigger scene count quality problem'
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// Parse degradation — multi-A/D/E without scene headings → only 1 scene
// This is the core of the "1 scene/集" bug: model generates A/D/E for multiple
// scenes but omits scene headings, so parseScreenplayScenes only sees 1 heading
// (the synthetic "1-1 日" from parseGeneratedScene).
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Tests depending on parseGeneratedScene (deleted — moved to server-side)
// Commented out until server-side equivalent is available
// ─────────────────────────────────────────────────────────────────────────────

/*
const ADE_MULTI_SCENE_WITHOUT_HEADINGS = `Action:
△林守钥站在旧库门口，手指死死按住腰间布袋。
沈黑虎：（冷笑）你以为我会退？

Dialogue:
林守钥：（咬牙）你要的东西不在这里。
沈黑虎：（冷笑）那就用你弟弟换。

Emotion:
△林守钥手心全是汗，他知道这次拖不了了。

Action:
△林守钥趁沈黑虎分神，从后窗翻出。
林守钥：（低声）账册已经不在了。

Dialogue:
沈黑虎：（发现窗户开了，吼）追！

Emotion:
△林守钥拼命往山上跑，耳边全是自己的心跳声。`

test('parseScreenplayScenes degrades to 1 scene when A/D/E blocks lack headings', () => {
  const parsed = parseGeneratedScene(ADE_MULTI_SCENE_WITHOUT_HEADINGS, 1)
  assert.equal(parsed.screenplayScenes?.length ?? 0, 1, 'A/D/E output with no headings → 1 synthetic scene')
  const report = inspectScreenplayQualityEpisode(parsed)
  assert.equal(report.sceneCount, 1, 'quality report should show only 1 scene')
  const sceneCountProblem = report.problems.find(p => p.includes('场次数'))
  assert.ok(sceneCountProblem, 'should have scene count problem: 1 is outside 2-4 range')
})
*/

// ─────────────────────────────────────────────────────────────────────────────
// CONTROL: pure screenplay with two headings → parseScreenplayScenes → 2 scenes
// This proves the parse chain CAN handle multi-scene when input is proper
// screenplay format (not A/D/E). The limitation is in the A/D/E → screenplay
// reconstruction step in parseGeneratedScene, not in parseScreenplayScenes itself.
// ─────────────────────────────────────────────────────────────────────────────

test('parseScreenplayScenes handles bold multi-heading with bare time marker 晨 (regression)', () => {
  // Model generates **1-1 日**, **1-2 夜**, **1-3 晨** headings.
  // The bare "晨" time marker was not recognized by matchSceneHeading → 3rd scene lost.
  const screenplay = `**1-1 日**

Action:
第一场内容。

**1-2 夜**

Action:
第二场内容。

**1-3 晨**

Action:
第三场内容。`

  const scenes = parseScreenplayScenes(screenplay)
  assert.equal(scenes.length, 3, '3 bold headings with 晨 → 3 scenes')
  assert.equal(scenes[0]?.sceneCode, '1-1')
  assert.equal(scenes[1]?.sceneCode, '1-2')
  assert.equal(scenes[2]?.sceneCode, '1-3', '3rd scene with 晨 time marker must not be lost')
  assert.equal(scenes[2]?.sceneHeading, '1-3 晨')
})

test('parseScreenplayScenes handles bold multi-heading with 夜 and 晨 mixed (regression)', () => {
  const screenplay = `**2-1 夜**

Action:
第一场。

**2-2 夜**

Action:
第二场。

**2-3 晨**

Action:
第三场。`

  const scenes = parseScreenplayScenes(screenplay)
  assert.equal(scenes.length, 3, 'mixed 夜/晨 headings → 3 scenes')
  assert.equal(scenes[0]?.sceneCode, '2-1')
  assert.equal(scenes[1]?.sceneCode, '2-2')
  assert.equal(scenes[2]?.sceneCode, '2-3')
  assert.equal(scenes[2]?.sceneHeading, '2-3 晨')
})

test('parseScreenplayScenes recognizes 后半夜 as a valid scene time marker', () => {
  const screenplay = `第9集

9-1 深夜
人物：黎明，小柔
△山洞里只剩喘气声。
黎明：先把纸藏好。

9-2 后半夜
人物：黎明，黑影
△黎明翻进执事房窗台。
黑影：你跑不掉。`

  const scenes = parseScreenplayScenes(screenplay)

  assert.equal(scenes.length, 2)
  assert.equal(scenes[1]?.sceneCode, '9-2')
  assert.equal(scenes[1]?.sceneHeading, '9-2 后半夜')
})

test('parseScreenplayScenes drops duplicate placeholder stub when same scene code appears twice', () => {
  const screenplay = `第30集

30-1 日
人物：人物
△第30集

30-1 日 内 破庙偏殿
人物：黎明、易成、小柔
△黎明肩头猛地一沉，反手把小柔拽到残墙后。
易成：弩手还在外面，别让他们看见账页。
△门外脚步声已经逼到破庙门槛。`

  const scenes = parseScreenplayScenes(screenplay)

  assert.equal(scenes.length, 1)
  assert.equal(scenes[0]?.sceneCode, '30-1')
  assert.equal(scenes[0]?.sceneHeading, '30-1 日 内 破庙偏殿')
  assert.deepEqual(scenes[0]?.characterRoster, ['黎明', '易成', '小柔'])
})

test('parseScreenplayScenes drops markdown placeholder stub before real scene with same code', () => {
  const screenplay = `第28集

28-1 日
人物：**人物**
△# 第28集

## 28-1 深夜｜地点：医庐内室
**人物**：黎明，小柔，残党头目，残党三人
△黎明按住渗血的左臂，盯着门外火光。
小柔：他们已经摸到后窗了。
△残党头目抬手一挥，门板当场被撞开。`

  const scenes = parseScreenplayScenes(screenplay)

  assert.equal(scenes.length, 1)
  assert.equal(scenes[0]?.sceneCode, '28-1')
  assert.equal(scenes[0]?.sceneHeading, '28-1 深夜｜地点：医庐内室')
  assert.deepEqual(scenes[0]?.characterRoster, ['黎明', '小柔', '残党头目', '残党三人'])
  assert.match(scenes[0]?.body || '', /门板当场被撞开/)
})

test('hasVoiceOverLeak catches Chinese and English voice-over markers', () => {
  assert.equal(hasVoiceOverLeak('李科：（画外音）让他进来。'), true)
  assert.equal(hasVoiceOverLeak('Guard (O.S.): open the door'), true)
  assert.equal(hasVoiceOverLeak('△门外传来李科的声音：“让他进来。”'), false)
})

test('parseScreenplayScenes does NOT split A/D/E-only content into multiple scenes (regression)', () => {
  // A/D/E content without headings must NOT be split into multiple scenes.
  // Route 1/2 detection is in parseGeneratedScene, not here.
  // This test ensures parseScreenplayScenes itself doesn't fabricate scene boundaries.
  const adEOnly = `Action:
林守钥背靠门板站着。

Dialogue:
沈黑虎：（冷笑）你以为我会退？

Emotion:
被逼到墙角的愤怒与恐惧。`

  const scenes = parseScreenplayScenes(adEOnly)
  // parseScreenplayScenes has no headings so it returns empty or single scene
  assert.ok(scenes.length <= 1, 'A/D/E only content should not be split into multiple scenes')
})

test('CONTROL: pure screenplay with 2 headings → parseScreenplayScenes returns 2 scenes', () => {
  const pureScreenplay = `第4集

1-1 夜
人物：林守钥
△ 运泔水的板车停在一条窄巷深处。

1-2 夜
人物：林守钥
△ 黑暗中传来一个苍老的声音。`

  const scenes = parseScreenplayScenes(pureScreenplay)
  assert.equal(scenes.length, 2, 'pure screenplay with 2 headings → 2 scenes')
  assert.equal(scenes[0]?.sceneCode, '1-1')
  assert.equal(scenes[1]?.sceneCode, '1-2')
})
