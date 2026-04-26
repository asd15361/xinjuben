import test from 'node:test'
import assert from 'node:assert/strict'

import type { StoryIntentPackageDto } from '@shared/contracts/intake'
import type { CharacterDraftDto } from '@shared/contracts/workflow'
import { enrichCharacterDrafts } from './enrich-character-drafts.ts'

function buildStoryIntent(): StoryIntentPackageDto {
  return {
    titleHint: '魔脉天剑',
    genre: '男频修仙',
    protagonist: '林霄',
    antagonist: '云天鹤',
    coreConflict: '林霄被仙盟与宗门长老派围猎魔尊血脉',
    generationBriefText:
      '【项目】魔脉天剑｜20集\n林霄觉醒魔尊血脉，王渊与云天鹤联手夺血脉。\n【角色卡】\n- 李寒：大长老最倚重的爪牙，行事狠辣，从不留活口\n- 林清：自幼被云天鹤收养，对其忠心耿耿，奉命接近慕容家\n- 慕容雄：一心壮大慕容家，与仙盟合作密切，实则各怀鬼胎',
    officialKeyCharacters: [],
    lockedCharacterNames: [],
    themeAnchors: [],
    worldAnchors: [],
    relationAnchors: [],
    dramaticMovement: []
  }
}

function buildIncompleteCharacter(name: string, biography: string, goal: string): CharacterDraftDto {
  return {
    name,
    biography,
    publicMask: '',
    hiddenPressure: '',
    fear: '',
    protectTarget: '',
    conflictTrigger: '',
    advantage: '',
    weakness: '',
    goal,
    arc: '',
    roleLayer: 'active'
  }
}

test('enrichCharacterDrafts does not leak repeated rule-boundary filler for faction agents', () => {
  const result = enrichCharacterDrafts({
    storyIntent: buildStoryIntent(),
    generationBriefText: buildStoryIntent().generationBriefText || '',
    characters: [
      buildIncompleteCharacter(
        '李寒',
        '大长老最倚重的爪牙，行事狠辣，从不留活口。',
        '服从即是正义，实力决定一切，不择手段维护大长老权威。'
      ),
      buildIncompleteCharacter(
        '林清',
        '林清自幼被云天鹤收养，对其忠心耿耿。',
        '忠君事主，完成任务高于一切；相信盟主的正义。'
      ),
      buildIncompleteCharacter(
        '慕容雄',
        '慕容雄一心壮大慕容家，与仙盟合作密切，实则各怀鬼胎。',
        '家族荣耀高于一切，不惜手段让家族成为仙盟第一大族。'
      )
    ]
  })

  const text = JSON.stringify(result)
  assert.equal(text.includes('职责边界'), false)
  assert.equal(text.includes('规矩解释权'), false)
  assert.equal(text.includes('只按规矩办事'), false)
  assert.match(result.find((item) => item.name === '李寒')?.protectTarget || '', /大长老|任务|爪牙/)
  assert.match(result.find((item) => item.name === '林清')?.protectTarget || '', /云天鹤|盟主|收养/)
  assert.match(result.find((item) => item.name === '慕容雄')?.protectTarget || '', /慕容家|家族/)
  assert.match(result.find((item) => item.name === '李寒')?.arc || '', /起点：/)
  assert.match(result.find((item) => item.name === '林清')?.arc || '', /代价选择：/)
  assert.match(result.find((item) => item.name === '慕容雄')?.arc || '', /终局变化：/)
})

test('enrichCharacterDrafts does not leak unrelated family names or doubled public-mask wording', () => {
  const storyIntent: StoryIntentPackageDto = {
    ...buildStoryIntent(),
    protagonist: '叶辰',
    antagonist: '苏天雄',
    generationBriefText:
      '【项目】魔尊血脉｜20集\n叶辰觉醒魔尊血脉，苏天雄和苏家暗中夺取血脉。\n【角色卡】\n- 李崇：青云宗二长老，大长老王鹤的亲信，执行大长老的打压指令\n- 苏婉柔：苏天雄的独女，从小被培养为家族棋子，接近叶辰只为血脉\n- 苏烈：苏家收养的杀伐工具，只知服从苏天雄'
  }

  const result = enrichCharacterDrafts({
    storyIntent,
    generationBriefText: storyIntent.generationBriefText || '',
    characters: [
      buildIncompleteCharacter('李崇', '青云宗二长老，大长老王鹤的亲信。', '追随强者往上爬。'),
      buildIncompleteCharacter(
        '苏婉柔',
        '苏婉柔是苏天雄的独女，从小被培养为家族棋子。',
        ''
      ),
      buildIncompleteCharacter('苏烈', '苏烈自幼被苏家收养，修炼杀伐之道，只知服从。', '')
    ]
  })

  const text = JSON.stringify(result)
  assert.equal(text.includes('慕容家'), false)
  assert.equal(text.includes('主角逼近'), false)
  assert.equal(text.includes('自己的选择、体面和还能信人的那口气'), false)
  assert.equal(text.includes('表面是苏婉柔是'), false)
  assert.equal(result.find((item) => item.name === '苏婉柔')?.publicMask?.startsWith('表面'), false)
  assert.ok(text.includes('叶辰'))
  assert.ok(text.includes('苏家'))
  assert.match(result.find((item) => item.name === '苏婉柔')?.arc || '', /触发：苏天雄逼苏婉柔牺牲叶辰/)
  assert.match(result.find((item) => item.name === '苏烈')?.arc || '', /摇摆：/)
})

