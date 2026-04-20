/**
 * stage-derivation.ts — Single Authoritative Entry Point for Stage, Blocked Reason, and Recommended Action
 *
 * PURPOSE:
 * This module provides the SINGLE SOURCE for deriving:
 * - current workflow stage from project snapshot
 * - blocked reason (if any) preventing script generation
 * - recommended action for user to progress
 *
 * PRINCIPLES (from truth-authority.ts):
 * - MAIN is the sole authoritative producer for stage, blockedReason, and recommendedAction
 * - RENDERER is always consumer — never computes these locally
 * - All derivation is pure functions based on project snapshot
 *
 * ARCHITECTURE:
 * - Main process: uses these functions when persisting project state
 * - Renderer process: MUST call via IPC to main, not compute locally
 */

import type { ProjectSnapshotDto } from '../../contracts/project'
import type { WorkflowStage } from '../../contracts/workflow'
import type { InputContractIssueDto } from '../../contracts/input-contract'
import { hasConfirmedSevenQuestions } from './seven-questions-authority'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Blocked reason preventing script generation from proceeding
 */
export interface BlockedReason {
  code: string
  message: string
  /**
   * Which stage user should navigate to in order to resolve this block
   */
  suggestedStage: WorkflowStage
}

/**
 * Recommended action for user to progress their workflow
 */
export interface RecommendedAction {
  /**
   * The stage user should navigate to
   */
  targetStage: WorkflowStage
  /**
   * Brief description of what to do at that stage
   */
  instruction: string
  /**
   * Whether there's a blocked reason preventing automatic progression
   */
  blockedReason?: BlockedReason
}

// =============================================================================
// STAGE DERIVATION (from project-store-core.ts deriveProjectStage)
// =============================================================================

/**
 * Check if project has script content
 */
function hasScriptContent(project: Pick<ProjectSnapshotDto, 'scriptDraft'>): boolean {
  return project.scriptDraft.some(
    (segment) =>
      segment.screenplay?.trim() ||
      segment.action?.trim() ||
      segment.dialogue?.trim() ||
      segment.emotion?.trim()
  )
}

/**
 * Check if project has detailed outline content
 */
function hasDetailedOutlineContent(
  project: Pick<ProjectSnapshotDto, 'detailedOutlineBlocks' | 'detailedOutlineSegments'>
): boolean {
  const hasBlocks = project.detailedOutlineBlocks.some(
    (block) =>
      block.summary?.trim() ||
      block.episodeBeats?.some(
        (beat) => beat.summary?.trim() || (beat.sceneByScene && beat.sceneByScene.length > 0)
      ) ||
      block.sections?.some(
        (section) =>
          section.summary?.trim() ||
          section.episodeBeats?.some(
            (beat) => beat.summary?.trim() || (beat.sceneByScene && beat.sceneByScene.length > 0)
          )
      )
  )

  if (hasBlocks) return true

  return project.detailedOutlineSegments.some(
    (segment) =>
      segment.content?.trim() ||
      segment.episodeBeats?.some(
        (beat) => beat.summary?.trim() || (beat.sceneByScene && beat.sceneByScene.length > 0)
      )
  )
}

/**
 * Check if project has character content
 */
function hasCharacterContent(project: Pick<ProjectSnapshotDto, 'characterDrafts'>): boolean {
  return project.characterDrafts.some(
    (character) => character.name?.trim() || character.biography?.trim() || character.goal?.trim()
  )
}

/**
 * Check if project has outline content
 */
function hasOutlineContent(project: Pick<ProjectSnapshotDto, 'outlineDraft'>): boolean {
  if (!project.outlineDraft) return false
  const outline = project.outlineDraft
  return Boolean(
    outline.summary?.trim() ||
    outline.summaryEpisodes?.some((episode) => episode.summary?.trim()) ||
    outline.outlineBlocks?.length
  )
}

function hasSevenQuestionsOnly(
  project: Pick<ProjectSnapshotDto, 'outlineDraft'>
): boolean {
  if (!project.outlineDraft) return false
  if (!hasConfirmedSevenQuestions(project.outlineDraft)) return false

  const outline = project.outlineDraft
  const hasOutlineSummary = Boolean(
    outline.summary?.trim() || outline.summaryEpisodes?.some((episode) => episode.summary?.trim())
  )

  return !hasOutlineSummary
}

/**
 * Derive the current workflow stage from project snapshot.
 *
 * This is the SINGLE SOURCE of stage derivation logic.
 * Both main (on persist) and renderer (via IPC) must use this function.
 *
 * ORDER MATTERS: Most advanced stage takes priority.
 * Script > Detailed Outline > Character > Outline > Chat
 */
