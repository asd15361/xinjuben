import type { AiGenerateRequestDto, AiGenerateResponseDto } from '../../../shared/contracts/ai.ts'

export function mockAiEnabled(): boolean {
  const raw = process.env.MOCK_AI_ENABLE
  if (raw == null || raw === '') return false
  return raw === '1' || raw.toLowerCase() === 'true'
}

function buildMockOutlineOverviewResponse(): string {
  return JSON.stringify(
    {
      outline: {
        title: '《婚约风暴》',
        genre: '现代都市·情感逆袭',
        theme: '自我价值觉醒·阶层突围',
        protagonist: '苏棠',
        mainConflict: '女主带着婚约原件回城自证身份，秦曼联手陆家与舆论把她往骗子位置上钉死。',
        summary:
          '苏棠带着婚约原件回到权力中心，先要在众人质疑里证明自己不是骗子。她越想守住身份和尊严，秦曼越把名誉、亲情和继承权三线一起压下来。中段开始，苏棠必须边自证边反打，把一层层旧账和证据搬到台面。临近终局时，婚约真相会把继承链彻底掀翻，也逼所有人公开站队。最后真相公开，但旧情和家族裂口不会被轻易抹平。',
        facts: [
          {
            label: '婚约原件',
            description: '苏棠手里握着能改写继承权归属的婚约原件。',
            level: 'core',
            linkedToPlot: true,
            linkedToTheme: true
          }
        ],
        actSummaries: [
          {
            act: 'opening',
            summary: '苏棠刚回城就被当成骗子围剿，第一段先把婚约原件和身份自证这把火点起来。'
          },
          {
            act: 'midpoint',
            summary: '秦曼把名誉、亲情和继承权一起升级成围杀，苏棠被逼着从自保转成公开反打。'
          },
          {
            act: 'climax',
            summary: '最狠的旧账和证据同时翻面，苏棠必须拿出最后底牌，把所有人拖上桌。'
          },
          {
            act: 'ending',
            summary: '真相被公开后，这一轮继承链正式重排，但情感和代价都被留在台面上。'
          }
        ]
      }
    },
    null,
    2
  )
}

function buildMockOutlineBatchResponse(startEpisode: number, endEpisode: number): string {
  return JSON.stringify(
    {
      batchSummary: `第${startEpisode}-${endEpisode}集主要写苏棠这一轮怎么守、怎么反打、怎么把下一轮更狠的压力挂出去。`,
      episodes: Array.from({ length: endEpisode - startEpisode + 1 }, (_, index) => {
        const episodeNo = startEpisode + index
        return {
          episodeNo,
          summary: `【起】第${episodeNo}集一开场，苏棠先被秦曼和陆家当众施压，婚约原件与身份真假一起被推上桌面。【承】对手顺着名誉、亲情和继承权继续加码，让她连退路都被一点点封死。【转】苏棠被逼着换打法，不再只解释自己，而是主动掀出这一集最关键的一块证据或关系反咬回去。【钩子】她刚抢回一点主动，下一轮更狠的围杀已经顺着旧账或站队问题追上来。`
        }
      })
    },
    null,
    2
  )
}