test('enrichCharacterDrafts generic fallback does not leak position-interest-template wording', () => {
  const storyIntent: StoryIntentPackageDto = {
    ...buildStoryIntent(),
    protagonist: '叶辰',
    antagonist: '天衍真人',
    generationBriefText:
      '【项目】魔尊血脉｜20集\n叶辰因魔尊血脉被青云宗和天衍仙盟同时盯上。\n【角色卡】\n- 王堂主：青云宗执法堂堂主，坚信公平执法，却发现高层掩盖主角血脉线索\n- 林尘：林家老仆，掌握主角母亲遗物，暗中引导主角查身世'
  }

  const result = enrichCharacterDrafts({
    storyIntent,
    generationBriefText: storyIntent.generationBriefText || '',
    characters: [
      buildIncompleteCharacter(
        '王堂主',
        '青云宗执法堂堂主，坚信公平执法，却发现高层掩盖主角血脉线索。',
        '宗门法规高于一切，公平执法是宗门根基。'
      ),
      buildIncompleteCharacter(
        '林尘',
        '林家老仆，掌握主角母亲遗物，暗中引导主角查身世。',
        '忠诚至上，林家血脉高于一切。'
      )
    ]
  })

  const text = JSON.stringify(result)
  assert.equal(text.includes('当前拥有的位置'), false)
  assert.equal(text.includes('能继续参与主线的筹码'), false)
  assert.equal(text.includes('对手阵营'), false)
  assert.equal(text.includes('旧信念开始失效'), false)
  assert.equal(text.includes('完成一次真实站位'), false)
  assert.match(result.find((item) => item.name === '王堂主')?.hiddenPressure || '', /执法|线索|高层/)
  assert.match(result.find((item) => item.name === '林尘')?.protectTarget || '', /林家|遗物|叶辰/)
})

test('enrichCharacterDrafts default fallback does not emit old-account or outside-backer template wording', () => {
  const storyIntent: StoryIntentPackageDto = {
    ...buildStoryIntent(),
    protagonist: '林尘',
    antagonist: '王长老',
    generationBriefText:
      '【项目】魔尊血脉｜20集\n林尘被青云宗暗处人员盯上。\n【角色卡】\n- 刘执事：青云宗外门执事，负责发放试炼任务，擅长看风向保全自己'
  }

  const result = enrichCharacterDrafts({
    storyIntent,
    generationBriefText: storyIntent.generationBriefText || '',
    characters: [
      buildIncompleteCharacter(
        '刘执事',
        '刘执事是青云宗外门执事，负责发放试炼任务，擅长看风向保全自己。',
        '先把差事办成，再决定站在哪边。'
      )
    ]
  })

  const character = result.find((item) => item.name === '刘执事')
  assert.ok(character)
  const text = JSON.stringify(character)
  assert.equal(text.includes('旧账'), false)
  assert.equal(text.includes('外部压力'), false)
  assert.equal(text.includes('可调动的关系'), false)
  assert.equal(text.includes('具体现场'), false)
  assert.equal(text.includes('筹码依赖外部靠山'), false)
  assert.equal(text.includes('自己这条线'), false)
  assert.match(character.hiddenPressure || '', /职责|证据|自保/)
  assert.match(character.protectTarget || '', /差事|结果|问责/)
  assert.match(character.arc || '', /现场责任|站队后果/)
})

