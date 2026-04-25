export interface NarrativeConstraintStoryIntent {
  genre?: string
  tone?: string
  protagonist?: string
  antagonist?: string
  coreConflict?: string
  creativeSummary?: string
  relationAnchors?: string[]
  worldAnchors?: string[]
  themeAnchors?: string[]
  generationBriefText?: string
  confirmedChatTranscript?: string
  storySynopsis?: {
    logline?: string
    openingPressureEvent?: string
    protagonistCurrentDilemma?: string
    firstFaceSlapEvent?: string
    antagonistForce?: string
    antagonistPressureMethod?: string
    corePayoff?: string
    stageGoal?: string
    keyFemaleCharacterFunction?: string
    episodePlanHint?: string
    finaleDirection?: string
  } | null
}

export interface NarrativeConstraintCandidate {
  title: string
  summary: string
  result: {
    sections: Array<{
      sectionTitle: string
      sevenQuestions: {
        goal: string
        obstacle: string
        effort: string
        result: string
        twist: string
        turnaround: string
        ending: string
      }
    }>
  }
}

export interface NarrativeConstraintLock {
  id:
    | 'xianxia-genre'
    | 'female-lead-indifferent-not-enemy'
    | 'key-pendant-lifecycle'
    | 'antagonist-trust-gradient'
    | 'mentor-protector-fate'
  promptLines: string[]
}

export interface NarrativeConstraintLockSet {
  truthText: string
  locks: NarrativeConstraintLock[]
}

export interface NarrativeConstraintViolation {
  field: string
  message: string
}

function buildTruthText(storyIntent?: NarrativeConstraintStoryIntent): string {
  return [
    storyIntent?.genre,
    storyIntent?.tone,
    storyIntent?.protagonist,
    storyIntent?.antagonist,
    storyIntent?.coreConflict,
    storyIntent?.creativeSummary,
    storyIntent?.generationBriefText,
    storyIntent?.confirmedChatTranscript,
    ...(storyIntent?.relationAnchors || []),
    ...(storyIntent?.worldAnchors || []),
    ...(storyIntent?.themeAnchors || []),
    storyIntent?.storySynopsis?.logline,
    storyIntent?.storySynopsis?.openingPressureEvent,
    storyIntent?.storySynopsis?.protagonistCurrentDilemma,
    storyIntent?.storySynopsis?.firstFaceSlapEvent,
    storyIntent?.storySynopsis?.antagonistForce,
    storyIntent?.storySynopsis?.antagonistPressureMethod,
    storyIntent?.storySynopsis?.corePayoff,
    storyIntent?.storySynopsis?.stageGoal,
    storyIntent?.storySynopsis?.keyFemaleCharacterFunction,
    storyIntent?.storySynopsis?.episodePlanHint,
    storyIntent?.storySynopsis?.finaleDirection
  ]
    .filter(Boolean)
    .join('\n')
}

function includesAny(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern))
}

