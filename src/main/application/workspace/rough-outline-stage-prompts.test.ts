import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildOutlineEpisodeBatchPrompt,
  buildOutlineOverviewPrompt
} from './rough-outline-stage-prompts.ts'

test('buildOutlineOverviewPrompt raises anti-template and strategy-variation rules', () => {
  const prompt = buildOutlineOverviewPrompt({
    generationBriefText:
      '【项目】修仙传｜10集\n【设定成交句】最该藏钥匙的人被逼亮底。\n【人物关系总梳理】\n- 黎明是李诚阳的第十九个徒弟。',
    totalEpisodes: 10,
    actPlans: [
      { act: 'opening', startEpisode: 1, endEpisode: 2 },
      { act: 'midpoint', startEpisode: 3, endEpisode: 5 },
      { act: 'climax', startEpisode: 6, endEpisode: 8 },
      { act: 'ending', startEpisode: 9, endEpisode: 10 }
    ]
  })

  assert.match(prompt, /权谋、智斗、借力周旋/)
  assert.match(prompt, /中后段至少两次换压力来源、换战场、换筹码或换关系位次/)
  assert.match(prompt, /至少两集要出现误判、倒挂、借力反打或局面反转/)
  assert.match(prompt, /妖兽、灾变、高手外压只能放大人祸/)
  assert.match(prompt, /如果已确认事实里有妖兽、蛇子、镇妖地或封印外压，开局和当前批次末两集都要显性落一次/)
  assert.match(prompt, /facts 只准写能被拿、抢、藏、毁、验、换、交出来的硬事实和硬筹码/)
  assert.match(prompt, /如果底稿里有“排行\/第十九徒\/最小徒弟”这类身份事实，至少一集要显性写出这身份被点名、被轻视、被拿来压规矩或当众羞辱/)
  assert.match(prompt, /“第十九个徒弟也敢挡路”“最小徒弟没资格碰账册”“按排行你先跪下”/)
  assert.match(prompt, /“拿刀抵喉\/绑住人逼交钥匙\/抓住小柔逼黎明现身”这种直给压法全季最多 2 次/)
  assert.match(prompt, /最后 3 集优先回收人账、证据账、规则账、关系账/)
  assert.match(prompt, /不准连续主要靠法阵、封印、长老议事或世界异象推进/)
  assert.match(prompt, /summary 字段里禁止出现“第1集”“第2集”“第X集”这类集号/)
  assert.match(prompt, /当前批次末集不准临时引入新名字、新亲属、新残党领头人/)
  assert.match(prompt, /后 4 集里，至少两集的主推进必须由主角或情感杠杆角色亲自拿证据、换条件、做局、反咬或逼表态完成/)
  assert.match(prompt, /每 3 集至少安排 1 次“主角或情感杠杆角色先让对手吃实亏”的主动回合/)
  assert.match(prompt, /当前 5 集批次就算其他道观、外门、使者或上位者入场，也只能拿现有旧账加压/)
  assert.match(prompt, /公审、议事、长老会只准当压力容器，不能连续两集占主场/)
  assert.match(prompt, /禁止使用“人账”“证据账”“规则账”“争证据”“争站队”“争时间”“主导权”这类 writer-room 词/)
  assert.match(prompt, /前 1-6 集不要反复直说“谦卦”“不争”“大道”“真镇守”/)
  assert.match(prompt, /如果主角设定里有“隐忍\/藏锋\/先让后反咬”，前 1-6 集至少两集 summary 要显性写出“黎明先忍”“黎明藏锋”“黎明装弱不亮底”/)
  assert.match(prompt, /第6集以后，每集 summary 第一短句优先落在搜屋、拦路、医治、抢证、追残党、毁契或换手这类外场动作/)
  assert.match(prompt, /第4集以后，分集 summary 第一短句如果还是堂上流程、关押问话或盖章程序/)
  assert.match(prompt, /当前 5 集批次如果必须有程序场，它们只能缩成半句过门/)
  assert.match(prompt, /反例：先盖章再去追人。正例：主角刚出门就被石阶伏击/)
  assert.match(prompt, /师父、执事、长老不能带着新证据进门直接替主角揭底/)
  assert.match(prompt, /当前批次末段如果出现程序场或宗门表态，它们只能确认已经发生的后果/)
  assert.match(prompt, /当前批次末两集不准把“谁来问责玄玉宫\/谁来重议镇守权责”写成主戏眼/)
  assert.match(prompt, /当前批次末集若必须出现合议、接任、令牌或职责确认，它们只能缩成一笔结果/)
  assert.match(prompt, /反例：合议确认罪责\+发职责令牌\+解释看守职责/)
  assert.match(prompt, /当前批次末集如果必须出现接任、令牌、合议、问责或职责确认，它们只能占半句结果/)
  assert.match(prompt, /summary 最后一句必须落在残党、水潭、见面约、证据外泄、伤势反噬或旧账追上门这类私人后果上/)
  assert.match(prompt, /当前批次末集的余波优先留在人际站位、职责变化、证据外流、伤势代价/)
})

