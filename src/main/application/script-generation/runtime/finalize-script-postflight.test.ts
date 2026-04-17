import test from 'node:test'
import assert from 'node:assert/strict'

import { finalizeScriptPostflight } from './finalize-script-postflight.ts'
import type {
  CharacterDraftDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../../shared/contracts/workflow.ts'
import type { StartScriptGenerationInputDto } from '../../../../shared/contracts/script-generation.ts'

function buildOutline(): OutlineDraftDto {
  return {
    title: '修仙传',
    genre: '玄幻',
    theme: '隐忍反咬',
    mainConflict: '黎明被逼亮底',
    protagonist: '黎明',
    summary: '第1集：黎明被逼亮底。',
    summaryEpisodes: [{ episodeNo: 1, summary: '黎明被逼亮底。' }],
    facts: []
  }
}

function buildCharacters(): CharacterDraftDto[] {
  return [
    {
      name: '黎明',
      biography: '守钥人',
      publicMask: '装弱',
      hiddenPressure: '被逼亮底',
      fear: '小柔出事',
      protectTarget: '小柔',
      conflictTrigger: '有人拿小柔逼他',
      advantage: '会藏锋',
      weakness: '旧伤',
      goal: '护住钥匙',
      arc: '从隐忍到反咬'
    }
  ]
}

function buildGenerationInput(): StartScriptGenerationInputDto {
  return {
    plan: {
      mode: 'fresh_start',
      ready: true,
      blockedBy: [],
      contract: {
        ready: true,
        targetEpisodes: 1,
        structuralActs: ['opening'],
        missingActs: [],
        confirmedFormalFacts: [],
        missingFormalFactLandings: [],
        storyContract: {
          characterSlots: {
            protagonist: '黎明',
            antagonist: '李科',
            heroine: '',
            mentor: ''
          },
          eventSlots: {
            finalePayoff: '',
            antagonistPressure: '',
            antagonistLoveConflict: '',
            relationshipShift: '',
            healingTechnique: '',
            themeRealization: ''
          },
          requirements: {
            requireFinalePayoff: false,
            requireHiddenCapabilityForeshadow: false,
            requireAntagonistContinuity: false,
            requireAntagonistLoveConflict: false,
            requireRelationshipShift: false,
            requireHealingTechnique: false,
            requireThemeRealization: false
          },
          hardFacts: [],
          softFacts: []
        },
        userAnchorLedger: {
          anchorNames: ['黎明', '李科'],
          protectedFacts: [],
          heroineRequired: false,
          heroineHint: ''
        },
        missingAnchorNames: [],
        heroineAnchorCovered: true
      },
      targetEpisodes: 1,
      existingSceneCount: 0,
      recommendedPrimaryLane: 'deepseek',
      recommendedFallbackLane: 'deepseek',
      runtimeProfile: {
        contextPressureScore: 0,
        shouldCompactContextFirst: false,
        maxStoryIntentChars: 1000,
        maxCharacterChars: 1000,
        maxSegmentChars: 1000,
        recommendedBatchSize: 5,
        profileLabel: 'test',
        reason: 'test'
      },
      episodePlans: []
    },
    outlineTitle: '修仙传',
    theme: '隐忍反咬',
    mainConflict: '黎明被逼亮底',
    charactersSummary: ['黎明:护住钥匙'],
    storyIntent: null,
    outline: buildOutline(),
    characters: buildCharacters(),
    existingScript: []
  }
}

function buildScene(screenplay: string): ScriptSegmentDto {
  return {
    sceneNo: 1,
    screenplay,
    screenplayScenes: [
      {
        sceneNo: 1,
        sceneHeading: '1-1 日 外门石阶',
        characterRoster: ['黎明', '李科'],
        body: '△ 李科堵住去路。\n李科：把钥匙交出来。\n黎明：你先放人。'
      },
      {
        sceneNo: 2,
        sceneHeading: '1-2 夜 旧居书房',
        characterRoster: ['黎明'],
        body: '△ 黎明撬开暗格。\n黎明：账册果然还在。\n△ 账册被他抽走，窗外火把已经照进门缝。'
      }
    ],
    action: '',
    dialogue: '',
    emotion: ''
  }
}

test('finalizeScriptPostflight returns shared screenplay quality verdict instead of null pass', () => {
  const result = finalizeScriptPostflight({
    generationInput: buildGenerationInput(),
    outline: buildOutline(),
    characters: buildCharacters(),
    existingScript: [],
    generatedScenes: [
      buildScene(
        [
          '第1集',
          '',
          '1-1 日 外门石阶',
          '人物：黎明、李科',
          '△ 李科带着两名手下堵住去路，把黎明逼到石阶尽头，袖口里露出半截沾血的布条。',
          '李科：把钥匙交出来。',
          '黎明：你先放人，我才会告诉你东西在哪。',
          '李科：你还敢跟我讲条件？小柔就在后院，她再挨一鞭子，今晚就站不起来。',
          '△ 黎明盯着那截布条，意识到小柔已经受伤，却还是压着火气没有立刻动手。',
          '黎明：七天之内，我把钥匙带到你面前。但你要是再碰她，我就让整条街都知道你拿残党旧账逼人。',
          '△ 李科冷笑着转身离开，故意把一张沾泥的残纸踩进砖缝，手下举着火把把院门照得通亮。',
          '',
          '1-2 夜 旧居书房',
          '人物：黎明',
          '△ 黎明撬开暗格，抽出账册，又从夹层里摸出一枚带血的旧钥匙拓印，案上灰尘被他袖口带出一道长痕。',
          '黎明：账册果然还在，李诚阳没把最要命的那页烧掉。',
          '△ 他飞快翻到写着潭边封印记录的那页，看见李科名字旁边多了一枚陌生印记，心里立刻明白残党已经提前进过旧居。',
          '黎明：如果他们先找到这页，小柔就不只是人质了。',
          '△ 账册被他抽走塞进怀里，窗外火把已经照进门缝，门闩也被人从外面猛地抵住。'
        ].join('\n')
      )
    ]
  })

  assert.equal(typeof result.postflight.pass, 'boolean')
  assert.equal(result.postflight.pass, true)
  assert.equal(result.postflight.quality?.pass, false)
  assert.equal(result.postflight.quality?.episodeCount, 1)
  assert.equal(
    result.postflight.issues.some((issue) => issue.code === 'screenplay_quality_failed'),
    false
  )
})