export function buildNarrativeConstraintLocks(
  storyIntent?: NarrativeConstraintStoryIntent
): NarrativeConstraintLockSet {
  const truthText = buildTruthText(storyIntent)
  const locks: NarrativeConstraintLock[] = []

  if (/修仙|玄幻|宗门|魔尊|仙盟|血脉|封印/.test(truthText)) {
    locks.push({
      id: 'xianxia-genre',
      promptLines: [
        '题材锁：必须使用修仙语汇：宗门、灵力/魔力、封印、血脉、仙盟/正道仙盟、秘境、法阵。',
        '反派势力锁：“反派大小姐”必须是正道仙盟/名门仙宗势力，不得改成刺客组织成员。',
        '语汇改写锁：“武林盟主/武林盟”必须改写为“正道仙盟盟主/太玄仙盟”等修仙势力。',
        '机制改写锁：“真爱之力”必须改写为宗门禁术、护心血、封魔阵眼、灵契代价等修仙机制。'
      ]
    })
  }

  if (/女主|宗门.*女儿|默默.*守护|暗中.*守护|苦苦.*陪|单向.*付出/.test(truthText)) {
    locks.push({
      id: 'female-lead-indifferent-not-enemy',
      promptLines: [
        '女主关系锁：男主前期可以冷淡/忽视/误会善意/觉得多管闲事，但不得写成敌对关系。',
        '女主禁止项：不得写“女主是敌人”“被主角误解/怀疑为敌人”“女主敌对”。',
        '女主命运锁：终局可以重伤、昏迷、濒死后被救回；不得写“牺牲自己/死亡”再一句话改成未死。'
      ]
    })
  }

  if (/吊坠|母亲遗物|妈妈留给|母亲留给/.test(truthText)) {
    locks.push({
      id: 'key-pendant-lifecycle',
      promptLines: [
        '吊坠生命周期锁：吊坠是贯穿性关键物品，不是一次性觉醒开关。',
        '吊坠状态锁：开局可破碎，但碎片/残片必须被保留，并在中后段继续承担记忆、遗言、血脉封印图谱、禁地线索或破阵功能。',
        '吊坠回收锁：至少一个非第一篇章必须明确写出“吊坠碎片/残片”的后续用途。'
      ]
    })
  }

  if (/大小姐|反派.*利用|伪装.*接近|骗取|套取|迷惑|感情.*利用/.test(truthText)) {
    locks.push({
      id: 'antagonist-trust-gradient',
      promptLines: [
        '信任梯度锁：主角可以被大小姐迷惑、感激、暂时依赖，但信任必须递进，不能一跳到“完全信任/毫无怀疑”。',
        '主角智商底线：主角可以被骗，但必须保留观察、戒备、发现破绽或将计就计的空间。',
        '反派利用锁：大小姐的每次推进必须通过小恩小惠、假线索、情感操控逐步加深，不得让主角无条件全盘相信。'
      ]
    })
  }

  if (/掌门|宗门老大|宗主/.test(truthText) && /隐忍|保护|背锅|愧疚|默默承受/.test(truthText)) {
    locks.push({
      id: 'mentor-protector-fate',
      promptLines: [
        '掌门/宗门老大命运锁：他是隐忍背锅的保护者，不能为了制造悲情轻易写死、临终交代或牺牲白给。',
        '掌门功能锁：他必须承担解释封印、保护世界、与主角和解的长线功能；可重伤、被误解，但默认应存活到终局附近。'
      ]
    })
  }

  return { truthText, locks }
}

export function renderNarrativeConstraintPromptBlock(lockSet: NarrativeConstraintLockSet): string {
  if (lockSet.locks.length === 0) return ''

  const lines = ['【叙事约束锁】以下规则来自用户已确认设定，优先级高于候选方案发散：']
  for (const lock of lockSet.locks) {
    for (const line of lock.promptLines) {
      lines.push(`- ${line}`)
    }
  }
  return lines.join('\n')
}

function getSectionText(section: NarrativeConstraintCandidate['result']['sections'][number]): string {
  return [
    section.sectionTitle,
    section.sevenQuestions.goal,
    section.sevenQuestions.obstacle,
    section.sevenQuestions.effort,
    section.sevenQuestions.result,
    section.sevenQuestions.twist,
    section.sevenQuestions.turnaround,
    section.sevenQuestions.ending
  ].join('\n')
}

function getCandidateText(candidate: NarrativeConstraintCandidate): string {
  return [
    candidate.title,
    candidate.summary,
    ...candidate.result.sections.map((section) => getSectionText(section))
  ].join('\n')
}

function getNonOpeningSectionText(candidate: NarrativeConstraintCandidate): string {
  return candidate.result.sections
    .slice(1)
    .map((section) => getSectionText(section))
    .join('\n')
}

function pushViolation(
  errors: NarrativeConstraintViolation[],
  field: string,
  message: string
): void {
  if (!errors.some((error) => error.field === field && error.message === message)) {
    errors.push({ field, message })
  }
}

