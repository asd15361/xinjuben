import type { StoryIntentPackageDto } from '../../../../shared/contracts/intake'
import type { ScriptStateLedgerDto } from '../../../../shared/contracts/script-ledger'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto
} from '../../../../shared/contracts/workflow'
import type {
  StoryContractDto,
  UserAnchorLedgerDto
} from '../../../../shared/contracts/story-contract'
import {
  buildCurrentBatchTaskCard,
  buildCurrentEpisodeTaskCard,
  buildDebtCard
} from './build-script-task-cards'

function pickFirst(...values: Array<string | undefined | null>): string {
  for (const value of values) {
    const text = String(value || '').trim()
    if (text) return text
  }
  return ''
}

function clipText(value: string, maxLength: number): string {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(20, maxLength - 1)).trim()}…`
}

function joinList(
  values: string[] | undefined,
  fallback: string,
  maxItems: number,
  maxLength: number
): string {
  const normalized = (values || []).map((value) => String(value || '').trim()).filter(Boolean)
  if (normalized.length === 0) return fallback
  return clipText(normalized.slice(0, maxItems).join('；'), maxLength)
}

export function buildScriptRelayBlock(input: {
  projectTitle: string
  theme: string
  mainConflict: string
  characters: CharacterDraftDto[]
  segments: DetailedOutlineSegmentDto[]
  episodeNo: number
  totalEpisodes: number
  batchSize: number
  storyIntent?: StoryIntentPackageDto | null
  storyContract: StoryContractDto
  anchorLedger: UserAnchorLedgerDto
  ledger: ScriptStateLedgerDto
}): string {
  const sellingPremise = pickFirst(
    input.storyIntent?.sellingPremise,
    input.storyContract.softFacts[0],
    input.mainConflict
  )
  const coreDislocation = pickFirst(
    input.storyIntent?.coreDislocation,
    input.storyContract.softFacts[1],
    input.theme
  )
  const emotionalPayoff = pickFirst(
    input.storyIntent?.emotionalPayoff,
    input.storyIntent?.dramaticMovement?.[0],
    input.storyContract.eventSlots.relationshipShift,
    input.theme
  )
  const protagonist = pickFirst(
    input.storyContract.characterSlots.protagonist,
    input.characters[0]?.name
  )
  const antagonist = pickFirst(
    input.storyContract.characterSlots.antagonist,
    input.characters[1]?.name
  )
  const activeConflict = clipText(
    input.ledger.storyMomentum.activeConflictLine || input.mainConflict || '当前主冲突待补',
    100
  )
  const mustContinue = joinList(
    [input.ledger.storyMomentum.pendingCost, input.ledger.storyMomentum.nextRequiredBridge].filter(
      Boolean
    ) as string[],
    '当前待补',
    2,
    100
  )
  const openHooks = joinList(
    [
      ...input.ledger.storyMomentum.hardAnchors,
      ...input.ledger.openHooks.map((hook) => `第${hook.sourceSceneNo}场：${hook.hookText}`)
    ],
    '当前待补',
    3,
    120
  )
  const relationPressure = joinList(
    input.ledger.characters.flatMap((character) =>
      character.relationshipPressure.map(
        (pressure) =>
          `${character.name}->${pressure.targetName}：${pressure.currentTension || pressure.leveragePoint}`
      )
    ),
    '当前待补',
    2,
    100
  )
  const formalFloor = clipText(
    input.ledger.preflight.assertionBlock ||
      joinList(input.anchorLedger.protectedFacts || [], '继续承接当前正式事实。', 4, 120),
    120
  )

  return [
    '【前情提要】',
    `- 这部戏一句话：${clipText(`${sellingPremise}；核心错位=${coreDislocation}；优先情绪=${emotionalPayoff}`, 140)}`,
    `- 当前局面：${activeConflict}`,
    `- 核心对顶：${clipText(`${protagonist || '主角待补'} vs ${antagonist || '对手待补'}`, 60)}`,
    `- 当前关系压强：${relationPressure}`,
    `- 必续后果：${mustContinue}`,
    `- 未结钩子：${openHooks}`,
    `- 正式事实底线：${formalFloor}`,
    '【当前要写的大纲】',
    buildCurrentBatchTaskCard({
      segments: input.segments,
      episodeNo: input.episodeNo,
      totalEpisodes: input.totalEpisodes,
      batchSize: input.batchSize
    }),
    buildCurrentEpisodeTaskCard({
      segments: input.segments,
      episodeNo: input.episodeNo,
      totalEpisodes: input.totalEpisodes
    }),
    buildDebtCard(input.ledger),
    '只认上面两块：前情提要 + 当前要写的大纲。除此之外，不要自己再扩一套历史包袱。',
    '上面这些提要、任务卡和欠账卡只准在你脑子里消化，不准转写成“注：”“说明：”“上一场承接的是……”“这一集要完成的是……”这类正文解释句。'
  ].join('\n')
}
