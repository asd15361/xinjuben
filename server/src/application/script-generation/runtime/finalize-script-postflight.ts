import type {
  CharacterDraftDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '@shared/contracts/workflow'
import type {
  ScriptLedgerPostflightDto,
  ScriptStateLedgerDto
} from '@shared/contracts/script-ledger'
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
