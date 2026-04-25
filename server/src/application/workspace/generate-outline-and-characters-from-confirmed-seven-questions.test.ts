import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import type { StoryIntentPackageDto } from '@shared/contracts/intake'
import type { CharacterDraftDto } from '@shared/contracts/workflow'
import { generateOutlineAndCharactersFromConfirmedSevenQuestions } from './generate-outline-and-characters-from-confirmed-seven-questions.ts'

function buildRuntimeConfig(): RuntimeProviderConfig {
  const provider = {
    apiKey: 'test',
    baseUrl: 'https://example.test',
    model: 'test-model',
    systemInstruction: '',
    timeoutMs: 1000
  }
  return {
    deepseek: provider,
    openrouterGeminiFlashLite: provider,
    openrouterQwenFree: provider,
    lanes: {
      deepseek: true,
      openrouterGeminiFlashLite: false,
      openrouterQwenFree: false
    },
    runtimeFetchTimeoutMs: 1000
  }
}

function buildStoryIntent(): StoryIntentPackageDto {
  return {
    titleHint: '魔尊血脉',
    genre: '男频修仙',
    protagonist: '林烬',
    antagonist: '仙盟大小姐',
    coreConflict: '废柴少年被仙盟大小姐利用，查清父母旧仇并掌控魔尊血脉',
    generationBriefText: '【项目】魔尊血脉｜20集\n林烬的母亲吊坠被踩碎后觉醒魔尊血脉。',
    officialKeyCharacters: [],
    lockedCharacterNames: [],
    themeAnchors: [],
    worldAnchors: [],
    relationAnchors: [],
    dramaticMovement: []
  }
}

function buildCharacter(name: string): CharacterDraftDto {
  return {
    name,
    biography: `${name}在当前主线里有明确压力。`,
    publicMask: '表面装弱并避开仙盟试探。',
    hiddenPressure: '怕血脉真相提前暴露。',
    fear: '失去母亲遗物碎片。',
    protectTarget: '吊坠碎片和女主留下的线索。',
    conflictTrigger: '被逼交出吊坠碎片时会反击。',
    advantage: '能借魔尊血脉短暂破局。',
    weakness: '血脉失控会伤到身边人。',
    goal: '查清父母被害真相。',
    arc: '从被动挨压转为主动设局。',
    roleLayer: 'core'
  }
}

test('outline and characters can be generated directly from story intent without confirmed seven questions', async () => {
  const diagnostics: string[] = []
  let receivedSevenQuestions: unknown = 'not-called'

  const result = await generateOutlineAndCharactersFromConfirmedSevenQuestions(
    {
      projectId: 'project_direct',
      storyIntent: buildStoryIntent(),
      outlineDraft: null,
      runtimeConfig: buildRuntimeConfig()
    },
    {
      appendDiagnosticLog: async (message) => {
        diagnostics.push(message)
      },
      generateCharacterProfiles: async () => ({
        characters: [buildCharacter('林烬'), buildCharacter('仙盟大小姐')]
      }),
      generateOutlineBundle: async (input) => {
        receivedSevenQuestions = input.sevenQuestions
        return {
          outline: {
            title: '魔尊血脉',
            genre: '男频修仙',
            theme: '普通人也能在压迫中发光',
            protagonist: '林烬',
            mainConflict: '仙盟大小姐夺取魔尊血脉',
            summary: '林烬在宗门羞辱中觉醒血脉，收起吊坠碎片追查父母旧仇。女主暗中守护，他却被大小姐伪善利用。最终他识破仙盟阴谋，掌控血脉并守住世界。',
            episodes: Array.from({ length: 20 }, (_, index) => ({
              episodeNo: index + 1,
              summary: `第${index + 1}集推进林烬查清吊坠碎片和仙盟阴谋。`
            })),
            facts: []
          }
        }
      }
    }
  )

  assert.equal(receivedSevenQuestions, undefined)
  assert.equal(result.sevenQuestions, null)
  assert.equal(result.outlineDraft.summaryEpisodes.length, 20)
  assert.equal(result.outlineDraft.outlineBlocks?.length, 4)
  assert.ok(result.outlineDraft.outlineBlocks?.every((block) => !block.sevenQuestions))
  assert.equal(result.characterDrafts.length, 2)
  assert.ok(diagnostics.some((message) => message.includes('rough_outline_start direct_story_intent')))
})

test('keeps generated characters but does not fabricate a temporary outline when rough outline fails', async () => {
  const diagnostics: string[] = []

  const result = await generateOutlineAndCharactersFromConfirmedSevenQuestions(
    {
      projectId: 'project_partial_outline',
      storyIntent: buildStoryIntent(),
      outlineDraft: null,
      runtimeConfig: buildRuntimeConfig()
    },
    {
      appendDiagnosticLog: async (message) => {
        diagnostics.push(message)
      },
      generateCharacterProfiles: async () => ({
        characters: [buildCharacter('林烬'), buildCharacter('仙盟大小姐')]
      }),
      generateOutlineBundle: async () => {
        throw new Error('rough_outline_batch_retry_exhausted:rough_outline_batch_parse_failed')
      }
    }
  )

  assert.equal(result.characterDrafts.length, 2)
  assert.equal(
    result.outlineGenerationError,
    'rough_outline_batch_retry_exhausted:rough_outline_batch_parse_failed'
  )
  assert.equal(result.outlineDraft.title, '魔尊血脉')
  assert.equal(result.outlineDraft.summary, '')
  assert.equal(result.outlineDraft.summaryEpisodes.length, 0)
  assert.equal(result.outlineDraft.outlineBlocks?.length, 0)
  assert.ok(
    diagnostics.some((message) =>
      message.includes('rough_outline_failed_without_temporary_skeleton')
    )
  )
})

test('adds a mandatory protagonist card when generated faction profiles omit the outline lead', async () => {
  const diagnostics: string[] = []

  const result = await generateOutlineAndCharactersFromConfirmedSevenQuestions(
    {
      projectId: 'project_missing_lead',
      storyIntent: {
        ...buildStoryIntent(),
        protagonist: '主角',
        antagonist: '名门正派大小姐',
        generationBriefText:
          '【项目】魔尊血脉｜20集\n男主的母亲吊坠被踩碎后觉醒魔尊血脉，名门正派大小姐伪装善意夺血脉。'
      },
      outlineDraft: null,
      runtimeConfig: buildRuntimeConfig()
    },
    {
      appendDiagnosticLog: async (message) => {
        diagnostics.push(message)
      },
      generateCharacterProfiles: async () => ({
        characters: [buildCharacter('陆渊'), buildCharacter('林若雪')]
      }),
      generateOutlineBundle: async () => ({
        outline: {
          title: '魔尊血脉',
          genre: '男频修仙',
          theme: '废柴逆袭',
          protagonist: '林夜',
          mainConflict: '林夜被名门正派大小姐利用，查清父母旧仇并掌控魔尊血脉',
          summary: '林夜从废柴受辱到吊坠破碎觉醒，再识破名门正派大小姐夺血脉的阴谋。',
          episodes: Array.from({ length: 20 }, (_, index) => ({
            episodeNo: index + 1,
            summary: `第${index + 1}集推进林夜围绕吊坠碎片查清真相。`
          })),
          facts: []
        }
      })
    }
  )

  assert.equal(result.characterDrafts[0]?.name, '林夜')
  assert.match(result.characterDrafts[0]?.biography || '', /母亲吊坠/)
  assert.ok(
    diagnostics.some((message) => message.includes('character_bundle_added_missing_protagonist'))
  )
})
