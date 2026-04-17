import test from 'node:test'
import assert from 'node:assert/strict'

import { parseGeneratedScene } from './parse-generated-scene.ts'

const INLINE_SCREENPLAY_SAMPLE = `第1集 1-1 镇口老槐树下·日 人物：少年守钥人，恶霸，众镇民 △清晨，七八个镇民围在老槐树下，指着地面一道深深的、沾着泥土的爪痕，神色惊恐。远处山中传来一声沉闷的低吼。 镇民甲：（声音发颤）昨晚听见的，就是这动静！我家屋顶瓦片都震掉了几片！ 镇民乙：（蹲下，手指颤抖地指着爪痕边缘）看这儿……这暗红色的，是血吗？ △守钥人站在人群外围，目光死死盯着爪痕边缘的暗红污迹，脸色发白。他悄悄后退一步，转身欲走。 恶霸：（高声）哟，这不是咱们镇里最懂老规矩的守钥人吗？走这么急？ △恶霸带着两个跟班，堵住了守钥人的去路。 1-2 镇口老槐树下·日 人物：少年守钥人，恶霸，众镇民 △恶霸一手重重拍在守钥人肩膀上，将他扳回面对镇民。镇民们安静下来，目光聚焦在两人身上。 恶霸：（环视众人，声音洪亮）乡亲们别慌！咱们这镇子，老辈传下来，底下怕是埋着镇邪祟的好东西！对吧，守钥人？ △恶霸目光如钩，紧紧盯着守钥人。守钥人肩膀被捏得生疼，低头避开视线。 守钥人：（低声）我不知道你在说什么。 恶霸：（凑近，压低声音却让周围人能听见）不知道？那山里的东西怎么偏偏这时候醒了？我看，是那“好东西”快压不住了吧？ △镇民们闻言，窃窃私语声更响，看向守钥人的眼神充满怀疑和期待。守钥人猛地挣脱恶霸的手。 守钥人：让开。 △守钥人低头从人群中挤出去。恶霸盯着他仓促离开的背影，冷笑一声。 恶霸：（对跟班）盯紧他。还有，河边那家姓林的丫头，也给我看好了。 1-3 守钥人家密室·夜 人物：少年守钥人 △昏暗油灯下，守钥人从墙壁暗格中取出一把古朴的青铜钥匙。钥匙入手温热，甚至有些烫手，表面原本模糊的纹路正隐隐发出微光。 守钥人：（喃喃自语）真的……有反应了。祖训说，钥匙发烫，妖物近镇…… △窗外远处，突然传来一阵激烈的狗吠，方向正是小镇另一头的少女家。守钥人一惊，握紧钥匙。 △紧接着，一声清晰的少女惊叫划破夜空！守钥人浑身一震，将钥匙塞回怀中，抓起桌上一把短刀，冲出门去。 △守钥人狂奔至少女家外墙角，喘息着探头窥视。少女家窗户紧闭，屋内灯火摇晃。 △一道异常高大、四肢着地的扭曲黑影，猛地从院内掠过窗棂，消失在屋后黑暗中。窗户纸上，映出一只巨大、非人的利爪轮廓，一闪而过。 △守钥人瞳孔骤缩，握刀的手青筋暴起。他刚要冲进院子，侧方巷口突然火把亮起，恶霸带着三个跟班走了出来，正好挡在院门前。 恶霸：（咧嘴笑）这么巧？你也听见动静了？别急，那丫头没事，在我屋里“做客”呢。不过…… △恶霸上前一步，压低声音。 恶霸：想要人平安？把你家祖传的“好东西”，拿来换。明天日落，镇外山神庙。别耍花样，不然……山里那东西饿着呢。 △恶霸说完，带着人转身走入黑暗。守钥人僵在原地，怀中发烫的钥匙如同烙铁，远处山中，再次传来一声悠长而饥渴的嘶吼。`

