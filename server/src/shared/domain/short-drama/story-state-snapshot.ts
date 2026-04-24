import type { StoryStateSnapshotDto } from '@shared/contracts/story-state'
import type {
  CharacterDraftDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '@shared/contracts/workflow'
import type { ScriptStateLedgerDto } from '@shared/contracts/script-ledger'
import type { StoryIntentPackageDto } from '@shared/contracts/intake'
import type { ScriptGenerationControlPackageDto } from '@shared/contracts/script-generation'

const MAX_ITEM_LENGTH = 80
const MAX_HOOKS = 5
const MAX_FORESHADOWING = 5
const MAX_CONSTRAINTS = 8
const MAX_PROPS = 6

function clipText(value: string | undefined, maxLength: number): string {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(12, maxLength - 1)).trim()}…`
}

function findCharacterByName(
  characters: CharacterDraftDto[],
  name: string | null | undefined
): CharacterDraftDto | null {
  if (!name) return null
  return characters.find((c) => c.name === name) || null
}

function resolvePreviousEpisodeEnding(
  episodeNo: number,
  generatedScenes: ScriptSegmentDto[] | undefined,
  existingScript: ScriptSegmentDto[] | undefined
): string {
  const allScenes = [...(existingScript || []), ...(generatedScenes || [])]
  const previousScene = allScenes.find((s) => s.sceneNo === episodeNo - 1)
  if (!previousScene || !previousScene.screenplay) {
    return '无（本集为第1集或上一集成稿未生成）'
  }
  const lines = previousScene.screenplay.split('\n').filter((l) => l.trim())
  const tail = lines.slice(-6).join(' ').trim()
  return clipText(tail, MAX_ITEM_LENGTH) || '待补'
}

export interface BuildStoryStateSnapshotInput {
  projectId: string
  outlineTitle: string
  theme?: string
  mainConflict?: string
  storyIntent?: StoryIntentPackageDto | null
  audienceLane?: string
  subgenre?: string
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  episodeNo: number
  targetEpisodes: number
  existingScript?: ScriptSegmentDto[]
  generatedScenes?: ScriptSegmentDto[]
  ledger?: ScriptStateLedgerDto | null
  scriptControlPackage?: ScriptGenerationControlPackageDto
}

export function buildStoryStateSnapshot(
  input: BuildStoryStateSnapshotInput
): StoryStateSnapshotDto {
  const {
    projectId,
    outlineTitle,
    theme,
    mainConflict,
    storyIntent,
    audienceLane,
    subgenre,
    outline,
    characters,
    episodeNo,
    targetEpisodes,
    existingScript,
    generatedScenes,
    ledger,
    scriptControlPackage
  } = input

  const protagonist = findCharacterByName(characters, outline.protagonist)
  const antagonist = findCharacterByName(characters, storyIntent?.antagonist)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marketProfile = (storyIntent as any)?.marketProfile
  const resolvedAudienceLane = audienceLane || marketProfile?.audienceLane || 'unknown'
  const resolvedSubgenre = subgenre || marketProfile?.subgenre || 'unknown'
  const controlCard =
    scriptControlPackage?.episodeControlPlans.find(
      (p) => p.episodeNo === episodeNo
    )?.episodeControlCard || null

  const activeProps: StoryStateSnapshotDto['activeProps'] = []
  if (controlCard?.requiredProp) {
    activeProps.push({
      name: clipText(controlCard.requiredProp, MAX_ITEM_LENGTH),
      status: 'held'
    })
  }

  const unresolvedHooks: string[] = []
  if (ledger?.storyMomentum?.previousCliffhanger) {
    unresolvedHooks.push(clipText(ledger.storyMomentum.previousCliffhanger, MAX_ITEM_LENGTH))
  }
  if (controlCard?.retentionCliffhanger) {
    unresolvedHooks.push(clipText(controlCard.retentionCliffhanger, MAX_ITEM_LENGTH))
  }

  const activeForeshadowing: string[] = []
  if (controlCard?.twistPoint) {
    activeForeshadowing.push(clipText(controlCard.twistPoint, MAX_ITEM_LENGTH))
  }
  if (controlCard?.signatureLineSeed) {
    activeForeshadowing.push(
      `金句种子：${clipText(controlCard.signatureLineSeed, MAX_ITEM_LENGTH)}`
    )
  }

  const continuityConstraints: string[] = []
  if (ledger?.knowledgeBoundaries?.publicFacts?.length) {
    for (const fact of ledger.knowledgeBoundaries.publicFacts.slice(0, MAX_CONSTRAINTS)) {
      continuityConstraints.push(clipText(fact, MAX_ITEM_LENGTH))
    }
  }

  return {
    projectId: projectId || outlineTitle || 'unknown',
    audienceLane: resolvedAudienceLane,
    subgenre: resolvedSubgenre,
    currentEpisode: episodeNo,
    totalEpisodes: targetEpisodes,
    protagonistState: {
      statusSummary: clipText(protagonist?.goal || protagonist?.biography || '待补', MAX_ITEM_LENGTH),
      emotionalArc: clipText(storyIntent?.emotionalPayoff, MAX_ITEM_LENGTH) || '待补'
    },
    antagonistState: {
      statusSummary: clipText(antagonist?.goal || antagonist?.biography || '待补', MAX_ITEM_LENGTH),
      threatLevel: clipText(controlCard?.villainPressure, MAX_ITEM_LENGTH) || '待补',
      currentGoal: clipText(antagonist?.goal, MAX_ITEM_LENGTH) || '待补'
    },
    relationshipState: {
      keyRelationship: clipText(storyIntent?.coreDislocation, MAX_ITEM_LENGTH) || '待补',
      currentTension: clipText(mainConflict || outline.mainConflict, MAX_ITEM_LENGTH) || '待补'
    },
    activeProps: activeProps.slice(0, MAX_PROPS),
    unresolvedHooks: unresolvedHooks.slice(0, MAX_HOOKS),
    activeForeshadowing: activeForeshadowing.slice(0, MAX_FORESHADOWING),
    continuityConstraints: continuityConstraints.slice(0, MAX_CONSTRAINTS),
    previousEpisodeEnding: resolvePreviousEpisodeEnding(
      episodeNo,
      generatedScenes,
      existingScript
    )
  }
}

export function buildStoryStateSnapshotPromptBlock(
  snapshot: StoryStateSnapshotDto
): string {
  const lines: string[] = []
  lines.push('【故事状态快照】')
  lines.push(`- 项目：${snapshot.projectId}`)
  lines.push(`- 受众：${snapshot.audienceLane}｜${snapshot.subgenre}`)
  lines.push(`- 当前集：第 ${snapshot.currentEpisode} 集 / 共 ${snapshot.totalEpisodes} 集`)
  lines.push('')

  lines.push('【主角状态】')
  lines.push(`- 处境：${snapshot.protagonistState.statusSummary}`)
  lines.push(`- 情绪线：${snapshot.protagonistState.emotionalArc}`)
  lines.push('')

  lines.push('【反派状态】')
  lines.push(`- 处境：${snapshot.antagonistState.statusSummary}`)
  lines.push(`- 威胁等级：${snapshot.antagonistState.threatLevel}`)
  lines.push(`- 当前目标：${snapshot.antagonistState.currentGoal}`)
  lines.push('')

  lines.push('【关系张力】')
  lines.push(`- 核心关系：${snapshot.relationshipState.keyRelationship}`)
  lines.push(`- 当前冲突：${snapshot.relationshipState.currentTension}`)
  lines.push('')

  if (snapshot.activeProps.length > 0) {
    lines.push('【当前道具】')
    for (const prop of snapshot.activeProps) {
      lines.push(`- ${prop.name}（${prop.status}）`)
    }
    lines.push('')
  }

  if (snapshot.unresolvedHooks.length > 0) {
    lines.push('【未兑现钩子】')
    for (const hook of snapshot.unresolvedHooks) {
      lines.push(`- ${hook}`)
    }
    lines.push('')
  }

  if (snapshot.activeForeshadowing.length > 0) {
    lines.push('【活跃伏笔】')
    for (const f of snapshot.activeForeshadowing) {
      lines.push(`- ${f}`)
    }
    lines.push('')
  }

  if (snapshot.continuityConstraints.length > 0) {
    lines.push('【连续性约束】')
    for (const c of snapshot.continuityConstraints) {
      lines.push(`- ${c}`)
    }
    lines.push('')
  }

  lines.push('【上一集落点】')
  lines.push(snapshot.previousEpisodeEnding)

  return lines.join('\n')
}
