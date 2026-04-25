import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSevenQuestionsPrompt,
  parseSevenQuestionsResponse,
  validateCandidate,
  type StoryIntentInput,
  type ValidatedCandidate
} from './seven-questions-agent.ts'

function buildMinimalIntent(): StoryIntentInput {
  return {
    titleHint: '修仙传',
    genre: '玄幻修仙',
    audience: '男频',
    protagonist: '身负魔尊血脉却被伪装成废柴的少年',
    antagonist: '宗门长老',
    coreConflict: '废柴少年在宗门嘲笑中觉醒魔尊血脉，查清正道仙盟黑幕',
    storySynopsis: {
      logline: '魔尊血脉少年被伪装成废柴，在宗门欺辱中觉醒并查清父母旧仇',
      openingPressureEvent: '母亲留下的吊坠被当众踩碎',
      firstFaceSlapEvent: '吊坠碎片散出魔力，主角第一次震飞欺辱者',
      keyFemaleCharacterFunction: '女主一直暗中守护主角，但男主前期忽视她的善意'
    }
  }
}

test('prompt contains candidates requirement', () => {
  const prompt = buildSevenQuestionsPrompt(buildMinimalIntent(), 20)
  assert.ok(prompt.includes('candidates'))
  assert.ok(prompt.includes('至少 2 个'))
  assert.ok(prompt.includes('方案A'))
  assert.ok(prompt.includes('方案B'))
})

test('xianxia prompt does not seed off-genre candidate examples', () => {
  const prompt = buildSevenQuestionsPrompt(buildMinimalIntent(), 20)
  assert.ok(prompt.includes('方案B：仙盟伪善黑幕流'))
  assert.ok(prompt.includes('正道仙盟'))
  assert.ok(!prompt.includes('方案B：刺客背叛黑幕流'))
  assert.ok(!prompt.includes('"summary": "侧重组织黑幕揭露与身份反转，悬疑感强，中后期爆发"'))
  assert.ok(prompt.includes('武林盟主/武林盟”必须改写为'))
  assert.ok(prompt.includes('“真爱之力”必须改写为'))
})

test('xianxia prompt preserves female lead and pendant payoff constraints', () => {
  const prompt = buildSevenQuestionsPrompt(buildMinimalIntent(), 20)
  assert.ok(prompt.includes('女主线必须是“默默守护但被男主忽视/误解善意”'))
  assert.ok(prompt.includes('不要写成“女主是敌人”'))
  assert.ok(prompt.includes('不得写成“被主角误解/怀疑为敌人”'))
  assert.ok(prompt.includes('不得写“牺牲自己/死亡”再用一句话改成未死'))
  assert.ok(prompt.includes('吊坠被踩碎后必须保留后续价值'))
  assert.ok(prompt.includes('血脉封印图谱'))
})

test('prompt contains seven-questions principles', () => {
  const prompt = buildSevenQuestionsPrompt(buildMinimalIntent(), 20)
  assert.ok(prompt.includes('七问是篇章级叙事骨架'))
  assert.ok(prompt.includes('分篇章强制条件'))
})

test('prompt contains storySynopsis openingPressureEvent when provided', () => {
  const prompt = buildSevenQuestionsPrompt(
    {
      ...buildMinimalIntent(),
      storySynopsis: {
        logline: '废灵根刺客觉醒神尊之力',
        openingPressureEvent: '测灵台当众判废体',
        firstFaceSlapEvent: '测灵石炸裂反噬长老',
        antagonistPressureMethod: '用宗门规矩当众废他灵脉'
      }
    },
    20
  )
  assert.ok(prompt.includes('【故事梗概——这是生成七问的核心依据】'))
  assert.ok(prompt.includes('开局压迫事件：测灵台当众判废体'))
})