test('enrichCharacterDrafts treats guardian heroine as protector instead of generic old-account lever', () => {
  const storyIntent: StoryIntentPackageDto = {
    ...buildStoryIntent(),
    protagonist: '凌寒',
    antagonist: '云天鹤',
    generationBriefText:
      '【项目】魔尊血脉｜20集\n凌寒被仙盟追杀，陆青瑶是玄天宗掌门之女，人称青瑶仙子，暗中守护主角并调查仙盟黑幕。'
  }

  const result = enrichCharacterDrafts({
    storyIntent,
    generationBriefText: storyIntent.generationBriefText || '',
    characters: [
      buildIncompleteCharacter(
        '陆青瑶',
        '陆青瑶，玄天宗掌门之女，自幼修习上乘道法，天资卓绝，人称青瑶仙子。她暗中守护主角，一面伪装成对主角漠不关心，一面在主角遭迫害时悄然相助。',
        '坚信情义重于规则，守护挚爱之人高于宗门荣辱。'
      )
    ]
  })

  const character = result.find((item) => item.name === '陆青瑶')
  assert.ok(character)
  const text = JSON.stringify(character)
  assert.equal(text.includes('旧账'), false)
  assert.equal(text.includes('外部靠山'), false)
  assert.equal(text.includes('被仙盟牺牲'), false)
  assert.equal(text.includes('他就会'), false)
  assert.match(character.protectTarget || '', /凌寒|主角|父亲|宗门|真相/)
  assert.match(character.hiddenPressure || '', /仙盟|父亲|宗门|凌寒|主角/)
  assert.match(character.advantage || '', /掌门之女|秘档|密道|道法|情报/)
})

test('enrichCharacterDrafts treats senior disciple as conflicted protector instead of disposable position holder', () => {
  const storyIntent: StoryIntentPackageDto = {
    ...buildStoryIntent(),
    protagonist: '凌寒',
    antagonist: '云天鹤',
    generationBriefText:
      '【项目】魔尊血脉｜20集\n王岳是掌门亲传大弟子，表面冷漠，实关心主角，夹在师父命令、同门规矩和主角安危之间。'
  }

  const result = enrichCharacterDrafts({
    storyIntent,
    generationBriefText: storyIntent.generationBriefText || '',
    characters: [
      buildIncompleteCharacter(
        '王岳',
        '王岳是掌门亲传大弟子，表面冷漠，实关心主角，按玄天宗规矩办事。',
        '效忠师父，维护同门。'
      )
    ]
  })

  const character = result.find((item) => item.name === '王岳')
  assert.ok(character)
  const text = JSON.stringify(character)
  assert.equal(text.includes('被更强的人替掉'), false)
  assert.equal(text.includes('还能掌控的选择余地'), false)
  assert.equal(text.includes('暗里被效忠师父'), false)
  assert.equal(text.includes('旧账'), false)
  assert.match(character.protectTarget || '', /师父|同门|凌寒|主角/)
  assert.match(character.hiddenPressure || '', /师命|师父|同门|凌寒|主角|规矩/)
  assert.match(character.arc || '', /起点：/)
})

test('enrichCharacterDrafts treats direct bullying disciple as enforcer instead of generic old-account lever', () => {
  const storyIntent: StoryIntentPackageDto = {
    ...buildStoryIntent(),
    protagonist: '林尘',
    antagonist: '王长老',
    generationBriefText:
      '【项目】魔尊血脉｜20集\n林尘在青云宗被长老派欺凌，张强是青云宗首席弟子，实为王长老走狗，是主角前期最直接的压迫者。'
  }

  const result = enrichCharacterDrafts({
    storyIntent,
    generationBriefText: storyIntent.generationBriefText || '',
    characters: [
      buildIncompleteCharacter(
        '张强',
        '张强是青云宗首席弟子，金丹初期，自诩天才，对废柴主角林尘百般凌辱，实为王长老的走狗，是主角前期最直接的压迫者。',
        '精英至上、实力决定地位、服从强者。'
      )
    ]
  })

  const character = result.find((item) => item.name === '张强')
  assert.ok(character)
  const text = JSON.stringify(character)
  assert.equal(text.includes('旧账'), false)
  assert.equal(text.includes('外部压力'), false)
  assert.equal(text.includes('可调动的关系'), false)
  assert.equal(text.includes('具体现场'), false)
  assert.equal(text.includes('筹码依赖外部靠山'), false)
  assert.match(character.protectTarget || '', /王长老|权力|爪牙|位置/)
  assert.match(character.hiddenPressure || '', /王长老|林尘|复仇|清算/)
  assert.match(character.arc || '', /公开反击|清算|靶子/)
})

test('enrichCharacterDrafts treats ambitious elder usurper as core antagonist instead of procedural fallback', () => {
  const storyIntent: StoryIntentPackageDto = {
    ...buildStoryIntent(),
    protagonist: '陆尘',
    antagonist: '凌天啸',
    generationBriefText:
      '【项目】魔尊血脉｜20集\n陆尘身怀魔尊血脉，周云鹤是天玄宗大长老，长老派压制者，野心是夺取血脉并取代掌门。'
  }

  const result = enrichCharacterDrafts({
    storyIntent,
    generationBriefText: storyIntent.generationBriefText || '',
    characters: [
      buildIncompleteCharacter(
        '周云鹤',
        '周云鹤是天玄宗大长老，野心家，按天玄宗规矩办事。',
        '夺取血脉，取代掌门。'
      )
    ]
  })

  const character = result.find((item) => item.name === '周云鹤')
  assert.ok(character)
  const text = JSON.stringify(character)
  assert.equal(text.includes('基本秩序，以及自己还能补救的现场关系'), false)
  assert.equal(text.includes('背下现场后果'), false)
  assert.equal(text.includes('现场变局'), false)
  assert.equal(text.includes('局势绕过程序'), false)
  assert.equal(text.includes('承认局势已经失控'), false)
  assert.equal(text.includes('站队代价'), false)
  assert.match(character.protectTarget || '', /长老派|血脉|掌门|布局/)
  assert.match(character.hiddenPressure || '', /架空掌门|陆尘|血脉|反噬/)
  assert.match(character.goal || '', /夺取|陆尘|掌门|天玄宗/)
  assert.match(character.arc || '', /公开抢夺血脉|清算/)
})

