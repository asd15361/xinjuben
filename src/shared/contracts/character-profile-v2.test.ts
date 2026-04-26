import test from 'node:test'
import assert from 'node:assert/strict'

import { mapV2ToLegacyCharacterDraft, type CharacterProfileV2Dto } from './character-profile-v2.ts'

test('mapV2ToLegacyCharacterDraft builds natural biography instead of stitching fields', () => {
  const profile: CharacterProfileV2Dto = {
    id: 'char_01',
    name: '柳如烟',
    depthLevel: 'core',
    appearance: '冷淡高傲的天才大小姐。',
    personality: '外冷内热。',
    identity: '青云宗宗主之女，核心弟子，宗内年轻一代实力顶尖。',
    values: '守护宗门与亲人，真相与正义高于个人利益。',
    plotFunction: '暗中保护叶辰并逐步揭开其身世。',
    conflictTrigger: '叶辰被当众冤枉时会直接破局。',
    advantage: '能用宗主之女身份调动禁地钥匙和密道情报。',
    goal: '保护叶辰'
  }

  const draft = mapV2ToLegacyCharacterDraft(profile)

  assert.equal(draft.biography.includes('。，'), false)
  assert.equal(draft.biography.includes('。。'), false)
  assert.match(draft.biography, /^柳如烟是青云宗宗主之女/)
  assert.match(draft.biography, /冷淡高傲/)
  assert.match(draft.biography, /外冷内热/)
  assert.match(draft.biography, /看重守护宗门与亲人/)
  assert.match(draft.biography, /暗中保护叶辰/)
  assert.match(draft.biography, /叶辰被当众冤枉/)
  assert.match(draft.biography, /禁地钥匙和密道情报/)
  assert.equal(draft.biography.includes('身份是'), false)
  assert.equal(draft.biography.includes('性格底色'), false)
  assert.equal(draft.biography.includes('在戏里'), false)
  assert.equal(draft.biography.includes('让柳如烟信奉'), false)
  assert.equal(draft.biography.includes('在主线里的作用'), false)
  assert.equal(draft.biography.includes('行动抓手'), false)
  assert.equal(draft.biography.includes('牵动他的软肋'), false)
  assert.equal(draft.biography.includes('压着这个人物'), false)
  assert.equal(draft.biography.includes('把冲突推到台前'), false)
})

test('mapV2ToLegacyCharacterDraft rejects field-stitched biography from model output', () => {
  const profile: CharacterProfileV2Dto = {
    id: 'char_field_stitched',
    name: '李雪儿',
    depthLevel: 'core',
    appearance: '年约十八，容貌清丽，常穿淡蓝色劲装。',
    personality: '正义感强，率真冲动。',
    identity: '掌门之女，青云宗筑基后期弟子。',
    values: '正义、忠诚、家族荣誉。',
    plotFunction: '作为主角在宗门内最直接的盟友，多次在主角被欺凌时出手解围。',
    hiddenPressure: '父亲的正道名声与主角的魔尊血脉之间的矛盾。',
    conflictTrigger: '有人当面羞辱或陷害主角时。',
    advantage: '掌门之女的身份可调动部分资源、精通青云宗剑法。',
    biography:
      '李雪儿外在年约十八，容貌清丽，身份是掌门之女；性格底色是正义感强。在戏里，李雪儿负责作为主角盟友；每次选择都牵动他的软肋与代价。'
  }

  const draft = mapV2ToLegacyCharacterDraft(profile)

  assert.equal(draft.biography.includes('身份是'), false)
  assert.equal(draft.biography.includes('性格底色'), false)
  assert.equal(draft.biography.includes('在戏里'), false)
  assert.equal(draft.biography.includes('牵动他的软肋'), false)
  assert.match(draft.biography, /^李雪儿是掌门之女/)
  assert.match(draft.biography, /掌门之女的身份/)
})

test('mapV2ToLegacyCharacterDraft rewrites result-only arcs into trigger-choice-cost arcs', () => {
  const profile: CharacterProfileV2Dto = {
    id: 'char_02',
    name: '苏婉柔',
    depthLevel: 'core',
    appearance: '白衣清冷。',
    personality: '外柔内冷。',
    identity: '苏家棋子。',
    values: '家族利益优先。',
    plotFunction: '接近叶辰并制造情感信息差。',
    protectTarget: '苏家给她的身份和最后的选择权。',
    fear: '叶辰看穿她后再也不信她。',
    conflictTrigger: '苏天雄逼她牺牲叶辰时。',
    goal: '完成接近任务并保住苏家。',
    arc: '从冷酷卧底到内心挣扎，最终可能选择背叛或救赎。'
  }

  const draft = mapV2ToLegacyCharacterDraft(profile)

  assert.match(draft.arc, /起点：/)
  assert.match(draft.arc, /触发：苏天雄逼她牺牲叶辰/)
  assert.match(draft.arc, /摇摆：叶辰看穿她后再也不信她/)
  assert.match(draft.arc, /代价选择：苏家给她的身份和最后的选择权/)
  assert.doesNotMatch(draft.arc, /^从冷酷卧底到内心挣扎，最终/)
})

