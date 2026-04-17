import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveScriptRuntimeProfile } from './resolve-runtime-profile.ts'

test('resolveScriptRuntimeProfile uses 5-episode batches for fresh generation', () => {
  const profile = resolveScriptRuntimeProfile({
    storyIntent: null,
    outline: {
      title: '测试项目',
      genre: '都市',
      theme: '信任与代价',
      mainConflict: '主角被逼交出关键钥匙',
      protagonist: '黎明',
      summary: '测试摘要',
      summaryEpisodes: Array.from({ length: 10 }, (_, index) => ({
        episodeNo: index + 1,
        summary: `第${index + 1}集`
      })),
      facts: []
    },
    characters: [
      {
        name: '黎明',
        biography: '',
        publicMask: '',
        hiddenPressure: '',
        fear: '',
        protectTarget: '小柔',
        conflictTrigger: '',
        advantage: '',
        weakness: '',
        goal: '守住钥匙',
        arc: '',
        roleLayer: 'core',
        activeBlockNos: []
      },
      {
        name: '李科',
        biography: '',
        publicMask: '',
        hiddenPressure: '',
        fear: '',
        protectTarget: '',
        conflictTrigger: '',
        advantage: '',
        weakness: '',
        goal: '逼出钥匙',
        arc: '',
        roleLayer: 'core',
        activeBlockNos: []
      }
    ],
    segments: [],
    targetEpisodes: 10,
    runtimeFailureHistory: []
  })

  assert.equal(profile.recommendedBatchSize, 5)
  assert.match(profile.reason, /首批按 5 集推进/)
})

test('resolveScriptRuntimeProfile keeps 5-episode batches even after failures', () => {
  const profile = resolveScriptRuntimeProfile({
    storyIntent: null,
    outline: {
      title: '测试项目',
      genre: '都市',
      theme: '信任与代价',
      mainConflict: '主角被逼交出关键钥匙',
      protagonist: '黎明',
      summary: '测试摘要',
      summaryEpisodes: Array.from({ length: 10 }, (_, index) => ({
        episodeNo: index + 1,
        summary: `第${index + 1}集`
      })),
      facts: []
    },
    characters: [
      {
        name: '黎明',
        biography: '',
        publicMask: '',
        hiddenPressure: '',
        fear: '',
        protectTarget: '小柔',
        conflictTrigger: '',
        advantage: '',
        weakness: '',
        goal: '守住钥匙',
        arc: '',
        roleLayer: 'core',
        activeBlockNos: []
      },
      {
        name: '李科',
        biography: '',
        publicMask: '',
        hiddenPressure: '',
        fear: '',
        protectTarget: '',
        conflictTrigger: '',
        advantage: '',
        weakness: '',
        goal: '逼出钥匙',
        arc: '',
        roleLayer: 'core',
        activeBlockNos: []
      }
    ],
    segments: [],
    targetEpisodes: 10,
    runtimeFailureHistory: ['runtime_interrupted']
  })

  assert.equal(profile.recommendedBatchSize, 5)
  assert.match(profile.reason, /失败历史=1/)
})
