import test from 'node:test'
import assert from 'node:assert/strict'

import type { MarketPatternDto, MarketPlaybookDraftDto } from '../../contracts/market-playbook.ts'
import type { ScriptSegmentDto } from '../../contracts/workflow.ts'
import {
  createMarketPlaybookDraftFromSamples,
  createSourceSample
} from './create-draft-from-samples.ts'
import { validateMarketPlaybookBeforeActivation, activateMarketPlaybookDraft } from './playbook-lifecycle.ts'
import { resolveMarketPlaybookSelection } from './market-playbook-registry.ts'
import { buildMarketPlaybookPromptBlock } from './playbook-prompt-block.ts'
import { inspectPlaybookAlignment } from './playbook-alignment.ts'
import { inspectContentQualityEpisode } from '../script/screenplay-content-quality.ts'

const XIUXIAN_SAMPLE_TEXT = `
第1集，测灵台上，主角被长老当众宣布废灵根，师兄和未婚妻一起嘲笑羞辱。
长老用宗门规则取消他的资源，逼他跪下认错，众人都等着看他崩溃。
主角没有解释，只把手按回测灵石。封印力量外泄，测灵台爆裂，长老被灵压反噬。
曾经退婚的未婚妻脸色大变，围观弟子震惊，第一次小打脸当场完成。
第2集，反派不认错，暗中派刺客追杀，又栽赃主角偷学禁术。
主角表面隐忍，暗中布局，借残片突破，反击时让刺客自曝幕后黑手。
第3集，神尊残魂在识海中苏醒，提示他真正身世还有更大秘密。
集尾必须留钩子：仙界令牌突然发烫，说明腐朽仙界已经盯上他。
`

function reviewDraftForActivation(draft: MarketPlaybookDraftDto): MarketPlaybookDraftDto {
  const reviewedPatterns = draft.extractedPatterns.map((pattern) => ({
    ...pattern,
    qualitySignal: qualitySignalFor(pattern),
    promptInstruction: promptInstructionFor(pattern)
  }))

  return {
    ...draft,
    extractedPatterns: reviewedPatterns,
    promptRules: reviewedPatterns.slice(0, 5).map((pattern) => pattern.promptInstruction),
    qualitySignals: reviewedPatterns.slice(0, 5).map((pattern) => pattern.qualitySignal),
    reviewNotes: ['P10 低成本闭环测试中模拟人工审核：只改 signals，不自动入库。']
  }
}

function qualitySignalFor(pattern: MarketPatternDto): string {
  switch (pattern.type) {
    case 'opening_pressure':
      return '测灵台 废灵根 当众羞辱'
    case 'payoff':
      return '测灵台爆裂 长老反噬 众人震惊'
    case 'hook':
      return '神尊残魂 苏醒 仙界令牌'
    case 'villain_pressure':
      return '取消资源 栽赃 追杀'
    case 'protagonist_action':
      return '不解释 隐忍布局 借残片突破'
    default:
      return pattern.qualitySignal
  }
}

function promptInstructionFor(pattern: MarketPatternDto): string {
  switch (pattern.type) {
    case 'opening_pressure':
      return '开局必须落到测灵台废灵根当众受辱，观众先憋屈再等反击。'
    case 'payoff':
      return '爽点必须有实质打脸：测灵台爆裂、长老反噬、围观者震惊。'
    case 'hook':
      return '集尾钩子必须用神尊残魂或仙界令牌把下一层危机压到眼前。'
    case 'villain_pressure':
      return '反派压迫要用宗门规则、资源剥夺、栽赃追杀逐级升级。'
    case 'protagonist_action':
      return '主角人狠话不多，先隐忍布局，再用证据或实力反击。'
    default:
      return pattern.promptInstruction
  }
}

function makeScene(screenplay: string): ScriptSegmentDto {
  return {
    sceneNo: 1,
    screenplay,
    action: '',
    dialogue: '',
    emotion: '',
    screenplayScenes: []
  }
}

