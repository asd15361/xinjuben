import test from 'node:test'
import assert from 'node:assert/strict'

import type { StoryIntentPackageDto } from '@shared/contracts/intake'
import type { FactionMatrixDto } from '@shared/contracts/faction-matrix'
import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import {
  buildCharacterProfileV2AgentPrompt,
  generateCharacterProfileV2,
  parseCharacterProfileV2Response
} from './character-profile-v2-agent.ts'

function buildRuntimeConfig(): RuntimeProviderConfig {
  const provider = {
    apiKey: 'test',
    baseUrl: 'https://example.test',
    model: 'test-model',
    systemInstruction: '',
    timeoutMs: 1000
  }
  return {
    deepseek: provider,
    openrouterGeminiFlashLite: provider,
    openrouterQwenFree: provider,
    lanes: {
      deepseek: true,
      openrouterGeminiFlashLite: false,
      openrouterQwenFree: false
    },
    runtimeFetchTimeoutMs: 1000
  }
}

function buildStoryIntent(): StoryIntentPackageDto {
  return {
    titleHint: '魔尊血脉',
    genre: '男频修仙',
    protagonist: '叶辰',
    antagonist: '苏天雄',
    sellingPremise: '废柴外门弟子觉醒魔尊血脉，识破仙盟伪善夺血脉',
    coreConflict: '叶辰被宗门内鬼与仙盟棋子围猎血脉，必须在误信与识破之间反设局',
    officialKeyCharacters: [],
    lockedCharacterNames: [],
    themeAnchors: [],
    worldAnchors: [],
    relationAnchors: [],
    dramaticMovement: []
  }
}

function buildFactionMatrix(): FactionMatrixDto {
  return {
    title: '魔尊血脉',
    totalEpisodes: 20,
    factions: [
      {
        id: 'faction_qingyun',
        name: '青云宗',
        positioning: '宗主暗护主角，大长老暗中压制主角',
        coreDemand: '守住宗门声誉与魔尊血脉秘密',
        coreValues: '宗门秩序高于个人委屈',
        mainMethods: ['门规压迫', '暗中保护'],
        vulnerabilities: ['内鬼渗透'],
        branches: [
          {
            id: 'branch_elder',
            name: '长老派',
            parentFactionId: 'faction_qingyun',
            positioning: '持续打压叶辰',
            coreDemand: '夺取血脉并架空宗主',
            characters: [
              {
                id: 'char_li_chong',
                name: '李崇',
                roleInFaction: 'enforcer',
                branchId: 'branch_elder',
                depthLevel: 'mid',
                identity: '大长老亲信',
                coreMotivation: '追随强者上位',
                plotFunction: '执行体罚、刁难和灭口'
              }
            ]
          }
        ]
      }
    ],
    crossRelations: [],
    landscapeSummary: '青云宗内部保护线和压制线互相撕扯。',
    factionTimetable: []
  }
}

function buildSeniorDiscipleFactionMatrix(): FactionMatrixDto {
  return {
    title: '魔尊血脉',
    totalEpisodes: 20,
    factions: [
      {
        id: 'faction_xuantian',
        name: '玄天宗',
        positioning: '主角所在宗门，掌门派暗中护住主角',
        coreDemand: '守住宗门秩序与主角秘密',
        coreValues: '同门情义与宗门规矩拉扯',
        mainMethods: ['门规遮掩', '暗中保护'],
        vulnerabilities: ['仙盟施压'],
        branches: [
          {
            id: 'branch_leader',
            name: '掌门派',
            parentFactionId: 'faction_xuantian',
            positioning: '掌门直属，表面按规矩办事，暗中护住主角',
            coreDemand: '效忠师父，维护同门',
            characters: [
              {
                id: 'char_wang_yue',
                name: '王岳',
                roleInFaction: 'enforcer',
                branchId: 'branch_leader',
                depthLevel: 'mid',
                identity: '掌门亲传大弟子，表面冷漠，实关心主角',
                coreMotivation: '效忠师父，维护同门',
                plotFunction: '把掌门派压力落到主角身上，也在关键时刻替主角留退路'
              }
            ]
          }
        ]
      }
    ],
    crossRelations: [],
    landscapeSummary: '玄天宗掌门派夹在仙盟压力和主角安危之间。',
    factionTimetable: []
  }
}

test('character profile prompt requires narrative biography, dramatic hook, and costed arc', () => {
  const prompt = buildCharacterProfileV2AgentPrompt({
    storyIntent: buildStoryIntent(),
    factionMatrix: buildFactionMatrix()
  })

  assert.match(prompt, /biography 必须是一段自然人物小传/)
  assert.match(prompt, /biography 必须自然融合五维/)
  assert.match(prompt, /不要把 identity、values、plotFunction 硬拼/)
  assert.match(prompt, /plotFunction 必须点名对手戏对象/)
  assert.match(prompt, /publicMask 必须是可拍演法/)
  assert.match(prompt, /conflictTrigger 必须写具体可拍场面/)
  assert.match(prompt, /advantage 必须写能直接进剧本的行动抓手/)
  assert.match(prompt, /禁止“聪明、勇敢、实力强、资源多”/)
  assert.match(prompt, /arc 必须写成：起点 → 触发事件 → 中段摇摆 → 代价选择 → 终局变化/)
  assert.match(prompt, /禁止只写“最终背叛\/最终战死\/最终醒悟”/)
})

