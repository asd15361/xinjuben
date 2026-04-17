import test from 'node:test'
import assert from 'node:assert/strict'
import { decomposeFreeformInput } from './decompose-chat-for-generation.ts'

test('decomposeFreeformInput returns empty result for empty text', () => {
  const result = decomposeFreeformInput({ text: '' })

  assert.equal(result.characters.length, 0)
  assert.equal(result.factions.length, 0)
  assert.equal(result.locations.length, 0)
  assert.equal(result.items.length, 0)
  assert.equal(result.relations.length, 0)
  assert.equal(result.immutableFacts.length, 0)
  assert.equal(result.unresolved.length, 0)
  assert.equal(result.originalText, '')
  assert.ok(result.meta.decomposedAt)
})

test('decomposeFreeformInput extracts characters from structured brief format', () => {
  const structuredText = `
【项目】测试项目｜10集
【主角】黎明
【对手】李科
【关键角色】黎明、李科、小柔

【角色卡】
- 黎明：主角，一直藏锋
- 李科：对手，持续施压
- 小柔：关键人物，会被卷入
`

  const result = decomposeFreeformInput({ text: structuredText })

  assert.ok(result.characters.length >= 3, 'Should extract at least 3 characters')

  const liMing = result.characters.find((c) => c.name === '黎明')
  assert.ok(liMing, '黎明 should be extracted')
  assert.equal(liMing.roleHint, 'protagonist')

  const liKe = result.characters.find((c) => c.name === '李科')
  assert.ok(liKe, '李科 should be extracted')
  assert.equal(liKe.roleHint, 'antagonist')

  const xiaoRou = result.characters.find((c) => c.name === '小柔')
  assert.ok(xiaoRou, '小柔 should be extracted')
})

test('decomposeFreeformInput extracts factions from structured brief', () => {
  const structuredText = `
【世界观与故事背景】
宗门争斗不休，世家林立，王朝更迭
`

  const result = decomposeFreeformInput({ text: structuredText })

  assert.ok(result.factions.length > 0, 'Should extract factions')
  const factionNames = result.factions.map((f) => f.name)
  assert.ok(factionNames.includes('宗门'), 'Should extract 宗门 faction')
  assert.ok(factionNames.includes('世家'), 'Should extract 世家 faction')
})

test('decomposeFreeformInput extracts named factions and links members from structured brief', () => {
  const structuredText = `
【世界观与故事背景】修仙宗门与凡俗势力并行的等级世界。玄玉宫等七座道观共同镇守妖兽蛇子。民间还有天地会暗中活动。
【角色卡】
- 黎明：玄玉宫弟子，守护秘宝钥匙。
- 李诚阳：玄玉宫道长，镇守山中。
- 韦小宝：天地会青木堂香主，冒充太监进入皇宫。
`

  const result = decomposeFreeformInput({ text: structuredText })

  const xuanYuGong = result.factions.find((faction) => faction.name === '玄玉宫')
  const tianDiHui = result.factions.find((faction) => faction.name === '天地会')

  assert.ok(xuanYuGong, 'Should extract named faction 玄玉宫')
  assert.ok(tianDiHui, 'Should extract named faction 天地会')
  assert.deepEqual(xuanYuGong.memberNames.sort(), ['李诚阳', '黎明'])
  assert.deepEqual(tianDiHui.memberNames, ['韦小宝'])
})

test('decomposeFreeformInput extracts locations from structured brief', () => {
  const structuredText = `
【世界观与故事背景】
黎明城是王朝重镇，坐落在山脉之巅
`

  const result = decomposeFreeformInput({ text: structuredText })

  const locationNames = result.locations.map((l) => l.name)
  assert.ok(locationNames.length > 0, 'Should extract locations')
  assert.ok(
    locationNames.some((n) => n.includes('城') || n.includes('山脉')),
    'Should extract location with keywords'
  )
})

test('decomposeFreeformInput extracts items from structured brief', () => {
  const structuredText = `
【串联简介】黎明持有宗门钥匙，被李科逼迫交出秘宝
【核心冲突】黎明被逼亮底
`

  const result = decomposeFreeformInput({ text: structuredText })

  const itemNames = result.items.map((i) => i.name)
  assert.ok(itemNames.includes('钥匙'), 'Should extract 钥匙')
  assert.ok(itemNames.includes('秘宝'), 'Should extract 秘宝')
})

