/**
 * src/main/application/workspace/character-profile-v2-agent.ts
 *
 * 五维人物小传 Agent。
 *
 * 职责：从势力拆解表和真源中生成五维人物小传，
 * 严格锁定五维模型：外在形象/性格特点/身份/价值观/剧情作用 必填。
 * 绝对禁止在小传中描写具体行为时间线（流水账剧情）。
 *
 * 输入：真源(StoryIntent) + 势力拆解表(FactionMatrixDto) + 旧人物小传(可选)
 * 输出：CharacterProfileV2Dto[]（严格 JSON）
 */

import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config.ts'
import { generateTextWithRuntimeRouter } from '../ai/generate-text.ts'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake.ts'
import type { FactionDto, FactionMatrixDto } from '../../../shared/contracts/faction-matrix.ts'
import type { CharacterProfileV2Dto } from '../../../shared/contracts/character-profile-v2.ts'

export interface CharacterProfileV2AgentInput {
  storyIntent: StoryIntentPackageDto
  factionMatrix: FactionMatrixDto
  existingCharacters?: Array<{
    name: string
    biography: string
    publicMask: string
  }>
}

export interface CharacterProfileV2Result {
  characters: CharacterProfileV2Dto[]
}

const CHARACTER_PROFILE_V2_CONCURRENCY_LIMIT = 2
const CHARACTER_PROFILE_V2_MAX_ATTEMPTS = 3
const CHARACTER_PROFILE_V2_BACKOFF_MS = [2000, 5000, 10000] as const

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeJsonEnvelope(rawText: string): string {
  return rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim()
}

function isTransientCharacterProfileRuntimeError(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  return (
    normalized.includes('terminated') ||
    normalized.includes('502') ||
    normalized.includes('429') ||
    normalized.includes('504') ||
    normalized.includes('bad gateway') ||
    normalized.includes('gateway timeout') ||
    normalized.includes('econnreset') ||
    normalized.includes('socket hang up') ||
    normalized.includes('etimedout') ||
    /^ai_request_timeout:\d+ms$/.test(normalized)
  )
}

