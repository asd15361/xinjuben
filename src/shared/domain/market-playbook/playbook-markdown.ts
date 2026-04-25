/**
 * src/shared/domain/market-playbook/playbook-markdown.ts
 *
 * 导出 Markdown 时的市场打法包小节。只导出元信息，不导出完整 patterns。
 */

import type { ProjectSnapshotDto } from '../../contracts/project.ts'

export function buildPlaybookSectionMarkdown(project: ProjectSnapshotDto): string {
  const selection = project.marketPlaybookSelection

  if (!selection || !selection.selectedPlaybookId) {
    return [
      '## 市场打法包',
      '',
      '当前未锁定市场打法包',
      ''
    ].join('\n')
  }

  const modeLabel =
    selection.selectionMode === 'locked'
      ? '已锁定'
      : selection.selectionMode === 'manual'
        ? '手动指定'
        : '自动选择'

  return [
    '## 市场打法包',
    '',
    `- 当前打法包：${selection.selectedPlaybookId}`,
    `- 版本：${selection.selectedVersion ?? '未记录'}`,
    `- 来源月份：${selection.selectedSourceMonth ?? '未记录'}`,
    `- 选择模式：${modeLabel}`,
    `- 锁定时间：${selection.lockedAt ?? '未记录'}`,
    ''
  ].join('\n')
}
