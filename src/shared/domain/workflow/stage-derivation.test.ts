import test from 'node:test'
import assert from 'node:assert/strict'

import { deriveBlockedReasonFromIssue, deriveStage } from './stage-derivation.ts'
import type { ProjectSnapshotDto } from '../../contracts/project.ts'

test('detailed outline anchor roster blocked reason points back to character stage', () => {
  const anchorRosterBlocked = deriveBlockedReasonFromIssue({
    code: 'detailed_outline_anchor_roster_missing',
    message: '详细大纲启动前，角色名册还没覆盖这些用户锚点。'
  })

  assert.equal(anchorRosterBlocked.suggestedStage, 'character')
})

test('confirmed seven questions are folded into outline stage instead of becoming a main stage', () => {
  const project = {
    scriptDraft: [],
    detailedOutlineBlocks: [],
    detailedOutlineSegments: [],
    characterDrafts: [],
    outlineDraft: {
      title: '',
      genre: '',
      theme: '',
      mainConflict: '',
      protagonist: '',
      summary: '',
      summaryEpisodes: [],
      facts: [],
      outlineBlocks: [
        {
          blockNo: 1,
          label: '全剧',
          startEpisode: 1,
          endEpisode: 20,
          summary: '',
          episodes: [],
          sevenQuestions: {
            goal: '查清身世',
            obstacle: '仙盟设局',
            effort: '收集吊坠碎片',
            result: '觉醒血脉',
            twist: '大小姐暴露',
            turnaround: '男主主动反击',
            ending: '守护世界'
          }
        }
      ]
    },
    scriptProgressBoard: null,
    scriptFailureResolution: null
  } as unknown as ProjectSnapshotDto

  assert.equal(deriveStage(project), 'outline')
})