test('parseGeneratedScene accepts inline screenplay text from fresh runtime sample', () => {
  const scene = parseGeneratedScene(INLINE_SCREENPLAY_SAMPLE, 1)

  assert.equal(scene.sceneNo, 1)
  assert.ok(scene.screenplay)
  assert.ok(scene.dialogue)
  assert.ok(scene.action)
  assert.match(scene.screenplay, /^第1集/)
  assert.match(scene.screenplay, /1-1 镇口老槐树下·日/)
  assert.match(scene.dialogue, /恶霸：/)
  assert.match(scene.action, /清晨，七八个镇民围在老槐树下/)
})

test('parseGeneratedScene does not reject valid screenplay for bold title or dramatic ellipsis', () => {
  const text = `**第1集**

**1-1 安仁闹市街头［外］［日］**
人物：黎明，小柔，小柔父，李科
△李科抖开借据，当街逼小柔父女还债。
**李科**：（冷笑）今天不还钱，就拿你闺女抵债！
**小柔**：（声音发颤）李爷，再宽限几天……
△黎明拨开人群上前，挡在小柔身前。
**黎明**：（语气平和）李爷，欠债还钱天经地义，可否宽限几日？
**李科**：（逼近）你算什么东西？

**1-2 破屋外［外］［傍晚］**
人物：黎明，小柔，小柔父
△黎明送小柔父女回到破屋，将碎银塞进小柔手里。
**小柔**：（眼眶微红）多谢恩公，三日三十两，我们实在还不上。
**黎明**：（低声）先给伯父抓药，钱的事再想办法。
△黎明临走前回头叮嘱，任何人叫门都别开。
**小柔**：（怔怔点头）我记住了。
△夜色压下来，破屋门闩被小柔缓缓插紧。`

  const scene = parseGeneratedScene(text, 1)

  assert.equal(scene.sceneNo, 1)
  assert.match(scene.screenplay || '', /第1集/)
  assert.match(scene.dialogue, /李科/)
  assert.match(scene.action, /李科抖开借据/)
})

const ADE_SAMPLE = `Action:
△ 天刚蒙蒙亮，镇口旧库外。沈黑虎一脚踹开虚掩的木门，身后跟着七八个手下，手里都提着棍棒。库房里空荡荡，只有被翻得乱七八糟的杂物和地上几个新鲜的泥脚印。

△ 沈黑虎走到墙角那堆木箱前，用脚尖踢开一个破箱子，露出后面一小片被压实的灰尘。他蹲下，捡起一小块干涸的泥巴，在指间捻碎。

沈黑虎：（头也不回）人昨晚回来过。东西没找全。

手下甲：（凑近）虎爷，那小子会不会……已经拿着账册跑了？

Dialogue:
沈黑虎：（盯着林守钥，声音压得很低，但每个字都像从牙缝里挤出来）你干的？

林守钥：（没动，也没躲开他的视线）账是顾先生记的。手印是证人按的。我只是把它贴出来。

沈黑虎：（往前走了一步）铜钥呢？

林守钥：（从怀里掏出那把铜钥匙，握在手里）在这儿。

Emotion:
△ 林守钥没退。他把铜钥匙塞回怀里，顺手抄起墙边一根顶门杠，横在身前。他握杠的手很稳，但嘴唇抿得发白。

△ 第一个打手的棍子砸下来，林守钥侧身躲开，用顶门杠格开第二下。`

