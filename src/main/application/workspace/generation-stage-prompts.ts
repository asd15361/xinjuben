import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import type { CharacterDraftDto, OutlineDraftDto } from '../../../shared/contracts/workflow'
import { renderAnchorBlock } from './generation-stage-prompt-anchors'

export function buildOutlineGenerationPrompt(generationBriefText: string): string {
  return [
    '你是短剧编剧助手。',
    '这一工序只负责“粗纲”，不是人物百科，也不是世界观扩写。',
    '你的目标是根据正式创作底稿，交出可供下游继续推进的主线骨架。',
    '这一步要守住 6 件事：主欲望、总阻力、阶段升级、关键关系杠杆、每集事件推进、每集结尾钩子。',
    '先守住“设定成交句、核心错位、情绪兑现”这三个最上层抓手，再往下展开主线。',
    '粗纲开写前先在心里答一句：这部戏第一集最值钱、最像宣传语的一刀到底是什么；如果答不上来，就先把这一刀写清再推进。',
    '优化方向：让戏更有推力，不是把设定写得更满。',
    '请优先继承底稿里的正式事实，不要自己改主角、对手、关键关系、主题方向。',
    '如果底稿里已经给了固有角色、地点、道具、关系，就直接拿这些锚点往前写，不要退回“主角/反派/神秘势力”这种通用叫法。',
    '如果底稿里已有角色足够推动主线，就继续用现有角色，不需要额外扩表。',
    '每一集都要看得出：谁在动、谁在压、这一集局面怎么被往前拱、结尾悬着什么没完。',
    '事实优先级：先吃人物和关系，再吃关键道具与主题，再吃世界压力；不要把世界观介绍写成主线推进。',
    '输出严格 JSON：',
    '{',
    '  "storyIntent": {',
    '    "titleHint": string, "genre": string, "tone": string, "audience": string,',
    '    "protagonist": string, "antagonist": string, "coreConflict": string, "endingDirection": string,',
    '    "officialKeyCharacters": string[], "lockedCharacterNames": string[],',
    '    "themeAnchors": string[], "worldAnchors": string[], "relationAnchors": string[], "dramaticMovement": string[],',
    '    "manualRequirementNotes": string, "freeChatFinalSummary": string',
    '  },',
    '  "outline": {',
    '    "title": string,',
    '    "genre": string,',
    '    "theme": string,',
    '    "protagonist": string,',
    '    "mainConflict": string,',
    '    "summary": string,',
    '    "episodes": [{"episodeNo": number, "summary": string}],',
    '    "facts": [{"label": string, "description": string, "level": "core"|"supporting", "linkedToPlot": boolean, "linkedToTheme": boolean}]',
    '  }',
    '}',
    'episodes 写法要求：',
    '1. 每集只写这一集最主要的事件推进。',
    '2. 每集都要带出当前阻力和这一集结尾的钩子。',
    '3. 让正式角色直接出现在分集里，不要总用泛称。',
    '4. 优先把底稿里的关系、地点、道具、主题锚点写进主线推进，而不是只写成背景。',
    '5. 每集都要写出“这一集最想让人继续点开的理由”，不要只把事情讲清楚。',
    '',
    '这份底稿里你必须优先执行的锚点：',
    renderAnchorBlock(generationBriefText),
    '',
    '第一板块正式创作底稿：',
    generationBriefText
  ].join('\n')
}