export function deriveStage(project: ProjectSnapshotDto): WorkflowStage {
  // Script stage: has failure resolution, resume possible (from board), or script content
  // Resume is derived from board episodeStatuses - canResume if any failed or non-"前缀已存在" pending episodes
  const canResumeFromBoard =
    project.scriptProgressBoard?.episodeStatuses.some(
      (e) => e.status === 'failed' || (e.status === 'pending' && !e.reason.includes('前缀已存在'))
    ) ?? false

  if (project.scriptFailureResolution || canResumeFromBoard || hasScriptContent(project)) {
    return 'script'
  }

  // Detailed outline stage
  if (hasDetailedOutlineContent(project)) {
    return 'detailed_outline'
  }

  // Character stage
  if (hasCharacterContent(project)) {
    return 'character'
  }

  if (hasSevenQuestionsOnly(project)) {
    return 'seven_questions'
  }

  // Outline stage
  if (hasOutlineContent(project)) {
    return 'outline'
  }

  // Default: chat
  return 'chat'
}

// =============================================================================
// BLOCKED REASON DERIVATION (maps error codes to human-readable messages + suggested stage)
// =============================================================================

/**
 * Map of error codes to blocked reason details.
 * All error codes that can block script generation should be defined here.
 *
 * This is the SINGLE SOURCE for error code interpretation.
 * Renderer must NOT interpret error codes locally — use this mapping.
 */
const BLOCKED_REASON_MAP: Record<string, { message: string; suggestedStage: WorkflowStage }> = {
  // Stage validation errors
  outline_title_missing: {
    message: '粗纲标题还没稳定下来。',
    suggestedStage: 'outline'
  },
  outline_genre_missing: {
    message: '粗纲题材还没定义。',
    suggestedStage: 'outline'
  },
  outline_theme_missing: {
    message: '粗纲主题锚点还没定义。',
    suggestedStage: 'outline'
  },
  outline_conflict_missing: {
    message: '粗纲主线冲突还没定义。',
    suggestedStage: 'outline'
  },
  outline_protagonist_missing: {
    message: '粗纲主角承载体还没定义。',
    suggestedStage: 'outline'
  },
  outline_summary_missing: {
    message: '粗略大纲骨架还没成稿，当前还只是事实和槽位。',
    suggestedStage: 'outline'
  },
  character_upstream_outline_incomplete: {
    message: '这版粗纲骨架还没立稳。先回灵感对话补充题材、主角困境或主线冲突，系统会自动重新整理。',
    suggestedStage: 'chat'
  },
  character_contract_incomplete: {
    message: '人物层还没写实。先把主角、对手和关键人物的小传、目标、优势、短板、弧光补齐。',
    suggestedStage: 'character'
  },
  character_formal_fact_missing: {
    message:
      '灵感对话里还没锁住至少 1 条关键设定。先回灵感对话补一句真正不能改的主线事实，系统会自动整理，不用你手填字段。',
    suggestedStage: 'chat'
  },
  detailed_outline_character_missing: {
    message: '详细大纲启动前，至少要先沉淀 1 个角色。',
    suggestedStage: 'character'
  },
  detailed_outline_character_contract_weak: {
    message: '主角、对手和当前人物的小传、目标、优势、短板、弧光还没写完整，详纲不能继续。',
    suggestedStage: 'character'
  },
  detailed_outline_anchor_roster_missing: {
    message: '详细大纲启动前，角色名册还没覆盖这些用户锚点。',
    suggestedStage: 'character'
  },

  // Script stage errors
  script_formal_fact_missing: {
    message: '先回粗纲把最关键的设定确认下来，再开始写剧本。',
    suggestedStage: 'outline'
  },
  script_formal_fact_segment_missing: {
    message: '当前详细大纲还没把已经确认的设定真正接进去，先回详细大纲补齐再写剧本。',
    suggestedStage: 'detailed_outline'
  },
  script_block_missing: {
    message: '剧本启动前，至少要先有 1 个详纲块。',
    suggestedStage: 'detailed_outline'
  },
  script_segment_missing: {
    message: '当前详细大纲还不够完整，先把这一版详细大纲补齐，再开始写剧本。',
    suggestedStage: 'detailed_outline'
  },
  script_segment_structure_weak: {
    message: '当前详细大纲还不够完整，先把这一版详细大纲补齐，再开始写剧本。',
    suggestedStage: 'detailed_outline'
  },
  script_section_structure_weak: {
    message: '剧本启动前，详纲至少要有 2 个有效段，避免下游偷补结构。',
    suggestedStage: 'detailed_outline'
  },
  script_character_missing: {
    message: '人物这一层还没准备好，先回人物页把关键角色补齐，再开始写剧本。',
    suggestedStage: 'character'
  },
  script_anchor_roster_missing: {
    message: '角色关系和主线推进还没完全对上，先回人物页或详细大纲页补齐再写剧本。',
    suggestedStage: 'detailed_outline'
  },
  script_heroine_anchor_missing: {
    message: '角色关系和主线推进还没完全对上，先回人物页或详细大纲页补齐再写剧本。',
    suggestedStage: 'detailed_outline'
  },
  script_scene_by_scene_missing: {
    message: '当前详细大纲还没完整，先把这一版详细大纲的逐集细纲补齐，再开始写剧本。',
    suggestedStage: 'detailed_outline'
  },
  script_active_character_blocks_missing: {
    message: '剧本启动前，当前块活跃角色包缺失，不能让下游自己猜这一批该跟谁。',
    suggestedStage: 'detailed_outline'
  }
}

