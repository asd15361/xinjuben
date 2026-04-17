import test from 'node:test'
import assert from 'node:assert/strict'

import type { ProjectSnapshotDto } from '../../../../../shared/contracts/project.ts'
import { requireConfirmedSevenQuestionsPersisted } from './confirmed-seven-questions-persistence.ts'

function createProjectSnapshot(
  outlineDraft: ProjectSnapshotDto['outlineDraft']
): Pick<ProjectSnapshotDto, 'outlineDraft'> {
  return { outlineDraft }
}

test('requireConfirmedSevenQuestionsPersisted throws when confirmed seven questions were not persisted', () => {
  assert.throws(
    () =>
      requireConfirmedSevenQuestionsPersisted(
        createProjectSnapshot({
          title: '修仙传',
          genre: '玄幻',
          theme: '藏锋',
          mainConflict: '李科步步紧逼',
          protagonist: '黎明',
          summary: '',
          summaryEpisodes: [],
          facts: []
        })
      ),
    /seven_questions_confirm_save_failed/
  )
})

test('requireConfirmedSevenQuestionsPersisted returns outline when confirmed seven questions exist', () => {
  const outlineDraft = requireConfirmedSevenQuestionsPersisted(
    createProjectSnapshot({
      title: '修仙传',
      genre: '玄幻',
      theme: '藏锋',
      mainConflict: '李科步步紧逼',
      protagonist: '黎明',
      summary: '',
      summaryEpisodes: [],
      facts: [],
      outlineBlocks: [
        {
          blockNo: 1,
          label: '第一篇章',
          sectionTitle: '第一篇章',
          startEpisode: 1,
          endEpisode: 10,
          summary: '',
          episodes: [],
          sevenQuestions: {
            goal: '守住钥匙',
            obstacle: '李科施压',
            effort: '黎明继续藏锋',
            result: '局势更险',
            twist: '蛇子异动',
            turnaround: '被迫反咬',
            ending: '形成第一轮对撞'
          }
        }
      ]
    })
  )

  assert.equal(outlineDraft.outlineBlocks?.[0]?.sevenQuestions?.ending, '形成第一轮对撞')
})