export function buildCharacterGenerationPrompt(input: {
  generationBriefText: string
  protagonist: string
  antagonist: string
  conflict: string
  outlineSummary: string
}): string {
  return [
    '你是短剧编剧助手。',
    '这一工序只负责“人物小传”，它不是人物百科，而是“详纲可执行说明书”。',
    '目标：让下游详纲一眼就知道，这个人想要什么、怕失去什么、会怎么施压、会在什么条件下行动、每推进一步会付什么代价。',
    '还要让下游一眼看出：这个人物最会制造什么戏、最会放大哪种反差、最容易把哪种情绪兑现打出来。',
    '每个人都要写得出一句大白话：这个人一进场，最容易把哪口气、哪种难堪、哪种翻盘打出来。',
    '优化方向：人物分层，不冗余。优先保留真正推动主线的人物，不重复扩表。',
    '请优先使用底稿和粗纲里已经明确的人物，不要随意发明新的核心角色、改名或重写关系。',
    '如果底稿已经给了某个人的前史、悟道、关系、代价、传承来源，你要做的是压缩成交付下游可执行的抓手，不是重新发明一版人物。',
    '每个人必须写清：name, biography, publicMask, hiddenPressure, fear, protectTarget, conflictTrigger, advantage, weakness, goal, arc。',
    '其中 biography 要写“当前人物为什么会这样行动”，不是堆背景；goal 和 arc 要贴着主线推进，而不是空喊成长。',
    '人物数量控制在真正推动主线的人物范围内，优先覆盖主驱动层、主阻力层、情感杠杆层、规则杠杆层。',
    '输出严格 JSON：',
    '{',
    '  "characters": [{"name": string, "biography": string, "publicMask": string, "hiddenPressure": string, "fear": string, "protectTarget": string, "conflictTrigger": string, "advantage": string, "weakness": string, "goal": string, "arc": string}]',
    '}',
    '',
    `当前主角：${input.protagonist || '待补'}`,
    `当前对手：${input.antagonist || '待补'}`,
    `当前主冲突：${input.conflict || '待补'}`,
    `当前粗纲主线：${input.outlineSummary}`,
    '',
    '这份底稿里你必须优先执行的锚点：',
    renderAnchorBlock(input.generationBriefText),
    '',
    '第一板块正式创作底稿：',
    input.generationBriefText
  ].join('\n')
}