test('prompt contains storySynopsis firstFaceSlapEvent when provided', () => {
  const prompt = buildSevenQuestionsPrompt(
    {
      ...buildMinimalIntent(),
      storySynopsis: {
        logline: '废灵根刺客觉醒神尊之力',
        openingPressureEvent: '测灵台当众判废体',
        firstFaceSlapEvent: '测灵石炸裂反噬长老',
        antagonistPressureMethod: '用宗门规矩当众废他灵脉'
      }
    },
    20
  )
  assert.ok(prompt.includes('第一场打脸：测灵石炸裂反噬长老'))
})

test('prompt contains storySynopsis antagonistPressureMethod when provided', () => {
  const prompt = buildSevenQuestionsPrompt(
    {
      ...buildMinimalIntent(),
      storySynopsis: {
        logline: '废灵根刺客觉醒神尊之力',
        openingPressureEvent: '测灵台当众判废体',
        firstFaceSlapEvent: '测灵石炸裂反噬长老',
        antagonistPressureMethod: '用宗门规矩当众废他灵脉'
      }
    },
    20
  )
  assert.ok(prompt.includes('反派压迫方式：用宗门规矩当众废他灵脉'))
})

test('prompt omits storySynopsis block when logline is missing', () => {
  const prompt = buildSevenQuestionsPrompt(
    {
      ...buildMinimalIntent(),
      storySynopsis: {
        openingPressureEvent: '测灵台当众判废体'
      }
    },
    20
  )
  assert.ok(!prompt.includes('【故事梗概——这是生成七问的核心依据】'))
})

test('prompt shows 未填 for missing optional synopsis fields', () => {
  const prompt = buildSevenQuestionsPrompt(
    {
      ...buildMinimalIntent(),
      storySynopsis: {
        logline: '仅有一句梗概'
      }
    },
    20
  )
  assert.ok(prompt.includes('开局压迫事件：未填'))
  assert.ok(prompt.includes('第一场打脸：未填'))
  assert.ok(prompt.includes('反派压迫方式：未填'))
})

test('parse new format with 2 candidates', () => {
  const raw = JSON.stringify({
    candidates: [
      {
        title: '方案A：废材逆袭打脸流',
        summary: '侧重主角从废体到觉醒的打脸爽感',
        needsSections: false,
        sectionCount: 1,
        sectionCountReason: '故事线单一',
        sections: [
          {
            sectionNo: 1,
            sectionTitle: '第一篇章：觉醒之路',
            startEpisode: 1,
            endEpisode: 20,
            sevenQuestions: {
              goal: '觉醒神尊之力',
              obstacle: '宗门废他灵脉',
              effort: '隐忍修炼',
              result: '测灵石炸裂',
              twist: '力量来自上古神尊',
              turnaround: '众人以为他是天才',
              ending: '踏上复仇之路'
            }
          }
        ]
      },
      {
        title: '方案B：刺客背叛黑幕流',
        summary: '侧重组织黑幕揭露',
        needsSections: true,
        sectionCount: 2,
        sectionCountReason: '凡人界到修仙界跨越',
        sections: [
          {
            sectionNo: 1,
            sectionTitle: '第一篇章：黑幕初现',
            startEpisode: 1,
            endEpisode: 10,
            sevenQuestions: {
              goal: '查清组织黑幕',
              obstacle: '组织追杀',
              effort: '收集证据',
              result: '发现更大阴谋',
              twist: '组织首脑是自己义父',
              turnaround: '被迫正面对决',
              ending: '逃离组织'
            }
          }
        ]
      }
    ]
  })

  const result = parseSevenQuestionsResponse(raw, 20)
  assert.equal(result.candidates.length, 2)
  assert.equal(result.needsMoreCandidates, false)

  const candA = result.candidates[0]
  assert.equal(candA.title, '方案A：废材逆袭打脸流')
  assert.equal(candA.result.needsSections, false)
  assert.equal(candA.result.sections[0].sevenQuestions.goal, '觉醒神尊之力')
  assert.equal(candA.source, 'generated')
  assert.ok(candA.id.startsWith('cand_'))

  const candB = result.candidates[1]
  assert.equal(candB.title, '方案B：刺客背叛黑幕流')
  assert.equal(candB.result.needsSections, true)
})

