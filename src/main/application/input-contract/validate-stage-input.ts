import type { InputContractValidationDto } from '../../../shared/contracts/input-contract'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import type { CharacterDraftDto, DetailedOutlineSegmentDto, OutlineDraftDto, ScriptSegmentDto } from '../../../shared/contracts/workflow'
import type { StageContractType } from '../../../shared/contracts/stage-contract'
import { matchFormalFactLanding } from '../../../shared/domain/formal-fact/match-formal-fact-landing'
import { getConfirmedFormalFacts } from '../../../shared/domain/formal-fact/selectors'
import {
  buildStoryContract,
  buildUserAnchorLedger,
  collectMissingUserAnchorNames,
  hasHeroineAnchorCoverage
} from '../../../shared/domain/story-contract/story-contract-policy'

interface StageInputPayload {
  storyIntent?: StoryIntentPackageDto | null
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  segments: DetailedOutlineSegmentDto[]
  script: ScriptSegmentDto[]
}

function hasText(value: string | undefined): boolean {
  return Boolean(value && value.trim())
}

export function validateStageInputContract(
  targetStage: StageContractType,
  payload: StageInputPayload
): InputContractValidationDto {
  const issues: InputContractValidationDto['issues'] = []
  const confirmedFormalFacts = getConfirmedFormalFacts(payload.outline)
  const storyContract = buildStoryContract({
    storyIntent: payload.storyIntent,
    outline: payload.outline,
    characters: payload.characters
  })
  const userAnchorLedger = buildUserAnchorLedger({
    storyIntent: payload.storyIntent,
    outline: payload.outline,
    characters: payload.characters
  })
  const missingAnchorNames = collectMissingUserAnchorNames(userAnchorLedger, payload.characters)
  const heroineCovered = hasHeroineAnchorCoverage(userAnchorLedger, payload.characters)

  if (targetStage === 'outline') {
    if (!hasText(payload.outline.title)) issues.push({ code: 'outline_title_missing', message: '粗纲标题还没稳定下来。' })
    if (!hasText(payload.outline.genre)) issues.push({ code: 'outline_genre_missing', message: '粗纲题材还没定义。' })
    if (!hasText(payload.outline.theme)) issues.push({ code: 'outline_theme_missing', message: '粗纲主题锚点还没定义。' })
    if (!hasText(payload.outline.mainConflict)) issues.push({ code: 'outline_conflict_missing', message: '粗纲主线冲突还没定义。' })
    if (!hasText(payload.outline.protagonist)) issues.push({ code: 'outline_protagonist_missing', message: '粗纲主角承载体还没定义。' })
    if (!hasText(payload.outline.summary)) issues.push({ code: 'outline_summary_missing', message: '粗略大纲骨架还没成稿，当前还只是事实和槽位。' })
  }

  if (targetStage === 'character') {
    if (!hasText(payload.outline.title) || !hasText(payload.outline.mainConflict) || !hasText(payload.outline.theme) || !hasText(payload.outline.summary)) {
      issues.push({ code: 'character_upstream_outline_incomplete', message: '人物工序启动前，粗纲标题、主题、主线冲突和粗略大纲骨架必须先完整。' })
    }
    if (confirmedFormalFacts.length === 0) {
      issues.push({ code: 'character_formal_fact_missing', message: '人物工序启动前，至少要先确认 1 个正式事实。' })
    }
    if (storyContract.characterSlots.protagonist && !payload.characters.some((item) => item.name.trim() === storyContract.characterSlots.protagonist)) {
      issues.push({ code: 'character_protagonist_anchor_missing', message: '人物工序还没有把主角锚点真正落到角色名册里。' })
    }
  }

  if (targetStage === 'detailed_outline') {
    if (payload.characters.length === 0) {
      issues.push({ code: 'detailed_outline_character_missing', message: '详细大纲启动前，至少要先沉淀 1 个角色。' })
    }
    if (!payload.characters.some((item) => hasText(item.name) && hasText(item.biography) && hasText(item.goal) && hasText(item.advantage) && hasText(item.weakness) && hasText(item.arc))) {
      issues.push({ code: 'detailed_outline_character_contract_weak', message: '至少要有 1 个角色完成姓名、小传、目标、优势、短板和弧光，详纲才能继续。' })
    }
    if (confirmedFormalFacts.length === 0) {
      issues.push({ code: 'detailed_outline_formal_fact_missing', message: '详细大纲启动前，必须先有已确认正式事实作为推进骨架。' })
    }
    if (missingAnchorNames.length > 0) {
      issues.push({
        code: 'detailed_outline_anchor_roster_missing',
        message: `详细大纲启动前，角色名册还没覆盖这些用户锚点：${missingAnchorNames.join('、')}。`
      })
    }
  }

  if (targetStage === 'script') {
    if (payload.segments.length === 0) {
      issues.push({ code: 'script_segment_missing', message: '剧本启动前，至少要先沉淀 1 个详纲分段。' })
    }
    const segmentActs = new Set(payload.segments.filter((item) => hasText(item.content)).map((item) => item.act))
    if (segmentActs.size < 2) {
      issues.push({ code: 'script_segment_structure_weak', message: '剧本启动前，详纲至少要有 2 个有效分段，避免下游偷补结构。' })
    }
    if (payload.characters.length === 0) {
      issues.push({ code: 'script_character_missing', message: '剧本启动前，人物小传不能为空。' })
    }
    if (confirmedFormalFacts.length === 0) {
      issues.push({ code: 'script_formal_fact_missing', message: '剧本启动前，必须先有已确认正式事实，不能让下游自己发明主线事实。' })
    }
    const mergedSegments = payload.segments.map((segment) => segment.content).join('\n')
    const missingFormalFactLandings = confirmedFormalFacts.filter(
      (fact) => !matchFormalFactLanding(fact, mergedSegments)
    )
    if (missingFormalFactLandings.length > 0) {
      issues.push({
        code: 'script_formal_fact_segment_missing',
        message: `剧本启动前，详纲还没承接这些正式事实：${missingFormalFactLandings.map((fact) => fact.label).join('、')}。`
      })
    }
    if (missingAnchorNames.length > 0) {
      issues.push({
        code: 'script_anchor_roster_missing',
        message: `剧本启动前，角色名册仍缺这些用户锚点：${missingAnchorNames.join('、')}。`
      })
    }
    if (!heroineCovered) {
      issues.push({
        code: 'script_heroine_anchor_missing',
        message: '剧本启动前，情感锚点还没有在角色或人物目标里被覆盖。'
      })
    }
  }

  return {
    targetStage,
    ready: issues.length === 0,
    issues,
    storyContract,
    userAnchorLedger
  }
}