test('enrichCharacterDrafts does not give ordinary faction claws an adoption-loyalist backstory', () => {
  const storyIntent: StoryIntentPackageDto = {
    ...buildStoryIntent(),
    protagonist: '凌寒',
    antagonist: '云天鹤',
    generationBriefText:
      '【项目】魔尊血脉｜20集\n柳长老是仙盟长老，也是云天鹤最信任的爪牙，专为盟主处理暗中事务。'
  }

  const result = enrichCharacterDrafts({
    storyIntent,
    generationBriefText: storyIntent.generationBriefText || '',
    characters: [
      buildIncompleteCharacter(
        '柳长老',
        '柳长老作为仙盟长老，是云天鹤最信任的爪牙，精明干练，专为盟主处理暗中事务。',
        '效忠盟主，谋取利益，相信跟随强者可得好处。'
      )
    ]
  })

  const character = result.find((item) => item.name === '柳长老')
  assert.ok(character)
  const text = JSON.stringify(character)
  assert.equal(text.includes('养育恩情'), false)
  assert.equal(text.includes('收养之恩'), false)
  assert.equal(text.includes('正道名分'), false)
  assert.match(character.protectTarget || '', /云天鹤|盟主|仙盟|爪牙|任务|权力/)
  assert.match(character.hiddenPressure || '', /云天鹤|盟主|仙盟|凌寒|主角/)
})

test('enrichCharacterDrafts uses marketProfile strategy terms for female CEO family pawns', () => {
  const storyIntent: StoryIntentPackageDto = {
    ...buildStoryIntent(),
    genre: '都市甜宠',
    protagonist: '许晚',
    antagonist: '顾氏集团',
    coreConflict: '许晚被豪门和集团舆论压迫，必须拿回契约和股权主动权',
    marketProfile: {
      audienceLane: 'female',
      subgenre: '女频霸总甜宠'
    },
    generationBriefText:
      '【项目】契约甜宠｜20集\n许晚被顾氏集团利用。\n【角色卡】\n- 苏婉柔：苏家独女，从小被培养为家族棋子，接近许晚只为契约和股权'
  }

  const result = enrichCharacterDrafts({
    storyIntent,
    generationBriefText: storyIntent.generationBriefText || '',
    characters: [
      buildIncompleteCharacter('苏婉柔', '苏婉柔是苏家独女，被家族派去接近许晚。', '')
    ]
  })

  const character = result.find((item) => item.name === '苏婉柔')
  assert.ok(character)
  const text = JSON.stringify(character)
  assert.equal(text.includes('夺血脉'), false)
  assert.equal(text.includes('血脉之争'), false)
  assert.equal(text.includes('仙盟'), false)
  assert.match(text, /契约|股权|集团|豪门/)
})

test('enrichCharacterDrafts does not force masculine-name characters into female emotion lever fallback', () => {
  const storyIntent: StoryIntentPackageDto = {
    ...buildStoryIntent(),
    protagonist: '陆尘',
    antagonist: '影煞',
    generationBriefText:
      '【项目】魔尊血脉｜20集\n林尘在苍玄宗是活泼师妹，被暗部盯上后与陆尘产生关系变化。'
  }

  const result = enrichCharacterDrafts({
    storyIntent,
    generationBriefText: storyIntent.generationBriefText || '',
    characters: [
      buildIncompleteCharacter(
        '林尘',
        '林尘在苍玄宗是出了名的活泼师妹，她常缠着陆尘问东问西。',
        ''
      )
    ]
  })

  const character = result.find((item) => item.name === '林尘')
  assert.ok(character)
  const text = JSON.stringify(character)
  assert.equal(text.includes('她'), false)
  assert.equal(text.includes('师妹'), false)
  assert.equal(text.includes('情感杠杆'), false)
  assert.equal(text.includes('拿她当筹码'), false)
  assert.equal(text.includes('主角因为她受伤'), false)
  assert.match(character.biography || '', /年轻弟子|同门/)
})
