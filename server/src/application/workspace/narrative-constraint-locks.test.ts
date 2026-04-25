import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildNarrativeConstraintLocks,
  renderNarrativeConstraintPromptBlock,
  validateNarrativeConstraintLocks,
  type NarrativeConstraintCandidate,
  type NarrativeConstraintStoryIntent
} from './narrative-constraint-locks.ts'

function buildIntent(): NarrativeConstraintStoryIntent {
  return {
    genre: '男频修仙',
    protagonist: '身负魔尊血脉却被伪装成废柴的少年',
    antagonist: '反派大小姐与正道仙盟',
    coreConflict: '废柴少年在宗门嘲笑中觉醒魔尊血脉，查清正道仙盟黑幕',
    relationAnchors: ['宗门老大隐忍保护主角', '女主默默守护主角', '反派大小姐伪装接近并利用主角'],
    storySynopsis: {
      logline: '魔尊血脉少年被伪装成废柴，在宗门欺辱中觉醒并查清父母旧仇',
      openingPressureEvent: '母亲留下的吊坠被当众踩碎',
      firstFaceSlapEvent: '吊坠碎片散出魔力，主角第一次震飞欺辱者',
      antagonistForce: '正道仙盟与反派大小姐',
      antagonistPressureMethod: '大小姐伪装善意接近，套取魔尊血脉信息',
      keyFemaleCharacterFunction: '女主一直暗中守护主角，但男主前期忽视她的善意'
    }
  }
}

function buildCandidate(overrides?: Partial<NarrativeConstraintCandidate>): NarrativeConstraintCandidate {
  return {
    title: '方案A：魔尊废柴打脸流',
    summary: '侧重吊坠破碎、血脉初醒和宗门羞辱后的连续打脸',
    result: {
      sections: [
        {
          sectionTitle: '第一篇章：羞辱觉醒',
          sevenQuestions: {
            goal: '主角想证明自己不是废柴',
            obstacle: '宗门上下故意打压，母亲吊坠被踩碎，魔尊血脉被封印',
            effort: '主角隐忍，吊坠碎裂后引动血脉震飞欺辱者',
            result: '女主暗中消除异象',
            twist: '反派大小姐伪装关心接近主角',
            turnaround: '主角开始接触血脉线索',
            ending: '主角决心查身世'
          }
        },
        {
          sectionTitle: '第二篇章：暗流涌动',
          sevenQuestions: {
            goal: '主角寻找身世线索并提升实力',
            obstacle: '正道仙盟暗中布局，大小姐利用感情套取血脉信息',
            effort: '主角带着吊坠碎片进入禁地，拼合母亲遗言和血脉封印图谱',
            result: '获得部分父母旧仇真相',
            twist: '主角发现大小姐给的线索有破绽，开始戒备',
            turnaround: '主角不动声色试探大小姐',
            ending: '主角继续隐忍布局'
          }
        },
        {
          sectionTitle: '第三篇章：真相浮现',
          sevenQuestions: {
            goal: '主角查清仙盟阴谋',
            obstacle: '仙盟布下血祭大阵',
            effort: '女主用宗门禁术护心，帮主角稳住血脉',
            result: '主角反杀仙盟高手',
            twist: '宗门老大揭示隐忍保护的真相',
            turnaround: '主角理解宗门老大的苦衷',
            ending: '主角与女主联手'
          }
        },
        {
          sectionTitle: '第四篇章：终极对决',
          sevenQuestions: {
            goal: '主角铲除反派大小姐并守护世界',
            obstacle: '大小姐启动禁术融合魔尊残魂',
            effort: '主角利用吊坠碎片破解封魔阵眼',
            result: '女主重伤昏迷，主角悲痛爆发',
            twist: '宗门老大赶到补全封印代价',
            turnaround: '主角掌控魔尊血脉',
            ending: '主角救回女主，与宗门老大和解'
          }
        }
      ]
    },
    ...overrides
  }
}

test('renderNarrativeConstraintPromptBlock promotes soft story rules to hard locks', () => {
  const locks = buildNarrativeConstraintLocks(buildIntent())
  const prompt = renderNarrativeConstraintPromptBlock(locks)

  assert.ok(prompt.includes('【叙事约束锁】'))
  assert.ok(prompt.includes('女主关系锁'))
  assert.ok(prompt.includes('冷淡/忽视/误会善意'))
  assert.ok(prompt.includes('吊坠生命周期锁'))
  assert.ok(prompt.includes('信任梯度锁'))
  assert.ok(prompt.includes('掌门/宗门老大命运锁'))
})

test('validateNarrativeConstraintLocks accepts a candidate that respects relation, item, trust, and mentor locks', () => {
  const locks = buildNarrativeConstraintLocks(buildIntent())
  const errors = validateNarrativeConstraintLocks(buildCandidate(), locks)

  assert.deepEqual(errors, [])
})

test('validateNarrativeConstraintLocks rejects enemy heroine, one-shot pendant, full trust, and mentor death', () => {
  const locks = buildNarrativeConstraintLocks(buildIntent())
  const badCandidate = buildCandidate({
    result: {
      sections: [
        buildCandidate().result.sections[0],
        {
          sectionTitle: '第二篇章：暗流涌动',
          sevenQuestions: {
            goal: '主角寻找身世线索',
            obstacle: '大小姐利用感情套取血脉信息',
            effort: '主角进入禁地获取母亲遗言碎片',
            result: '主角完全信任大小姐，毫无怀疑',
            twist: '女主为救主角暴露身份，被主角误解为敌人',
            turnaround: '主角怒而催动魔力',
            ending: '主角被软禁'
          }
        },
        {
          sectionTitle: '第三篇章：真相浮现',
          sevenQuestions: {
            goal: '主角突破封印',
            obstacle: '仙盟布阵',
            effort: '女主护心',
            result: '主角魔力暴涨',
            twist: '宗门老大临终揭示所有真相',
            turnaround: '主角悔恨',
            ending: '主角宣战'
          }
        },
        {
          sectionTitle: '第四篇章：终极对决',
          sevenQuestions: {
            goal: '主角复仇',
            obstacle: '大小姐启动禁术',
            effort: '主角破阵',
            result: '女主为挡刀牺牲自己',
            twist: '女主重伤未死',
            turnaround: '主角斩杀大小姐',
            ending: '主角与女主相守'
          }
        }
      ]
    }
  })

  const fields = validateNarrativeConstraintLocks(badCandidate, locks).map((error) => error.field)

  assert.ok(fields.includes('femaleLeadRelation'))
  assert.ok(fields.includes('keyItemLifecycle'))
  assert.ok(fields.includes('trustGradient'))
  assert.ok(fields.includes('mentorFate'))
  assert.ok(fields.includes('femaleLeadFate'))
})