test('mapV2ToLegacyCharacterDraft forces unlabeled arcs into structured change logic', () => {
  const profile: CharacterProfileV2Dto = {
    id: 'char_03',
    name: '李崇',
    depthLevel: 'core',
    appearance: '黑衣执事。',
    personality: '狠辣谨慎。',
    identity: '大长老亲信。',
    values: '服从强者才有活路。',
    plotFunction: '负责体罚叶辰并把长老派压力推到台前。',
    hiddenPressure: '一旦王鹤失势，他就是最先被清算的人。',
    fear: '被王鹤当弃子。',
    protectTarget: '王鹤给他的权力和亲信位置。',
    conflictTrigger: '叶辰拿到账册反咬王鹤时。',
    advantage: '熟悉戒律堂流程，能提前扣人、换供词、压证据。',
    weakness: '离开王鹤庇护就没有独立谋局能力。',
    goal: '替王鹤压死叶辰。',
    arc: '从台前爪牙变成叶辰第一次公开反击的靶子。'
  }

  const draft = mapV2ToLegacyCharacterDraft(profile)

  assert.match(draft.arc, /起点：/)
  assert.match(draft.arc, /触发：叶辰拿到账册反咬王鹤/)
  assert.match(draft.arc, /摇摆：被王鹤当弃子/)
  assert.match(draft.arc, /代价选择：王鹤给他的权力和亲信位置/)
  assert.match(draft.arc, /终局变化：从台前爪牙变成叶辰第一次公开反击的靶子/)
})

test('mapV2ToLegacyCharacterDraft rewrites arrow-chain arcs without duplicating the whole chain into every stage', () => {
  const profile: CharacterProfileV2Dto = {
    id: 'char_05',
    name: '孙副堂主',
    depthLevel: 'core',
    appearance: '铁面执法。',
    personality: '阴狠多疑。',
    identity: '仙盟安插在青云宗执法堂的暗线。',
    values: '自身利益和仙盟密令高于门规。',
    plotFunction: '在大比上伪造禁术证据，当众构陷叶辰。',
    hiddenPressure: '仙盟随时可能弃掉他灭口。',
    fear: '暴露仙盟暗线身份后失去现有地位和性命。',
    protectTarget: '仙盟秘密和执法堂副堂主的位置。',
    conflictTrigger: '叶辰在宗门大比上逼近禁术证据真相时。',
    advantage: '能调动执法弟子、篡改卷宗、安插眼线。',
    weakness: '过度依赖仙盟支持，一旦仙盟失势就孤立无援。',
    goal: '替仙盟清除叶辰并夺取血脉样本。',
    arc: '表面公正的执法者 → 在大小姐授意下诬陷主角 → 发现主角觉醒魔尊血脉，恐惧加深 → 试图以灭口换取仙盟庇护 → 最终被主角反杀，临死前供出仙盟阴谋'
  }

  const draft = mapV2ToLegacyCharacterDraft(profile)

  assert.match(draft.arc, /起点：表面公正的执法者/)
  assert.match(draft.arc, /触发：叶辰在宗门大比上逼近禁术证据真相/)
  assert.match(draft.arc, /摇摆：暴露仙盟暗线身份/)
  assert.match(draft.arc, /代价选择：仙盟秘密和执法堂副堂主的位置/)
  assert.match(draft.arc, /终局变化：最终被主角反杀/)
  assert.equal((draft.arc.match(/→/g) || []).length <= 1, true)
  assert.equal(draft.arc.includes('；触发：') && draft.arc.indexOf('；触发：') < 90, true)
})

test('mapV2ToLegacyCharacterDraft cleans doubled public mask prefix', () => {
  const profile: CharacterProfileV2Dto = {
    id: 'char_04',
    name: '苏婉柔',
    depthLevel: 'core',
    appearance: '白衣清冷。',
    personality: '外柔内冷。',
    identity: '苏家棋子。',
    values: '家族利益优先。',
    plotFunction: '接近叶辰并制造情感信息差。',
    publicMask: '表面是温柔无害的仙盟大小姐。',
    conflictTrigger: '苏天雄逼她牺牲叶辰时。',
    advantage: '递假情报试探叶辰。'
  }

  const draft = mapV2ToLegacyCharacterDraft(profile)

  assert.equal(draft.publicMask.startsWith('表面'), false)
  assert.equal(draft.publicMask, '温柔无害的仙盟大小姐')
})

