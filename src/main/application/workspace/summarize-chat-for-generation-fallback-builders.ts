import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import type { GenerationBriefPackage } from './generation-brief-template'
import type { FallbackSummaryFacts } from './summarize-chat-for-generation-fallback-types'
import { uniqueList } from './summarize-chat-for-generation-fallback-internals'

export function buildFallbackGenerationBrief(facts: FallbackSummaryFacts): Partial<GenerationBriefPackage> {
  return {
    projectTitle: facts.projectTitle,
    episodeCount: facts.episodeCount,
    genreAndStyle: facts.genreAndStyle,
    sellingPremise:
      facts.protagonist && facts.antagonist
        ? `${facts.protagonist}明明只想藏住${facts.keyAsset || '关键底牌'}，偏偏${facts.antagonist}拿${facts.protectTarget || '重要的人'}的命逼他当场亮底。`
        : facts.chainSynopsis || '待补',
    coreDislocation:
      facts.antagonist && facts.protectTarget
        ? `最该藏锋的人，偏偏被${facts.antagonist}拿${facts.protectTarget}逼到退无可退。`
        : '主角明明想躲，结果局势偏偏逼他第一个站出来。',
    emotionalPayoff:
      facts.protectTarget
        ? `先让观众看到他宁可把自己暴露，也要把${facts.protectTarget}护下来的那口气。`
        : '先让观众吃到主角不再白挨打、开始反咬回去的那口爽。',
    worldAndBackground: facts.worldAndBackground,
    protagonist: facts.protagonist || '待补',
    antagonist: facts.antagonist || '待补',
    coreConflict: facts.coreConflict,
    endingDirection: '待补',
    keyCharacters: facts.keyCharacters,
    chainSynopsis: facts.chainSynopsis,
    characterCards: facts.characterCards,
    characterLayers: facts.keyCharacters.map((name) => ({
      name,
      layer:
        name === facts.protagonist
          ? '主驱动层'
          : name === facts.antagonist
            ? '主阻力层'
            : name === facts.protectTarget
              ? '情感杠杆层'
              : '外压层',
      duty:
        name === facts.protagonist
          ? '负责扛住选择并把主线往前推'
          : name === facts.antagonist
            ? '负责持续施压'
            : name === facts.protectTarget
              ? '负责把关系代价变成推进压力'
              : '负责持续放大外部危险'
    })),
    seasonDesireLine:
      facts.protagonist
        ? `${facts.protagonist}想同时守住${facts.protectTarget || '重要的人'}和${facts.keyAsset || '关键底牌'}，但每往前一步都要付出更大代价。`
        : '待补',
    seasonResistanceLine:
      facts.antagonist || facts.worldThreat
        ? `${facts.antagonist || '对手'}会围着${facts.protectTarget || '主角软肋'}和${facts.keyAsset || '关键底牌'}持续施压，${facts.worldThreat || '外部危险'}也会不断逼近。`
        : '待补',
    seasonCostLine:
      facts.protagonist
        ? `${facts.protagonist}每次想守住人和底牌，都会让身份暴露、关系受伤或局势升级。`
        : '主角每往前走一步，都要承担身份、关系或安全上的新代价。',
    relationshipLeverLine:
      facts.antagonist && facts.protectTarget
        ? `${facts.antagonist}会拿${facts.protectTarget}逼${facts.protagonist || '主角'}交出${facts.keyAsset || '关键底牌'}。`
        : '关键关系会被反复拿来施压与反制。',
    hookChainLine:
      facts.keyAsset || facts.worldThreat
        ? `每集结尾都要从${facts.keyAsset || '关键底牌'}和${facts.worldThreat || '外部危险'}留下的新后果里继续挂钩。`
        : '每集结尾都要从当前没解决的冲突里继续挂钩。',
    relationSummary:
      facts.antagonist && facts.protectTarget && facts.protagonist
        ? [`${facts.antagonist}拿${facts.protectTarget}做筹码，持续逼${facts.protagonist}亮底。`]
        : [],
    softUnderstanding: facts.protagonist ? ['主线不是单纯抢东西，而是守约与救人不断互相咬住。'] : [],
    pendingConfirmations: uniqueList(
      [
        !facts.keyAsset ? '钥匙或关键底牌的具体规则' : '',
        !facts.worldThreat ? '外部异变的具体表现和推进方式' : '',
        !facts.protectTarget ? '被拿来施压的人物关系细节' : '',
        '结局方向'
      ].filter(Boolean),
      6
    )
  }
}

export function buildFallbackStoryIntent(facts: FallbackSummaryFacts): Partial<StoryIntentPackageDto> {
  return {
    titleHint: facts.projectTitle ? `《${facts.projectTitle}》` : '',
    genre: facts.genreAndStyle,
    sellingPremise:
      facts.protagonist && facts.antagonist
        ? `${facts.protagonist}明明只想藏住${facts.keyAsset || '关键底牌'}，偏偏${facts.antagonist}拿${facts.protectTarget || '重要的人'}的命逼他当场亮底。`
        : facts.chainSynopsis,
    coreDislocation:
      facts.antagonist && facts.protectTarget
        ? `最该藏锋的人，偏偏被${facts.antagonist}拿${facts.protectTarget}逼到退无可退。`
        : '主角明明想躲，结果局势偏偏逼他第一个站出来。',
    emotionalPayoff: facts.protectTarget ? `先护住${facts.protectTarget}这口气` : '先把那口被压着的气反咬回去',
    protagonist: facts.protagonist,
    antagonist: facts.antagonist,
    coreConflict: facts.coreConflict,
    endingDirection: '',
    officialKeyCharacters: facts.keyCharacters,
    lockedCharacterNames: facts.keyCharacters,
    relationAnchors:
      facts.antagonist && facts.protectTarget && facts.protagonist
        ? [`${facts.antagonist}拿${facts.protectTarget}施压，逼${facts.protagonist}在守约和救人之间做选择`]
        : [],
    worldAnchors: uniqueList([facts.worldAndBackground, facts.worldThreat].filter(Boolean), 4),
    themeAnchors: uniqueList(['守约与救人', '真相层层逼出', '后果不断承接'], 6),
    dramaticMovement: [
      facts.chainSynopsis,
      facts.antagonist ? `${facts.antagonist}持续施压` : '',
      '代价持续升级',
      '每集从未完冲突挂钩'
    ].filter(Boolean),
    manualRequirementNotes: uniqueList(
      [
        !facts.keyAsset ? '关键底牌规则未完全讲死' : '',
        !facts.worldThreat ? '外部危险定义还不够硬' : ''
      ].filter(Boolean),
      4
    ).join('；'),
    freeChatFinalSummary: facts.chainSynopsis
  }
}
