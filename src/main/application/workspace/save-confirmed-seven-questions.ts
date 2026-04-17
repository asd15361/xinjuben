/**
 * src/main/application/workspace/save-confirmed-seven-questions.ts
 *
 * 保存确认版七问服务。
 *
 * 职责：
 * - 将用户确认后的七问写入 outlineDraft.outlineBlocks
 * - 这是唯一合法的七问写入口
 *
 * 【七问工作流】
 * storyIntent 已确认
 *   -> generateSevenQuestionsDraft（生成初稿）
 *   -> 前端展示七问（用户修改/确认）
 *   -> saveConfirmedSevenQuestions（写入 outlineBlocks）<- 这里
 *   -> generateOutlineAndCharactersFromConfirmedSevenQuestions（生成粗纲）
 */

import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import type { OutlineDraftDto, SevenQuestionsResultDto } from '../../../shared/contracts/workflow'
import { writeConfirmedSevenQuestionsToOutlineBlocks } from '../../../shared/domain/workflow/seven-questions-authority'

export interface SaveConfirmedSevenQuestionsInput {
  storyIntent: StoryIntentPackageDto
  sevenQuestions: SevenQuestionsResultDto
}

/**
 * 将确认版七问写入 outlineDraft。
 *
 * @param input.storyIntent - 当前真源（用于构建 outlineDraft 基础信息）
 * @param input.sevenQuestions - 用户确认后的七问
 * @returns 包含 outlineDraft 的更新结果
 */
export function buildOutlineDraftWithConfirmedSevenQuestions(
  input: SaveConfirmedSevenQuestionsInput
): { outlineDraft: OutlineDraftDto } {
  const { storyIntent, sevenQuestions } = input

  // 构建基础 outlineDraft（从真源提取）
  const baseOutlineDraft: OutlineDraftDto = {
    title: storyIntent.titleHint || '',
    genre: storyIntent.genre || '',
    theme: storyIntent.themeAnchors?.[0] || '',
    mainConflict: storyIntent.coreConflict || '',
    protagonist: storyIntent.protagonist || '',
    summary: '',
    summaryEpisodes: [],
    facts: []
  }

  // 将七问写入 outlineBlocks
  const outlineDraft = writeConfirmedSevenQuestionsToOutlineBlocks(
    baseOutlineDraft,
    sevenQuestions.sections
  )

  return { outlineDraft }
}