test('parseGeneratedScene A/D/E path builds screenplay with real character names', () => {
  const scene = parseGeneratedScene(ADE_SAMPLE, 10)

  // screenplay and screenplayScenes must be populated for official quality gate
  assert.ok(scene.screenplay, 'screenplay should be populated')
  assert.ok(scene.screenplayScenes, 'screenplayScenes should be populated')
  assert.equal(scene.screenplayScenes.length, 1, 'should have 1 scene')
  assert.ok(scene.screenplay!.includes('第10集'), 'screenplay should have episode heading')
  assert.ok(scene.screenplay!.includes('10-1 日'), 'screenplay should have parseable scene heading')

  // Character names must be extracted from dialogue (not "待补")
  const firstScene = scene.screenplayScenes[0]!
  const roster = firstScene.characterRoster || []
  assert.ok(roster.length > 0, 'character roster should not be empty')
  assert.ok(!roster.includes('待补'), 'character roster should not contain placeholder')
  assert.ok(roster.includes('沈黑虎'), '沈黑虎 should be in character roster')
  assert.ok(roster.includes('林守钥'), '林守钥 should be in character roster')

  // No double △ markers (action/emotion already have △ in extractSceneSections output)
  assert.ok(!scene.screenplay!.includes('△△'), 'no double △ markers')

  // No A/D/E marker residue in screenplay text
  assert.ok(!scene.screenplay!.includes('Action:'), 'no Action: marker in screenplay')
  assert.ok(!scene.screenplay!.includes('Dialogue:'), 'no Dialogue: marker in screenplay')
  assert.ok(!scene.screenplay!.includes('Emotion:'), 'no Emotion: marker in screenplay')
})

// Tests A/D/E residue stripping when model generates "Action:" as character speech
const ADE_CONTAMINATED_SAMPLE = `Action:
△深夜，镇口旧库的木门被一脚踹开。

Dialogue:
沈黑虎：（冷笑）顾老头走了，这库该换人守了。

？烧掉？那师父留下的理，就真成灰了。

Action:
林守钥猛地吸了口气，把铜匣抱在怀里。

Dialogue:
林守钥：（挣扎）沈黑虎！你毁了顾先生的真相！

Emotion:
铜匣被夺走的瞬间，林守钥心里像被挖空了一块。`

test('parseGeneratedScene strips residual A/D/E markers when embedded in dialogue content', () => {
  const scene = parseGeneratedScene(ADE_CONTAMINATED_SAMPLE, 1)

  assert.ok(scene.screenplay, 'screenplay should be populated')
  // A/D/E markers must be stripped even when embedded inside dialogue
  assert.ok(!scene.screenplay!.includes('Action:'), 'no Action: marker in screenplay')
  assert.ok(!scene.screenplay!.includes('Dialogue:'), 'no Dialogue: marker in screenplay')
  assert.ok(!scene.screenplay!.includes('Emotion:'), 'no Emotion: marker in screenplay')
  // Character names still extracted from dialogue content
  const roster = (scene.screenplayScenes ?? [])[0]!.characterRoster || []
  assert.ok(roster.includes('沈黑虎'), '沈黑虎 should be extracted')
  assert.ok(roster.includes('林守钥'), '林守钥 should be extracted')
})

// ─────────────────────────────────────────────────────────────────────────────
// A/D/E with two scene headings → parseGeneratedScene collapses to 1 scene
// This reproduces the ep4/ep5/ep6/ep7/ep8 bug: rawText has multiple headings
// but parseGeneratedScene unconditionally rebuilds with a single heading.
//
// Key: both scene headings appear BEFORE the first A/D/E marker in the raw text.
// extractSceneSections only captures content BETWEEN markers, so headings that
// appear before Action: are completely lost and replaced with the hardcoded
// heading = "${sceneNo}-1 日".
// ─────────────────────────────────────────────────────────────────────────────

const ADE_WITH_TWO_HEADINGS_BEFORE_ACTION = `1-1 夜

1-2 夜

Action:
△ 运泔水的板车停在一条窄巷深处。

Dialogue:
林守钥：（低声）陈差爷让我来的。

Emotion:
△ 林守钥屏住呼吸。`

test('FIXED: A/D/E with headings before Action: marker → Route 1 returns 2 scenes', () => {
  // Route 1 (≥2 scene headings) now takes precedence over A/D/E path
  // → 2 scenes preserved instead of collapsed to 1
  const scene = parseGeneratedScene(ADE_WITH_TWO_HEADINGS_BEFORE_ACTION, 4)

  assert.equal(scene.sceneNo, 4, 'sceneNo should be preserved')
  assert.ok(scene.screenplay, 'screenplay should be populated')
  assert.equal(scene.screenplayScenes?.length ?? 0, 2, 'FIXED: ≥2 headings → 2 scenes preserved')

  // screenplay path uses original headings (not hardcoded sceneNo-1 日)
  assert.ok(scene.screenplay!.includes('1-1 夜'), 'original 1-1 夜 heading preserved')
  assert.ok(scene.screenplay!.includes('1-2 夜'), 'original 1-2 夜 heading preserved')
})

