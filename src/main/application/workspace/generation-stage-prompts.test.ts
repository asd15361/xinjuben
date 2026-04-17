import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCharacterGenerationPrompt,
  buildDetailedOutlineActPrompt
} from './generation-stage-prompts.ts'

test('buildCharacterGenerationPrompt forces character names to stay on upstream anchors', () => {
  const prompt = buildCharacterGenerationPrompt({
    generationBriefText:
      '【关键角色】少年守钥人、恶霸、小镇少女\n【人物关系总梳理】\n- 少年守钥人是师父的第十九个徒弟。',
    protagonist: '少年守钥人',
    antagonist: '恶霸',
    keyCharacters: ['少年守钥人', '恶霸', '小镇少女'],
    conflict: '守钥人必须在守约和救人之间做选择',
    outlineSummary: '少年守钥人被恶霸拿小镇少女逼到亮底。'
  })

  assert.match(prompt, /这次必须覆盖上游已经锁住的人物锚点/)
  assert.match(prompt, /如果上游给的是角色标签而不是真实名字，就直接把这个标签原样写进 name/)
  assert.match(prompt, /禁止把“少年守钥人\/恶霸\/小镇少女”改写成“林默\/赵虎\/小月”/)
  assert.match(prompt, /这次必须原样保留的人物锚点：少年守钥人、恶霸、小镇少女/)
  assert.match(prompt, /最会把戏往哪边拧/)
  assert.match(prompt, /被逼到什么点会做什么动作/)
  assert.match(prompt, /其余字段都只写 1 句/)
  assert.match(prompt, /不要提前写成“最终怎么大战、怎么封印、怎么牺牲、怎么揭开终极答案”/)
  assert.match(
    prompt,
    /如果是外压层、规则杠杆层或非人角色，只写它如何放大人祸、被谁利用、在什么条件下失控/
  )
  assert.match(prompt, /师父、长老、高手或规则杠杆角色，只写他怎么改规则、压时限、给条件、逼表态/)
  assert.match(
    prompt,
    /非人角色或灾变外压，goal、fear、arc 只能写“会被什么引动、被谁利用、会把哪笔人祸放大”/
  )
  assert.match(prompt, /情感杠杆角色的 advantage、goal、arc 必须写成她主动能做的事/)
  assert.match(prompt, /不要写成“她的安危会刺激主角”这种被动说明/)
  assert.match(prompt, /不能只停在“柔弱顺从、等人来救、不敢反抗”/)
  assert.match(prompt, /publicMask 不是“她对主角什么态度”/)
  assert.match(prompt, /publicMask 禁止直接出现“柔弱顺从”“逆来顺受”“等人来救”“礼貌保持距离”/)
  assert.match(prompt, /publicMask 必须同时写出一个表面动作和一个暗里动作/)
  assert.match(prompt, /所有角色的 publicMask 都必须先写成“表面怎么演、怎么藏、怎么拖”的可拍动作/)
  assert.match(prompt, /主角的 publicMask 只能写当前压力场里的表面演法/)
  assert.match(prompt, /不要写成“对小柔保持距离”这种裁判句/)
  assert.match(prompt, /错误示例：对黎明保持礼貌距离/)
  assert.match(prompt, /如果 publicMask 写成“她对黎明冷淡\/保持距离\/不太喜欢他”这类态度词/)
  assert.match(prompt, /规则杠杆角色的 goal、arc 里禁止出现“领悟”“考验”“见证成长”“逼他自己醒悟”/)
  assert.match(
    prompt,
    /规则杠杆角色的 biography、hiddenPressure、goal、arc 都禁止出现“悟道历程”“见证成长”“考验主角”“逼他自己醒悟”/
  )
  assert.match(
    prompt,
    /如果规则杠杆角色的 biography、hiddenPressure、goal、arc 里出现“确保主角领悟”“让主角悟道”“帮他完成成长”“逼他自己破局”/
  )
  assert.match(
    prompt,
    /规则杠杆角色一旦写出“逼黎明自己破局”“逼主角自己破局”“等他自己悟到”“她不出手只等他醒悟”/
  )
  assert.match(prompt, /规则杠杆角色的 publicMask 也不能写成“表面不插手、暗里等他自己悟”这类空态度/)
  assert.match(prompt, /规则杠杆角色写法反例：李诚阳暗里通过旧规和传承条件逼黎明自己破局/)
  assert.match(
    prompt,
    /非人角色或灾变外压的 biography、hiddenPressure、goal、fear、arc 里禁止出现“渴望”“想要”“野心”“突破镇封”“主导终局”/
  )
  assert.match(prompt, /错误示例：渴望突破镇封。正确示例：一旦有人靠近潭边妄动/)
  assert.match(prompt, /goal、fear、protectTarget 优先写具体人、物、伤口、位置、账册、封印或名分/)
  assert.match(prompt, /不要只写“宗门秩序”“自身利益”“自身存在”“大道”“真相”这种抽象大词/)
  assert.match(
    prompt,
    /如果底稿里有“排行\/第十九徒\/最小徒弟”这类身份事实，至少把它写进 biography、hiddenPressure、weakness、conflictTrigger 或 goal 其中一处/
  )
  assert.match(prompt, /主角若是最小徒弟或排行靠后，不能只写“守小柔、守钥匙”/)
  assert.match(prompt, /规则杠杆角色也别只守“宗门秩序”/)
  assert.match(prompt, /非人角色的 protectTarget 禁止写“自身存在”/)
  assert.match(prompt, /biography 和 arc 也少写“悟透”“领悟”“真谛”“大道”/)
  assert.match(prompt, /所有字段都不能留“无”“待补”或“不适用”/)
  assert.match(prompt, /非人角色的 protectTarget 不能写“无”/)
  assert.match(prompt, /非人角色的 fear 不能写“无”或抽象大道理/)
  assert.match(prompt, /非人角色的 goal 不能写“无自主目标”/)
  assert.match(prompt, /情感杠杆角色的 arc 禁止写成“从被动等人来救，到后来主动一点”/)
  assert.match(prompt, /非人角色的 publicMask 也要写成能直接拍到的当前状态/)
  assert.match(prompt, /主角和情感杠杆角色的 biography、goal、arc 也不要写成“帮助他领悟真正的道”/)
  assert.match(prompt, /删掉妖兽或长老，这部戏是不是还成立为人逼人、人逼自己/)
  assert.match(prompt, /当前粗纲总述：少年守钥人被恶霸拿小镇少女逼到亮底/)
  assert.doesNotMatch(prompt, /第一板块正式创作底稿/)
})