test('parse old format single result returns 1 candidate with needsMoreCandidates=true', () => {
  const raw = JSON.stringify({
    needsSections: false,
    sectionCount: 1,
    sectionCountReason: '单一故事线',
    sections: [
      {
        sectionNo: 1,
        sectionTitle: '第一篇章',
        startEpisode: 1,
        endEpisode: 20,
        sevenQuestions: {
          goal: '觉醒',
          obstacle: '废体',
          effort: '修炼',
          result: '炸裂',
          twist: '神尊',
          turnaround: '震惊',
          ending: '复仇'
        }
      }
    ]
  })

  const result = parseSevenQuestionsResponse(raw, 20)
  assert.equal(result.candidates.length, 1)
  assert.equal(result.needsMoreCandidates, true)
  assert.equal(result.candidates[0].title, '未命名方案')
  assert.equal(result.candidates[0].result.sections[0].sevenQuestions.goal, '觉醒')
})

test('parse empty candidates returns empty with needsMoreCandidates=true', () => {
  const result = parseSevenQuestionsResponse('{"candidates": []}', 10)
  assert.equal(result.candidates.length, 0)
  assert.equal(result.needsMoreCandidates, true)
})

test('parse invalid JSON returns empty with needsMoreCandidates=true', () => {
  const result = parseSevenQuestionsResponse('not json at all', 10)
  assert.equal(result.candidates.length, 0)
  assert.equal(result.needsMoreCandidates, true)
})

test('parse with markdown code block wrapper', () => {
  const raw = '```json\n' + JSON.stringify({
    candidates: [
      {
        title: '方案A',
        summary: '测试',
        needsSections: false,
        sectionCount: 1,
        sectionCountReason: '',
        sections: [
          {
            sectionNo: 1,
            sectionTitle: '篇章一',
            startEpisode: 1,
            endEpisode: 10,
            sevenQuestions: {
              goal: 'g', obstacle: 'o', effort: 'e', result: 'r', twist: 't', turnaround: 'ta', ending: 'en'
            }
          }
        ]
      }
    ]
  }) + '\n```'

  const result = parseSevenQuestionsResponse(raw, 10)
  assert.equal(result.candidates.length, 1)
  assert.equal(result.needsMoreCandidates, true)
})

test('parse single candidate returns needsMoreCandidates=true', () => {
  const raw = JSON.stringify({
    candidates: [
      {
        title: '唯一方案',
        summary: '只有一个',
        needsSections: false,
        sectionCount: 1,
        sectionCountReason: '',
        sections: [
          {
            sectionNo: 1,
            sectionTitle: '篇章一',
            startEpisode: 1,
            endEpisode: 10,
            sevenQuestions: {
              goal: 'g', obstacle: 'o', effort: 'e', result: 'r', twist: 't', turnaround: 'ta', ending: 'en'
            }
          }
        ]
      }
    ]
  })

  const result = parseSevenQuestionsResponse(raw, 10)
  assert.equal(result.candidates.length, 1)
  assert.equal(result.needsMoreCandidates, true)
})

test('candidate missing sections is filtered out', () => {
  const raw = JSON.stringify({
    candidates: [
      {
        title: '有效方案',
        summary: '有sections',
        needsSections: false,
        sectionCount: 1,
        sectionCountReason: '',
        sections: [
          {
            sectionNo: 1,
            sectionTitle: '篇章一',
            startEpisode: 1,
            endEpisode: 10,
            sevenQuestions: {
              goal: 'g', obstacle: 'o', effort: 'e', result: 'r', twist: 't', turnaround: 'ta', ending: 'en'
            }
          }
        ]
      },
      {
        title: '无效方案',
        summary: '缺sections'
      }
    ]
  })

  const result = parseSevenQuestionsResponse(raw, 10)
  assert.equal(result.candidates.length, 1)
  assert.equal(result.candidates[0].title, '有效方案')
})

