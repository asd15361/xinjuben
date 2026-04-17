import test from 'node:test'
import assert from 'node:assert/strict'

import { dirtyRegistry, resetDirtyRegistry } from '../app/save-dirty-state/dirty-registry.ts'
import { useStageStore } from './useStageStore.ts'

function resetStageStore(): void {
  useStageStore.getState().reset()
  resetDirtyRegistry()
}

function installWorkspaceApiMocks() {
  const calls = {
    outline: [] as Array<{ projectId: string }>,
    character: [] as Array<{ projectId: string }>,
    detailedOutline: [] as Array<{ projectId: string }>
  }

  ;(globalThis as any).window = {
    api: {
      ai: {} as any,
      system: {} as any,
      workflow: {} as any,
      workspace: {
        listProjects: async () => ({ projects: [] }),
        createProject: async () => ({ project: null }),
        deleteProject: async () => ({ deleted: true }),
        openProjectShell: async () => ({ opened: true }),
        getProject: async () => null,
        getStagePayload: async () => null,
        saveStoryIntent: async () => null,
        saveChatMessages: async () => null,
        saveGenerationStatus: async () => null,
        startGenerationStatus: async () => null,
        clearGenerationStatus: async () => ({ cleared: true }),
        saveOutlineDraft: async (input: { projectId: string }) => {
          calls.outline.push({ projectId: input.projectId })
          return null
        },
        saveCharacterDrafts: async (input: { projectId: string }) => {
          calls.character.push({ projectId: input.projectId })
          return null
        },
        saveDetailedOutlineBlocks: async (input: { projectId: string }) => {
          calls.detailedOutline.push({ projectId: input.projectId })
          return null
        },
        saveEntityStore: async () => null,
        saveScriptDraft: async () => null,
        saveScriptRuntimeState: async () => null,
        saveScriptRuntimeFailureHistory: async () => null,
        atomicSaveGenerationState: async () => null,
        createOutlineSeed: async () => null,
        generateOutlineAndCharacters: async () => ({
          project: null,
          storyIntent: null,
          outlineDraft: null,
          characterDrafts: [],
          activeCharacterBlocks: []
        }),
        generateDetailedOutline: async () => ({
          project: null,
          detailedOutlineBlocks: [],
          detailedOutlineSegments: []
        }),
        generateDetailedOutlineBlocks: async () => ({
          project: null,
          detailedOutlineBlocks: [],
          detailedOutlineSegments: []
        }),
        changeProjectStage: async () => ({ project: null })
      } as any
    } as any
  }

  return calls
}

test('hydrate keeps outline clean and saveOutlineDraft skips writes until user edits', async () => {
  resetStageStore()
  const calls = installWorkspaceApiMocks()

  useStageStore.getState().hydrateOutlineStage({
    title: '旧标题',
    genre: '悬疑',
    theme: '真相',
    mainConflict: '冲突',
    protagonist: '主角',
    summary: '旧摘要',
    summaryEpisodes: [],
    facts: []
  })

  const hydratedVersion = dirtyRegistry.getHydratedVersion('outline')
  assert.ok(hydratedVersion)
  assert.equal(dirtyRegistry.isDirty('outline'), false)

  await useStageStore.getState().saveOutlineDraft('project-outline')
  assert.equal(calls.outline.length, 0)

  useStageStore.getState().setOutline({ title: '新标题' })
  assert.equal(dirtyRegistry.isDirty('outline'), true)
  assert.equal(dirtyRegistry.getHydratedVersion('outline'), hydratedVersion)

  await useStageStore.getState().saveOutlineDraft('project-outline')
  assert.equal(calls.outline.length, 1)
  assert.equal(dirtyRegistry.isDirty('outline'), false)
})

test('hydrate and derived character block sync stay clean, force save bypasses dirty gate', async () => {
  resetStageStore()
  const calls = installWorkspaceApiMocks()

  useStageStore.getState().hydrateCharacterStage(
    [
      {
        name: '角色A',
        biography: '',
        publicMask: '',
        hiddenPressure: '',
        fear: '',
        protectTarget: '',
        conflictTrigger: '',
        advantage: '',
        weakness: '',
        goal: '',
        arc: '',
        roleLayer: 'core',
        activeBlockNos: []
      }
    ],
    []
  )

  useStageStore.getState().replaceActiveCharacterBlocks([
    {
      blockNo: 1,
      startEpisode: 1,
      endEpisode: 10,
      summary: '派生块',
      characterNames: ['角色A'],
      characters: []
    }
  ])

  assert.equal(dirtyRegistry.isDirty('character'), false)

  useStageStore.getState().updateCharacter(0, { goal: '新目标' })
  assert.equal(dirtyRegistry.isDirty('character'), true)

  await useStageStore.getState().saveCharacterDrafts('project-character')
  assert.equal(calls.character.length, 1)
  assert.equal(dirtyRegistry.isDirty('character'), false)

  await useStageStore.getState().saveCharacterDrafts('project-character', { force: true })
  assert.equal(calls.character.length, 2)
})

test('AI-style detailed outline replacement hydrates clean and explicit force save writes immediately', async () => {
  resetStageStore()
  const calls = installWorkspaceApiMocks()

  useStageStore.getState().replaceDetailedOutlineBlocks([
    {
      blockNo: 1,
      startEpisode: 1,
      endEpisode: 2,
      summary: 'AI 生成块',
      episodeBeats: [],
      sections: [
        {
          sectionNo: 1,
          act: 'A1',
          startEpisode: 1,
          endEpisode: 2,
          title: '第一段',
          summary: 'AI 生成摘要',
          hookType: 'hook',
          episodeBeats: []
        }
      ]
    }
  ])

  assert.equal(dirtyRegistry.isDirty('detailed_outline'), false)
  const versionAfterReplace = dirtyRegistry.getHydratedVersion('detailed_outline')
  assert.ok(versionAfterReplace)

  await useStageStore.getState().saveDetailedOutlineBlocks('project-detail')
  assert.equal(calls.detailedOutline.length, 0)

  useStageStore.getState().setDetailedOutlineSectionSummary(1, 1, '用户改过')
  assert.equal(dirtyRegistry.isDirty('detailed_outline'), true)

  await useStageStore.getState().saveDetailedOutlineBlocks('project-detail')
  assert.equal(calls.detailedOutline.length, 1)
  assert.equal(dirtyRegistry.isDirty('detailed_outline'), false)

  await useStageStore.getState().saveDetailedOutlineBlocks('project-detail', { force: true })
  assert.equal(calls.detailedOutline.length, 2)
  assert.equal(dirtyRegistry.getHydratedVersion('detailed_outline'), versionAfterReplace)
})