test('buildDetailedOutlineActPrompt only asks for the current act episode range', () => {
  const prompt = buildDetailedOutlineActPrompt({
    outline: {
      title: '修仙传',
      genre: '玄幻修仙',
      theme: '藏锋与反咬',
      protagonist: '黎明',
      mainConflict: '黎明被李科拿小柔逼到退无可退',
      summary: '整季从藏武守钥一路被逼到亮底。',
      summaryEpisodes: [
        { episodeNo: 1, summary: '第1集先被拖进局。' },
        { episodeNo: 2, summary: '第2集压力升级。' }
      ],
      facts: [
        {
          id: 'fact-theme',
          label: '谦卦领悟',
          description: '黎明因早年吃亏悟透谦卦，行事低调，但需在冲突中重新落地此道',
          linkedToPlot: true,
          linkedToTheme: true,
          authorityType: 'user_declared',
          status: 'confirmed',
          level: 'supporting',
          declaredBy: 'user',
          declaredStage: 'outline',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'fact-rank',
          label: '黎明排行第十九',
          description: '黎明是李诚阳的第十九个徒弟，在宗门里常被看轻。',
          linkedToPlot: true,
          linkedToTheme: false,
          authorityType: 'user_declared',
          status: 'confirmed',
          level: 'supporting',
          declaredBy: 'user',
          declaredStage: 'outline',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    },
    characters: [
      {
        name: '黎明',
        biography: '隐于闹市守钥匙。',
        publicMask: '',
        hiddenPressure: '',
        fear: '小柔出事',
        protectTarget: '小柔',
        conflictTrigger: '一旦有人拿小柔逼他，就会翻脸',
        advantage: '藏锋和反咬',
        weakness: '太在意身边人',
        goal: '守住钥匙和小柔',
        arc: '从隐忍到亮底'
      }
    ],
    storyIntent: {
      sellingPremise: '最该藏钥匙的人被逼亮底。',
      coreDislocation: '黎明本该继续藏锋，却被李科拿小柔逼到退无可退。',
      emotionalPayoff: '先让观众吃到主角不再白挨打的那口爽。',
      protagonist: '黎明',
      antagonist: '李科',
      coreConflict: '黎明在多重压力下被逼亮底。',
      endingDirection: '开放结局',
      titleHint: '修仙传',
      genre: '玄幻修仙',
      tone: '热血升级',
      audience: '短剧用户',
      officialKeyCharacters: ['黎明', '李科', '小柔'],
      lockedCharacterNames: ['黎明', '李科', '小柔'],
      themeAnchors: ['不争得失'],
      worldAnchors: ['玄玉宫镇守妖兽'],
      relationAnchors: ['师徒', '守护'],
      dramaticMovement: ['守住钥匙', '李科不断逼压', '蛇子苏醒代价升级'],
      generationBriefText: '【项目】修仙传｜10集'
    },
    act: 'opening',
    startEpisode: 1,
    endEpisode: 2,
    episodes: [
      { episodeNo: 1, summary: '第1集先被拖进局。' },
      { episodeNo: 2, summary: '第2集压力升级。' }
    ],
    previousActSummary: '黎明刚被拖进局。'
  })

  assert.match(prompt, /当前只写：开局段（第1-2集）/)
  assert.match(prompt, /episodes 只能覆盖第1-2集，而且必须全部覆盖/)
  assert.match(prompt, /上一段已经落定：黎明刚被拖进局/)
  assert.match(prompt, /本段粗纲逐集：\n第1集：第1集先被拖进局。\n第2集：第2集压力升级。/)
  assert.match(prompt, /如果底稿更偏权谋、智斗或“靠智慧周旋”/)
  assert.match(prompt, /每一集先钉住一个本集戏眼/)
  assert.match(prompt, /已确认正式事实不能只留在整季总述里/)
  assert.match(
    prompt,
    /如果已确认正式事实里有“排行\/第十九徒\/最小徒弟”这类身份事实，至少一集 summary 或 sceneByScene 要把它写成具体压强/
  )
  assert.match(
    prompt,
    /有人当众叫他“第十九个徒弟\/最小徒弟”、拿排行压他资格、挡他碰账册、逼他先跪先退或拿这层身份羞辱他/
  )
  assert.match(prompt, /凡是主题、领悟、旧规、空物、信条类正式事实/)
  assert.match(
    prompt,
    /如果正式事实里确认主角有“隐忍\/藏锋\/先让后反咬”，前 1-6 集至少两集必须显性落出“黎明隐忍”/
  )
  assert.match(
    prompt,
    /如果已确认正式事实里有“妖兽\/蛇子\/镇妖地\/封印外压”，开局段和收束段都必须显性落一次/
  )
  assert.match(
    prompt,
    /收束段至少一集要直接写蛇子异动、鳞片外渗、镇妖地受扰或妖兽反噬怎样继续逼人站队/
  )
  assert.match(prompt, /已确认正式事实：\n- 谦卦领悟：黎明因早年吃亏悟透谦卦/)
  assert.match(prompt, /- 黎明排行第十九：黎明是李诚阳的第十九个徒弟，在宗门里常被看轻/)
  assert.match(prompt, /相邻两场 tension 不能只是同一句换说法/)
  assert.match(prompt, /收束段优先 2-3 场，能并掉的解释场、疗伤场、议事场就并掉/)
  assert.match(prompt, /妖兽、灾变、高手外压只能放大人祸/)
  assert.match(prompt, /终局不能只剩大战收尾/)
  assert.match(
    prompt,
    /如果当前已经进入收束段，至少一集要直接写谁被揭穿、谁失去筹码、谁被迫站队、谁拿证据换命或谁被追责/
  )
  assert.match(prompt, /不能直接执行“废修为、收钥匙、投入炼炉、当众宣判”这类终局动作/)
  assert.match(prompt, /情感杠杆角色不能只做人质或陪跑/)
  assert.match(
    prompt,
    /当前 5 集批次里，至少两集要由主角或情感杠杆角色亲自拿出证据、换条件、诈供、截人或反咬完成关键推进/
  )
  assert.match(prompt, /公审、议事、长老会只准当压力容器，不能连续两集占主场/)
  assert.match(prompt, /同一阶段里，公审\/议事\/殿内对质最多只允许 1 集当主战场/)
  assert.match(prompt, /下一集就要转去潜入、追逃、交易、拦截、抢人、毁契或路上反打/)
  assert.match(prompt, /一旦宗门、官府或组织问责入场，它只负责压时限和改规则/)
  assert.match(
    prompt,
    /summary、facts、sceneByScene 都不要解释“象征了什么”“说明了什么”“哪套大道被领悟”/
  )
  assert.match(
    prompt,
    /summary、episode summary、sceneByScene 里禁止使用“争证据”“争站队”“争时间”“主导权”“推进”“升级”“收束”这类 writer-room 词/
  )
  assert.match(prompt, /前 1-6 集不要反复直说“谦卦”“不争”“大道”“真镇守”/)
  assert.match(prompt, /第6集以后，每集 summary 第一短句必须先落在外场或私下动作/)
  assert.match(prompt, /第4集以后，scene1 禁止设在堂上流程、关押问话或盖章程序里/)
  assert.match(prompt, /师父、执事、长老不能带着新证据入场替主角揭底/)
  assert.match(
    prompt,
    /第4-7集如果上一集已经用了程序场，这一集第一场必须立刻转去路上、山林、医庐、旧屋、潭边、宅邸或暗巷/
  )
  assert.match(
    prompt,
    /中段若上一集 scene1 已是程序场，这一集 scene1 必须改成路上、旧屋、山林、医庐、暗巷或门外动作/
  )
  assert.match(prompt, /同一集里，程序场最多只允许 1 场/)
  assert.match(prompt, /当前 5 集批次如果出现其他道观、使者、长老问责或更高层表态/)
  assert.match(
    prompt,
    /当前 5 集批次如果必须出现执事、外门执事、偏殿、公议或合议，它们只能做半句盖章/
  )
  assert.match(prompt, /当前批次末场第一句不准从盖章句或堂上结果起手/)
  assert.match(prompt, /不要把“象征意义、话语权、势力格局、内部分裂”直接写成 summary/)
  assert.match(prompt, /小柔这类情感杠杆角色在中后段至少一次主动改局/)
  assert.match(prompt, /当前 5 集批次如果某集只给 2 场，summary 里必须明确写出两次独立变位/)
  assert.match(prompt, /当前 5 集批次每场只准完成一个推进回合：压进来、变招、结果落地，然后切场/)
  assert.match(prompt, /当前 5 集批次每场正文目标就是 8-12 行的有效戏/)
  assert.match(prompt, /不要引入新名字、新亲属、新残党头子接管尾声/)
  assert.match(prompt, /当前批次末集最多只允许 1 场制度确认/)
  assert.match(prompt, /当前批次末两集如果必须出现接任、宣判、认罚、废修为或宗门表态/)
  assert.match(
    prompt,
    /收束段的当前批次末集若保留制度确认场，它只能做最短第三场：1句起手 \+ 1句结果/
  )
  assert.match(prompt, /不准把职责令牌、新看守职责或侧殿合议写成尾钩/)
  assert.match(prompt, /当前批次末集第一场不准从宗门合议、卷轴宣读、长老落锤或制度宣判起手/)
  assert.match(
    prompt,
    /当前 5 集批次如果场景落在包扎、疗伤、潭边、锁旁、静室或歇脚处，不准把拉扯写成“为什么藏到现在\/为什么不争\/师父说过什么”的问答戏/
  )
  assert.match(
    prompt,
    /当前 5 集批次若主题必须显形，只能贴着空锁、碎钥匙、血迹、账页、盯梢人或已发生的代价落一句短狠结果/
  )
  assert.match(
    prompt,
    /hookEnd 至少要落一个已经发生的外部动作：门被撞、纸被抢、血滴上去、人被堵住、黑影现身、脚步追到门口之一/
  )
  assert.match(prompt, /sceneByScene 也不准预埋“师父说…所以…”“这才是真的…”“她帮他悟道了”这类解释句/)
  assert.match(
    prompt,
    /sceneByScene 的 setup \/ tension \/ hookEnd 不准写“意识到、感到、明白、发现自己、沉默片刻、目光一沉”/
  )
  assert.match(prompt, /sceneByScene 若出现门外喊声、台阶下喝声、窗外示警，不准写成 `角色名：台词`/)
  assert.match(
    prompt,
    /当前批次末集第一场如果还是“侧殿听宣判 \/ 静室接处罚 \/ 合议堂落锤”，就算写错/
  )
  assert.doesNotMatch(prompt, /不争得失/)
})