test('prompt contains totalEpisodes hard constraint', () => {
  const prompt = buildSevenQuestionsPrompt(buildMinimalIntent(), 20)
  assert.ok(prompt.includes('totalEpisodes'))
  assert.ok(prompt.includes('用户明确要求 20 集'))
  assert.ok(prompt.includes('集数硬约束'))
})

test('prompt contains episode section allocation rule', () => {
  const prompt = buildSevenQuestionsPrompt(buildMinimalIntent(), 20)
  assert.ok(prompt.includes('20 集默认只用 1 个全剧篇章'))
  assert.ok(prompt.includes('60 集可以分 3 个篇章'))
  assert.ok(!prompt.includes('20 集至少 4 个篇章'))
})

test('prompt contains short drama rhythm anchors', () => {
  const prompt = buildSevenQuestionsPrompt(buildMinimalIntent(), 20)
  assert.ok(prompt.includes('短剧节奏锚点'))
  assert.ok(prompt.includes('第1集：开局强压迫'))
  assert.ok(prompt.includes('每5集来一次大爽点'))
})

test('prompt contains max trump card release rhythm', () => {
  const prompt = buildSevenQuestionsPrompt(buildMinimalIntent(), 20)
  assert.ok(prompt.includes('最大底牌释放节奏'))
  assert.ok(prompt.includes('严禁在第10集'))
  assert.ok(prompt.includes('神尊转世'))
})

test('validateCandidate flags wrong totalEpisodes', () => {
  const candidate: ValidatedCandidate = {
    id: 'cand_test',
    title: '测试',
    summary: '测试',
    result: {
      needsSections: true,
      sectionCount: 4,
      sectionCountReason: '测试',
      totalEpisodes: 10,
      sections: [
        { sectionNo: 1, sectionTitle: '一', startEpisode: 1, endEpisode: 5, sevenQuestions: { goal: 'g', obstacle: 'o', effort: 'e', result: 'r', twist: 't', turnaround: 'ta', ending: 'en' } },
        { sectionNo: 2, sectionTitle: '二', startEpisode: 6, endEpisode: 10, sevenQuestions: { goal: 'g', obstacle: 'o', effort: 'e', result: 'r', twist: 't', turnaround: 'ta', ending: 'en' } }
      ]
    },
    createdAt: new Date().toISOString(),
    source: 'generated',
    validationErrors: [],
    isValid: true
  }
  const errors = validateCandidate(candidate, 20)
  assert.ok(errors.some((e) => e.field === 'totalEpisodes'))
  assert.ok(errors.some((e) => e.message.includes('用户要求 20 集')))
})

test('validateCandidate accepts a single full-story section for 20 episodes', () => {
  const candidate: ValidatedCandidate = {
    id: 'cand_test',
    title: '测试',
    summary: '测试',
    result: {
      needsSections: false,
      sectionCount: 1,
      sectionCountReason: '20集主线连续，不强拆篇章',
      totalEpisodes: 20,
      sections: [
        { sectionNo: 1, sectionTitle: '全剧', startEpisode: 1, endEpisode: 20, sevenQuestions: { goal: 'g', obstacle: 'o', effort: 'e', result: 'r', twist: 't', turnaround: 'ta', ending: 'en' } }
      ]
    },
    createdAt: new Date().toISOString(),
    source: 'generated',
    validationErrors: [],
    isValid: true
  }
  const errors = validateCandidate(candidate, 20)
  assert.deepEqual(errors, [])
})

test('validateCandidate flags early finale in ending', () => {
  const candidate: ValidatedCandidate = {
    id: 'cand_test',
    title: '测试',
    summary: '测试',
    result: {
      needsSections: true,
      sectionCount: 2,
      sectionCountReason: '测试',
      totalEpisodes: 20,
      sections: [
        { sectionNo: 1, sectionTitle: '一', startEpisode: 1, endEpisode: 10, sevenQuestions: { goal: 'g', obstacle: 'o', effort: 'e', result: 'r', twist: 't', turnaround: 'ta', ending: '杀上仙界完成逆袭' } },
        { sectionNo: 2, sectionTitle: '二', startEpisode: 11, endEpisode: 20, sevenQuestions: { goal: 'g', obstacle: 'o', effort: 'e', result: 'r', twist: 't', turnaround: 'ta', ending: 'en' } }
      ]
    },
    createdAt: new Date().toISOString(),
    source: 'generated',
    validationErrors: [],
    isValid: true
  }
  const errors = validateCandidate(candidate, 20)
  assert.ok(errors.some((e) => e.field === 'ending'))
  assert.ok(errors.some((e) => e.message.includes('提前大结局')))
})

