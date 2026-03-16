import type { FallbackSummaryFacts } from './summarize-chat-for-generation-fallback-types'
import { normalizeNameList, pickFirstKeyword, pickFirstPattern } from './summarize-chat-for-generation-fallback-internals'

function inferEpisodeCount(text: string): number {
  const match = text.match(/(\d+)\s*集/)
  const next = Number(match?.[1] || 0)
  if (!Number.isFinite(next) || next <= 0) return 10
  return Math.max(1, Math.min(80, Math.floor(next)))
}

function inferProjectTitle(text: string, protagonist: string): string {
  if (text.includes('修仙传')) return '修仙传'
  if (protagonist) return protagonist
  return '未命名项目'
}

function inferFallbackGenreAndStyle(text: string): string {
  if (text.includes('古风悬疑成长')) return '古风悬疑成长'
  if (text.includes('民国悬疑复仇')) return '民国悬疑复仇'
  if (text.includes('都市悬疑成长')) return '都市悬疑成长'
  if (text.includes('古风') && text.includes('悬疑')) return '古风悬疑'
  if (text.includes('古风') && text.includes('成长')) return '古风成长'
  if (text.includes('民国') && text.includes('悬疑')) return '民国悬疑'
  if (text.includes('都市') && text.includes('悬疑')) return '都市悬疑'
  if (text.includes('古风')) return '古风'
  if (text.includes('玄幻') || text.includes('修仙')) return '玄幻修仙'
  if (text.includes('都市')) return '都市'
  if (text.includes('民国')) return '民国'
  return '待补'
}

function inferFallbackProtagonist(text: string): string {
  return (
    text.match(/(?:主角|男主|女主)[是叫为：:\s]*([一-龥]{2,8})/)?.[1] ||
    pickFirstPattern(text, [
      /([一-龥]{2,10})(?:为了|发现|被迫|必须|正在|决定)/,
      /([一-龥]{2,10})(?:卷入|回到|查清|守住|揭露)/
    ]) ||
    pickFirstKeyword(text, ['少年守钥人', '守钥人', '黎明', '林砚']) ||
    ''
  )
}

function inferFallbackAntagonist(text: string): string {
  return (
    text.match(/反派[是叫为：:\s]*([一-龥]{2,8})/)?.[1] ||
    text.match(/(恶霸|反派|仇家|族长|城主|掌柜|恶少)(?:盯上|绑了|扣住|逼|拿)/)?.[1] ||
    pickFirstPattern(text, [
      /([一-龥]{2,8})(?:盯上|扣在|拿.+筹码|持续施压|围着)/,
      /和([一-龥]{2,10})周旋/
    ]) ||
    pickFirstKeyword(text, ['恶霸', '反派恶霸', '李科', '赵屠户']) ||
    ''
  )
}

function inferFallbackProtectTarget(text: string): string {
  return (
    pickFirstPattern(text, [
      /([一-龥]{2,10})被当成施压筹码/,
      /([一-龥]{2,10})被当筹码/,
      /([一-龥]{2,10})被扣在/,
      /([一-龥]{2,10})再次出事/
    ]) ||
    pickFirstKeyword(text, ['小镇少女', '小柔', '苏婉', '家人'])
  )
}

function inferFallbackWorldThreat(text: string): string {
  return (
    pickFirstPattern(text, [
      /([一-龥]{2,10})(?:异动越来越近|传闻越闹越凶|开始在.+连锁异常|开始失控|逼近)/,
      /([一-龥]{2,10})(?:传闻|冤魂|系统)/,
      /([一-龥]{2,10})开始在城市基础设施里连锁异常/
    ]) ||
    pickFirstKeyword(text, ['山中妖物', '妖物', '妖兽', '蛇子', '戏楼冤魂', '失控系统'])
  )
}

function inferFallbackKeyAsset(text: string): string {
  return (
    pickFirstPattern(text, [
      /盯上([一-龥]{2,10})/,
      /交出([一-龥]{2,10})/,
      /围着([一-龥]{2,10})持续施压/
    ]) ||
    pickFirstKeyword(text, ['密库钥匙', '钥匙', '秘宝', '证据', '戏本秘密', '源代码'])
  )
}

