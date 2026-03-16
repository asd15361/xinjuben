import type { CharacterDraftDto } from '../../../shared/contracts/workflow'
import { parseStructuredGenerationBrief } from './summarize-chat-for-generation-support'
import { normalizeAnchorName } from './summarize-chat-for-generation-shared'

function deriveFallbackAsset(summary: string, conflict: string): string {
  const text = `${summary} ${conflict}`
  if (text.includes('钥匙')) return '钥匙'
  if (text.includes('密库')) return '密库秘密'
  if (text.includes('证据')) return '关键证据'
  if (text.includes('U盘') || text.includes('u盘')) return '原始证据U盘'
  if (text.includes('婚约')) return '婚约真相'
  return '手里的关键底牌'
}

function deriveFallbackProtectTarget(summary: string, conflict: string): string {
  const text = `${summary} ${conflict}`
  if (text.includes('小镇少女')) return '小镇少女'
  if (text.includes('小柔')) return '小柔'
  if (text.includes('弟弟') && text.includes('小姨')) return '小姨和弟弟'
  if (text.includes('家人')) return '家人'
  return '最重要的人'
}

function normalizeCharacterDraft(character: CharacterDraftDto): CharacterDraftDto {
  return {
    name: character.name?.trim() || '未命名人物',
    biography: character.biography?.trim() || `${character.name?.trim() || '这个人物'}当前只有人物标签，还没有真正展开小传。`,
    publicMask: character.publicMask?.trim() || '',
    hiddenPressure: character.hiddenPressure?.trim() || '',
    fear: character.fear?.trim() || '',
    protectTarget: character.protectTarget?.trim() || '',
    conflictTrigger: character.conflictTrigger?.trim() || '',
    advantage: character.advantage?.trim() || '',
    weakness: character.weakness?.trim() || '',
    goal: character.goal?.trim() || '',
    arc: character.arc?.trim() || ''
  }
}

function hasCharacterName(characters: CharacterDraftDto[], targetName: string): boolean {
  const normalizedTarget = normalizeAnchorName(targetName.trim())
  if (!normalizedTarget) return false
  return characters.some((character) => normalizeAnchorName(character.name.trim()) === normalizedTarget)
}

function appendRequiredAnchorCharacters(input: {
  characters: CharacterDraftDto[]
  protagonist: string
  antagonist: string
  protectTarget: string
  keyAsset: string
}): CharacterDraftDto[] {
  const result = [...input.characters]
  const protagonistName = input.protagonist?.trim() ? normalizeAnchorName(input.protagonist).slice(0, 12) : '主角'
  const antagonistName = input.antagonist?.trim() ? normalizeAnchorName(input.antagonist).slice(0, 12) : '对手'

  if (protagonistName && !hasCharacterName(result, protagonistName)) {
    result.push({
      name: protagonistName,
      biography: `${protagonistName}表面一直压着自己，不肯轻易亮底，真实重心是守住${input.protectTarget}和${input.keyAsset}。前期只能一边忍，一边找翻盘时机；一旦外部压力真压到人和底牌身上，他就会被逼着从隐忍转向正面对抗。`,
      publicMask: '表面低调隐忍，像是没有资格翻盘的人。',
      hiddenPressure: `真正压力不只是自己受委屈，而是${input.protectTarget}和${input.keyAsset}一旦失手，整条退路都会被掐断。`,
      fear: `最怕自己还没来得及动手，${input.protectTarget}和${input.keyAsset}就先被毁掉。`,
      protectTarget: `想守住${input.protectTarget}和${input.keyAsset}。`,
      conflictTrigger: `只要有人直接动${input.protectTarget}或逼他交出${input.keyAsset}，他就会被逼到亮底。`,
      advantage: '行动力强，敢赌敢拼',
      weakness: '容易冲动，被情绪带节奏',
      goal: '夺回身份与尊严',
      arc: '从被动受压到主动掌控'
    })
  }

  if (antagonistName && !hasCharacterName(result, antagonistName)) {
    result.push({
      name: antagonistName,
      biography: `${antagonistName}长期站在资源和规则高位，核心打法就是拿${input.protectTarget}和现实压力去逼人低头。他看重的不是讲理，而是尽快把${input.keyAsset}抢到手；越到后面越会因为自负和加码施压，把自己推到必须硬碰硬的位置。`,
      publicMask: '习惯站在高位，永远一副自己稳赢的样子。',
      hiddenPressure: `最怕${input.keyAsset}失手，也最怕自己拿来压人的局势突然反过来咬自己。`,
      fear: `最怕主角把${input.keyAsset}背后的真相直接掀开。`,
      protectTarget: '守住自己手里的资源、规则和话语权。',
      conflictTrigger: `只要感到主角想翻盘，或发现${input.keyAsset}没有真的到手，就会立刻加码施压。`,
      advantage: '资源强，擅长操控舆论与规则',
      weakness: '自负，轻视主角的成长',
      goal: '守住既得利益，压制真相曝光',
      arc: '从优势碾压到被事实反噬'
    })
  }

  return result
}