export function buildDetailedOutlinePrompt(input: {
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  storyIntent?: StoryIntentPackageDto | null
}): string {
  const characterSummary = input.characters
    .slice(0, 6)
    .map((item) =>
      [
        `${item.name}：${item.biography || item.goal || item.arc || '待补人物驱动力'}`,
        item.publicMask ? `表面：${item.publicMask}` : '',
        item.hiddenPressure ? `暗里卡着：${item.hiddenPressure}` : '',
        item.fear ? `最怕失去：${item.fear}` : '',
        item.protectTarget ? `最想守住：${item.protectTarget}` : '',
        item.conflictTrigger ? `触发动作条件：${item.conflictTrigger}` : ''
      ]
        .filter(Boolean)
        .join(' ')
    )
    .join('\n')
  const storyIntentBlock = [
    `设定成交句：${input.storyIntent?.sellingPremise || '待补'}`,
    `核心错位：${input.storyIntent?.coreDislocation || '待补'}`,
    `情绪兑现：${input.storyIntent?.emotionalPayoff || '待补'}`,
    `主线欲望：${input.storyIntent?.dramaticMovement?.[0] || input.storyIntent?.coreConflict || '待补'}`,
    `总阻力：${input.storyIntent?.dramaticMovement?.[1] || input.storyIntent?.relationAnchors?.[0] || '待补'}`,
    `代价升级：${input.storyIntent?.dramaticMovement?.[2] || input.storyIntent?.themeAnchors?.[0] || '待补'}`,
    `关系杠杆：${input.storyIntent?.relationAnchors?.join('；') || '待补'}`,
    `世界压力：${input.storyIntent?.worldAnchors?.join('；') || '待补'}`
  ].join('\n')

  return [
    '你是短剧编剧助手。你要把“粗纲主线骨架 + 人物执行说明书”展开成可直接写剧本的详细大纲。',
    '这一步不是扩资料，也不是把粗纲重新分四块。',
    '你必须同时交出两层东西：',
    '第一层是四段阶段推进图；第二层是逐集细纲。',
    '逐集细纲必须挂在四段下面，用户要能按集看、按集改，不能只看到四段大话。',
    '四段都要持续吃住“设定成交句、核心错位、情绪兑现”，不能一进详纲就把最能卖的那一刀写没了。',
    '每个阶段都要明确回答：这一段主角想守什么、谁在拦、采取了什么动作、付了什么代价、这一段最后正式变成了什么新局面。',
    '每一段除了回答“在打什么仗”，还要回答“这一段最让人想继续点开的理由是什么、这一段最早兑现的情绪是什么”。',
    '每一段都要有一句最值钱的大白话，像宣传片里最会被剪出来的那一句，不准四段都写成局势说明。',
    '四段里的人物推动不能只停在“态度”和“立场”上，还要写出他们在当下怎么嘴硬、怎么难堪、怎么压着不退，情绪压强要落进行动和代价。',
    '四段职责不能混：开局负责点火，中段负责升级，高潮负责逼到亮底，收束负责先把这一轮正式收住，再把下一轮轻轻挂出去。',
    '四段都要用大白话直接回答“这一段在打什么仗”，不要写成长解释、背景说明或复盘报告。',
    '每段尽量控制在 2 到 4 句，短、硬、能执行，少讲抽象道理。',
    '开局段必须写出：最先想守什么、第一层压力怎么压下来、故事为什么从这里点燃。',
    '开局段优先把最强反差和最强错位打出来，不准一上来把最好卖的设定写平。',
    '中段必须写出：局面为什么更难、谁在升级、主角怎么应对、代价怎么明显变重。',
    '中段必须明确制造下一轮更想点开的理由，不能只是把局势解释得更清楚。',
    '高潮段必须写出：为什么这是最痛的一刀、哪张底牌被逼出来、哪层误判或真相一起翻面。',
    '高潮段要让情绪兑现真正落下去，不能只有结构翻面，没有爽点、痛点或关系翻盘。',
    '收束段必须写出：这一轮怎么收、主角付了什么代价、下一轮为什么还会继续。',
    '收束段先回答 3 件事：这一轮人物到底做了什么决定、为这个决定付了什么代价、局面因此正式变成了什么新状态。',
    '只有这 3 件事已经落定，收束段才允许留下一条下一轮继续追的口子。',
    '逐集细纲写法要求：',
    '1. 每一集都要直接对应粗纲里的那一集，不准漏集、并集、跳集。',
    '2. 每一集都要写清这一集最具体的推进动作、最直接的压强、最明显的代价变化、结尾往下勾的口子。',
    '3. 每一集都要比粗纲更细一点，但不能写成散文，也不能只改写阶段大意。',
    '4. 每一集都要让用户一眼看出“这一集具体发生什么、人物为什么更难、下一集为什么要点开”。',
    '不要把收束段写成继续开设定、继续抬危险、继续抛去处；那样不是收口，只是把问题往后拖。',
    '高潮段负责把人逼到只能选，收束段负责把这个选择真的落地；不要让高潮和收束都只顾着继续加压。',
    '禁止写法：',
    '1. 直接把粗纲前段、中段、后段、结尾顺着抄进四段。',
    '2. 只讲发生了什么，不讲这一段到底在打什么仗。',
    '3. 把人物小传当背景资料，不把人物目标、害怕、触发条件写进阶段动作。',
    '4. 收束段只顾着再抛新设定、新规则、新地点，却没写清这一轮到底怎么落定。',
    '5. 用“这一段主要讲的是”“这一段说明了”“这一段展示了”这种说明书口气起句。',
    '6. 逐集细纲只写成“本集继续升级”“关系继续变化”“局势更难”这种空话。',
    '每一段必须显式写出谁在推、谁在压、谁在付代价。',
    '如果某一段只有冲突概念，却听不出人物当下在硬撑、让步、反咬或失手，这一段就还不够成立，继续改。',
    '输出必须是严格 JSON，不要 markdown。',
    'JSON schema:',
    '{',
    '  "opening": { "summary": string, "episodes": [{"episodeNo": number, "summary": string}] },',
    '  "midpoint": { "summary": string, "episodes": [{"episodeNo": number, "summary": string}] },',
    '  "climax": { "summary": string, "episodes": [{"episodeNo": number, "summary": string}] },',
    '  "ending": { "summary": string, "episodes": [{"episodeNo": number, "summary": string}] }',
    '}',
    'episodes 数组里只放当前阶段覆盖到的集数。',
    '',
    `剧本名称：${input.outline.title}`,
    `题材：${input.outline.genre}`,
    `主题：${input.outline.theme}`,
    `主角：${input.outline.protagonist}`,
    `核心冲突：${input.outline.mainConflict}`,
    `粗纲：${input.outline.summary}`,
    `更上层推进合同：\n${storyIntentBlock}`,
    `人物执行说明书：\n${characterSummary || '当前人物信息为空'}`
  ].join('\n')
}