test('validateCandidate flags early trump card exposure', () => {
  const candidate: ValidatedCandidate = {
    id: 'cand_test',
    title: '测试',
    summary: '测试',
    result: {
      needsSections: true,
      sectionCount: 4,
      sectionCountReason: '测试',
      totalEpisodes: 20,
      sections: [
        { sectionNo: 1, sectionTitle: '一', startEpisode: 1, endEpisode: 5, sevenQuestions: { goal: 'g', obstacle: 'o', effort: 'e', result: 'r', twist: '原来他是万年前神尊转世', turnaround: 'ta', ending: 'en' } },
        { sectionNo: 2, sectionTitle: '二', startEpisode: 6, endEpisode: 10, sevenQuestions: { goal: 'g', obstacle: 'o', effort: 'e', result: 'r', twist: 't', turnaround: 'ta', ending: 'en' } },
        { sectionNo: 3, sectionTitle: '三', startEpisode: 11, endEpisode: 15, sevenQuestions: { goal: 'g', obstacle: 'o', effort: 'e', result: 'r', twist: 't', turnaround: 'ta', ending: 'en' } },
        { sectionNo: 4, sectionTitle: '四', startEpisode: 16, endEpisode: 20, sevenQuestions: { goal: 'g', obstacle: 'o', effort: 'e', result: 'r', twist: 't', turnaround: 'ta', ending: 'en' } }
      ]
    },
    createdAt: new Date().toISOString(),
    source: 'generated',
    validationErrors: [],
    isValid: true
  }
  const errors = validateCandidate(candidate, 20)
  assert.ok(errors.some((e) => e.field === 'twist'))
  assert.ok(errors.some((e) => e.message.includes('底牌过早暴露')))
})

test('parseSevenQuestionsResponse validates candidates with expectedEpisodes', () => {
  const raw = JSON.stringify({
    candidates: [
      {
        title: '方案A',
        summary: '测试',
        needsSections: true,
        sectionCount: 2,
        sectionCountReason: '',
        totalEpisodes: 10,
        sections: [
          { sectionNo: 1, sectionTitle: '一', startEpisode: 1, endEpisode: 5, sevenQuestions: { goal: 'g', obstacle: 'o', effort: 'e', result: 'r', twist: 't', turnaround: 'ta', ending: 'en' } },
          { sectionNo: 2, sectionTitle: '二', startEpisode: 6, endEpisode: 10, sevenQuestions: { goal: 'g', obstacle: 'o', effort: 'e', result: 'r', twist: 't', turnaround: 'ta', ending: 'en' } }
        ]
      }
    ]
  })

  const result = parseSevenQuestionsResponse(raw, 20)
  assert.equal(result.candidates.length, 1)
  const cand = result.candidates[0]
  assert.equal(cand.isValid, false)
  assert.ok(cand.validationErrors.some((e) => e.field === 'totalEpisodes'))
})