test('mapV2ToLegacyCharacterDraft strips duplicated stage labels inside rebuilt arcs', () => {
  const profile: CharacterProfileV2Dto = {
    id: 'char_06',
    name: '林夜',
    depthLevel: 'core',
    appearance: '须发半白。',
    personality: '宽厚隐忍。',
    identity: '玄天宗掌门。',
    values: '守约护宗。',
    plotFunction: '在正道压力下保护凌寒。',
    protectTarget: '主角、玄天宗基业和旧日约定。',
    fear: '主角血脉失控毁掉宗门。',
    conflictTrigger: '名门正派逼他交出主角时。',
    goal: '暗中帮助主角控制魔尊血脉。',
    arc: '起点的宽厚掌门 → 终局变化：重伤退隐'
  }

  const draft = mapV2ToLegacyCharacterDraft(profile)

  assert.equal(draft.arc.includes('起点：起点'), false)
  assert.equal(draft.arc.includes('终局变化：终局变化'), false)
  assert.match(draft.arc, /起点：宽厚掌门/)
  assert.match(draft.arc, /终局变化：重伤退隐/)
})

test('mapV2ToLegacyCharacterDraft normalizes structured arcs whose ending repeats the whole chain', () => {
  const profile: CharacterProfileV2Dto = {
    id: 'char_07',
    name: '赵盟主',
    depthLevel: 'core',
    appearance: '白袍威严。',
    personality: '城府极深。',
    identity: '天道仙盟盟主。',
    values: '力量至上。',
    plotFunction: '暗中布局夺取主角血脉。',
    protectTarget: '自己的盟主之位和修为突破的希望。',
    fear: '害怕魔尊血脉觉醒后无法掌控。',
    conflictTrigger: '主角展现出魔尊血脉潜力时。',
    goal: '夺取主角血脉突破化神。',
    arc:
      '起点：开端以正道盟主形象出现，隐藏野心；中期因主角觉醒而步步紧逼，暴露真面目；后期在争夺秘宝中与主角决战；触发：主角展现出魔尊血脉潜力时；摇摆：害怕魔尊血脉觉醒后无法掌控；代价选择：自己的盟主之位和修为突破的希望；终局变化：开端以正道盟主形象出现，隐藏野心；中期因主角觉醒而步步紧逼，暴露真面目；后期在争夺秘宝中与主角决战，最终因贪念反噬。'
  }

  const draft = mapV2ToLegacyCharacterDraft(profile)

  assert.match(draft.arc, /起点：开端以正道盟主形象出现/)
  assert.match(draft.arc, /触发：主角展现出魔尊血脉潜力/)
  assert.match(draft.arc, /终局变化：最终因贪念反噬/)
  assert.equal(/终局变化：.*起点|终局变化：.*中期|终局变化：.*后期/u.test(draft.arc), false)
})

test('mapV2ToLegacyCharacterDraft normalizes arc labels with 是 and arrow-embedded ending', () => {
  const profile: CharacterProfileV2Dto = {
    id: 'char_08',
    name: '陈渊',
    depthLevel: 'core',
    appearance: '玄袍掌门。',
    personality: '威严隐忍。',
    identity: '苍玄宗掌门。',
    values: '守住主角和宗门。',
    plotFunction: '暗中保护主角并压制长老会。',
    protectTarget: '主角、宗门稳定和血脉真相。',
    fear: '主角血脉暴露导致宗门分裂。',
    conflictTrigger: '赵无极威胁主角性命时。',
    goal: '让主角安全成长。',
    arc: '起点：起点是隐瞒秘密的威严掌门；触发：赵无极威胁主角性命时；摇摆：主角血脉暴露导致宗门分裂；代价选择：牺牲自身威望保护主角 → 终局：公开真相，或牺牲自我换取主角觉醒；终局变化：公开真相，或牺牲自我换取主角觉醒'
  }

  const draft = mapV2ToLegacyCharacterDraft(profile)

  assert.equal(draft.arc.includes('起点：起点'), false)
  assert.equal(draft.arc.includes('代价选择：牺牲自身威望保护主角 → 终局'), false)
  assert.equal(draft.arc.includes('终局变化：终局'), false)
  assert.match(draft.arc, /起点：隐瞒秘密的威严掌门/)
  assert.match(draft.arc, /代价选择：牺牲自身威望保护主角/)
  assert.match(draft.arc, /终局变化：公开真相/)
})
