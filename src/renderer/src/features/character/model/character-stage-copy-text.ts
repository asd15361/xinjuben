import type { CharacterDraftDto } from '../../../../../shared/contracts/workflow.ts'
import type {
  CharacterStageFactionRosterItem,
  CharacterStageLightCard,
  CharacterStageSections
} from './derive-character-stage-sections.ts'

function clean(value: unknown): string {
  return String(value ?? '').trim()
}

function line(label: string, value: unknown): string[] {
  const text = clean(value)
  return text ? [`${label}：${text}`] : []
}

function block(title: string, lines: string[]): string {
  return [`## ${title}`, ...lines.filter(Boolean)].join('\n')
}

export function buildCharacterProfileCopyText(character: CharacterDraftDto): string {
  return block(clean(character.name) || '未命名人物', [
    ...line('外在形象', character.appearance),
    ...line('性格特点', character.personality),
    ...line('身份', character.identity),
    ...line('价值观', character.values),
    ...line('剧情作用', character.plotFunction),
    ...line('最想守', character.protectTarget),
    ...line('最怕失去', character.fear),
    ...line('一碰就炸', character.conflictTrigger),
    ...line('目标', character.goal),
    ...line('表面', character.publicMask),
    ...line('暗里卡着', character.hiddenPressure),
    ...line('优势', character.advantage),
    ...line('弱点', character.weakness),
    ...line('人物弧线', character.arc),
    ...line('小传', character.biography)
  ])
}

export function buildLightCharacterCopyText(card: CharacterStageLightCard): string {
  return block(clean(card.name) || '未命名轻量人物', [
    ...line('层级', card.roleLayerLabel),
    ...line('阵营', card.factionNames.join('、')),
    ...line('势力职责', card.factionRole),
    ...line('当前功能', card.currentFunction),
    ...line('对外身份', card.publicIdentity),
    ...line('立场', card.stance),
    ...line('口风', card.voiceStyle),
    ...line('想要', card.goalPreview),
    ...line('压力', card.pressurePreview),
    ...line('摘要', card.summary)
  ])
}

export function buildFactionRosterCopyText(faction: CharacterStageFactionRosterItem): string {
  const members =
    faction.members.length > 0
      ? faction.members
          .map(
            (member) =>
              `- ${member.name} · ${member.isFullProfile ? '已升完整' : member.roleLayerLabel}`
          )
          .join('\n')
      : '- 当前还没挂上实名人物'
  const seats =
    faction.placeholderSeats.length > 0
      ? faction.placeholderSeats
          .map((seat) => `- ${seat.label} · ${seat.roleLayerLabel}`)
          .join('\n')
      : '- 无待补席位'

  return block(clean(faction.name) || '未命名势力', [
    ...line('势力类型', faction.factionTypeLabel),
    ...line('人数', `已实名 ${faction.members.length} / 总位 ${faction.seatCount}`),
    ...line('摘要', faction.summary),
    '已实名人物：',
    members,
    '待补席位：',
    seats
  ])
}

export function buildCharacterStageCopyText(sections: CharacterStageSections): string {
  const parts = [
    '# 人物小传',
    `完整人物小传：${sections.fullProfiles.length}`,
    `轻量人物卡：${sections.lightCards.length}`,
    `势力与人物位：${sections.factionSeatCount}`,
    '',
    '# 完整人物小传',
    sections.fullProfiles.length > 0
      ? sections.fullProfiles.map(buildCharacterProfileCopyText).join('\n\n')
      : '暂无完整人物小传',
    '',
    '# 轻量人物卡',
    sections.lightCards.length > 0
      ? sections.lightCards.map(buildLightCharacterCopyText).join('\n\n')
      : '暂无轻量人物卡',
    '',
    '# 势力与人物位',
    sections.factionRoster.length > 0
      ? sections.factionRoster.map(buildFactionRosterCopyText).join('\n\n')
      : '暂无势力与人物位'
  ]

  return parts.join('\n').trim()
}