function inferFallbackWorldAndBackground(input: {
  genreAndStyle: string
  protectTarget: string
  worldThreat: string
}): string {
  const pieces = [
    input.genreAndStyle.includes('古风') ? '古风小镇' : '',
    input.worldThreat ? `${input.worldThreat}异动逼近` : '',
    input.protectTarget ? `${input.protectTarget}被卷进主线` : ''
  ].filter(Boolean)
  return pieces.join('，') || '待补'
}

function inferFallbackChainSynopsis(input: {
  protagonist: string
  antagonist: string
  protectTarget: string
  keyAsset: string
  worldThreat: string
  coreConflict: string
}): string {
  const pieces = [
    input.protagonist ? `${input.protagonist}被迫卷进局里` : '',
    input.antagonist && input.keyAsset ? `${input.antagonist}盯上${input.keyAsset}` : '',
    input.protectTarget ? `${input.protectTarget}被当成筹码` : '',
    input.worldThreat ? `${input.worldThreat}持续逼近` : '',
    input.coreConflict || ''
  ].filter(Boolean)
  return pieces.join('，') || '待补'
}

function inferFallbackCharacterCards(input: {
  protagonist: string
  antagonist: string
  protectTarget: string
  worldThreat: string
  keyAsset: string
}): Array<{ name: string; summary: string }> {
  const cards: Array<{ name: string; summary: string }> = []
  if (input.protagonist) {
    cards.push({
      name: input.protagonist,
      summary: `${input.protagonist}被迫卷进异变，既要守住${input.keyAsset || '关键底牌'}，也要守住${input.protectTarget || '重要的人'}。`
    })
  }
  if (input.antagonist) {
    cards.push({
      name: input.antagonist,
      summary: `${input.antagonist}围着${input.keyAsset || '关键底牌'}和${input.protectTarget || '主角软肋'}持续施压。`
    })
  }
  if (input.protectTarget) {
    cards.push({
      name: input.protectTarget,
      summary: `${input.protectTarget}被当成筹码，但她的站位变化会直接改写主线压力。`
    })
  }
  if (input.worldThreat) {
    cards.push({
      name: input.worldThreat,
      summary: `${input.worldThreat}不是背景板，而是会不断放大主线代价的外部危险。`
    })
  }
  return cards
}

export function inferFallbackSummaryFacts(text: string): FallbackSummaryFacts {
  const episodeCount = inferEpisodeCount(text)
  const protagonist = inferFallbackProtagonist(text)
  const antagonist = inferFallbackAntagonist(text)
  const protectTarget = inferFallbackProtectTarget(text)
  const worldThreat = inferFallbackWorldThreat(text)
  const keyAsset = inferFallbackKeyAsset(text)
  const genreAndStyle = inferFallbackGenreAndStyle(text)
  const projectTitle = inferProjectTitle(text, protagonist)
  const keyCharacters = normalizeNameList([protagonist, antagonist, protectTarget, worldThreat].filter(Boolean), 6)
  const worldAndBackground = inferFallbackWorldAndBackground({
    genreAndStyle,
    protectTarget,
    worldThreat
  })
  const coreConflict =
    protagonist && (protectTarget || keyAsset)
      ? `${protagonist}被迫卷入镇上异变，必须在守住${keyAsset || '关键底牌'}与救下${protectTarget || '重要的人'}之间做选择。`
      : text.slice(0, 120) || '待补'

  return {
    episodeCount,
    protagonist,
    antagonist,
    protectTarget,
    worldThreat,
    keyAsset,
    genreAndStyle,
    projectTitle,
    keyCharacters,
    worldAndBackground,
    coreConflict,
    chainSynopsis: inferFallbackChainSynopsis({
      protagonist,
      antagonist,
      protectTarget,
      keyAsset,
      worldThreat,
      coreConflict
    }),
    characterCards: inferFallbackCharacterCards({
      protagonist,
      antagonist,
      protectTarget,
      worldThreat,
      keyAsset
    })
  }
}