function shouldSplitFactionIntoSingleCharacterCalls(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  return (
    normalized.includes('terminated') ||
    normalized.includes('502') ||
    normalized.includes('504') ||
    normalized.includes('bad gateway') ||
    normalized.includes('gateway timeout')
  )
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function summarizeCharacterProfileV2ParseIssues(rawText: string): string[] {
  const issues: string[] = []

  try {
    const cleaned = normalizeJsonEnvelope(rawText)
    const parsed = JSON.parse(cleaned)

    if (!Array.isArray(parsed.characters)) {
      issues.push('characters_missing')
      return issues
    }

    if (parsed.characters.length === 0) {
      issues.push('characters_empty')
      return issues
    }

    parsed.characters.forEach((char: Record<string, unknown>, index: number) => {
      if (!hasText(char.id)) issues.push(`id_missing:character_${index + 1}`)
      if (!hasText(char.name)) issues.push(`name_missing:character_${index + 1}`)
      if (!hasText(char.depthLevel)) issues.push(`depth_level_missing:character_${index + 1}`)
      if (!hasText(char.appearance)) issues.push(`appearance_missing:character_${index + 1}`)
      if (!hasText(char.personality)) issues.push(`personality_missing:character_${index + 1}`)
      if (!hasText(char.identity)) issues.push(`identity_missing:character_${index + 1}`)
      if (!hasText(char.values)) issues.push(`values_missing:character_${index + 1}`)
      if (!hasText(char.plotFunction)) issues.push(`plot_function_missing:character_${index + 1}`)

      if (char.depthLevel === 'core') {
        if (!hasText(char.hiddenPressure))
          issues.push(`hidden_pressure_missing:character_${index + 1}`)
        if (!hasText(char.fear)) issues.push(`fear_missing:character_${index + 1}`)
        if (!hasText(char.protectTarget))
          issues.push(`protect_target_missing:character_${index + 1}`)
        if (!hasText(char.conflictTrigger))
          issues.push(`conflict_trigger_missing:character_${index + 1}`)
        if (!hasText(char.advantage)) issues.push(`advantage_missing:character_${index + 1}`)
        if (!hasText(char.weakness)) issues.push(`weakness_missing:character_${index + 1}`)
        if (!hasText(char.goal)) issues.push(`goal_missing:character_${index + 1}`)
        if (!hasText(char.arc)) issues.push(`arc_missing:character_${index + 1}`)
        if (!hasText(char.publicMask)) issues.push(`public_mask_missing:character_${index + 1}`)
      }
    })
  } catch {
    issues.push('json_parse_failed')
  }

  return issues
}

function buildCharacterProfileV2RetryPrompt(input: {
  originalPrompt: string
  parseIssues: string[]
  factionName: string
}): string {
  return [
    `你上一版【${input.factionName}】五维人物小传没有通过结构校验。`,
    '这次只输出合法 JSON，不要解释，不要 markdown，不要 ```json。',
    '每个人物都必须保住 5 个基础维度：appearance / personality / identity / values / plotFunction。',
    'core 人物还必须补齐：hiddenPressure / fear / protectTarget / conflictTrigger / advantage / weakness / goal / arc / publicMask。',
    `上一版问题：${input.parseIssues.join('、') || 'unknown'}`,
    '如果你写不下长文案，优先缩短每个字段的长度，也不要删字段。',
    '只输出这个结构：',
    '{',
    '  "characters": [',
    '    {',
    '      "id": "char_01",',
    '      "name": "string",',
    '      "depthLevel": "core",',
    '      "factionId": "faction_01",',
    '      "branchId": "branch_01",',
    '      "roleInFaction": "leader",',
    '      "appearance": "string",',
    '      "personality": "string",',
    '      "identity": "string",',
    '      "values": "string",',
    '      "plotFunction": "string",',
    '      "hiddenPressure": "string",',
    '      "fear": "string",',
    '      "protectTarget": "string",',
    '      "conflictTrigger": "string",',
    '      "advantage": "string",',
    '      "weakness": "string",',
    '      "goal": "string",',
    '      "arc": "string",',
    '      "publicMask": "string",',
    '      "biography": "string"',
    '    }',
    '  ]',
    '}',
    '',
    '项目上下文：',
    input.originalPrompt
  ].join('\n')
}

/**
 * 构建单个势力的五维人物小传 Agent Prompt。
 *
 * 核心铁律：
 * 1. 五维模型强制锁死：appearance/personality/identity/values/plotFunction 必填
 * 2. 禁止流水账剧情：小传只定义"他是个什么样的人"+"他为了什么而活"+"他在全剧提供什么功能"
 * 3. 差异化生成：核心人物超详尽，中层精简，龙套一行字
 */
export function buildCharacterProfileV2AgentPrompt(input: CharacterProfileV2AgentInput): string {
  const premise = input.storyIntent.sellingPremise || '待补'
  const coreConflict = input.storyIntent.coreConflict || '待补'
  const protagonist = input.storyIntent.protagonist || '主角'
  const antagonist = input.storyIntent.antagonist || '反派'
  const worldView = input.storyIntent.shortDramaConstitution?.worldViewBrief || '待补'

  const currentFaction = input.factionMatrix.factions[0]
  const factionSummary = currentFaction ? serializeFactionSummary(currentFaction) : '无势力'

  const crossRelationsSummary = input.factionMatrix.crossRelations
    .map((rel) => {
      const typeLabel = rel.relationType
      return `  - ${typeLabel}：${rel.fromFactionId} → ${rel.toFactionId}｜${rel.description}`
    })
    .join('\n')

  const existingCharHint = input.existingCharacters
    ? input.existingCharacters
        .map(
          (c) =>
            `  - ${c.name}：${c.biography}${c.publicMask ? ` | 表面演法：${c.publicMask}` : ''}`
        )
        .join('\n')
    : '无旧版人物小传'

  return [
    '【五维人物小传 Agent · 人物生成指令】',
    '输出严格JSON，无文本、无解释。',
    '',
    '【致命红线 · 禁止流水账剧情】',
    '绝对禁止在小传中描写"他后来做了什么"、"他在第几集杀了谁"、"他和谁相爱"等具体的行为时间线！',
    '小传只定义三件事：',
    '  1. 他是个什么样的人（外在形象 + 性格特点 + 身份）',
    '  2. 他为了什么而活（价值观 —— 这是人物行动的根源）',
    '  3. 他在全剧提供什么功能（剧情作用）',
    '',
    '【五维模型 · 必填锁死】',
    '每个人物必须且只能包含这 5 个核心维度：',
    '  1. appearance（外在形象）：年龄、性别、身高体型、穿衣风格、标志性外貌特征。让甲方快速建立视觉印象。',
    '  2. personality（性格特点）：核心性格驱动力。是敏感自卑、乐观豁达，还是嫉恶如仇？明确行为逻辑的底层驱动。',
    '  3. identity（身份）：职业或剧中身份（如：县令之子、客栈小二、集团二把手、江湖游侠）。锚定社会角色。',
    '  4. values（价值观）：人物行动的根源信条（如：秩序至上、弱肉强食、家族荣耀高于一切）。这是塑造人物弧光的关键。',
    '  5. plotFunction（剧情作用）：人物在全剧中提供的核心功能（如：用工业技术在古代建功、替主角挡刀的忠诚者、制造信息差的卧底）。聚焦"在故事中起什么作用"，而非流水账。',
    '',
    '【差异化层级】',
    '  - 核心人物（depthLevel="core"，3-5人）：超详尽五维 + 成长弧光 + hiddenPressure/fear/protectTarget/conflictTrigger/advantage/weakness/goal/arc/publicMask 全填',
    '  - 势力中层（depthLevel="mid"）：重点填 identity + values + plotFunction，五维必填，扩展字段选填',
    '  - 功能性龙套（depthLevel="extra"）：一行字 identity + coreMotivation 即可，五维必填但可短',
    '',
    '【人物与势力映射】',
    '这次只生成当前这个势力下的人物，不要跨势力乱补名单。',
    '每个人物必须关联到当前势力里的具体分支和占位符。',
    '当前势力里已经定义的人物占位符，你必须保留并扩展为五维小传。',
    '只有主角/对手本来就在当前势力名单里时，才允许在本次输出里写他们。',
    '',
    '【当前势力】',
    factionSummary,
    '',
    '【当前势力相关交叉关系】',
    crossRelationsSummary || '  - 无显式交叉关系',
    '',
    '【旧版人物小传（参考，不可发明新核心角色）】',
    existingCharHint,
    '',
    '【故事前提】',
    `- 设定成交句：${premise}`,
    `- 核心冲突：${coreConflict}`,
    `- 主角方向：${protagonist}`,
    `- 对手方向：${antagonist}`,
    `- 世界观摘要：${worldView}`,
    '',
    '【输出格式】',
    '严格输出 JSON，不要 markdown，不要解释：',
    '{',
    '  "characters": [',
    '    {',
    '      "id": string,',
    '      "name": string,',
    '      "depthLevel": "core"|"mid"|"extra",',
    '      "factionId": string | null,',
    '      "branchId": string | null,',
    '      "roleInFaction": "leader"|"enforcer"|"variable"|"functional" | null,',
    '',
    '      // ── 五维必填（每个人物必须有） ──',
    '      "appearance": string,',
    '      "personality": string,',
    '      "identity": string,',
    '      "values": string,',
    '      "plotFunction": string,',
    '',
    '      // ── 核心人物扩展（depthLevel=core 时必填） ──',
    '      "hiddenPressure": string,',
    '      "fear": string,',
    '      "protectTarget": string,',
    '      "conflictTrigger": string,',
    '      "advantage": string,',
    '      "weakness": string,',
    '      "goal": string,',
    '      "arc": string,',
    '      "publicMask": string,',
    '',
    '      // ── 兼容旧字段 ──',
    '      "biography": string',
    '    }',
    '  ]',
    '}'
  ].join('\n')
}

export function parseCharacterProfileV2Response(rawText: string): CharacterProfileV2Result | null {
  try {
    const cleaned = normalizeJsonEnvelope(rawText)
    const parsed = JSON.parse(cleaned)

    if (!Array.isArray(parsed.characters) || parsed.characters.length === 0) {
      return null
    }

    // 五维必填是硬性要求
    for (const char of parsed.characters) {
      if (
        !hasText(char.id) ||
        !hasText(char.name) ||
        !hasText(char.depthLevel) ||
        !hasText(char.appearance) ||
        !hasText(char.personality) ||
        !hasText(char.identity) ||
        !hasText(char.values) ||
        !hasText(char.plotFunction)
      ) {
        return null
      }

      // 【放宽校验】core 扩展字段不再强制要求，允许部分为空
      // enrichCharacterDrafts 会在后续补全缺失字段
      // 之前的问题：AI 返回空字符串导致整个解析失败，现在改为接受并后续补全
      // core 人物至少要有 goal（否则后续合同检查会失败）
      if (char.depthLevel === 'core' && !hasText(char.goal)) {
        // 如果 goal 为空，用 values 作为 fallback
        char.goal = char.values || ''
      }
    }

    return parsed as CharacterProfileV2Result
  } catch {
    return null
  }
}

function serializeFactionSummary(faction: FactionDto): string {
  const branchSummary = faction.branches
    .map((branch) => {
      const chars = branch.characters
        .map(
          (c) =>
            `      - ${c.name}（${c.roleInFaction}）：${c.identity}｜动机：${c.coreMotivation}${c.isSleeper ? ` ⚠️卧底→${c.sleeperForFactionId || '?'}` : ''}`
        )
        .join('\n')
      return `    ├─ 二级分支：${branch.name}\n${chars}`
    })
    .join('\n')

  return `  ■ ${faction.name}（${faction.positioning}｜核心诉求：${faction.coreDemand}｜价值观：${faction.coreValues}）\n${branchSummary}`
}

function createFactionScopedMatrix(
  factionMatrix: FactionMatrixDto,
  faction: FactionDto,
  characterNames?: string[]
): FactionMatrixDto {
  const allowedCharacterNames = characterNames ? new Set(characterNames) : null
  const filteredBranches = faction.branches
    .map((branch) => ({
      ...branch,
      characters: branch.characters.filter((character) =>
        allowedCharacterNames ? allowedCharacterNames.has(character.name) : true
      )
    }))
    .filter((branch) => branch.characters.length > 0)

  const scopedFaction: FactionDto = {
    ...faction,
    branches: filteredBranches
  }

  const relevantCharacterIds = new Set(
    scopedFaction.branches.flatMap((branch) => branch.characters.map((character) => character.id))
  )

  const relevantCrossRelations = factionMatrix.crossRelations.filter((relation) => {
    if (relation.fromFactionId === faction.id || relation.toFactionId === faction.id) {
      return true
    }

    return (relation.involvedCharacterIds || []).some((characterId) =>
      relevantCharacterIds.has(characterId)
    )
  })

  return {
    ...factionMatrix,
    factions: [scopedFaction],
    crossRelations: relevantCrossRelations
  }
}

async function runWithConcurrencyLimit<TInput, TResult>(input: {
  items: TInput[]
  concurrency: number
  worker: (item: TInput, index: number) => Promise<TResult>
}): Promise<TResult[]> {
  const results = new Array<TResult>(input.items.length)
  let nextIndex = 0

  async function consume(): Promise<void> {
    while (true) {
      const currentIndex = nextIndex
      nextIndex += 1
      if (currentIndex >= input.items.length) {
        return
      }

      results[currentIndex] = await input.worker(input.items[currentIndex], currentIndex)
    }
  }

  const workerCount = Math.min(Math.max(input.concurrency, 1), input.items.length)
  await Promise.all(Array.from({ length: workerCount }, () => consume()))
  return results
}

async function generateCharacterProfileV2ForFaction(input: {
  storyIntent: StoryIntentPackageDto
  factionMatrix: FactionMatrixDto
  faction: FactionDto
  characterNames?: string[]
  existingCharacters?: Array<{ name: string; biography: string; publicMask: string }>
  runtimeConfig: RuntimeProviderConfig
  generateText: typeof generateTextWithRuntimeRouter
  signal?: AbortSignal
  log: (message: string) => Promise<void>
  startedAt: number
}): Promise<CharacterProfileV2Dto[]> {
  const scopedMatrix = createFactionScopedMatrix(
    input.factionMatrix,
    input.faction,
    input.characterNames
  )
  const prompt = buildCharacterProfileV2AgentPrompt({
    storyIntent: input.storyIntent,
    factionMatrix: scopedMatrix,
    existingCharacters: input.existingCharacters?.filter((character) =>
      input.faction.branches.some((branch) =>
        branch.characters.some((placeholder) => placeholder.name === character.name)
      )
    )
  })
  const timeoutMs = 90000

  await input.log(
    `faction_start faction=${input.faction.name} characterCount=${scopedMatrix.factions[0]?.branches.flatMap((branch) => branch.characters).length ?? 0} promptChars=${prompt.length} timeoutMs=${timeoutMs}`
  )

  let currentPrompt = prompt
  let parseIssues: string[] = []
  let retryMode: 'fresh' | 'retry_parse' | 'retry_runtime' = 'fresh'

  for (let attempt = 1; attempt <= CHARACTER_PROFILE_V2_MAX_ATTEMPTS; attempt += 1) {
    let resultText = ''

    try {
      const result = await input.generateText(
        {
          task: 'character_profile',
          prompt: currentPrompt,
          allowFallback: false,
          responseFormat: 'json_object',
          temperature: attempt === 1 ? 0.5 : 0.35,
          timeoutMs,
          runtimeHints: {
            strictness: 'strict',
            totalEpisodes: input.storyIntent.shortDramaConstitution?.episodeTotal,
            recoveryMode: retryMode
          }
        },
        input.runtimeConfig,
        { signal: input.signal }
      )

      resultText = result.text
      const parsed = parseCharacterProfileV2Response(result.text)
      const responsePreview = result.text.replace(/\s+/g, ' ').trim()

      if (parsed) {
        await input.log(
          `faction_finish faction=${input.faction.name} elapsedMs=${Date.now() - input.startedAt} attempt=${attempt} responseChars=${result.text.length} parsed=yes responseHead=${responsePreview.slice(0, 200)} responseTail=${responsePreview.slice(-200)}`
        )
        return parsed.characters.map((character) => ({
          ...character,
          factionId: character.factionId ?? input.faction.id
        }))
      }

      parseIssues = summarizeCharacterProfileV2ParseIssues(result.text)
      await input.log(
        `faction_parse_failed faction=${input.faction.name} elapsedMs=${Date.now() - input.startedAt} attempt=${attempt} responseChars=${result.text.length} issues=${parseIssues.join(',') || 'unknown'} responseHead=${responsePreview.slice(0, 200)} responseTail=${responsePreview.slice(-200)}`
      )

      if (attempt < CHARACTER_PROFILE_V2_MAX_ATTEMPTS) {
        retryMode = 'retry_parse'
        currentPrompt = buildCharacterProfileV2RetryPrompt({
          originalPrompt: prompt,
          parseIssues,
          factionName: input.faction.name
        })
      }
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error(String(error || 'unknown_error'))
      await input.log(
        `faction_runtime_failed faction=${input.faction.name} elapsedMs=${Date.now() - input.startedAt} attempt=${attempt} error=${normalizedError.message} responseChars=${resultText.length}`
      )
      if (
        attempt < CHARACTER_PROFILE_V2_MAX_ATTEMPTS &&
        isTransientCharacterProfileRuntimeError(normalizedError.message)
      ) {
        retryMode = 'retry_runtime'
        const backoffMs =
          CHARACTER_PROFILE_V2_BACKOFF_MS[
            Math.min(attempt - 1, CHARACTER_PROFILE_V2_BACKOFF_MS.length - 1)
          ]
        await input.log(
          `faction_runtime_retry faction=${input.faction.name} elapsedMs=${Date.now() - input.startedAt} nextAttempt=${attempt + 1} backoffMs=${backoffMs} reason=${normalizedError.message}`
        )
        await delay(backoffMs)
        continue
      }
      throw new Error(
        `character_profile_v2_generation_failed:${input.faction.name}:${normalizedError.message}`
      )
    }
  }

  throw new Error(
    `character_profile_v2_parse_failed:${input.faction.name}:${parseIssues.join(',') || 'unknown'}`
  )
}

async function generateCharacterProfileV2ForFactionWithAdaptiveSplit(input: {
  storyIntent: StoryIntentPackageDto
  factionMatrix: FactionMatrixDto
  faction: FactionDto
  existingCharacters?: Array<{ name: string; biography: string; publicMask: string }>
  runtimeConfig: RuntimeProviderConfig
  generateText: typeof generateTextWithRuntimeRouter
  signal?: AbortSignal
  log: (message: string) => Promise<void>
  startedAt: number
}): Promise<CharacterProfileV2Dto[]> {
  try {
    return await generateCharacterProfileV2ForFaction(input)
  } catch (error) {
    const normalizedError =
      error instanceof Error ? error : new Error(String(error || 'unknown_error'))
    const isRuntimeFailure = normalizedError.message.startsWith(
      `character_profile_v2_generation_failed:${input.faction.name}:`
    )

    if (!isRuntimeFailure || !shouldSplitFactionIntoSingleCharacterCalls(normalizedError.message)) {
      throw normalizedError
    }

    const totalCharacters = input.faction.branches.flatMap((branch) => branch.characters)
    if (totalCharacters.length <= 1) {
      throw normalizedError
    }

    await input.log(
      `faction_adaptive_split_start faction=${input.faction.name} elapsedMs=${Date.now() - input.startedAt} characterCount=${totalCharacters.length} reason=${normalizedError.message}`
    )

    const splitResults = await runWithConcurrencyLimit({
      items: totalCharacters,
      concurrency: CHARACTER_PROFILE_V2_CONCURRENCY_LIMIT,
      worker: async (character) =>
        generateCharacterProfileV2ForFaction({
          ...input,
          characterNames: [character.name]
        })
    })

    const merged = splitResults.flat()
    await input.log(
      `faction_adaptive_split_finish faction=${input.faction.name} elapsedMs=${Date.now() - input.startedAt} characterCount=${merged.length}`
    )
    return merged
  }
}

export async function generateCharacterProfileV2(input: {
  storyIntent: StoryIntentPackageDto
  factionMatrix: FactionMatrixDto
  existingCharacters?: Array<{ name: string; biography: string; publicMask: string }>
  runtimeConfig: RuntimeProviderConfig
  generateText?: typeof generateTextWithRuntimeRouter
  signal?: AbortSignal
  diagnosticLogger?: (message: string) => Promise<void>
}): Promise<CharacterProfileV2Result> {
  const generateText = input.generateText ?? generateTextWithRuntimeRouter
  const startedAt = Date.now()
  const log =
    input.diagnosticLogger ??
    (async (message: string) => {
      const { appendRuntimeDiagnosticLog } =
        await import('../../infrastructure/diagnostics/runtime-diagnostic-log.ts')
      await appendRuntimeDiagnosticLog('character_profile_v2', message)
    })

  await log(
    `start totalEpisodes=${input.storyIntent.shortDramaConstitution?.episodeTotal ?? 0} factionCount=${input.factionMatrix.factions.length} concurrency=${CHARACTER_PROFILE_V2_CONCURRENCY_LIMIT}`
  )

  if (input.factionMatrix.factions.length === 0) {
    throw new Error('character_profile_v2_generation_failed:no_factions')
  }

  const factionResults = await runWithConcurrencyLimit({
    items: input.factionMatrix.factions,
    concurrency: CHARACTER_PROFILE_V2_CONCURRENCY_LIMIT,
    worker: async (faction) =>
      generateCharacterProfileV2ForFactionWithAdaptiveSplit({
        storyIntent: input.storyIntent,
        factionMatrix: input.factionMatrix,
        faction,
        existingCharacters: input.existingCharacters,
        runtimeConfig: input.runtimeConfig,
        generateText,
        signal: input.signal,
        log,
        startedAt
      })
  })

  const characters = factionResults.flat()
  await log(
    `finish elapsedMs=${Date.now() - startedAt} factionCount=${input.factionMatrix.factions.length} characterCount=${characters.length}`
  )

  return { characters }
}

/**
 * 格式化五维人物小传为 RAG 底料（注入到粗纲 Prompt）。
 * 与旧版 formatCharacterProfileForRAG 并行使用。
 */
export function formatCharacterProfileV2ForRAG(characters: CharacterProfileV2Dto[]): string {
  if (!characters || characters.length === 0) return ''

  const lines: string[] = []
  lines.push('【五维人物图谱（RAG底料 V2）】')

  const coreChars = characters.filter((c) => c.depthLevel === 'core')
  const midChars = characters.filter((c) => c.depthLevel === 'mid')
  const extraChars = characters.filter((c) => c.depthLevel === 'extra')

  const groupLabels: Record<string, string> = {
    core: '核心人物（超详尽五维）',
    mid: '势力中层',
    extra: '功能性龙套'
  }

  const groupChars: Record<string, CharacterProfileV2Dto[]> = {
    core: coreChars,
    mid: midChars,
    extra: extraChars
  }

  for (const [layer, label] of Object.entries(groupLabels)) {
    const chars = groupChars[layer]
    if (!chars || chars.length === 0) continue

    lines.push('')
    lines.push(`【${label}】`)
    for (const char of chars) {
      lines.push(`【${char.name}】`)
      lines.push(`  外在形象：${char.appearance}`)
      lines.push(`  性格特点：${char.personality}`)
      lines.push(`  身份：${char.identity}`)
      lines.push(`  价值观：${char.values}`)
      lines.push(`  剧情作用：${char.plotFunction}`)
      if (char.hiddenPressure) lines.push(`  隐藏压力：${char.hiddenPressure}`)
      if (char.fear) lines.push(`  最怕失去：${char.fear}`)
      if (char.protectTarget) lines.push(`  最想守住：${char.protectTarget}`)
      if (char.conflictTrigger) lines.push(`  触发动作：${char.conflictTrigger}`)
      if (char.advantage) lines.push(`  能打的点：${char.advantage}`)
      if (char.weakness) lines.push(`  会出事的点：${char.weakness}`)
      if (char.goal) lines.push(`  目标：${char.goal}`)
      if (char.arc) lines.push(`  弧线：${char.arc}`)
      if (char.publicMask) lines.push(`  表面演法：${char.publicMask}`)
      if (char.factionId) lines.push(`  所属势力：${char.factionId}`)
    }
  }

  return lines.join('\n')
}