test('validateCandidate flags xianxia genre drift from stale wrong template', () => {
  const raw = JSON.stringify({
    candidates: [
      {
        title: '方案B：刺客背叛黑幕流',
        summary: '侧重组织黑幕揭露与身份反转',
        needsSections: true,
        sectionCount: 4,
        sectionCountReason: '测试',
        totalEpisodes: 20,
        sections: [
          {
            sectionNo: 1,
            sectionTitle: '第一篇章：刺客组织黑幕',
            startEpisode: 1,
            endEpisode: 5,
            sevenQuestions: {
              goal: '查清刺客组织黑幕',
              obstacle: '刺客组织追杀',
              effort: '主角潜入组织',
              result: '发现武林盟主参与阴谋',
              twist: '真爱之力稳定血脉',
              turnaround: '继续追查',
              ending: '进入下一阶段'
            }
          },
          {
            sectionNo: 2,
            sectionTitle: '第二篇章',
            startEpisode: 6,
            endEpisode: 10,
            sevenQuestions: {
              goal: '魔尊血脉初醒',
              obstacle: '宗门压迫',
              effort: '隐忍布局',
              result: '取得线索',
              twist: '反派设局',
              turnaround: '主角反击',
              ending: '进入秘境'
            }
          },
          {
            sectionNo: 3,
            sectionTitle: '第三篇章',
            startEpisode: 11,
            endEpisode: 15,
            sevenQuestions: {
              goal: '查清正道仙盟',
              obstacle: '仙盟围剿',
              effort: '破解封印',
              result: '击败中层反派',
              twist: '父母旧仇浮出',
              turnaround: '主角主动设局',
              ending: '逼近幕后'
            }
          },
          {
            sectionNo: 4,
            sectionTitle: '第四篇章',
            startEpisode: 16,
            endEpisode: 20,
            sevenQuestions: {
              goal: '掌控魔尊血脉',
              obstacle: '仙盟终局围杀',
              effort: '联合女主反击',
              result: '揭露阴谋',
              twist: '宗门老大真相',
              turnaround: '主角完全觉醒',
              ending: '完成复仇并守护世界'
            }
          }
        ]
      }
    ]
  })

  const result = parseSevenQuestionsResponse(raw, 20, buildMinimalIntent())
  assert.equal(result.candidates.length, 1)
  const errors = result.candidates[0].validationErrors
  assert.ok(errors.some((error) => error.field === 'genreDrift'))
  assert.ok(errors.some((error) => error.message.includes('刺客组织')))
  assert.ok(errors.some((error) => error.message.includes('武林盟主')))
  assert.ok(errors.some((error) => error.message.includes('真爱之力')))
})

test('validateCandidate flags female lead enemy drift and missing pendant payoff', () => {
  const raw = JSON.stringify({
    candidates: [
      {
        title: '方案A：魔尊废柴打脸流',
        summary: '侧重吊坠破碎和宗门打脸',
        needsSections: true,
        sectionCount: 4,
        sectionCountReason: '20集按5集一篇章',
        totalEpisodes: 20,
        sections: [
          {
            sectionNo: 1,
            sectionTitle: '第一篇章：宗门欺辱',
            startEpisode: 1,
            endEpisode: 5,
            sevenQuestions: {
              goal: '魔尊血脉少年想在宗门证明自己',
              obstacle: '全宗门嘲笑他是废柴，女主是敌人',
              effort: '母亲吊坠被踩碎后主角觉醒魔尊血脉',
              result: '震飞欺辱者',
              twist: '反派大小姐接近他',
              turnaround: '主角开始追查父母旧仇',
              ending: '进入下一阶段'
            }
          },
          {
            sectionNo: 2,
            sectionTitle: '第二篇章：宗门黑幕',
            startEpisode: 6,
            endEpisode: 10,
            sevenQuestions: {
              goal: '调查正道仙盟',
              obstacle: '宗门长老阻拦',
              effort: '男主暗中搜证',
              result: '发现血脉被觊觎',
              twist: '反派大小姐设局',
              turnaround: '主角将计就计',
              ending: '进入禁地'
            }
          },
          {
            sectionNo: 3,
            sectionTitle: '第三篇章：禁地封印',
            startEpisode: 11,
            endEpisode: 15,
            sevenQuestions: {
              goal: '破解禁地封印',
              obstacle: '仙盟法阵压制血脉',
              effort: '主角与女主联手',
              result: '找到父母旧仇证据',
              twist: '宗门老大隐忍真相浮出',
              turnaround: '主角理解守护代价',
              ending: '逼近终局'
            }
          },
          {
            sectionNo: 4,
            sectionTitle: '第四篇章：血脉终临',
            startEpisode: 16,
            endEpisode: 20,
            sevenQuestions: {
              goal: '掌控魔尊血脉',
              obstacle: '正道仙盟围杀',
              effort: '主角破阵反击',
              result: '揭露反派阴谋',
              twist: '女主暗中守护的真相公开',
              turnaround: '主角完成觉醒',
              ending: '完成复仇并守护世界'
            }
          }
        ]
      }
    ]
  })

  const result = parseSevenQuestionsResponse(raw, 20, buildMinimalIntent())
  const errors = result.candidates[0].validationErrors
  assert.ok(errors.some((error) => error.field === 'femaleLeadRelation'))
  assert.ok(errors.some((error) => error.field === 'keyItemLifecycle'))
})