test('parseCharacterProfileV2Response normalizes generated biography and result-only arc', () => {
  const parsed = parseCharacterProfileV2Response(
    JSON.stringify({
      characters: [
        {
          id: 'char_su',
          name: '苏婉柔',
          depthLevel: 'core',
          factionId: 'faction_xuantian',
          branchId: 'branch_su',
          roleInFaction: 'variable',
          appearance: '白衣清冷。',
          personality: '外柔内冷。',
          identity: '苏家棋子。',
          values: '家族利益优先。',
          plotFunction: '接近叶辰并制造情感信息差。',
          protectTarget: '苏家给她的身份和最后的选择权。',
          fear: '叶辰看穿她后再也不信她。',
          conflictTrigger: '苏天雄逼她牺牲叶辰时。',
          advantage: '能用假情报试探叶辰，也能在关键时刻反咬苏天雄。',
          weakness: '真实感情和家族身份同时被拿住。',
          goal: '完成接近任务并保住苏家。',
          arc: '从冷酷卧底到内心挣扎，最终可能选择背叛或救赎。',
          publicMask: '表面是温柔无害的仙盟大小姐。',
          biography: '苏家棋子。，家族利益优先。。接近叶辰并制造情感信息差。'
        }
      ]
    })
  )

  assert.ok(parsed)
  const character = parsed.characters[0]
  assert.equal((character.biography || '').includes('。，'), false)
  assert.match(character.biography || '', /^苏婉柔是苏家棋子/)
  assert.match(character.biography || '', /白衣清冷/)
  assert.equal((character.biography || '').includes('身份是'), false)
  assert.equal((character.biography || '').includes('性格底色'), false)
  assert.equal((character.biography || '').includes('在戏里'), false)
  assert.equal(character.publicMask?.startsWith('表面'), false)
  assert.match(character.arc || '', /触发：苏天雄逼她牺牲叶辰/)
  assert.match(character.arc || '', /代价选择：苏家给她的身份和最后的选择权/)
})

test('parseCharacterProfileV2Response rewrites field-stitched biography before it reaches display layers', () => {
  const parsed = parseCharacterProfileV2Response(
    JSON.stringify({
      characters: [
        {
          id: 'char_lixueer',
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
          goal: '帮助主角洗清冤屈。',
          biography:
            '李雪儿外在年约十八，容貌清丽，身份是掌门之女；性格底色是正义感强。在戏里，李雪儿负责作为主角盟友；每次选择都牵动他的软肋与代价。'
        }
      ]
    })
  )

  assert.ok(parsed)
  const biography = parsed.characters[0]?.biography || ''
  assert.equal(biography.includes('身份是'), false)
  assert.equal(biography.includes('性格底色'), false)
  assert.equal(biography.includes('在戏里'), false)
  assert.equal(biography.includes('牵动他的软肋'), false)
  assert.match(biography, /^李雪儿是掌门之女/)
})

test('parseCharacterProfileV2Response extracts JSON object from fenced prose response', () => {
  const parsed = parseCharacterProfileV2Response(`这里是人物小传结果：
\`\`\`json
${JSON.stringify({
  characters: [
    {
      id: 'char_li',
      name: '李崇',
      depthLevel: 'mid',
      factionId: 'faction_qingyun',
      branchId: 'branch_elder',
      roleInFaction: 'enforcer',
      appearance: '黑袍重剑。',
      personality: '狠厉急躁。',
      identity: '大长老亲信。',
      values: '强者命令高于门规。',
      plotFunction: '在演武场压迫叶辰并把长老派冲突推到台前。',
      biography: '李崇是青云宗大长老亲信，负责把长老派压力落到主角身上。'
    }
  ]
})}
\`\`\`
以上。`)

  assert.ok(parsed)
  assert.equal(parsed.characters[0]?.name, '李崇')
})

test('generateCharacterProfileV2 falls back to faction placeholders after repeated malformed JSON', async () => {
  const logs: string[] = []
  const result = await generateCharacterProfileV2({
    storyIntent: buildStoryIntent(),
    factionMatrix: buildFactionMatrix(),
    runtimeConfig: buildRuntimeConfig(),
    diagnosticLogger: async (message) => {
      logs.push(message)
    },
    generateText: async () =>
      ({
        text: '人物小传已经生成，但不是合法 JSON：{ "characters": [',
        lane: 'deepseek',
        model: 'test-model',
        usedFallback: false,
        durationMs: 1
      }) as never
  })

  assert.equal(result.characters.length, 1)
  assert.equal(result.characters[0]?.name, '李崇')
  assert.equal(result.characters[0]?.factionId, 'faction_qingyun')
  assert.ok(result.characters[0]?.biography?.includes('李崇'))
  assert.ok(logs.some((message) => message.includes('faction_parse_fallback')))
})

test('generateCharacterProfileV2 fallback writes senior disciple as conflicted protector, not generic placeholder', async () => {
  const result = await generateCharacterProfileV2({
    storyIntent: {
      ...buildStoryIntent(),
      protagonist: '凌寒',
      antagonist: '云天鹤'
    },
    factionMatrix: buildSeniorDiscipleFactionMatrix(),
    runtimeConfig: buildRuntimeConfig(),
    diagnosticLogger: async () => {},
    generateText: async () =>
      ({
        text: '人物小传已经生成，但不是合法 JSON：{ "characters": [',
        lane: 'deepseek',
        model: 'test-model',
        usedFallback: false,
        durationMs: 1
      }) as never
  })

  const character = result.characters[0]
  assert.equal(character?.name, '王岳')
  const text = JSON.stringify(character)
  assert.equal(text.includes('被更强的人替掉'), false)
  assert.equal(text.includes('还能掌控的选择余地'), false)
  assert.equal(text.includes('暗里被效忠师父'), false)
  assert.match(character?.protectTarget || '', /师父|同门|凌寒|主角/)
  assert.match(character?.hiddenPressure || '', /师命|师父|同门|凌寒|主角|规矩/)
  assert.match(character?.biography || '', /亲传大弟子|师父|同门|凌寒|主角/)
})
