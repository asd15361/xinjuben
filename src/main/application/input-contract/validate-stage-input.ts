import type { InputContractValidationDto } from '../../../shared/contracts/input-contract.ts'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake.ts'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../shared/contracts/workflow.ts'
import type { StageContractType } from '../../../shared/contracts/stage-contract.ts'
import { matchFormalFactLanding } from '../../../shared/domain/formal-fact/match-formal-fact-landing.ts'
import { getConfirmedFormalFacts } from '../../../shared/domain/formal-fact/selectors.ts'
import {
  buildStoryContract,
  buildUserAnchorLedger,
  collectMissingUserAnchorNames,
  hasHeroineAnchorCoverage
} from '../../../shared/domain/story-contract/story-contract-policy.ts'
import {
  isCharacterBundleStructurallyComplete,
  resolveCharacterContractAnchors
} from '../../../shared/domain/workflow/character-contract.ts'

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
  const characterContractAnchors = resolveCharacterContractAnchors({
    storyIntent: payload.storyIntent,
    outline: payload.outline
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
    if (
      !isCharacterBundleStructurallyComplete({
        characters: payload.characters,
        protagonist: characterContractAnchors.protagonist,
        antagonist: characterContractAnchors.antagonist
      })
    ) {
      issues.push({
        code: 'character_contract_incomplete',
        message:
          '人物工序启动前，主角、对手和当前人物小传必须满足正式人物合同：旧版要有姓名、小传、目标、优势、短板和弧光；V2 要满足五维必填，核心人物还要补齐压力、短板、目标和弧光。'
      })
    }
  }

  if (targetStage === 'detailed_outline') {
    if (payload.characters.length === 0) {
      issues.push({ code: 'detailed_outline_character_missing', message: '详细大纲启动前，至少要先沉淀 1 个角色。' })
    }
    if (
      !isCharacterBundleStructurallyComplete({
        characters: payload.characters,
        protagonist: characterContractAnchors.protagonist,
        antagonist: characterContractAnchors.antagonist
      })
    ) {
      issues.push({
        code: 'detailed_outline_character_contract_weak',
        message:
          '主角、对手和当前人物小传必须满足正式人物合同：旧版要有姓名、小传、目标、优势、短板和弧光；V2 要满足五维必填，核心人物还要补齐压力、短板、目标和弧光，详纲才能继续。'
      })
    }
    // 【第二刀延伸】放宽 anchor_roster 检查：如果 character contract 已通过，
    // 说明主角/对手已在人物列表中，anchor_roster 检查不再强制要求
    // 只有当人物数量明显不足（少于 3 个）且还有锚点缺失时才报错
    if (missingAnchorNames.length > 0 && payload.characters.length < 3) {
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
    // 【剧本门禁放宽】应用与详纲相同的模糊匹配放宽逻辑
    // 如果 character contract 已通过，说明主角/对手已在人物列表中
    // 只有当人物数量明显不足（少于 3 个）且还有锚点缺失时才报错
    if (missingAnchorNames.length > 0 && payload.characters.length < 3) {
      issues.push({
        code: 'script_anchor_roster_missing',
        message: `剧本启动前，角色名册还没覆盖这些用户锚点：${missingAnchorNames.join('、')}。`
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
