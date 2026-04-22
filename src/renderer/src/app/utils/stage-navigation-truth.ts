/**
 * stage-navigation-truth.ts — Renderer-side utilities for stage navigation
 *
 * PURPOSE:
 * This module provides renderer-side utilities for stage navigation evaluation.
 * It acts as an HTTP bridge — all actual stage derivation happens in server.
 *
 * PRINCIPLES (from truth-authority.ts):
 * - Renderer is always Consumer, never Producer for core truths
 * - Stage derivation is done in server via HTTP, not locally
 * - This module only transforms data for HTTP calls
 */

import type { ProjectSnapshotDto } from '../../../../shared/contracts/project.ts'
import type { ScriptRuntimeFailureHistoryCode } from '../../../../shared/contracts/script-generation.ts'
import type { WorkflowStage } from '../../../../shared/contracts/workflow.ts'
import { resolveProjectEpisodeCount } from '../../../../shared/domain/workflow/episode-count.ts'
import { countCoveredScriptEpisodes } from '../../../../shared/domain/workflow/script-episode-coverage.ts'
import { getScriptGenerationPlan } from '../services/script-plan-service.ts'
import { apiValidateStageContract } from '../../services/api-client.ts'

export interface StageNavigationPayload {
  projectId: string
  storyIntent: ProjectSnapshotDto['storyIntent']
  outline: ProjectSnapshotDto['outlineDraft']
  characters: ProjectSnapshotDto['characterDrafts']
  segments: ProjectSnapshotDto['detailedOutlineSegments']
  script: ProjectSnapshotDto['scriptDraft']
  runtimeFailureHistory?: ScriptRuntimeFailureHistoryCode[]
}

export interface StageNavigationResult {
  ready: boolean
  message: string
  issues: string[]
}

export function summarizeIssues(issues: string[], fallback: string): string {
  if (issues.length === 0) return fallback
  if (issues.length === 1) return issues[0]
  return `${issues.slice(0, 2).join('；')}（共 ${issues.length} 条）`
}

function getEmptyOutline(): NonNullable<ProjectSnapshotDto['outlineDraft']> {
  return {
    title: '',
    genre: '',
    theme: '',
    mainConflict: '',
    protagonist: '',
    summary: '',
    summaryEpisodes: [],
    facts: []
  }
}

/**
 * Evaluate whether the user can access a given stage.
 *
 * This function delegates to main process via IPC for gate decisions.
 * The renderer does NOT compute stage readiness locally.
 */
export async function evaluateStageAccess(
  targetStage: WorkflowStage,
  payload: StageNavigationPayload
): Promise<StageNavigationResult> {
  if (targetStage === 'chat') {
    return { ready: true, message: '', issues: [] }
  }

  if (targetStage === 'seven_questions') {
    if (payload.storyIntent) {
      return { ready: true, message: '', issues: [] }
    }
    return {
      ready: false,
      message: '先在灵感对话里确认创作信息，再进入七问篇章。',
      issues: ['还没有确认创作信息']
    }
  }

  if (targetStage === 'script') {
    const targetEpisodes = resolveProjectEpisodeCount({
      outline: payload.outline,
      storyIntent: payload.storyIntent
    })
    const coveredEpisodeCount = countCoveredScriptEpisodes(payload.script, targetEpisodes)
    const plan = await getScriptGenerationPlan({
      planInput: {
        mode: coveredEpisodeCount > 0 ? 'resume' : 'fresh_start',
        targetEpisodes
      },
      storyIntent: payload.storyIntent,
      outline: payload.outline || getEmptyOutline(),
      characters: payload.characters,
      segments: payload.segments,
      script: payload.script,
      failureHistory: payload.runtimeFailureHistory || []
    })

    if (!plan) {
      return { ready: false, message: '剧本生成计划无法构建，请检查上游内容完整性。', issues: [] }
    }

    if (!plan.ready) {
      const issues = plan.blockedBy.map((item) => item.message)
      return {
        ready: false,
        message: issues.length > 0 ? issues[0] : '剧本入口还未放行，请先完善上游内容。',
        issues
      }
    }

    return {
      ready: true,
      message: '',
      issues: []
    }
  }

  const validation = await apiValidateStageContract({
    projectId: payload.projectId,
    targetStage
  })

  const issues = validation.issues.map((item) => item.message).filter(Boolean)
  return {
    ready: validation.ready,
    message: summarizeIssues(issues, `${targetStage} 入口还没放行。`),
    issues
  }
}

/**
 * Build a stage navigation payload from a project snapshot.
 *
 * This is a data transformation utility — it does NOT derive stage.
 * Stage is derived in main process and stored in projectSnapshot.stage.
 */
export function buildStagePayloadFromProject(project: ProjectSnapshotDto): StageNavigationPayload {
  return {
    projectId: project.id,
    storyIntent: project.storyIntent,
    outline: project.outlineDraft,
    characters: project.characterDrafts,
    segments: project.detailedOutlineSegments,
    script: project.scriptDraft,
    runtimeFailureHistory: project.scriptRuntimeFailureHistory as ScriptRuntimeFailureHistoryCode[]
  }
}