/**
 * Default fallback when error code is not recognized
 */
const DEFAULT_BLOCKED_REASON: { message: string; suggestedStage: WorkflowStage } = {
  message: '先把详细大纲、人物和关键设定补齐，再开始写剧本。',
  suggestedStage: 'detailed_outline'
}

/**
 * Derive blocked reason from a single issue code.
 * Returns the blocked reason with human-readable message and suggested stage.
 */
export function deriveBlockedReasonFromIssue(issue: InputContractIssueDto): BlockedReason {
  const mapping = BLOCKED_REASON_MAP[issue.code]
  if (mapping) {
    return {
      code: issue.code,
      message: mapping.message,
      suggestedStage: mapping.suggestedStage
    }
  }
  return {
    code: issue.code,
    message: issue.message || DEFAULT_BLOCKED_REASON.message,
    suggestedStage: DEFAULT_BLOCKED_REASON.suggestedStage
  }
}

/**
 * Derive the primary blocked reason from a list of issues.
 * Returns the most critical (first) issue as the primary blocked reason.
 */
export function deriveBlockedReason(issues: InputContractIssueDto[]): BlockedReason | null {
  if (issues.length === 0) return null
  return deriveBlockedReasonFromIssue(issues[0])
}

// =============================================================================
// RECOMMENDED ACTION DERIVATION
// =============================================================================

/**
 * Derive the recommended action based on project snapshot and optional blocked reason.
 *
 * This combines:
 * - The current stage derived from project content
 * - Any blocked reason that prevents progression
 * - Contextual instruction for what to do next
 */
export function deriveRecommendedAction(
  project: ProjectSnapshotDto,
  blockedReason?: BlockedReason | null
): RecommendedAction {
  const currentStage = deriveStage(project)

  // If there's a blocked reason, use its suggested stage
  if (blockedReason) {
    return {
      targetStage: blockedReason.suggestedStage,
      instruction: blockedReason.message,
      blockedReason
    }
  }

  // Default instruction based on current stage
  const instructionMap: Record<WorkflowStage | 'runtime_console', string> = {
    chat: '继续在灵感对话里把需求说清楚，系统会自动整理成粗纲。',
    seven_questions: '先确认并保存篇章七问，再单独启动粗纲和人物生成。',
    outline: '继续完善粗纲，确保题材、主角困境和主线冲突都已定义。',
    character: '继续完善人物小传，确保关键角色都有完整的人物弧光。',
    detailed_outline: '继续完善详细大纲，确保每个角色块和逐集细纲都已完成。',
    script: '可以在剧本页继续写，或回详细大纲继续完善。',
    runtime_console: '查看运行信息或回到剧本继续。'
  }

  return {
    targetStage: currentStage,
    instruction: instructionMap[currentStage] || '继续当前工作。'
  }
}

// =============================================================================
// COMBINED DERIVATION RESULT
// =============================================================================

/**
 * Combined result of all derivations for a project snapshot.
 * Useful for IPC responses that need all three pieces of information.
 */
export interface StageDerivationResult {
  stage: WorkflowStage
  blockedReason: BlockedReason | null
  recommendedAction: RecommendedAction
}

/**
 * Derive all stage-related information at once.
 * Convenience function for IPC handlers that need all three pieces.
 */
export function deriveStageInfo(
  project: ProjectSnapshotDto,
  issues: InputContractIssueDto[] = []
): StageDerivationResult {
  const blockedReason = deriveBlockedReason(issues)
  const recommendedAction = deriveRecommendedAction(project, blockedReason)

  return {
    stage: deriveStage(project),
    blockedReason,
    recommendedAction
  }
}
