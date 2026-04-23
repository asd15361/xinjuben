/**
 * src/shared/domain/workflow/seven-questions-authority.ts
 *
 * 七问真相源管理。
 *
 * 【核心原则】
 * 1. 唯一权威：outlineDraft.outlineBlocks[].sevenQuestions
 * 2. 顶层 project.sevenQuestions 已移除，不再作为合同字段存在
 * 3. 读：优先从 outlineBlocks 读
 * 4. 写：只写 outlineBlocks
 *
 * 【七问 Agent 工作流】
 * storyIntent 已确认
 *   -> 生成七问初稿（generateSevenQuestionsDraft）
 *   -> 前端展示七问（用户修改/确认）
 *   -> 把确认版七问写回 outlineBlocks（saveConfirmedSevenQuestions）
 *   -> 再生成粗纲/人物/后续详纲（generateOutlineAndCharactersFromConfirmedSevenQuestions）
 */

import type {
  OutlineDraftDto,
  OutlineBlockDto,
  SevenQuestionsDto,
  SevenQuestionsResultDto,
  SevenQuestionsSectionDto
} from '../../contracts/workflow'

/**
 * 从 outlineDraft 提取确认版七问。
 *
 * 如果 outlineBlocks 中存在七问，返回 SevenQuestionsResultDto 格式。
 * 这用于判断项目是否已有用户确认版七问。
 */
export function extractConfirmedSevenQuestions(
  outlineDraft: OutlineDraftDto | null
): SevenQuestionsResultDto | null {
  if (!outlineDraft?.outlineBlocks || outlineDraft.outlineBlocks.length === 0) {
    return null
  }

  const blocksWithSevenQuestions = outlineDraft.outlineBlocks.filter(
    (block) => block.sevenQuestions
  )

  if (blocksWithSevenQuestions.length === 0) {
    return null
  }

  const sections: SevenQuestionsSectionDto[] = blocksWithSevenQuestions.map((block) => ({
    sectionNo: block.blockNo,
    sectionTitle: block.sectionTitle || block.label,
    startEpisode: block.startEpisode,
    endEpisode: block.endEpisode,
    sevenQuestions: block.sevenQuestions!
  }))

  return {
    needsSections: sections.length > 1,
    sectionCount: sections.length,
    sectionCountReason: sections.length > 1 ? '剧本有明显的篇章划分' : '剧本整体一个篇章',
    sections
  }
}

/**
 * 检查项目是否已有确认版七问。
 *
 * 这是粗纲生成的先决条件检查。
 */
export function hasConfirmedSevenQuestions(outlineDraft: OutlineDraftDto | null): boolean {
  return extractConfirmedSevenQuestions(outlineDraft) !== null
}

/**
 * 获取指定篇章的七问。
 */
export function getSectionSevenQuestions(
  outlineDraft: OutlineDraftDto | null,
  sectionNo: number
): SevenQuestionsDto | null {
  if (!outlineDraft?.outlineBlocks) {
    return null
  }

  const block = outlineDraft.outlineBlocks.find((b) => b.blockNo === sectionNo)
  return block?.sevenQuestions ?? null
}

/**
 * 获取所有篇章的七问列表。
 */
export function getAllSectionSevenQuestions(
  outlineDraft: OutlineDraftDto | null
): Array<{ blockNo: number; sectionTitle: string; sevenQuestions: SevenQuestionsDto }> {
  if (!outlineDraft?.outlineBlocks) {
    return []
  }

  return outlineDraft.outlineBlocks
    .filter((b) => b.sevenQuestions)
    .map((b) => ({
      blockNo: b.blockNo,
      sectionTitle: b.sectionTitle || b.label,
      sevenQuestions: b.sevenQuestions!
    }))
}

/**
 * 将确认版七问写入 outlineBlocks。
 *
 * @param outlineDraft 当前 outlineDraft
 * @param sections 确认后的七问篇章列表
 * @returns 更新后的 outlineDraft
 */
export function writeConfirmedSevenQuestionsToOutlineBlocks(
  outlineDraft: OutlineDraftDto,
  sections: SevenQuestionsSectionDto[]
): OutlineDraftDto {
  // 确保 outlineBlocks 存在
  if (!outlineDraft.outlineBlocks) {
    outlineDraft.outlineBlocks = []
  }

  // 按篇章号更新或创建 outlineBlocks
  const updatedBlocks = sections.map((section) => {
    const existingBlock = outlineDraft.outlineBlocks!.find((b) => b.blockNo === section.sectionNo)

    if (existingBlock) {
      // 更新已有 block 的七问
      return {
        ...existingBlock,
        sectionTitle: section.sectionTitle,
        startEpisode: section.startEpisode,
        endEpisode: section.endEpisode,
        sevenQuestions: section.sevenQuestions
      } satisfies OutlineBlockDto
    } else {
      // 创建新 block
      return {
        blockNo: section.sectionNo,
        label: section.sectionTitle,
        sectionTitle: section.sectionTitle,
        startEpisode: section.startEpisode,
        endEpisode: section.endEpisode,
        summary: '',
        episodes: [],
        sevenQuestions: section.sevenQuestions
      } satisfies OutlineBlockDto
    }
  })

  return {
    ...outlineDraft,
    outlineBlocks: updatedBlocks
  }
}
