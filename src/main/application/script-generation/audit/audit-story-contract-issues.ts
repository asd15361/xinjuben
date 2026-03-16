import type { ScriptAuditReportDto } from '../../../../shared/contracts/script-audit'
import type { CharacterDraftDto, OutlineDraftDto } from '../../../../shared/contracts/workflow'
import type { StoryContractDto, UserAnchorLedgerDto } from '../../../../shared/contracts/story-contract'
import {
  collectMissingUserAnchorNames,
  hasHeroineAnchorCoverage
} from '../../../../shared/domain/story-contract/story-contract-policy'
import { hasRelationshipVerbs } from './audit-helpers'

function normalizeText(value: string): string {
  return value
    .replace(/[，。、“”‘’：；！？（）()【】\[\],.!?;:'"`~\-_/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractSemanticTokens(normalizedAnchor: string): string[] {
  const directTokens = normalizedAnchor.match(/[\u4e00-\u9fff]{2,8}|[a-zA-Z0-9]{2,}/g) || []
  const filteredDirectTokens = directTokens.filter((token) => token.length >= 2)
  if (filteredDirectTokens.length > 0) {
    return filteredDirectTokens
  }

  const compact = normalizedAnchor.replace(/\s+/g, '')
  if (compact.length < 4) return compact ? [compact] : []

  const stopTokens = new Set(['当前', '继续', '以及', '因为', '所以', '已经', '一个', '一种', '不能', '然后'])
  const grams = new Set<string>()
  for (let index = 0; index <= compact.length - 2; index += 2) {
    grams.add(compact.slice(index, index + 2))
    if (index <= compact.length - 3) grams.add(compact.slice(index, index + 3))
    if (index <= compact.length - 4) grams.add(compact.slice(index, index + 4))
  }

  return Array.from(grams).filter((token) => token.length >= 2 && !stopTokens.has(token))
}

function hasSemanticAnchor(text: string, anchorText: string): boolean {
  const normalizedText = normalizeText(text)
  const normalizedAnchor = normalizeText(anchorText)
  if (!normalizedText || !normalizedAnchor) return false
  if (normalizedText.includes(normalizedAnchor)) return true

  const filtered = extractSemanticTokens(normalizedAnchor)
  if (filtered.length === 0) return false

  let hits = 0
  const shouldTreatAsThemeMotto = filtered.length <= 2 && filtered.every((token) => token.length >= 4)
  const requiredHits = shouldTreatAsThemeMotto ? 1 : filtered.length >= 6 ? 3 : Math.min(2, filtered.length)
  for (const token of filtered) {
    if (normalizedText.includes(token)) {
      hits += 1
      if (hits >= requiredHits) return true
    }
  }

  return false
}

function hasHardAnchorSupport(text: string, anchorText: string): boolean {
  if (hasSemanticAnchor(text, anchorText)) return true

  const normalizedAnchor = normalizeText(anchorText)
  if (!normalizedAnchor) return false

  if (normalizedAnchor.includes('藏锋守拙') || normalizedAnchor.includes('不争而胜')) {
    return /(藏锋|守拙|不争|身外之物|没还手|压回丹田|硬生生停住|不值得拼命)/.test(text)
  }

  if (normalizedAnchor.includes('藏武隐忍') || normalizedAnchor.includes('被迫亮出底牌')) {
    return /(隐忍|没还手|压回丹田|硬生生停住|钥匙|李科|小柔|妖兽|山里那东西|亮出|底牌)/.test(text)
  }

  return false
}

export function collectUserAnchorAuditIssues(
  userAnchorLedger: UserAnchorLedgerDto | undefined,
  characters: CharacterDraftDto[]
): ScriptAuditReportDto['issues'] {
  const issues: ScriptAuditReportDto['issues'] = []
  if (!userAnchorLedger) return issues

  const missingAnchorNames = collectMissingUserAnchorNames(userAnchorLedger, characters)
  if (missingAnchorNames.length > 0) {
    issues.push({
      code: 'user_anchor_roster_missing',
      severity: 'high',
      message: `人物名册还没覆盖这些用户锚点：${missingAnchorNames.join('、')}。`
    })
  }

  if (!hasHeroineAnchorCoverage(userAnchorLedger, characters)) {
    issues.push({
      code: 'heroine_anchor_missing',
      severity: 'medium',
      message: '当前人物层还没有承接用户声明的情感锚点。'
    })
  }

  return issues
}

export function collectStoryContractAuditIssues(
  storyContract: StoryContractDto | undefined,
  outline: OutlineDraftDto | undefined,
  mergedScript: string
): ScriptAuditReportDto['issues'] {
  const issues: ScriptAuditReportDto['issues'] = []
  if (!storyContract || !outline) return issues

  const antagonist = storyContract.characterSlots.antagonist
  const heroine = storyContract.characterSlots.heroine

  if (storyContract.requirements.requireAntagonistContinuity && antagonist && !hasSemanticAnchor(mergedScript, antagonist)) {
    issues.push({
      code: 'antagonist_continuity_missing',
      severity: 'high',
      message: `当前剧本还没有让对手“${antagonist}”形成贯穿施压。`
    })
  }

  if (
    storyContract.requirements.requireRelationshipShift &&
    heroine &&
    (!hasSemanticAnchor(mergedScript, heroine) || (!hasRelationshipVerbs(mergedScript) && !/(失望|冷淡|嫌弃|护在身前|挡在身前|看向.*眼神|心头一紧)/.test(mergedScript)))
  ) {
    issues.push({
      code: 'relationship_shift_missing',
      severity: 'medium',
      message: `当前剧本还没有让情感对象“${heroine}”进入关系推进。`
    })
  }

  if (
    storyContract.requirements.requireAntagonistLoveConflict &&
    !/(逼婚|抢走|夺走|强占|争夺|拿她威胁|拿他威胁|情敌|所爱|爱人|小娘子|这丫头|带走|送到李府|收尸)/.test(mergedScript)
  ) {
    issues.push({
      code: 'antagonist_love_conflict_missing',
      severity: 'medium',
      message: '当前剧本还没有兑现“对手争夺主角所爱”的持续施压。'
    })
  }

  if (
    storyContract.requirements.requireHealingTechnique &&
    !/(术法|秘术|法门|疗法|法诀|功法|救治|疗伤|治疗|救人)/.test(mergedScript)
  ) {
    issues.push({
      code: 'healing_technique_missing',
      severity: 'medium',
      message: '当前剧本还没有兑现关键救治事件或治疗手段。'
    })
  }

  if (
    storyContract.requirements.requireHiddenCapabilityForeshadow &&
    !/(隐藏|藏锋|克制|假装不会|不露|忍住出手|压下.*真气|收敛|袖中|瞳孔骤缩|手指.*顿|不能动武|身体纹丝未动|强行压下|按向腰间|几乎要冲出去|不敢妄动)/.test(
      mergedScript
    )
  ) {
    issues.push({
      code: 'hidden_capability_foreshadow_missing',
      severity: 'medium',
      message: '当前剧本还没有埋下隐藏能力或克制出手的前置伏笔。'
    })
  }

  const hardAnchorMissing = [outline.theme, outline.mainConflict, outline.protagonist]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item) => !hasHardAnchorSupport(mergedScript, item))
  if (hardAnchorMissing.length > 0) {
    issues.push({
      code: 'hard_anchor_pending',
      severity: 'low',
      message: `这些硬锚点还没在当前剧本里形成承接：${hardAnchorMissing.slice(0, 3).join('、')}。`
    })
  }

  return issues
}