// ─────────────────────────────────────────────────────────────────────────────
// PLAN A support test: pure screenplay (no A/D/E markers) → multi-scene preserved
//
// parseGeneratedScene falls back to extractStructuredSceneFromScreenplay when
// extractSceneSections returns null. This path correctly preserves multiple scenes.
// This proves Plan A is viable: if we prioritize the screenplay parsing path
// (skip A/D/E when input looks like screenplay), multi-scene is already supported.
// ─────────────────────────────────────────────────────────────────────────────

const PURE_SCREENPLAY_WITH_TWO_SCENES = `第4集

1-1 夜
人物：林守钥
△ 运泔水的板车停在一条窄巷深处。林守钥从车底滚出。

1-2 夜
人物：林守钥
△ 黑暗中传来一个苍老的声音。林守钥屏住呼吸。`

test('PLAN A SUPPORTS: pure screenplay with 2 headings → parseGeneratedScene preserves 2 scenes', () => {
  const scene = parseGeneratedScene(PURE_SCREENPLAY_WITH_TWO_SCENES, 4)

  // No A/D/E markers → extractSceneSections returns null
  // → falls through to extractStructuredSceneFromScreenplay → correctly gets 2 scenes
  assert.equal(scene.sceneNo, 4)
  assert.ok(scene.screenplayScenes, 'screenplayScenes should be populated')
  assert.equal(scene.screenplayScenes!.length, 2, 'pure screenplay → 2 scenes preserved')
  assert.equal(scene.screenplayScenes![0]!.sceneCode, '1-1')
  assert.equal(scene.screenplayScenes![1]!.sceneCode, '1-2')
})

// ─────────────────────────────────────────────────────────────────────────────
// PLAN A FIX: heading + A/D/E markers → screenplay path → multi-scene preserved
//
// With the routing fix, if input contains scene headings (looksLikeScreenplayFormat),
// the screenplay path is taken even when A/D/E markers are present.
// This preserves multiple scenes instead of collapsing to 1.
// ─────────────────────────────────────────────────────────────────────────────

const SCREENPLAY_WITH_HEADINGS_AND_ADE_MARKERS = `第4集

1-1 夜

Action:
△ 运泔水的板车停在一条窄巷深处。

Dialogue:
林守钥：（低声）陈差爷让我来的。

Emotion:
△ 林守钥屏住呼吸。

1-2 夜

△ 黑暗中传来一个苍老的声音。

林守钥：（压低声音）是我。

△ 林守钥贴在墙根，心跳如擂鼓。`

test('PLAN A FIX: heading + A/D/E markers → screenplay path preserves multi-scene', () => {
  // Has 第4集 episode heading + scene headings → looksLikeScreenplayFormat = true
  // → screenplay path taken → 2 scenes preserved (not collapsed to 1)
  const scene = parseGeneratedScene(SCREENPLAY_WITH_HEADINGS_AND_ADE_MARKERS, 4)

  assert.equal(scene.sceneNo, 4)
  assert.ok(scene.screenplayScenes, 'screenplayScenes should be populated')
  assert.equal(scene.screenplayScenes!.length, 2, 'PLAN A FIX: headings + A/D/E → 2 scenes preserved')
  // First scene: '1-1 夜' heading → sceneCode '1-1'; second scene: '1-2 夜' heading → sceneCode '1-2'
  assert.equal(scene.screenplayScenes![0]!.sceneCode, '1-1')
  assert.equal(scene.screenplayScenes![1]!.sceneCode, '1-2')
})

