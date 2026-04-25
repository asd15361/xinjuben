import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeSummaryPayload } from './summarize-chat-for-generation-support.ts'
import { buildConfirmedStoryIntent } from '../../../shared/domain/workflow/confirmed-story-intent.ts'
import { inspectStorySynopsisReadiness } from '../../../shared/domain/intake/story-synopsis.ts'
import {
  buildSevenQuestionsPrompt,
  parseSevenQuestionsResponse
} from '../../../../server/src/application/workspace/seven-questions-agent.ts'

test('mock chain: 修仙逆袭全链路验收', () => {
  // ========== 1. 模拟 summarizeChat 输出 ==========
  const payload = normalizeSummaryPayload(
    {
      projectTitle: '废灵根逆袭',
      episodeCount: 20,
      genreAndStyle: '古代修仙｜男频爽剧',
      tone: '爽',
      audience: '男频',
      sellingPremise: '废灵根刺客发现效忠势力是世间祸首',
      coreDislocation: '废体其实是神尊封印',
      emotionalPayoff: '废材逆袭、身份反转、当众打脸',
      worldAndBackground: '修仙界宗门林立',
      protagonist: '沈烬',
      antagonist: '宗门长老',
      coreConflict: '刺客发现组织是世间祸首',
      endingDirection: '登顶清算',
      keyCharacters: ['沈烬', '宗门长老', '苏婉'],
      chainSynopsis:
        '废灵根刺客沈烬发现效忠的刺客组织是世间祸首，体内封印的上古神尊之力觉醒，逆袭打脸',
      dramaticMovement: ['欲望线', '阻力线', '代价线', '关系线', '钩子线'],
      creativeSummary:
        '用户想写一个废灵根刺客发现组织黑幕的修仙逆袭故事，20集，多女主，体内封印上古神尊，当众打脸',
      storySynopsis: {
        logline: '废灵根刺客发现效忠势力是世间祸首，觉醒神尊之力逆袭',
        openingPressureEvent: '测灵台当众判废体受辱',
        protagonistCurrentDilemma: '被宗门判废体，功劳被夺，未婚妻冷眼',
        firstFaceSlapEvent: '测灵石爆裂，长老反噬，封印初现',
        antagonistForce: '腐朽宗门与刺客组织联合体',
        antagonistPressureMethod: '宗门规矩当众废他灵脉，权位压迫，栽赃陷害',
        corePayoff: '废材逆袭、身份反转、当众打脸',
        stageGoal: '先在宗门站稳并查出幕后黑手',
        keyFemaleCharacterFunction: '多女主，先弃后追',
        episodePlanHint: '20集，前5集觉醒打脸，中10集查黑幕，后5集登顶',
        finaleDirection: '登顶仙界清算旧势力'
      }
    },
    '用户：古代修仙\n用户：男频爽剧\n用户：屌丝逆袭\n用户：刺客发现效忠势力是祸首\n用户：废灵根当众受辱\n用户：体内封印上古神尊\n用户：身份反转\n用户：隐藏身份\n用户：20集\n用户：多女主'
  )

  // ========== 2. 验证 creativeSummary ==========
  assert.equal(
    payload.storyIntent.creativeSummary,
    '用户想写一个废灵根刺客发现组织黑幕的修仙逆袭故事，20集，多女主，体内封印上古神尊，当众打脸'
  )

  // ========== 3. 验证 storySynopsis 字段 ==========
  const ss = payload.storyIntent.storySynopsis
  assert.ok(ss, 'storySynopsis 不应为 null')
  assert.equal(ss?.logline, '废灵根刺客发现效忠势力是世间祸首，觉醒神尊之力逆袭')
  assert.equal(ss?.openingPressureEvent, '测灵台当众判废体受辱')
  assert.equal(ss?.firstFaceSlapEvent, '测灵石爆裂，长老反噬，封印初现')
  assert.equal(ss?.antagonistForce, '腐朽宗门与刺客组织联合体')
  assert.equal(ss?.antagonistPressureMethod, '宗门规矩当众废他灵脉，权位压迫，栽赃陷害')
  assert.equal(ss?.corePayoff, '废材逆袭、身份反转、当众打脸')
  assert.equal(ss?.stageGoal, '先在宗门站稳并查出幕后黑手')

  // ========== 4. buildConfirmedStoryIntent 组装 ==========
  const confirmed = buildConfirmedStoryIntent({
    storyIntent: payload.storyIntent,
    generationBriefText: payload.generationBriefText,
    chatTranscript: '用户：古代修仙\n用户：20集'
  })

  assert.ok(confirmed.storySynopsis)
  assert.equal(confirmed.storySynopsis?.openingPressureEvent, '测灵台当众判废体受辱')
  assert.equal(confirmed.creativeSummary, payload.storyIntent.creativeSummary)

  // ========== 5. readiness 质量门 ==========
  const readiness = inspectStorySynopsisReadiness(confirmed.storySynopsis)
  assert.equal(readiness.ready, true, `应通过 readiness，但缺：${readiness.missing.join('、')}`)
  assert.equal(readiness.missing.length, 0)

  // ========== 6. 七问 prompt 包含 storySynopsis ==========
  const prompt = buildSevenQuestionsPrompt(
    {
      titleHint: confirmed.titleHint,
      genre: confirmed.genre,
      tone: confirmed.tone,
      audience: confirmed.audience,
      protagonist: confirmed.protagonist,
      antagonist: confirmed.antagonist,
      coreConflict: confirmed.coreConflict,
      creativeSummary: confirmed.creativeSummary,
      storySynopsis: confirmed.storySynopsis ?? undefined
    },
    20
  )

  assert.ok(prompt.includes('【故事梗概——这是生成七问的核心依据】'))
  assert.ok(prompt.includes('测灵台当众判废体受辱'))
  assert.ok(prompt.includes('测灵石爆裂，长老反噬，封印初现'))
  assert.ok(prompt.includes('宗门规矩当众废他灵脉，权位压迫，栽赃陷害'))
  assert.ok(prompt.includes('先在宗门站稳并查出幕后黑手'))
  assert.ok(prompt.includes('废材逆袭、身份反转、当众打脸'))

  // ========== 7. mock AI 返回 candidates[2] ==========
  const mockAiResponse = JSON.stringify({
    candidates: [
      {
        title: '方案A：废材觉醒打脸流',
        summary: '侧重测灵台觉醒、当场打脸长老，节奏快爽感足',
        needsSections: true,
        sectionCount: 4,
        sectionCountReason: '20集分4个5集篇章',
        totalEpisodes: 20,
        sections: [
          {
            sectionNo: 1,
            sectionTitle: '第一篇章：废体受辱',
            startEpisode: 1,
            endEpisode: 5,
            sevenQuestions: {
              goal: '在宗门中活下去',
              obstacle: '废灵根被当众判废体',
              effort: '忍辱暗中寻找生机',
              result: '发现体内封印异动',
              twist: '测灵石爆裂反噬长老',
              turnaround: '众人开始怀疑他不是废体',
              ending: '被宗门追杀逃入禁地'
            }
          },
          {
            sectionNo: 2,
            sectionTitle: '第二篇章：觉醒之路',
            startEpisode: 6,
            endEpisode: 10,
            sevenQuestions: {
              goal: '激活封印获得力量',
              obstacle: '封印需要远古残片才能解开',
              effort: '收集残片并修炼旁门功法',
              result: '封印初开力量初显',
              twist: '残片引来刺客组织觊觎',
              turnaround: '被迫与组织周旋',
              ending: '发现组织与宗门暗通'
            }
          },
          {
            sectionNo: 3,
            sectionTitle: '第三篇章：黑幕揭秘',
            startEpisode: 11,
            endEpisode: 15,
            sevenQuestions: {
              goal: '查清组织与宗门的黑幕',
              obstacle: '组织高手如云且身中控制',
              effort: '假意效忠暗中收集罪证',
              result: '找到幕后黑手线索',
              twist: '幕后黑手是仙界腐朽势力',
              turnaround: '联合盟友建立反抗力量',
              ending: '身份部分暴露引发围剿'
            }
          },
          {
            sectionNo: 4,
            sectionTitle: '第四篇章：仙界清算',
            startEpisode: 16,
            endEpisode: 20,
            sevenQuestions: {
              goal: '登顶仙界清算旧势力',
              obstacle: '腐朽宗门联合围剿',
              effort: '神尊之力觉醒联合盟友',
              result: '瓦解旧秩序',
              twist: '幕后黑手是上古神尊宿敌',
              turnaround: '神尊之力完全觉醒',
              ending: '建立新秩序多女主归心'
            }
          }
        ]
      },
      {
        title: '方案B：刺客黑幕揭秘流',
        summary: '侧重组织黑幕、身份反转、悬疑感强',
        needsSections: true,
        sectionCount: 4,
        sectionCountReason: '20集分4个5集篇章',
        totalEpisodes: 20,
        sections: [
          {
            sectionNo: 1,
            sectionTitle: '第一篇章：隐忍求存',
            startEpisode: 1,
            endEpisode: 5,
            sevenQuestions: {
              goal: '在宗门中活下去',
              obstacle: '废灵根被全宗轻视资源被克扣',
              effort: '主动揽脏活偷学禁术结交底层',
              result: '获得残缺心法但被发现偷学',
              twist: '昔日仇人揭露他是暗杀组织遗孤',
              turnaround: '被迫成为刺客',
              ending: '进入组织发现与仙界腐败有关'
            }
          },
          {
            sectionNo: 2,
            sectionTitle: '第二篇章：刺客生涯',
            startEpisode: 6,
            endEpisode: 10,
            sevenQuestions: {
              goal: '在组织中站稳脚跟',
              obstacle: '身中控制毒蛊无法脱身',
              effort: '假意效忠暗中破解',
              result: '毒蛊松动但暴露破绽',
              twist: '神尊残魂初醒指点迷津',
              turnaround: '利用组织规矩反制上级',
              ending: '获得组织高层信任接触核心'
            }
          },
          {
            sectionNo: 3,
            sectionTitle: '第三篇章：黑幕揭秘',
            startEpisode: 11,
            endEpisode: 15,
            sevenQuestions: {
              goal: '瓦解组织复仇',
              obstacle: '组织高手如云且身中控制',
              effort: '假意效忠暗中收集罪证',
              result: '找到解药但暴露被追杀',
              twist: '幕后黑手竟与仙界腐败有关',
              turnaround: '联合盟友建立新势力',
              ending: '组织内乱身份部分暴露'
            }
          },
          {
            sectionNo: 4,
            sectionTitle: '第四篇章：复仇觉醒',
            startEpisode: 16,
            endEpisode: 20,
            sevenQuestions: {
              goal: '揭露仙界腐败完成逆袭',
              obstacle: '腐朽宗门联合围剿',
              effort: '神尊之力觉醒联合盟友',
              result: '瓦解旧秩序',
              twist: '原来他是万年前神尊转世',
              turnaround: '身份反转震慑全场',
              ending: '摧毁组织杀上仙界'
            }
          }
        ]
      }
    ]
  })

  const parsed = parseSevenQuestionsResponse(mockAiResponse, 20)
  assert.equal(parsed.candidates.length, 2, '应解析出 2 个候选')
  assert.equal(parsed.needsMoreCandidates, false, '2 个候选不需要更多')

  // ========== 8. 验证集数硬对齐 ==========
  for (const cand of parsed.candidates) {
    assert.equal(cand.result.totalEpisodes, 20, `${cand.title} 集数应为 20`)
  }

  // ========== 9. 选中候选 A ==========
  const selected = parsed.candidates[0]
  assert.equal(selected.title, '方案A：废材觉醒打脸流')
  assert.equal(selected.result.sections[0].sevenQuestions.goal, '在宗门中活下去')

  // ========== 10. 模拟锁定逻辑（前端行为）==========
  // 选中 A 后，B 不会被误保存（前端只把 selected.result 传 save）
  const lockedResult = selected.result
  assert.equal(lockedResult.sections[0].sevenQuestions.twist, '测灵石爆裂反噬长老')

  // 验证 B 的内容不会被误带入
  const notSelected = parsed.candidates[1]
  assert.equal(notSelected.result.sections.length, 4)
  assert.notEqual(
    lockedResult.sections[1].sevenQuestions.twist,
    notSelected.result.sections[1].sevenQuestions.twist
  )
})

test('mock chain: readiness 会正确标记缺失项', () => {
  const incomplete = buildConfirmedStoryIntent({
    storyIntent: {
      titleHint: '测试',
      storySynopsis: {
        logline: '只有一句话梗概',
        openingPressureEvent: '',
        protagonistCurrentDilemma: '',
        firstFaceSlapEvent: '',
        antagonistForce: '',
        antagonistPressureMethod: '',
        corePayoff: '',
        stageGoal: '',
        finaleDirection: ''
      }
    },
    generationBriefText: 'brief',
    chatTranscript: 'transcript'
  })

  const readiness = inspectStorySynopsisReadiness(incomplete.storySynopsis)
  assert.equal(readiness.ready, false)
  assert.ok(readiness.missing.length > 0)
  assert.ok(readiness.missing.some((m) => m.includes('开局压迫事件')))
  assert.ok(readiness.missing.some((m) => m.includes('第一场打脸')))
  assert.ok(readiness.missing.some((m) => m.includes('反派压迫方式')))
})
