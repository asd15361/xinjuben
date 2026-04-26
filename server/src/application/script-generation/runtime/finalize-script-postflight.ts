import type {
  CharacterDraftDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '@shared/contracts/workflow'
import type {
  ScriptLedgerIssueDto,
  ScriptLedgerPostflightDto,
  ScriptStateLedgerDto
} from '@shared/contracts/script-ledger'
import {
  detectStrategyContamination,
  resolveGenerationStrategy
} from '@shared/domain/generation-strategy/generation-strategy'
import type {
  StartScriptGenerationInputDto,
  StartScriptGenerationResultDto
} from '@shared/contracts/script-generation'
import { inspectScreenplayQualityBatch } from '@shared/domain/script/screenplay-quality'
import { inspectContentQualityBatch } from '@shared/domain/script/screenplay-content-quality'
import { buildStoryStateSnapshot } from '@shared/domain/short-drama/story-state-snapshot'
import { resolveProjectMarketPlaybook } from '@shared/domain/market-playbook/playbook-prompt-block'
import { buildScriptStateLedger } from '../ledger/build-script-ledger'
import { buildLedgerPostflightAssertion } from '../ledger/ledger-postflight'
import { collectF6PostflightIssues } from './collect-f6-postflight-issues'

function buildGeneratedScriptText(scenes: ScriptSegmentDto[]): string {
  return scenes
    .map((scene) =>
      [
        `第${scene.sceneNo}集`,
        scene.screenplay || '',
        scene.action || '',
        scene.dialogue || '',
        scene.emotion || '',
        ...(scene.screenplayScenes || []).flatMap((block) => [
          block.sceneCode || '',
          block.sceneHeading || '',
          (block.characterRoster || []).join('、'),
          block.body || ''
        ])
      ].join('\n')
    )
    .join('\n\n')
}

function collectGenerationStrategyPostflightIssues(input: {
  generationInput: StartScriptGenerationInputDto
  outline: OutlineDraftDto
  fullScript: ScriptSegmentDto[]
}): ScriptLedgerIssueDto[] {
  const resolution = resolveGenerationStrategy({
    marketProfile: input.generationInput.storyIntent?.marketProfile,
    genre: input.outline.genre,
    storyIntentGenre: `${input.generationInput.mainConflict || ''}\n${input.outline.mainConflict || ''}\n${input.outline.summary || ''}`,
    title: input.outline.title || input.generationInput.outlineTitle
  })
  const scriptText = buildGeneratedScriptText(input.fullScript)
  const seenTerms = new Set<string>()

  return detectStrategyContamination(resolution.strategy, scriptText)
    .filter((issue) => {
      if (seenTerms.has(issue.term)) return false
      seenTerms.add(issue.term)
      return true
    })
    .map((issue) => ({
      severity: issue.severity === 'error' ? 'high' : 'medium',
      code: 'generation_strategy_contamination',
      detail: `正式剧本疑似串题材：当前题材策略「${resolution.strategy.label}」不应出现「${issue.term}」。`
    }))
}

export function finalizeScriptPostflight(input: {
  generationInput: StartScriptGenerationInputDto
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  existingScript: ScriptSegmentDto[]
  generatedScenes: StartScriptGenerationResultDto['generatedScenes']
}): {
  ledger: ScriptStateLedgerDto
  postflight: ScriptLedgerPostflightDto
} {
  const previousLedger =
    input.existingScript.length > 0
      ? buildScriptStateLedger({
          storyIntent: input.generationInput.storyIntent,
          outline: input.outline,
          characters: input.characters,
          script: input.existingScript
        })
      : null
  const ledger = buildScriptStateLedger({
    storyIntent: input.generationInput.storyIntent,
    outline: input.outline,
    characters: input.characters,
    script: [...input.existingScript, ...input.generatedScenes]
  })
  const postflight = buildLedgerPostflightAssertion({
    previousLedger,
    nextLedger: ledger
  })
  const fullScript = [...input.existingScript, ...input.generatedScenes]
  const qualityReport = inspectScreenplayQualityBatch(fullScript)
  const marketProfile = input.generationInput.storyIntent?.marketProfile

  // 为每集构建 snapshot 用于连续性质检
  const snapshots = fullScript.map((scene) =>
    buildStoryStateSnapshot({
      projectId: input.generationInput.projectId || input.outline.title || 'unknown',
      outlineTitle: input.outline.title || '',
      theme: input.generationInput.theme,
      mainConflict: input.generationInput.mainConflict,
      storyIntent: input.generationInput.storyIntent,
      outline: input.outline,
      characters: input.characters,
      episodeNo: scene.sceneNo,
      targetEpisodes: input.generationInput.plan?.targetEpisodes ?? 20,
      existingScript: input.existingScript,
      generatedScenes: input.generatedScenes,
      ledger
    })
  )

  const contentQualityReport = inspectContentQualityBatch(fullScript, {
    protagonistName: input.outline.protagonist || input.generationInput.storyIntent?.protagonist,
    supportingName: undefined,
    antagonistName: input.generationInput.storyIntent?.antagonist,
    marketProfile,
    playbook: resolveProjectMarketPlaybook({
      marketPlaybookSelection: input.generationInput.marketPlaybookSelection,
      audienceLane: marketProfile?.audienceLane,
      subgenre: marketProfile?.subgenre,
      customPlaybooks: input.generationInput.customMarketPlaybooks
    }),
    snapshots
  })
  postflight.issues.push(...collectF6PostflightIssues(input.generatedScenes))
  postflight.issues.push(
    ...collectGenerationStrategyPostflightIssues({
      generationInput: input.generationInput,
      outline: input.outline,
      fullScript
    })
  )
  postflight.quality = {
    pass: qualityReport.pass,
    episodeCount: qualityReport.episodeCount,
    passedEpisodes: qualityReport.passedEpisodes,
    averageCharCount: qualityReport.averageCharCount,
    weakEpisodes: qualityReport.weakEpisodes.map((episode) => ({
      sceneNo: episode.sceneNo,
      problems: episode.problems,
      charCount: episode.charCount,
      sceneCount: episode.sceneCount,
      hookLine: episode.hookLine
    })),
    openingShockScore: contentQualityReport.averageOpeningShockScore,
    punchlineDensityScore: contentQualityReport.averagePunchlineDensityScore,
    catharsisPayoffScore: contentQualityReport.averageCatharsisPayoffScore,
    villainOppressionQualityScore: contentQualityReport.averageVillainOppressionQualityScore,
    hookRetentionScore: contentQualityReport.averageHookRetentionScore,
    informationDensityScore: contentQualityReport.averageInformationDensityScore,
    screenplayFormatScore: contentQualityReport.averageScreenplayFormatScore,
    storyContinuityScore: contentQualityReport.averageStoryContinuityScore,
    marketQualityScore: contentQualityReport.averageMarketQualityScore,
    playbookAlignmentScore: contentQualityReport.averagePlaybookAlignmentScore
  }
  postflight.pass = postflight.issues.length === 0
  if (postflight.issues.length > 0 && !qualityReport.pass) {
    postflight.summary = `生成后账本断言发现问题：${postflight.issues.map((issue) => issue.detail).join(';')}；另外还有 ${qualityReport.weakEpisodes.length} 集需要继续走返修 Agent。`
  } else if (postflight.issues.length > 0) {
    postflight.summary = `生成后账本断言发现问题：${postflight.issues.map((issue) => issue.detail).join(';')}`
  } else if (!qualityReport.pass) {
    postflight.summary = `剧本已经生成完成；当前还有 ${qualityReport.weakEpisodes.length} 集需要继续走返修 Agent，平均字数 ${qualityReport.averageCharCount}。`
  } else {
    postflight.summary = `生成后账本与内容观察通过：共 ${qualityReport.episodeCount} 集，平均字数 ${qualityReport.averageCharCount}。`
  }

  ledger.postflight = postflight

  return {
    ledger,
    postflight
  }
}