export function buildFallbackCharacters(input: {
  protagonist: string
  antagonist: string
  conflict: string
  outlineSummary: string
  generationBriefText?: string
}): CharacterDraftDto[] {
  const protectTarget = deriveFallbackProtectTarget(input.outlineSummary, input.conflict)
  const keyAsset = deriveFallbackAsset(input.outlineSummary, input.conflict)
  const structured = input.generationBriefText ? parseStructuredGenerationBrief(input.generationBriefText) : null
  const structuredCards =
    structured?.generationBrief &&
    typeof structured.generationBrief === 'object' &&
    Array.isArray((structured.generationBrief as { characterCards?: unknown[] }).characterCards)
      ? ((structured.generationBrief as { characterCards?: Array<{ name?: string; summary?: string }> }).characterCards || [])
      : []

  if (structuredCards.length > 0) {
    const structuredCharacters = structuredCards.slice(0, 6).map((card, index) => {
      const name = card.name?.trim() || `关键人物${index + 1}`
      const summary = card.summary?.trim() || `${name}当前需要补人物抓手。`
      const isProtagonist = name === input.protagonist
      const isAntagonist = name === input.antagonist
      return normalizeCharacterDraft({
        name,
        biography: summary,
        publicMask: isProtagonist
          ? '表面低调藏锋，不轻易亮底。'
          : isAntagonist
            ? '表面强势压人，习惯站在高位。'
            : '表面带着自己最容易被看到的角色样子。',
        hiddenPressure: isProtagonist
          ? '真正压力不是自己受屈，而是重要的人和底牌同时被逼近。'
          : isAntagonist
            ? '最怕自己一直压着的真相突然失控反噬。'
            : `${name}背后压着一条会影响主线的私人压力。`,
        fear: isProtagonist
          ? '最怕还没动手，重要的人和底牌就先失守。'
          : isAntagonist
            ? '最怕主角真的把局面翻过来。'
            : `${name}最怕自己所在的位置被直接夺走。`,
        protectTarget: isProtagonist
          ? '想守住当前最重要的人和物。'
          : isAntagonist
            ? '想守住自己手里的优势和控制权。'
            : `${name}有自己一定要守的关系或立场。`,
        conflictTrigger: isProtagonist
          ? '只要有人直接动他最想守住的人和物，他就会被逼着往前推。'
          : isAntagonist
            ? '一旦感觉局面不再受控，就会立刻加码施压。'
            : `${name}一旦自己的软肋被碰到，就会改变站位。`,
        advantage: isProtagonist ? '能忍、会藏、关键时刻敢动' : isAntagonist ? '资源强、施压狠、控场快' : '对主线有独特作用',
        weakness: isProtagonist ? '越在意越容易被拿来做杠杆' : isAntagonist ? '自负，容易低估反扑' : '一旦站位被看穿就容易反噬',
        goal: isProtagonist
          ? '守住重要的人和底牌，并完成真正反转。'
          : isAntagonist
            ? '持续压住主角，把关键东西抢到手。'
            : '把自己手里的那条主线杠杆真正用起来。',
        arc: isProtagonist
          ? '从隐忍藏锋走到被逼亮底，再到主动掌局。'
          : isAntagonist
            ? '从优势压制走到不断加码，最终被局势反咬。'
            : '从局内人变成真正改变局面的关键杠杆。'
        })
    })
    return appendRequiredAnchorCharacters({
      characters: structuredCharacters,
      protagonist: input.protagonist,
      antagonist: input.antagonist,
      protectTarget,
      keyAsset
    })
  }

  const p = input.protagonist?.trim()
  const a = input.antagonist?.trim()
  const protagonistName = p ? normalizeAnchorName(p.split(/[，,。]/)[0].trim()).slice(0, 12) : '主角'
  const antagonistName = a ? normalizeAnchorName(a).slice(0, 12) : '对手'
  return appendRequiredAnchorCharacters({
    characters: [
    {
      name: protagonistName || '主角',
      biography: `${protagonistName || '主角'}表面一直压着自己，不肯轻易亮底，真实重心是守住${protectTarget}和${keyAsset}。前期只能一边忍，一边找翻盘时机；一旦外部压力真压到人和底牌身上，他就会被逼着从隐忍转向正面对抗。`,
      publicMask: `表面低调隐忍，像是没有资格翻盘的人。`,
      hiddenPressure: `真正压力不只是自己受委屈，而是${protectTarget}和${keyAsset}一旦失手，整条退路都会被掐断。`,
      fear: `最怕自己还没来得及动手，${protectTarget}和${keyAsset}就先被毁掉。`,
      protectTarget: `想守住${protectTarget}和${keyAsset}。`,
      conflictTrigger: `只要有人直接动${protectTarget}或逼他交出${keyAsset}，他就会被逼到亮底。`,
      advantage: '行动力强，敢赌敢拼',
      weakness: '容易冲动，被情绪带节奏',
      goal: '夺回身份与尊严',
      arc: '从被动受压到主动掌控'
    },
    {
      name: antagonistName || '对手',
      biography: `${antagonistName || '对手'}长期站在资源和规则高位，核心打法就是拿${protectTarget}和现实压力去逼人低头。他看重的不是讲理，而是尽快把${keyAsset}抢到手；越到后面越会因为自负和加码施压，把自己推到必须硬碰硬的位置。`,
      publicMask: '习惯站在高位，永远一副自己稳赢的样子。',
      hiddenPressure: `最怕${keyAsset}失手，也最怕自己拿来压人的局势突然反过来咬自己。`,
      fear: `最怕主角把${keyAsset}背后的真相直接掀开。`,
      protectTarget: '守住自己手里的资源、规则和话语权。',
      conflictTrigger: `只要感到主角想翻盘，或发现${keyAsset}没有真的到手，就会立刻加码施压。`,
      advantage: '资源强，擅长操控舆论与规则',
      weakness: '自负，轻视主角的成长',
      goal: '守住既得利益，压制真相曝光',
      arc: '从优势碾压到被事实反噬'
    }
  ],
    protagonist: input.protagonist,
    antagonist: input.antagonist,
    protectTarget,
    keyAsset
  })
}

export function normalizeFallbackCharacterDraft(character: CharacterDraftDto): CharacterDraftDto {
  return normalizeCharacterDraft(character)
}