// ─────────────────────────────────────────────────────────────────────────────
// FIX: Bold-markdown scene headings → Route 1.5 detects ≥2 headings after ** strip
//
// Real model output wraps scene headings in **bold** markdown (e.g. "**6-1 日**").
// Before the fix, the Route 1.5 regex /(?:^|\n)\d+\-\d+\s+/ failed to match
// because ** chars precede the digit. Normalizing the text before regex matching
// lets Route 1.5 correctly detect 3 headings → screenplay path → 3 scenes preserved.
// This reproduces the ep6/ep9 real-model failure mode.
// ─────────────────────────────────────────────────────────────────────────────

const BOLD_MARKDOWN_HEADINGS_ADE_FORMAT = `**6-1 日**

**Action:**
△ 沉重的撞门声戛然而止。

**Dialogue:**
林守钥：（缓缓放下扳手）沈黑虎，你要的东西，不在这儿。

**Emotion:**
墙破开的瞬间，血都冲到了头顶。

**6-2 日**

**Action:**
△ 林守钥没动，也没看倒地呻吟的老赵。

**Dialogue:**
林守钥：（猛地跨前一步）沈黑虎！

**Emotion:**
说出"河道清淤款"时，是孤注一掷的赌博。

**6-3 日**

**Action:**
△ 沈黑虎一步步走向林守钥。

**Dialogue:**
沈黑虎：（声音嘶哑）东西呢？！

**Emotion:**
看到空荡荡的暗格，脑子里"嗡"了一声。`

test('FIXED: Bold-markdown scene headings with bare time marker 晨 → 3 scenes preserved (regression)', () => {
  // Bug: matchSceneHeading did not recognize bare time marker "晨" (only 日/夜).
  // "**2-3 晨**" was detected as heading in Route 1 regex but then lost in parseScreenplayScenes
  // because matchSceneHeading returned null for single-segment "晨".
  const BOLD_晨_HEADINGS = `**2-1 夜**

Action:
第一场内容。

Dialogue:
对白内容。

Emotion:
情绪内容。

**2-2 夜**

Action:
第二场内容。

Dialogue:
对白内容。

Emotion:
情绪内容。

**2-3 晨**

Action:
第三场内容。

Dialogue:
对白内容。

Emotion:
情绪内容。`

  const scene = parseGeneratedScene(BOLD_晨_HEADINGS, 2)

  // Route 1: ≥2 bold headings after ** strip → screenplay path
  assert.equal(scene.screenplayScenes!.length, 3, '3 bold headings with 晨 → 3 scenes')
  assert.equal(scene.screenplayScenes![0]!.sceneCode, '2-1')
  assert.equal(scene.screenplayScenes![1]!.sceneCode, '2-2')
  assert.equal(scene.screenplayScenes![2]!.sceneCode, '2-3', '3rd scene with 晨 must not be lost')
  assert.equal(scene.screenplayScenes![2]!.sceneHeading, '2-3 晨')
})

test('FIXED: Bold-markdown scene headings + A/D/E → Route 1.5 → 3 scenes preserved', () => {
  const scene = parseGeneratedScene(BOLD_MARKDOWN_HEADINGS_ADE_FORMAT, 6)

  // Route 1.5 (≥2 headings after ** strip) → screenplay path
  assert.equal(scene.sceneNo, 6, 'sceneNo should be preserved')
  assert.ok(scene.screenplay, 'screenplay should be populated')
  assert.ok(scene.screenplayScenes, 'screenplayScenes should be populated')
  assert.equal(scene.screenplayScenes!.length, 3, 'FIXED: 3 bold-wrapped headings → 3 scenes preserved')
  assert.equal(scene.screenplayScenes![0]!.sceneCode, '6-1', 'scene 1 heading preserved')
  assert.equal(scene.screenplayScenes![1]!.sceneCode, '6-2', 'scene 2 heading preserved')
  assert.equal(scene.screenplayScenes![2]!.sceneCode, '6-3', 'scene 3 heading preserved')
})