export function createMockResponse(request: AiGenerateRequestDto): AiGenerateResponseDto {
  const header = `mock_ai_enabled:${request.task}`

  if (request.task === 'episode_script') {
    const forced = Number(process.env.MOCK_AI_FAIL_EPISODE || 0)
    const episode = Number(request.runtimeHints?.episode ?? 0)
    if (forced > 0 && episode === forced) {
      throw new Error(`mock_ai_forced_failure:episode_${episode}`)
    }
  }

  if (request.task === 'story_intake') {
    return {
      text: JSON.stringify(
        {
          projectTitle: '她带着婚约归来',
          episodeCount: 30,
          genreAndStyle: '都市情感逆袭',
          tone: '强对抗·快节奏·高反转',
          audience: '女性向',
          sellingPremise: '她带着婚约原件回城，所有人都想把她当骗子按死。',
          coreDislocation: '最该被赶出门的人，偏偏握着能改写继承权的真凭实据。',
          emotionalPayoff: '先让观众吃到她被围攻时突然掀桌反打的那口爽。',
          worldAndBackground: '豪门继承、职场权力和舆论审判一起压下来。',
          protagonist: '苏棠',
          antagonist: '秦曼',
          coreConflict: '婚约真相逼迫继承权重排，女主必须在众目睽睽下自证。',
          endingDirection: '公开真相并完成自我价值觉醒',
          keyCharacters: ['苏棠', '陆峥', '秦曼'],
          chainSynopsis:
            '苏棠带着婚约原件回到权力中心，先要在众人质疑里证明自己不是骗子。中段她会被名誉、亲情和继承权三线同时围剿，被迫一次次拿出更硬的证据。临近终局时，婚约真相会把继承链彻底掀翻，也逼男主和反派站队。最后真相公开，但代价和情感裂痕不会被轻易抹平。',
          characterCards: [
            { name: '苏棠', summary: '握着婚约原件回城，用自证和反打夺回身份。' },
            { name: '陆峥', summary: '继承链核心人物，被旧情和家族责任同时撕扯。' },
            { name: '秦曼', summary: '擅长操盘舆论和家族秩序，最怕真相公开核验。' }
          ],
          characterLayers: [
            { name: '苏棠', layer: '主驱动层', duty: '扛住自证主线并持续反打' },
            { name: '陆峥', layer: '摇摆杠杆层', duty: '决定继承链最终站队' },
            { name: '秦曼', layer: '主阻力层', duty: '持续用名誉和亲情施压' }
          ],
          themeAnchors: ['自我价值觉醒', '身份真相', '破局'],
          worldAnchors: ['豪门继承', '职场权力', '舆论审判'],
          relationAnchors: ['旧情与利益冲突', '亲情绑架', '权力压迫'],
          dramaticMovement: [
            '苏棠要在众目睽睽下守住婚约原件和真实身份。',
            '秦曼会联手家族和舆论把她往骗子位置上钉死。',
            '她每次往前一步，都要赔上名誉、旧情和亲情裂口。',
            '陆峥的站队会不断改写她和反派的力量平衡。',
            '每次证据掀开一点，都会把下一轮更大的围剿逼出来。'
          ],
          relationSummary: ['苏棠和陆峥有旧情', '秦曼拿亲情和名誉压苏棠'],
          softUnderstanding: ['女主越被围攻越要当众反打', '真相公开不会没有代价'],
          pendingConfirmations: ['男主最终站队方式']
        },
        null,
        2
      ),
      lane: 'deepseek',
      model: 'mock',
      usedFallback: false,
      finishReason: 'stop',
      routeReasonCodes: [header]
    }
  }

  if (request.task === 'short_drama_showrunner') {
    return {
      text: JSON.stringify(
        {
          corePrinciple: '快节奏、强冲突、稳情绪',
          coreEmotion: '一路反咬的爽感',
          incitingIncident: {
            timingRequirement: '30 秒炸场，最晚不超过第 1 集结尾',
            disruption: '对手先把主角拖进主冲突',
            mainLine: '主角必须先守住眼前人和关键筹码'
          },
          protagonistArc: {
            flawBelief: '主角以为一直忍就能保全一切',
            growthMode: '每集被逼着改一次打法',
            payoff: '最后把旧账狠狠干回去'
          },
          povPolicy: {
            mode: 'single_protagonist',
            allowedAuxiliaryViewpoints: ['对手'],
            restriction: '默认单主角视角，其他视角只能补主线必要信息。'
          },
          climaxPolicy: {
            episodeHookRule: '集集有小高潮，集尾必须留强钩子。',
            finalePayoffRule: '结局总爆发，并回打开篇激励事件。',
            callbackRequirement: '结局必须回打第一刀。'
          },
          characterPolicy: {
            stateDrivenConflictRule: '一切冲突升级都必须基于人物当下心理状态和当前压力触发。',
            noForcedStupidityRule: '严禁为了强行反转让人物突然降智、突然看不见明牌风险。',
            noAbruptMutationRule: '严禁人物无铺垫性格突变；真要变招，必须先有欲望、恐惧或压强升级。'
          }
        },
        null,
        2
      ),
      lane: 'deepseek',
      model: 'mock',
      usedFallback: false,
      finishReason: 'stop',
      routeReasonCodes: [header]
    }
  }

  if (request.task === 'decision_assist') {
    return {
      text: JSON.stringify(
        {
          storyIntent: {
            titleHint: '她带着婚约归来',
            genre: '都市情感逆袭',
            tone: '强对抗·快节奏·高反转',
            audience: '女性向',
            protagonist: '苏棠',
            antagonist: '秦曼',
            coreConflict: '婚约真相逼迫继承权重排，女主必须在众目睽睽下自证',
            endingDirection: '公开真相并完成自我价值觉醒',
            officialKeyCharacters: ['苏棠', '陆峥', '秦曼'],
            lockedCharacterNames: ['苏棠', '陆峥', '秦曼'],
            themeAnchors: ['自我价值觉醒', '身份真相', '破局'],
            worldAnchors: ['豪门继承', '职场权力', '舆论审判'],
            relationAnchors: ['旧情与利益冲突', '亲情绑架', '权力压迫'],
            dramaticMovement: [
              '第3集公开她才是真正继承人',
              '代价升级：名誉崩盘',
              '集尾钩子：证据反转'
            ],
            manualRequirementNotes: '（本地 Mock）',
            freeChatFinalSummary: '（本地 Mock）用户想要都市情感逆袭，核心是婚约真相与继承权之争。'
          },
          outline: {
            title: '《婚约风暴》',
            genre: '现代都市·情感逆袭',
            theme: '自我价值觉醒·阶层突围',
            protagonist: '苏棠',
            mainConflict: '女主用婚约原件逼男主承认身份真相；男主与反派以名誉与亲情施压逼她退场。',
            summary:
              '苏棠带着婚约原件回到权力中心，先要在众人质疑里证明自己不是骗子。中段她会被名誉、亲情和继承权三线同时围剿，被迫一次次拿出更硬的证据。临近终局时，婚约真相会把继承链彻底掀翻，也逼男主和反派站队。最后真相公开，但代价和情感裂痕不会被轻易抹平。',
            facts: [
              {
                label: '婚约原件',
                description: '女主持有可改写继承权归属的婚约原件。',
                level: 'core',
                linkedToPlot: true,
                linkedToTheme: true
              }
            ]
          },
          characters: [
            {
              name: '苏棠',
              biography:
                '前集团秘书，手里握着婚约原件，看似回来自证身份，实际是在赌自己还能不能把被碾碎的尊严拿回来。她最怕的不是外面的舆论，而是亲情和旧情一起压过来时自己会不会再退缩。',
              advantage: '握有婚约原件，冷静反杀，敢在公众场合自证。',
              weakness: '过度在意父亲评价，容易被亲情绑架牵制。',
              goal: '夺回身份与尊严，逼迫男主承认真相。',
              arc: '被动承受→主动出击→价值觉醒。'
            },
            {
              name: '陆峥',
              biography:
                '继承链上的核心人物，表面冷硬克制，实际被旧情、家族责任和权力布局同时撕扯。越想把苏棠压回去，越会被她手里的真相逼出自己的裂缝。',
              advantage: '掌控资源与舆论，擅长施压与封口。',
              weakness: '对旧情有裂缝，越压越心虚。',
              goal: '维持继承权稳定，逼女主退出。',
              arc: '冷酷压制→事实动摇→立场反转。'
            },
            {
              name: '秦曼',
              biography:
                '真正擅长操盘局势的人，习惯把名誉、亲情和公众视线一起变成武器。她最大的危险不是没有手段，而是太相信自己能永远把真相按死。',
              advantage: '擅长操控家族与公众舆论，用“名誉与亲情”双重绑架。',
              weakness: '真正的继承链路经不起公开核验，越强势越露出破绽。',
              goal: '守住继承权布局，逼苏棠在公开场合自毁信用。',
              arc: '压制成功→被证据击穿→孤注一掷反扑。'
            }
          ]
        },
        null,
        2
      ),
      lane: 'deepseek',
      model: 'mock',
      usedFallback: false,
      finishReason: 'stop',
      routeReasonCodes: [header]
    }
  }

  if (request.task === 'rough_outline') {
    const rangeMatch = request.prompt.match(/当前只生成第\s*(\d+)\s*-\s*(\d+)\s*集/)
    const isOverviewPrompt = request.prompt.includes('"actSummaries"')
    return {
      text: isOverviewPrompt
        ? buildMockOutlineOverviewResponse()
        : buildMockOutlineBatchResponse(
            Number(rangeMatch?.[1] || 1),
            Number(rangeMatch?.[2] || 10)
          ),
      lane: 'deepseek',
      model: 'mock',
      usedFallback: false,
      finishReason: 'stop',
      routeReasonCodes: [header]
    }
  }

  if (request.task === 'character_profile') {
    return {
      text: JSON.stringify(
        {
          characters: [
            {
              name: '苏棠',
              biography:
                '前集团秘书，手里握着婚约原件，看似回来自证身份，实际是在赌自己还能不能把被碾碎的尊严拿回来。',
              publicMask: '冷静克制，像只是来核验事实。',
              hiddenPressure: '怕自己再次被亲情和旧情一起压回去。',
              fear: '最怕真相公开前先被舆论钉死。',
              protectTarget: '自己最后一点尊严',
              conflictTrigger: '任何人试图公开否定她的婚约和身份',
              advantage: '握有婚约原件，敢当众反打。',
              weakness: '仍会被父亲评价和旧情牵动。',
              goal: '夺回身份与尊严，逼对方承认真相。',
              arc: '被动承受→主动反击→价值觉醒。'
            },
            {
              name: '陆峥',
              biography: '继承链核心人物，表面冷硬克制，实际被旧情、家族责任和权力布局同时撕扯。',
              publicMask: '掌控全局、不会失态的继承人。',
              hiddenPressure: '越想压住苏棠，越怕真相核验时自己先崩。',
              fear: '最怕继承链公开翻盘。',
              protectTarget: '家族秩序和自己掌控的局面',
              conflictTrigger: '苏棠公开逼他承认婚约',
              advantage: '资源、人脉、舆论都在手里。',
              weakness: '对旧情有裂缝，压得越狠越心虚。',
              goal: '稳住继承权，逼苏棠退场。',
              arc: '冷硬压制→事实动摇→被迫站队。'
            },
            {
              name: '秦曼',
              biography: '最擅长操盘名誉和家族秩序的人，习惯把亲情、舆论和规则一起变成武器。',
              publicMask: '体面、稳重、为家族大局着想。',
              hiddenPressure: '真正的继承链路经不起公开核验。',
              fear: '最怕苏棠把证据搬到所有人面前。',
              protectTarget: '自己布好的继承权局',
              conflictTrigger: '苏棠获得任何一次公开发言机会',
              advantage: '会用名誉、亲情和规矩一起压人。',
              weakness: '太相信自己能永远把真相按住。',
              goal: '守住既有布局，让苏棠在众目睽睽下自毁信用。',
              arc: '稳压局面→破绽外露→孤注一掷反扑。'
            }
          ]
        },
        null,
        2
      ),
      lane: 'deepseek',
      model: 'mock',
      usedFallback: false,
      finishReason: 'stop',
      routeReasonCodes: [header]
    }
  }

  if (request.task === 'episode_control') {
    return {
      text: JSON.stringify(
        {
          cards: [
            {
              episodeNo: request.runtimeHints?.episode || 1,
              episodeMission: '这一集先把当前主线继续往前推。',
              openingBomb: '开场先把当集最狠的冲突甩到脸上。',
              conflictUpgrade: '把这层冲突再压重一格。',
              arcBeat: '主角被逼着改一次打法。',
              emotionBeat: '稳住一路反咬的爽感。',
              hookLanding: '尾场必须把下一步动作挂出来。',
              povConstraint: '只准跟着主角往前走。',
              forbiddenDrift: ['不要铺背景', '不要切旁支视角']
            }
          ]
        },
        null,
        2
      ),
      lane: 'deepseek',
      model: 'mock',
      usedFallback: false,
      finishReason: 'stop',
      routeReasonCodes: [header]
    }
  }

  if (request.task === 'faction_matrix') {
    return {
      text: JSON.stringify(
        {
          title: '《婚约风暴》势力矩阵',
          totalEpisodes: 20,
          factions: [
            {
              id: 'faction_01',
              name: '陆家主系',
              positioning: '旧秩序掌权方',
              coreDemand: '守住继承链',
              coreValues: '体面、掌控、稳定',
              mainMethods: ['封口', '舆论操盘'],
              vulnerabilities: ['婚约真相经不起公开核验'],
              branches: [
                {
                  id: 'faction_01_branch_01',
                  name: '家族核心',
                  parentFactionId: 'faction_01',
                  positioning: '拍板层',
                  coreDemand: '压住真相',
                  characters: [
                    {
                      id: 'char_01',
                      name: '陆峥',
                      roleInFaction: 'leader',
                      branchId: 'faction_01_branch_01',
                      depthLevel: 'core',
                      identity: '继承链核心人物',
                      coreMotivation: '保住家族秩序',
                      plotFunction: '掌控局势',
                      isSleeper: false,
                      sleeperForFactionId: null
                    },
                    {
                      id: 'char_02',
                      name: '秦曼',
                      roleInFaction: 'enforcer',
                      branchId: 'faction_01_branch_01',
                      depthLevel: 'core',
                      identity: '家族操盘者',
                      coreMotivation: '守住既得利益',
                      plotFunction: '持续施压',
                      isSleeper: false,
                      sleeperForFactionId: null
                    }
                  ]
                },
                {
                  id: 'faction_01_branch_02',
                  name: '舆论外线',
                  parentFactionId: 'faction_01',
                  positioning: '执行层',
                  coreDemand: '塑造骗子叙事',
                  characters: [
                    {
                      id: 'char_03',
                      name: '公关总监',
                      roleInFaction: 'leader',
                      branchId: 'faction_01_branch_02',
                      depthLevel: 'mid',
                      identity: '公关负责人',
                      coreMotivation: '完成封口任务',
                      plotFunction: '扩散舆论',
                      isSleeper: false,
                      sleeperForFactionId: null
                    },
                    {
                      id: 'char_04',
                      name: '媒体眼线',
                      roleInFaction: 'variable',
                      branchId: 'faction_01_branch_02',
                      depthLevel: 'extra',
                      identity: '媒体联系人',
                      coreMotivation: '两边押宝',
                      plotFunction: '制造变数',
                      isSleeper: false,
                      sleeperForFactionId: null
                    }
                  ]
                }
              ]
            },
            {
              id: 'faction_02',
              name: '苏棠一线',
              positioning: '真相反打方',
              coreDemand: '夺回身份与尊严',
              coreValues: '真相、自证、反咬',
              mainMethods: ['公开反打', '逼对手失态'],
              vulnerabilities: ['旧情和亲情会拖慢出手'],
              branches: [
                {
                  id: 'faction_02_branch_01',
                  name: '自证主线',
                  parentFactionId: 'faction_02',
                  positioning: '主驱动层',
                  coreDemand: '守住婚约原件',
                  characters: [
                    {
                      id: 'char_05',
                      name: '苏棠',
                      roleInFaction: 'leader',
                      branchId: 'faction_02_branch_01',
                      depthLevel: 'core',
                      identity: '婚约持有者',
                      coreMotivation: '夺回身份',
                      plotFunction: '主角反打',
                      isSleeper: false,
                      sleeperForFactionId: null
                    },
                    {
                      id: 'char_06',
                      name: '老律师',
                      roleInFaction: 'enforcer',
                      branchId: 'faction_02_branch_01',
                      depthLevel: 'mid',
                      identity: '证据顾问',
                      coreMotivation: '还真相一个说法',
                      plotFunction: '撑住公开场',
                      isSleeper: false,
                      sleeperForFactionId: null
                    }
                  ]
                },
                {
                  id: 'faction_02_branch_02',
                  name: '暗线协力',
                  parentFactionId: 'faction_02',
                  positioning: '辅助层',
                  coreDemand: '盯住反派破绽',
                  characters: [
                    {
                      id: 'char_07',
                      name: '旧同事',
                      roleInFaction: 'leader',
                      branchId: 'faction_02_branch_02',
                      depthLevel: 'mid',
                      identity: '内部知情人',
                      coreMotivation: '补偿过去的沉默',
                      plotFunction: '递关键口风',
                      isSleeper: false,
                      sleeperForFactionId: null
                    },
                    {
                      id: 'char_08',
                      name: '秘书眼线',
                      roleInFaction: 'variable',
                      branchId: 'faction_02_branch_02',
                      depthLevel: 'extra',
                      identity: '办公室眼线',
                      coreMotivation: '保住自己',
                      plotFunction: '临场倒戈',
                      isSleeper: true,
                      sleeperForFactionId: 'faction_01'
                    }
                  ]
                }
              ]
            }
          ],
          crossRelations: [
            {
              id: 'cross_01',
              relationType: 'double_agent',
              fromFactionId: 'faction_02',
              toFactionId: 'faction_01',
              involvedCharacterIds: ['char_08'],
              description: '秘书眼线表面替陆家递话，实际也把破绽回流给苏棠。',
              revealEpisodeRange: { start: 6, end: 8 }
            }
          ],
          landscapeSummary: '旧秩序掌权方和真相反打方围绕婚约与继承链公开缠斗。',
          factionTimetable: [
            {
              factionId: 'faction_01',
              entryEpisode: 1,
              entryDescription: '陆家先手压场'
            }
          ]
        },
        null,
        2
      ),
      lane: 'deepseek',
      model: 'mock',
      usedFallback: false,
      finishReason: 'stop',
      routeReasonCodes: [header]
    }
  }

  if (request.task === 'episode_script' || request.task === 'episode_rewrite') {
    const episode = request.runtimeHints?.episode ?? '?'
    return {
      text: [
        `Action:（本地 Mock）第 ${episode} 场推进：主角被迫做出公开选择，关系施压产生实际后果；关键事实以“行动”而不是旁白体现。`,
        `Dialogue:（本地 Mock）“你以为你在选择，其实你在承认。” “我承认的，是我自己。”`,
        `Emotion:（本地 Mock）压抑→爆发→冷静回收，情绪推动下一场钩子。`
      ].join('\n'),
      lane: 'deepseek',
      model: 'mock',
      usedFallback: false,
      finishReason: 'stop',
      routeReasonCodes: [header]
    }
  }

  return {
    text: `（本地 Mock）${header}\n\n${request.prompt.slice(0, 200)}`,
    lane: 'deepseek',
    model: 'mock',
    usedFallback: false,
    finishReason: 'stop',
    routeReasonCodes: [header]
  }
}
