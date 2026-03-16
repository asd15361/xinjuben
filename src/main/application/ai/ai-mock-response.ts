import type { AiGenerateRequestDto, AiGenerateResponseDto } from '../../../shared/contracts/ai'

export function mockAiEnabled(): boolean {
  const raw = process.env.MOCK_AI_ENABLE
  if (raw == null || raw === '') return false
  return raw === '1' || raw.toLowerCase() === 'true'
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
            dramaticMovement: ['第3集公开她才是真正继承人', '代价升级：名誉崩盘', '集尾钩子：证据反转'],
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
              biography: '前集团秘书，手里握着婚约原件，看似回来自证身份，实际是在赌自己还能不能把被碾碎的尊严拿回来。她最怕的不是外面的舆论，而是亲情和旧情一起压过来时自己会不会再退缩。',
              advantage: '握有婚约原件，冷静反杀，敢在公众场合自证。',
              weakness: '过度在意父亲评价，容易被亲情绑架牵制。',
              goal: '夺回身份与尊严，逼迫男主承认真相。',
              arc: '被动承受→主动出击→价值觉醒。'
            },
            {
              name: '陆峥',
              biography: '继承链上的核心人物，表面冷硬克制，实际被旧情、家族责任和权力布局同时撕扯。越想把苏棠压回去，越会被她手里的真相逼出自己的裂缝。',
              advantage: '掌控资源与舆论，擅长施压与封口。',
              weakness: '对旧情有裂缝，越压越心虚。',
              goal: '维持继承权稳定，逼女主退出。',
              arc: '冷酷压制→事实动摇→立场反转。'
            },
            {
              name: '秦曼',
              biography: '真正擅长操盘局势的人，习惯把名誉、亲情和公众视线一起变成武器。她最大的危险不是没有手段，而是太相信自己能永远把真相按死。',
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
      routeReasonCodes: [header]
    }
  }

  return {
    text: `（本地 Mock）${header}\n\n${request.prompt.slice(0, 200)}`,
    lane: 'deepseek',
    model: 'mock',
    usedFallback: false,
    routeReasonCodes: [header]
  }
}
