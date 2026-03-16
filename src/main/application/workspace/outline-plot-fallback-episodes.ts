function sanitizeEpisodeText(text: string, replacements: Array<[string, string]>): string {
  let result = text
  for (const [from, to] of replacements) {
    if (!from || !to) continue
    result = result.replaceAll(from, to)
  }
  return result.replace(/\s+/g, ' ').trim()
}

export function buildFallbackEpisodeSummaries(input: {
  protagonist: string
  antagonist: string
  protectTarget: string
  keyAsset: string
  worldThreat: string
  mentor: string
  location: string
  wisdomAnchor: string
  conflictDirection: string
  episodeCount?: number
}): Array<{ episodeNo: number; summary: string }> {
  const totalEpisodes = Number.isFinite(input.episodeCount) && (input.episodeCount || 0) > 0 ? Math.max(1, Math.floor(Number(input.episodeCount))) : 10
  const conflictBeats = [
    `${input.antagonist}拿${input.protectTarget}和${input.keyAsset}双线卡喉，逼${input.protagonist}当场表态。`,
    `${input.protagonist}一边稳住${input.antagonist}的试探，一边沿着${input.keyAsset}和旧规矩反查第一道破口。`,
    `${input.worldThreat}真正露头后，小镇里开始有人受波及，${input.protectTarget}的处境比前一集更危险。`,
    `${input.protagonist}刚摸到更深真相，${input.antagonist}就顺势把火往${input.protectTarget}和镇上百姓身上烧。`,
    `${input.antagonist}以为自己已经压实胜局，开始逼${input.protagonist}公开交出底牌。`,
    `${input.protagonist}反手布局以后，局内人开始重新站位，旧规矩第一次压回${input.antagonist}。`,
    `${input.protectTarget}被再次拖上台面后，${input.protagonist}的隐藏空间几乎被全部掀开。`,
    `${input.worldThreat}和${input.keyAsset}背后的真因一并翻面，所有人都得为前面积下的选择买单。`,
    `${input.antagonist}把前九集攒下来的筹码一次性砸出来，逼${input.protagonist}没有退路。`,
    `${input.protagonist}在救${input.protectTarget}和守${input.keyAsset}之间做出的最终选择，让${input.worldThreat}彻底并线爆发。`
  ]
  const hookBeats = [
    `${input.protagonist}刚压住眼前这一轮，下一集更狠的代价已经顺着${input.protectTarget}追上来。`,
    `${input.protagonist}试出来的门道不但没让局面松口，反而把更深一层的禁忌提前翻了出来。`,
    `${input.worldThreat}这次露头留下的后果，会逼出镇上下一轮更实的伤亡和怀疑。`,
    `${input.protagonist}刚摸到的真相还没捂热，就要在下一集反过来咬伤自己最想守的人。`,
    `${input.antagonist}这次高压把所有人都推到边缘，下一集谁先失手谁就先掉下去。`,
    `${input.protagonist}好不容易抢回一点主动，下一集却要为这次亮招付出更大的站位代价。`,
    `${input.protectTarget}这次出事留下的裂口，会把${input.protagonist}真正逼进不得不亮底的临界点。`,
    `${input.worldThreat}和旧真相一起翻上桌后，下一集没人还能继续装作不知道。`,
    `${input.antagonist}把退路封死以后，下一集就只剩硬碰硬和真相见底两条路。`,
    `${input.protagonist}这一轮选择虽然收住当下，但它留下的命运线已经钩向下一轮更大的账。`
  ]
  const beats = [
    `${input.antagonist}先拿${input.protectTarget}逼${input.protagonist}交出${input.keyAsset}，把主线第一轮压力正面压下来。`,
    `${input.protagonist}表面继续藏锋，暗里借${input.wisdomAnchor}试探${input.keyAsset}${input.mentor ? `与${input.mentor}留下的真正路数` : '真正认主的门道'}。`,
    `${input.worldThreat}开始在${input.location}露头，${input.antagonist}趁乱继续加压，${input.protectTarget}被卷得更深。`,
    `${input.protagonist}顺着${input.worldThreat}和${input.keyAsset}的牵连摸到更大真相，但也让自己和${input.protectTarget}同时暴露风险。`,
    `${input.antagonist}误以为局面尽在掌握，当众逼${input.protagonist}低头，双方第一次真正撕破脸。`,
    `${input.protagonist}借${input.wisdomAnchor}反手布一局，让${input.conflictDirection}从被动挨打转向主动牵制。`,
    `${input.protectTarget}再次出事，逼得${input.protagonist}必须在继续隐藏和直接亮底之间做更痛的选择。`,
    `${input.mentor || input.worldThreat}和${input.keyAsset}背后的旧真相被进一步掀开，${input.antagonist}开始感到局面失控。`,
    `${input.antagonist}带着前面压住的所有关系和危险狠狠干向${input.protagonist}最后的退路，终局压力全部并线。`,
    `${input.protagonist}为救${input.protectTarget}正面迎上去，把${input.keyAsset}、${input.worldThreat}${input.mentor ? `和${input.mentor}留下的那条命运线` : '留下的那条命运线'}一起钩到下一轮。`
  ]

  return Array.from({ length: totalEpisodes }, (_, index) => {
    const beatIndex = Math.min(beats.length - 1, Math.floor((index / totalEpisodes) * beats.length))
    const phase = beatIndex + 1
    const summary = beats[beatIndex]
    const conflict = conflictBeats[beatIndex] || `${input.antagonist}和${input.worldThreat}把局势往更险处推。`
    const hook = hookBeats[beatIndex] || '这一集留下的麻烦会在下一集立刻回来咬人。'
    const roundText =
      totalEpisodes > beats.length
        ? `这一集属于第${phase}轮压力升级，重点是把当前局面继续往更窄、更痛的方向拱。`
        : ''

    return {
      episodeNo: index + 1,
    summary: sanitizeEpisodeText(
      `【推进】${summary}${roundText ? `【阶段】${roundText}` : ''}【冲突】${conflict}${beatIndex >= 5 ? `【后果】${input.protagonist}这一集的选择会直接改写下一集的站位和代价。` : ''}【钩子】${hook}`,
      [
        ['最重要的人', input.protectTarget],
        ['关键底牌', input.keyAsset],
        ['外部危机', input.worldThreat],
        ['关键地点', input.location],
        ['关键旧关系', input.mentor || input.worldThreat]
      ]
    )
    }
  })
}
