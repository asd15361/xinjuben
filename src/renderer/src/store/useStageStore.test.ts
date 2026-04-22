import test from 'node:test'
import assert from 'node:assert/strict'

import { useStageStore } from './useStageStore.ts'

function resetStageStore(): void {
  useStageStore.getState().reset()
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function installWorkspaceApiMocks(): void {
  const calls = {
    outline: [] as Array<{ projectId: string }>,
    character: [] as Array<{ projectId: string }>,
    detailedOutline: [] as Array<{ projectId: string }>
  }

  ;(
    globalThis as typeof globalThis & {
      window: {
        api: {
          ai: Record<string, unknown>
          system: Record<string, unknown>
          workflow: Record<string, unknown>
          workspace: {
            listProjects: () => Promise<{ projects: [] }>
            createProject: () => Promise<{ project: null }>
            deleteProject: () => Promise<{ deleted: true }>
            openProjectShell: () => Promise<{ opened: true }>
            getProject: () => Promise<null>
            getStagePayload: () => Promise<null>
            saveStoryIntent: () => Promise<null>
            saveChatMessages: () => Promise<null>
            saveGenerationStatus: () => Promise<null>
            startGenerationStatus: () => Promise<null>
            clearGenerationStatus: () => Promise<{ cleared: true }>
            saveOutlineDraft: (input: { projectId: string }) => Promise<null>
            saveCharacterDrafts: (input: { projectId: string }) => Promise<null>
            saveDetailedOutlineBlocks: (input: { projectId: string }) => Promise<null>
            saveDetailedOutlineSegments: (input: { projectId: string }) => Promise<null>
            saveEntityStore: () => Promise<null>
            saveScriptDraft: () => Promise<null>
            saveScriptRuntimeState: () => Promise<null>
            saveScriptRuntimeFailureHistory: () => Promise<null>
            atomicSaveGenerationState: () => Promise<null>
            createOutlineSeed: () => Promise<null>
            generateOutlineAndCharacters: () => Promise<{
              project: null
              storyIntent: null
              outlineDraft: null
              characterDrafts: []
              activeCharacterBlocks: []
            }>
            generateDetailedOutline: () => Promise<{
              project: null
              detailedOutlineBlocks: []
              detailedOutlineSegments: []
            }>
            generateDetailedOutlineBlocks: () => Promise<{
              project: null
              detailedOutlineBlocks: []
              detailedOutlineSegments: []
            }>
            changeProjectStage: () => Promise<{ project: null }>
          }
        }
      }
    }
  ).window = {
    api: {
      ai: {},
      system: {},
      workflow: {},
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
        saveDetailedOutlineSegments: async (input: { projectId: string }) => {
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
      }
    }
  }

  return calls
}

// NOTE: The dirtyRegistry-based save gating was removed from useStageStore.
// The store now uses simple hydration via hydrateProjectDrafts.
// Save operations are handled by useProjectStagePersistence hook with ref-based change detection.

test('hydrateProjectDrafts sets outline data correctly', async () => {
  resetStageStore()

  useStageStore.getState().hydrateProjectDrafts({
    outline: {
      title: '测试标题',
      genre: '悬疑',
      theme: '真相',
      mainConflict: '冲突',
      protagonist: '主角',
      summary: '摘要',
      summaryEpisodes: [],
      facts: []
    }
  })

  const state = useStageStore.getState()
  assert.equal(state.outline.title, '测试标题')
  assert.equal(state.outline.genre, '悬疑')
  assert.equal(state.outline.theme, '真相')
})

test('hydrateProjectDrafts sets characters and segments correctly', async () => {
  resetStageStore()

  useStageStore.getState().hydrateProjectDrafts({
    characters: [
      {
        name: '角色A',
        biography: '简介',
        publicMask: '公开面具',
        hiddenPressure: '隐藏压力',
        fear: '恐惧',
        protectTarget: '保护目标',
        conflictTrigger: '冲突触发',
        advantage: '优势',
        weakness: '弱点',
        goal: '目标',
        arc: '弧光',
        roleLayer: 'core',
        activeBlockNos: []
      }
    ],
    segments: [
      {
        act: 'opening',
        content: '开场内容',
        hookType: '追杀',
        episodeBeats: []
      }
    ]
  })

  const state = useStageStore.getState()
  assert.equal(state.characters.length, 1)
  assert.equal(state.characters[0].name, '角色A')
  assert.equal(state.segments.length, 1)
  assert.equal(state.segments[0].act, 'opening')
})

test('hydrateProjectDrafts handles AI-style detailed outline segments', async () => {
  resetStageStore()

  useStageStore.getState().hydrateProjectDrafts({
    segments: [
      {
        act: 'opening',
        content: 'AI 生成内容',
        hookType: 'hook',
        episodeBeats: [
          {
            episodeNo: 1,
            summary: '第1集摘要',
            sceneByScene: []
          }
        ]
      }
    ]
  })

  const state = useStageStore.getState()
  assert.equal(state.segments.length, 1)
  assert.equal(state.segments[0].episodeBeats.length, 1)
  assert.equal(state.segments[0].episodeBeats[0].summary, '第1集摘要')
})

test('setOutline updates outline data', async () => {
  resetStageStore()

  useStageStore.getState().hydrateProjectDrafts({
    outline: {
      title: '旧标题',
      genre: '悬疑',
      theme: '真相',
      mainConflict: '冲突',
      protagonist: '主角',
      summary: '旧摘要',
      summaryEpisodes: [],
      facts: []
    }
  })

  useStageStore.getState().setOutline({ title: '新标题' })

  const state = useStageStore.getState()
  assert.equal(state.outline.title, '新标题')
  assert.equal(state.outline.genre, '悬疑') // preserved
})

test('updateCharacter updates character data', async () => {
  resetStageStore()

  useStageStore.getState().hydrateProjectDrafts({
    characters: [
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
        goal: '旧目标',
        arc: '',
        roleLayer: 'core',
        activeBlockNos: []
      }
    ]
  })

  useStageStore.getState().updateCharacter(0, { goal: '新目标' })

  const state = useStageStore.getState()
  assert.equal(state.characters[0].goal, '新目标')
  assert.equal(state.characters[0].name, '角色A') // preserved
})

test('replaceSegments replaces all segments', async () => {
  resetStageStore()

  useStageStore.getState().hydrateProjectDrafts({
    segments: [
      {
        act: 'opening',
        content: '旧内容',
        hookType: '',
        episodeBeats: []
      }
    ]
  })

  useStageStore.getState().replaceSegments([
    {
      act: 'climax',
      content: '新内容',
      hookType: '转折',
      episodeBeats: []
    }
  ])

  const state = useStageStore.getState()
  assert.equal(state.segments.length, 1)
  assert.equal(state.segments[0].act, 'climax')
  assert.equal(state.segments[0].content, '新内容')
})