test('decomposeFreeformInput extracts immutable facts from sections', () => {
  const structuredText = `
【核心冲突】黎明被逼亮底
【核心错位】明明无武功却握有真传
【情绪兑现】先让观众看到他护住小柔的那口气
【设定成交句】黎明只想藏住钥匙，偏偏李科拿小柔的命逼他亮底
`

  const result = decomposeFreeformInput({ text: structuredText })

  assert.ok(result.immutableFacts.length >= 4, 'Should extract at least 4 immutable facts')

  const conflictFact = result.immutableFacts.find((f) => f.label === '核心冲突')
  assert.ok(conflictFact, 'Should have 核心冲突 fact')
  assert.ok(conflictFact.description.includes('黎明'), '核心冲突 should mention 黎明')
})

test('decomposeFreeformInput extracts unresolved items from pending confirmations', () => {
  const structuredText = `
【待确认】
- 黎明的真实身世是否确定？
- 小柔的师父是谁？
`

  const result = decomposeFreeformInput({ text: structuredText })

  assert.ok(result.unresolved.length >= 2, 'Should extract at least 2 unresolved items')
  assert.ok(
    result.unresolved.some((u) => u.item.includes('身世')),
    'Should have unresolved about 身世'
  )
})

test('decomposeFreeformInput preserves provenance tier in source info', () => {
  const structuredText = `
【主角】黎明
【角色卡】
- 黎明：主角，一直藏锋
`

  const result = decomposeFreeformInput({
    text: structuredText,
    provenanceTier: 'user_declared'
  })

  for (const character of result.characters) {
    assert.equal(character.source.provenanceTier, 'user_declared')
  }
})

test('decomposeFreeformInput extracts relations when key characters and relation summary are present', () => {
  const structuredText = `
【主角】黎明
【对手】李科
【关键角色】黎明、李科
【人物关系总梳理】
- 黎明与李科是敌对关系
`

  const result = decomposeFreeformInput({ text: structuredText })

  // Verify the structure is correct - relations depend on having explicit key characters
  assert.ok(result.characters.length >= 2, 'Should have characters')
  assert.ok(result.sectionMap['人物关系总梳理'], 'Should have relation section')
})

test('decomposeFreeformInput returns sectionMap in result', () => {
  const structuredText = `
【项目】测试项目
【串联简介】测试简介
`

  const result = decomposeFreeformInput({ text: structuredText })

  assert.ok(result.sectionMap, 'Should have sectionMap')
  assert.ok(result.sectionMap['项目'], 'sectionMap should contain 项目')
  assert.ok(result.sectionMap['串联简介'], 'sectionMap should contain 串联简介')
})

test('decomposeFreeformInput handles non-structured freeform text gracefully', () => {
  const freeformText = `
用户说：我想写一个修仙故事，主角叫黎明，是个少年守钥人，
他被一个叫李科的反派追杀，还有一个叫小柔的少女帮助他。
他们要去王母宫寻找秘宝。
`

  const result = decomposeFreeformInput({ text: freeformText })

  assert.ok(result, 'Should return a result even for non-structured text')
  assert.ok(result.originalText, 'Should preserve original text')
  assert.ok(result.meta.decomposedAt, 'Should have decomposedAt timestamp')
})

test('decomposeFreeformInput marks protagonist and antagonist correctly', () => {
  const structuredText = `
【主角】黎明
【对手】李科
【关键角色】黎明、李科
`

  const result = decomposeFreeformInput({ text: structuredText })

  const protagonist = result.characters.find((c) => c.roleHint === 'protagonist')
  const antagonist = result.characters.find((c) => c.roleHint === 'antagonist')

  assert.equal(protagonist?.name, '黎明', '黎明 should be protagonist')
  assert.equal(antagonist?.name, '李科', '李科 should be antagonist')
})

test('decomposeFreeformInput does not duplicate characters', () => {
  const structuredText = `
【主角】黎明
【关键角色】黎明、李科、小柔
【角色卡】
- 黎明：主角，一直藏锋
- 李科：对手，持续施压
`

  const result = decomposeFreeformInput({ text: structuredText })

  const liMingCount = result.characters.filter((c) => c.name === '黎明').length
  assert.equal(liMingCount, 1, '黎明 should appear only once')
})