test('buildOutlineEpisodeBatchPrompt removes fixed four-tag summaries and requires tactic changes', () => {
  const prompt = buildOutlineEpisodeBatchPrompt({
    generationBriefText:
      '【项目】修仙传｜10集\n【设定成交句】最该藏钥匙的人被逼亮底。\n【软理解】\n- 这是一个权谋剧\n- 主角靠智慧周旋\n【人物关系总梳理】\n- 黎明是李诚阳的第十九个徒弟。',
    totalEpisodes: 10,
    startEpisode: 1,
    endEpisode: 5,
    overviewSummary: '整季围绕钥匙、小柔和谦卦代价展开。',
    actPlans: [
      { act: 'opening', startEpisode: 1, endEpisode: 2, summary: '先把人拖进局。' },
      { act: 'midpoint', startEpisode: 3, endEpisode: 5, summary: '中段升级代价。' }
    ],
    previousEpisodes: []
  })

  assert.match(prompt, /不要出现 `【起】`、`【承】`、`【转】`、`【钩子】` 这类模板词/)
  assert.match(prompt, /相邻两集的主要推进手法必须变化/)
  assert.match(prompt, /优先写做局、抢口风、套话、借势、栽赃、反证、调虎离山/)
  assert.match(prompt, /至少安排 2 集不是直线加码/)
  assert.match(prompt, /不要老停在沉思、凝视、意识到/)
  assert.match(prompt, /不要解释“象征了什么”“说明了什么”“哪套大道被领悟”/)
  assert.match(prompt, /如果底稿里有“排行\/第十九徒\/最小徒弟”这类身份事实，至少一集要显性写出这身份被点名、被轻视、被拿来压规矩或当众羞辱/)
  assert.match(prompt, /哪怕打起来，也要写清是谁借外压逼人、谁借外压翻盘/)
  assert.match(prompt, /如果本季正式事实里有妖兽、蛇子、镇妖地或封印外压，后半程至少一集要显性写它怎样继续压人、逼职责或抬高代价/)
  assert.match(prompt, /“拿刀抵喉\/绑住人逼交钥匙\/抓住小柔逼黎明现身”这种直给压法全季最多 2 次/)
  assert.match(prompt, /每集至少落一笔人账、证据账、规则账或关系账/)
  assert.match(prompt, /优先写谁被揭穿、谁失去筹码、谁被迫表态、谁拿证据换命、谁被追责/)
  assert.match(prompt, /一旦宗门、官府或组织问责入场，它只能当压力容器/)
  assert.match(prompt, /中段（尤其第4-7集）如果上一集已经用了程序场/)
  assert.match(prompt, /如果第4集已经从程序场起手，第5集第一句必须改成逃跑、押送、潜入、医治、换手或山林动作/)
  assert.match(prompt, /同一集 summary 里如果已经用了问责、对质或程序场/)
  assert.match(prompt, /禁止使用“人账”“证据账”“规则账”“争证据”“争站队”“争时间”“主导权”这类 writer-room 词/)
  assert.match(prompt, /前 1-6 集不要反复直说“谦卦”“不争”“大道”“真镇守”/)
  assert.match(prompt, /如果主角设定里有“隐忍\/藏锋\/先让后反咬”，前 1-6 集至少两集 summary 要显性写出“黎明先忍”“黎明藏锋”“黎明装弱不亮底”/)
  assert.match(prompt, /第6集以后，每集 summary 第一短句必须先落在搜屋、拦路、医治、抢证、追残党、毁契、换手或逃跑这类私人动作/)
  assert.match(prompt, /第4集以后，分集 summary 第一短句如果还是堂上流程、关押问话或盖章程序/)
  assert.match(prompt, /当前 5 集批次如果必须有程序场，它们只能缩成半句过门/)
  assert.match(prompt, /反例：先盖章再去追人。正例：刚离现场就被石阶伏击/)
  assert.match(prompt, /师父、执事、长老不能带着新证据进门直接替主角揭底/)
  assert.match(prompt, /当前 5 集批次如果出现其他道观、外门、使者或更高层问责，他们只能拿现有旧账加压/)
  assert.match(prompt, /当前批次末集结尾不要再临时开“更大怪物\/更高封印\/更深世界秘密”这种新口/)
  assert.match(prompt, /当前批次末段不准从宗门合议、代表宣判、长老落锤或师父收钥匙开场/)
  assert.match(prompt, /当前批次末集第一场不准从侧殿疗伤、静室听宣判或领处分起手/)
  assert.match(prompt, /当前批次末两集如果必须写接任、认罚、宣判、废修为或宗门表态，只能用 1-2 句当结果确认/)
  assert.match(prompt, /当前批次末段若出现合议、侧殿、接任、令牌或职责，只能做最短确认/)
  assert.match(prompt, /不准把“职责令牌”“新看守职责”写成尾钩/)
  assert.match(prompt, /小柔或其他情感杠杆角色至少一次主动带出证据、换条件、传信、自救或反咬/)
  assert.match(prompt, /每 3 集至少安排 1 次主角或情感杠杆角色先让对手吃实亏/)
  assert.match(prompt, /当前批次末段不要把“长老揭穿\/长老裁决\/宗门表态”写成主推进/)
  assert.match(prompt, /师父、长老、高手不能直接执行“废修为、收钥匙、投入炼炉、当众宣判”这类终局动作/)
  assert.match(prompt, /不要把“象征意义、话语权、势力格局、各方震动”这类抽象词当推进/)
  assert.match(prompt, /当前批次末两集不准临时引入新名字、新亲属、新残党领头人接管尾声/)
})