test('P10: 市场学习闭环从样本草案走到 prompt 与观测信号', () => {
  const sourceSample = createSourceSample({
    name: '2026-06-男频修仙爆款样本.txt',
    contentText: XIUXIAN_SAMPLE_TEXT,
    sourceType: 'txt',
    audienceLane: 'male',
    subgenre: '修仙逆袭'
  })

  const draft = createMarketPlaybookDraftFromSamples({
    samples: [sourceSample],
    name: '2026-06 男频修仙逆袭打法包草案',
    audienceLane: 'male',
    subgenre: '修仙逆袭',
    sourceMonth: '2026-06',
    version: 'v1'
  })

  const extractedTypes = draft.extractedPatterns.map((pattern) => pattern.type)
  assert.ok(extractedTypes.includes('opening_pressure'))
  assert.ok(extractedTypes.includes('payoff'))
  assert.ok(extractedTypes.includes('hook'))

  const reviewedDraft = reviewDraftForActivation(draft)
  const validation = validateMarketPlaybookBeforeActivation({
    draft: reviewedDraft,
    existingActivePlaybooks: []
  })
  assert.equal(validation.valid, true, validation.issues.join('\n'))

  const activePlaybook = activateMarketPlaybookDraft({
    draft: reviewedDraft,
    activateAt: '2026-06-01T00:00:00.000Z'
  })
  assert.equal(activePlaybook.status, 'active')
  assert.equal(activePlaybook.sourceMonth, '2026-06')

  const lockedSelection = resolveMarketPlaybookSelection({
    audienceLane: 'male',
    subgenre: '修仙逆袭',
    existingSelection: {
      selectedPlaybookId: 'market-2026-04-male-xiuxian-v1',
      selectionMode: 'locked',
      selectedVersion: 'v1',
      selectedSourceMonth: '2026-04',
      lockedAt: '2026-04-25T00:00:00.000Z'
    }
  })
  assert.equal(lockedSelection.reason, 'existing_locked')
  assert.equal(lockedSelection.playbook?.id, 'market-2026-04-male-xiuxian-v1')

  const promptBlock = buildMarketPlaybookPromptBlock({
    playbook: activePlaybook,
    stage: 'episode_script'
  })
  assert.ok(promptBlock.includes('不能覆盖稳定创作内核'))
  assert.ok(promptBlock.includes('测灵台废灵根当众受辱'))
  assert.ok(promptBlock.includes('长老反噬'))
  assert.ok(promptBlock.includes('神尊残魂'))

  const screenplayText = `
第1集
1-1 测灵台 日
人物：陆沉、赵长老、围观弟子
△赵长老当众宣布陆沉是废灵根，取消资源，逼他跪下认错。
陆沉：我不解释。
△陆沉把手按回测灵石，测灵台爆裂，长老反噬吐血，众人震惊。
△集尾，神尊残魂苏醒，仙界令牌突然发烫。
`
  const alignment = inspectPlaybookAlignment({
    text: screenplayText,
    playbook: activePlaybook
  })

  assert.ok(alignment)
  assert.ok(alignment!.score > 0)
  assert.ok(alignment!.matchedSignals.some((signal) => signal.includes('测灵台')))
})

test('P10: playbookAlignmentScore 只观测，不改变 overallScore', () => {
  const sourceSample = createSourceSample({
    name: '2026-06-男频修仙爆款样本.txt',
    contentText: XIUXIAN_SAMPLE_TEXT,
    sourceType: 'txt',
    audienceLane: 'male',
    subgenre: '修仙逆袭'
  })
  const activePlaybook = activateMarketPlaybookDraft({
    draft: reviewDraftForActivation(
      createMarketPlaybookDraftFromSamples({
        samples: [sourceSample],
        name: '2026-06 男频修仙逆袭打法包草案',
        audienceLane: 'male',
        subgenre: '修仙逆袭',
        sourceMonth: '2026-06',
        version: 'v2'
      })
    ),
    activateAt: '2026-06-01T00:00:00.000Z'
  })

  const scene = makeScene(`
第1集
1-1 测灵台 日
人物：陆沉、赵长老、围观弟子
△赵长老当众宣布陆沉是废灵根，取消资源，逼他跪下认错。
陆沉：我不解释。
△陆沉把手按回测灵石，测灵台爆裂，长老反噬吐血，众人震惊。
△集尾，神尊残魂苏醒，仙界令牌突然发烫。
`)

  const withoutPlaybook = inspectContentQualityEpisode(scene, {
    protagonistName: '陆沉',
    antagonistName: '赵长老'
  })
  const withPlaybook = inspectContentQualityEpisode(scene, {
    protagonistName: '陆沉',
    antagonistName: '赵长老',
    playbook: activePlaybook
  })

  assert.equal(withPlaybook.overallScore, withoutPlaybook.overallScore)
  assert.equal(withoutPlaybook.playbookAlignmentScore, undefined)
  assert.ok(typeof withPlaybook.playbookAlignmentScore === 'number')
})
