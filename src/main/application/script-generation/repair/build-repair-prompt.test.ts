import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRepairPrompt } from './build-repair-prompt.ts'
import type { ExecuteScriptRepairInputDto } from '../../../../shared/contracts/script-audit'
import type { ScriptSegmentDto, OutlineDraftDto } from '../../../../shared/contracts/workflow'
import type { ScriptStateLedgerDto } from '../../../../shared/contracts/script-ledger'

function createOutline(): OutlineDraftDto {
  return {
    title: '修仙传',
    genre: '古风奇幻',
    theme: '藏锋守人',
    mainConflict: '黎明守护钥匙与小柔，对抗李科逼压',
    protagonist: '黎明',
    summary: '黎明因钥匙秘密卷入李科逼压与妖祟危机。',
    summaryEpisodes: [
      {
        episodeNo: 1,
        summary: '黎明救下小柔，李科起疑。'
      }
    ],
    outlineBlocks: [],
    facts: []
  }
}

function createLedger(): ScriptStateLedgerDto {
  return {
    semanticHash: 'hash-1',
    sceneCount: 1,
    latestHook: '李科派人盯上黎明',
    recentSceneNos: [1],
    unresolvedSignals: [],
    openHooks: [
      {
        id: 'hook-1',
        hookText: '李科派人盯上黎明',
        sourceSceneNo: 1,
        urgency: 'high',
        expectedPayoffType: 'conflict',
        relatedCharacters: ['黎明', '李科'],
        anchorRefs: []
      }
    ],
    storyMomentum: {
      previousCliffhanger: '李科记住了黎明',
      nextRequiredBridge: '李科试探黎明底细',
      activeConflictLine: '李科逼压黎明与小柔',
      pendingCost: '小柔父女随时会被报复',
      memoryEchoes: [],
      hardAnchors: []
    },
    knowledgeBoundaries: {
      perspectiveCharacter: '黎明',
      publicFacts: ['李科盯上黎明'],
      hiddenFacts: ['钥匙秘密未暴露'],
      forbiddenOmniscienceRules: ['不能写全知视角']
    },
    characters: [
      {
        name: '黎明',
        lastKnownGoal: '守住钥匙秘密',
        latestEmotion: '压着警惕',
        latestAction: '暂时稳住李科',
        appearanceCount: 1,
        continuityStatus: {
          location: '安仁镇',
          injuryStatus: '无伤',
          custodyStatus: 'free',
          canActDirectly: true,
          injuryEpisodeStreak: 0,
          custodyEpisodeStreak: 0,
          statusEvidence: '状态正常',
          lastSeenSceneNo: 1
        },
        relationshipPressure: [],
        traitBindings: []
      }
    ],
    factState: {
      theme: '藏锋守人',
      mainConflict: '黎明守护钥匙与小柔，对抗李科逼压',
      confirmedFormalFacts: [],
      protectedFacts: [],
      lastUpdatedAt: '2026-03-22T00:00:00.000Z'
    },
    anchorState: {
      requiredAnchorNames: [],
      missingAnchorNames: [],
      heroineRequired: true,
      heroineHint: '小柔必须持续在主线施压里发挥作用',
      heroineCovered: true
    },
    eventLog: [],
    preflight: {
      issues: [],
      assertionBlock: ''
    }
  }
}

function createScene(): ScriptSegmentDto {
  return {
    sceneNo: 1,
    action: '',
    dialogue: '',
    emotion: '',
    screenplay: `第1集

1-1 安仁镇市集［外］［日］

人物：黎明，小柔，李科
△李科逼债。
李科：还钱！
黎明：先等等。`,
    screenplayScenes: [],
    legacyFormat: false
  }
}

test('buildRepairPrompt uses screenplay format contract and no longer emits A/D/E output format', () => {
  const suggestion: ExecuteScriptRepairInputDto['suggestions'][number] = {
    targetSceneNo: 1,
    policyKey: 'real_quality_contract',
    source: '旧项目修补经验 + ledger 驱动修补主链',
    focus: ['正式事实', '用户锚点', '主线冲突'],
    evidenceHint: '检查当前场是否真的承接了正式事实、用户锚点和主线冲突。',
    instruction: '请把这一集修回合同内，保持正式事实、用户锚点和主线冲突一致。'
  }

  const prompt = buildRepairPrompt({
    suggestion,
    targetScene: createScene(),
    ledger: createLedger() as ScriptStateLedgerDto,
    outline: createOutline(),
    segments: [
      {
        act: 'opening',
        content: 'summary',
        hookType: 'pressure',
        episodeBeats: [{ episodeNo: 1, summary: 'beat' }]
      }
    ]
  })

  // NEW: screenplay format rules must be present
  assert.ok(prompt.includes('【修补格式合同】'))
  assert.ok(prompt.includes('只输出剧本正文，不要输出 Action:/Dialogue:/Emotion: 等旧格式标签'))
  assert.ok(prompt.includes('每场必须包含场景标题'))
  assert.ok(prompt.includes('每场最后一条△动作或最后一句对白，必须落在具体可见的结果上'))

  // OLD: no A/D/E output format
  assert.doesNotMatch(prompt, /Action:\s*\n/)
  assert.doesNotMatch(prompt, /请只输出三段/)
  assert.doesNotMatch(prompt, /只保留三段正文/)
  assert.doesNotMatch(prompt, /禁止输出 ## 标题/)
  // OLD contract terms that no longer exist
  assert.doesNotMatch(prompt, /800-1200 字目标带/)
  assert.doesNotMatch(prompt, /正式格式必须直接落成/)
  assert.doesNotMatch(prompt, /不可拍心理描写/)
  // Old scene count wording that is no longer present
  assert.doesNotMatch(prompt, /2-3 场/)
})