export function validateNarrativeConstraintLocks(
  candidate: NarrativeConstraintCandidate,
  lockSet: NarrativeConstraintLockSet
): NarrativeConstraintViolation[] {
  const errors: NarrativeConstraintViolation[] = []
  const sourceText = getCandidateText(candidate)
  const nonOpeningText = getNonOpeningSectionText(candidate)
  const lockIds = new Set(lockSet.locks.map((lock) => lock.id))

  if (lockIds.has('xianxia-genre')) {
    for (const pattern of ['刺客组织', '刺客背叛', '武林盟', '武林盟主', '真爱之力']) {
      if (sourceText.includes(pattern)) {
        pushViolation(
          errors,
          'genreDrift',
          `题材漂移：男频修仙真源里出现了偏武侠/偏俗套表达「${pattern}」`
        )
      }
    }

    for (const signal of ['魔尊', '血脉', '宗门']) {
      if (!sourceText.includes(signal)) {
        pushViolation(errors, 'missingGenreSignal', `修仙主线信号缺失：候选方案必须保留「${signal}」`)
      }
    }
  }

  if (lockIds.has('female-lead-indifferent-not-enemy')) {
    const directEnemyPatterns = ['女主是敌人', '误以为女主是敌人', '把女主当成敌人', '女主为敌', '女主敌对', '敌视女主']
    for (const pattern of directEnemyPatterns) {
      if (sourceText.includes(pattern)) {
        pushViolation(
          errors,
          'femaleLeadRelation',
          `女主关系偏移：真源是默默守护/被忽视，不应写成「${pattern}」`
        )
      }
    }

    const enemyRegexes = [
      /女主[^。\n，,；;]{0,12}(?:被)?(?:主角|男主)[^。\n，,；;]{0,8}(?:误解|怀疑)[^。\n，,；;]{0,4}敌人/,
      /(?:主角|男主)[^。\n，,；;]{0,8}(?:误解|怀疑)[^。\n，,；;]{0,8}女主[^。\n，,；;]{0,4}(?:敌人|敌对)/,
      /被(?:主角|男主)(?:误解|怀疑)为敌人/
    ]
    if (enemyRegexes.some((pattern) => pattern.test(sourceText))) {
      pushViolation(
        errors,
        'femaleLeadRelation',
        '女主关系偏移：真源是默默守护/被忽视，不应写成女主被主角误解或怀疑为敌人'
      )
    }

    if (/女主[^。\n，,；;]{0,12}牺牲自己|女主[^。\n，,；;]{0,12}(?:身死|死亡)/.test(sourceText)) {
      pushViolation(
        errors,
        'femaleLeadFate',
        '女主终局写法矛盾：可以重伤/昏迷/濒死，但不要写成牺牲自己或真死后又拉回'
      )
    }
  }

  if (lockIds.has('key-pendant-lifecycle')) {
    const hasOpeningPendant = candidate.result.sections.length > 0 && /吊坠|母亲遗物/.test(getSectionText(candidate.result.sections[0]))
    const hasLaterPendantPayoff =
      /吊坠[^。\n]{0,24}(?:碎片|残片|遗言|记忆|图谱|封印|线索|破阵|法器)|(?:碎片|残片)[^。\n]{0,12}吊坠/.test(
        nonOpeningText
      )

    if (!hasOpeningPendant || !hasLaterPendantPayoff) {
      pushViolation(
        errors,
        'keyItemLifecycle',
        '吊坠生命周期断裂：必须在开局使用吊坠，并在非第一篇章明确回收“吊坠碎片/残片”的长线用途'
      )
    }
  }

  if (lockIds.has('antagonist-trust-gradient')) {
    const fullTrustPatterns = ['完全信任', '毫无怀疑', '毫无保留', '唯一依靠', '彻底相信', '全盘相信', '无条件相信']
    if (includesAny(sourceText, fullTrustPatterns)) {
      pushViolation(
        errors,
        'trustGradient',
        '信任梯度断裂：主角可以被大小姐迷惑，但不能完全信任/毫无怀疑，必须保留智商底线和戒备空间'
      )
    }

    if (!/(怀疑|戒备|破绽|矛盾|将计就计|留心|试探|暗中观察)/.test(sourceText)) {
      pushViolation(
        errors,
        'protagonistJudgment',
        '主角智商底线缺失：被反派利用的同时，候选方案必须安排怀疑、戒备、发现破绽或将计就计'
      )
    }
  }

  if (lockIds.has('mentor-protector-fate')) {
    const mentorDeathPatterns = [
      /(?:掌门|宗门老大|宗主)[^。\n，,；;]{0,12}临终/,
      /(?:掌门|宗门老大|宗主)[^。\n，,；;]{0,12}(?:身死|死亡|牺牲|战死)/,
      /(?:临终|身死|死亡|牺牲|战死)[^。\n，,；;]{0,12}(?:掌门|宗门老大|宗主)/
    ]
    if (mentorDeathPatterns.some((pattern) => pattern.test(sourceText))) {
      pushViolation(
        errors,
        'mentorFate',
        '掌门/宗门老大命运偏移：他是隐忍保护者，不能为了悲情被轻易写成临终、死亡或牺牲'
      )
    }
  }

  return errors
}
