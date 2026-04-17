import test from 'node:test'
import assert from 'node:assert/strict'

import { buildEpisodeSceneDirectives } from './build-episode-scene-directives.ts'

test('buildEpisodeSceneDirectives adds final-run human-ledger rules for the last three episodes', () => {
  const outline = {
    title: '修仙传',
    genre: '权谋',
    theme: '藏锋',
    protagonist: '黎明',
    mainConflict: '黎明被李科逼亮底',
    summary: 'summary',
    summaryEpisodes: Array.from({ length: 10 }, (_, index) => ({
      episodeNo: index + 1,
      summary: `第${index + 1}集`
    })),
    facts: []
  }

  const lines = buildEpisodeSceneDirectives(outline, 8).join('\n')

  assert.match(lines, /当前 5 集批次的收口段优先收人账、证据账、规则账、关系账/)
  assert.match(lines, /不准连续靠运功、法阵、镇压、长老解释或天地异象推进/)
  assert.match(lines, /师父、长老、高手若出场，只能改规则、压时限、给条件、逼表态/)
  assert.match(lines, /情感杠杆角色不能只做人质或陪跑/)
  assert.match(lines, /主角或情感杠杆角色每集至少亲手推进一次关键变化/)
  assert.match(lines, /小柔这类情感杠杆角色在当前 5 集批次的收口段至少有一次主动动作改局/)
  assert.match(lines, /不要把“名分”“象征意义”“话语权”当对白中心/)
  assert.match(lines, /前 1-6 集不要让人物把谦卦、不争、大道直接讲明白/)
  assert.match(lines, /第6集以后别让师父、执事把新账册、新记录、新证词送进场里当第一证据/)
  assert.match(lines, /对白行里不准出现（画外音\/旁白\/OS）/)
  assert.match(
    lines,
    /门外、窗外、台阶下、身后的声音，一律先写成△门外传来某人的喊声\/脚步声\/砸门声/
  )
  assert.match(lines, /反例：李科：（画外音）让他进来。正例：△堂内传来李科的声音：“让他进来。”/)
  assert.match(lines, /潜入、搜屋、尾随、躲藏、包扎、换药这类场也不能整场默剧/)
  assert.match(lines, /当前 5 集批次的末两集不准让师父、长老直接废修为、收钥匙、投入炼炉或当众宣判/)
  assert.match(
    lines,
    /若上一集已经用了公审、殿内对质或合议，这一集必须转去潜入、截人、毁契、抢证、追逃或私下交易/
  )
  assert.match(lines, /当前 5 集批次的末两集整集最多只允许 1 场公审、议事或殿内对质主场/)
  assert.match(lines, /当前批次末集的第一场不准从合议堂、卷轴宣读、代表宣判或长老落锤开场/)
  assert.match(lines, /当前 5 集批次的末两集不准临时抬出堂兄、师叔、新残党头子这类新名字接管尾声/)
  assert.match(
    lines,
    /当前 5 集批次的末两集若必须出现接任、认罚、废修为、宣判或宗门表态，只能放在最短一场做结果确认/
  )
  assert.match(lines, /当前批次末集的余波优先留在人际站位、职责变化、证据外流、伤势代价和旧账未清/)
  assert.match(
    lines,
    /当前 5 集批次如果执事、外门执事、偏殿、公议或合议必须出现，只准做过门：收证、定时限、转身离场/
  )
  assert.match(
    lines,
    /当前 5 集批次的收口段如果场景落在包扎、疗伤、潭边、锁旁或歇脚处，不准让人物互问“为什么藏到现在\/为什么不争\/师父说了什么”/
  )
  assert.match(
    lines,
    /当前 5 集批次若主题必须露面，只准贴着空锁、血迹、账页、碎钥匙、撤退脚步或已发生的代价说一句短句/
  )
  assert.match(lines, /当前 5 集批次就算只有 2 场，也要让每场各自完成一次独立变位/)
  assert.match(lines, /当前 5 集批次每场只准打一轮：压进来 -> 变招 -> 结果落地，然后切场/)
  assert.match(
    lines,
    /场级预算必须硬控：2 场集每场目标 420-560 字，3 场集每场目标 280-380 字，4 场集每场目标 220-300 字/
  )
  assert.match(lines, /当前 5 集批次每场正文尽量压在 8-12 行内/)
  assert.match(
    lines,
    /瘦场也不准只剩提纲句：2 场集单场低于 320 字、3 场集单场低于 220 字、4 场集单场低于 180 字/
  )
  assert.match(lines, /当前 5 集批次的收口段如果有人还没进本场人物表，就不准直接写成“某人：对白”/)
})

test('buildEpisodeSceneDirectives does not add final-run rules before the last three episodes', () => {
  const outline = {
    title: '修仙传',
    genre: '权谋',
    theme: '藏锋',
    protagonist: '黎明',
    mainConflict: '黎明被李科逼亮底',
    summary: 'summary',
    summaryEpisodes: Array.from({ length: 10 }, (_, index) => ({
      episodeNo: index + 1,
      summary: `第${index + 1}集`
    })),
    facts: []
  }

  const lines = buildEpisodeSceneDirectives(outline, 6).join('\n')

  assert.doesNotMatch(lines, /当前 5 集批次的收口段优先收人账、证据账、规则账、关系账/)
  assert.doesNotMatch(lines, /情感杠杆角色不能只做人质或陪跑/)
})

test('buildEpisodeSceneDirectives adds mid-run anti-tribunal-loop rules around episodes 4-7', () => {
  const outline = {
    title: '修仙传',
    genre: '权谋',
    theme: '藏锋',
    protagonist: '黎明',
    mainConflict: '黎明被李科逼亮底',
    summary: 'summary',
    summaryEpisodes: Array.from({ length: 10 }, (_, index) => ({
      episodeNo: index + 1,
      summary: `第${index + 1}集`
    })),
    facts: []
  }

  const lines = buildEpisodeSceneDirectives(outline, 4).join('\n')

  assert.match(lines, /少写“盯着\/看向\/沉默\/皱眉\/闭眼\/意识到”这类微动作；不改局就删/)
  assert.match(lines, /“拿刀抵喉\/绑住人逼交钥匙\/抓住小柔逼黎明现身”这种直给压法全季最多 2 次/)
  assert.match(lines, /当前 5 集批次若其他道观、使者、长老或新上位者入场，他们只能拿旧账加压/)
  assert.match(lines, /不要把“争证据”“争站队”“争时间”“主导权”这类策划词直接写进 sceneByScene/)
  assert.match(lines, /第4集以后，scene1 禁止落在偏殿、审讯室、地牢、执事房、广场宣判或侧殿听令/)
  assert.match(lines, /如果上一集刚是执事、长老、公审或合议落锤，这一集第一句不准再由他们开口/)
  assert.match(
    lines,
    /第4-7集若制度压力入场，第一场优先写押送路上、门外堵截、搜物、换手、封口、换药或截人/
  )
  assert.match(lines, /“被带去问话\/对质”不算推进/)
  assert.match(
    lines,
    /同一集若已经用了 1 场偏殿、审讯、合议或哨岗，第二拍就搬到门外、押送路、屋外、巷里或山林/
  )
  assert.match(lines, /上一集刚在制度场落锤，这一集就回路上、门外、山林、旧屋或静室收账/)
})