test('validateCandidate flags female lead enemy wording variants and false death', () => {
  const raw = JSON.stringify({
    candidates: [
      {
        title: '方案A：魔尊废柴打脸流',
        summary: '侧重吊坠破碎、血脉初醒和宗门羞辱后的连续打脸',
        needsSections: true,
        sectionCount: 4,
        sectionCountReason: '20集按5集一篇章',
        totalEpisodes: 20,
        sections: [
          {
            sectionNo: 1,
            sectionTitle: '第一篇章：羞辱觉醒',
            startEpisode: 1,
            endEpisode: 5,
            sevenQuestions: {
              goal: '主角在宗门底层受尽羞辱，渴望证明自己不是废柴',
              obstacle: '宗门上下故意打压，母亲遗物被踩碎，魔尊血脉被封印',
              effort: '主角在嘲笑中隐忍，吊坠碎裂后意外引动血脉，震飞欺辱者',
              result: '第一次觉醒引来宗门高层试探，女主暗中消除异象',
              twist: '反派大小姐伪装关心接近主角',
              turnaround: '主角开始接触血脉线索',
              ending: '主角离开禁闭室'
            }
          },
          {
            sectionNo: 2,
            sectionTitle: '第二篇章：暗流涌动',
            startEpisode: 6,
            endEpisode: 10,
            sevenQuestions: {
              goal: '主角初步觉醒，寻找身世线索并提升实力',
              obstacle: '正道仙盟暗中布局，大小姐利用感情套取血脉信息',
              effort: '主角通过女主留下的线索，进入禁地获取母亲遗言碎片',
              result: '获得部分真相',
              twist: '女主为救主角暴露身份，被主角误解为敌人',
              turnaround: '主角怒而催动魔力',
              ending: '主角被软禁'
            }
          },
          {
            sectionNo: 3,
            sectionTitle: '第三篇章：真相浮现',
            startEpisode: 11,
            endEpisode: 15,
            sevenQuestions: {
              goal: '主角突破封印，彻底觉醒魔尊血脉',
              obstacle: '大小姐联合仙盟布下绝杀大阵',
              effort: '女主用宗门禁术护心，点燃主角血脉',
              result: '主角魔力暴涨',
              twist: '宗门老大揭示所有真相',
              turnaround: '主角悔恨误解女主',
              ending: '主角与女主联手'
            }
          },
          {
            sectionNo: 4,
            sectionTitle: '第四篇章：终极对决',
            startEpisode: 16,
            endEpisode: 20,
            sevenQuestions: {
              goal: '主角铲除反派大小姐',
              obstacle: '大小姐启动禁术',
              effort: '主角利用吊坠碎片破解法器',
              result: '主角与大小姐激战，女主为挡刀牺牲自己',
              twist: '女主重伤未死，用最后力量激活封魔阵眼',
              turnaround: '主角彻底斩杀大小姐',
              ending: '主角与女主相守'
            }
          }
        ]
      }
    ]
  })

  const result = parseSevenQuestionsResponse(raw, 20, buildMinimalIntent())
  const errors = result.candidates[0].validationErrors
  assert.ok(errors.some((error) => error.field === 'femaleLeadRelation'))
  assert.ok(errors.some((error) => error.field === 'femaleLeadFate'))
})
