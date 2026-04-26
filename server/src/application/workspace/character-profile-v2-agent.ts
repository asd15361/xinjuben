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

import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import { generateTextWithRuntimeRouter } from '../ai/generate-text'
import { resolveAiStageTimeoutMs } from '../ai/resolve-ai-stage-timeout'
import type { StoryIntentPackageDto } from '@shared/contracts/intake'
import type { MarketProfileDto } from '@shared/contracts/project'
import type {
  CharacterPlaceholderDto,
  FactionBranchDto,
  FactionDto,
  FactionMatrixDto
} from '@shared/contracts/faction-matrix'
import {
  mapV2ToLegacyCharacterDraft,
  type CharacterProfileV2Dto
} from '@shared/contracts/character-profile-v2'
import { buildMarketProfilePromptSection } from './build-market-profile-prompt-section'

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

const CHARACTER_PROFILE_V2_FACTION_CONCURRENCY_LIMIT = 2
const CHARACTER_PROFILE_V2_SPLIT_CONCURRENCY_LIMIT = 2
const CHARACTER_PROFILE_V2_MAX_ATTEMPTS = 3
const CHARACTER_PROFILE_V2_BACKOFF_MS = [2000, 5000, 10000] as const
const CHARACTER_PROFILE_V2_MAX_OUTPUT_TOKENS = 3500
const CHARACTER_PROFILE_V2_SINGLE_CHARACTER_MAX_OUTPUT_TOKENS = 1400

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeJsonEnvelope(rawText: string): string {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim()
  const fencedJson = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fencedJson?.[1]) {
    return fencedJson[1].trim()
  }

  const start = cleaned.indexOf('{')
  if (start < 0) {
    return cleaned
  }

  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < cleaned.length; index += 1) {
    const char = cleaned[index]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }
    if (char === '{') {
      depth += 1
      continue
    }
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return cleaned.slice(start, index + 1).trim()
      }
    }
  }

  return cleaned.slice(start).trim()
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
    normalized.includes('aborted due to timeout') ||
    normalized.includes('operation was aborted due to timeout') ||
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
    normalized.includes('gateway timeout') ||
    normalized.includes('aborted due to timeout') ||
    normalized.includes('operation was aborted due to timeout') ||
    /^ai_request_timeout:\d+ms$/.test(normalized)
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
    'biography 必须是一段自然人物小传，不要把 identity、values、plotFunction 硬拼成一串。',
    'biography 必须融合五维：外在形象、身份处境、价值观、隐藏压力、剧中动作方式，写成可交给编剧的自然段。',
    'plotFunction 必须点名他和谁形成对手戏，以及用什么手段推进主线；禁止只写“推动剧情”。',
    'conflictTrigger 必须写具体可拍场面；advantage 必须写能直接进剧本的行动抓手。',
    'publicMask 必须写可拍的表面动作或演法，不能只写“冷淡/善良/忠诚/神秘”这类态度。',
    'arc 必须写成：起点 → 触发事件 → 中段摇摆 → 代价选择 → 终局变化。禁止只写“最终背叛/最终战死/最终醒悟”。',
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
export function buildCharacterProfileV2AgentPrompt(input: CharacterProfileV2AgentInput & { marketProfile?: MarketProfileDto | null }): string {
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

  const marketProfileSection = buildMarketProfilePromptSection({
    marketProfile: input.marketProfile,
    stage: 'characters'
  })

  return [
    '【五维人物小传 Agent · 人物生成指令】',
    ...(marketProfileSection ? [marketProfileSection] : []),
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
    '【剧本可用性 · 禁止设定表假完成】',
    'biography 必须是一段自然人物小传：用 1-2 句写清“他是谁、被什么压力推着动、在戏里怎么制造冲突”。',
    'biography 必须自然融合五维：外在形象、身份处境、价值观、隐藏压力、剧中动作方式；不能只把五个字段并排复述。',
    '不要把 identity、values、plotFunction 硬拼成小传，不要出现“身份。价值观。剧情作用。”这种条目揉段落。',
    'plotFunction 必须点名对手戏对象或关系杠杆，并写清他是逼供、做局、护短、递假消息、压规则、抢证据还是反咬。',
    'publicMask 必须是可拍演法：表面怎么装、怎么藏、怎么拖；不要只写“冷淡/无害/忠诚/神秘/正道楷模”。',
    'conflictTrigger 必须写具体可拍场面：谁做了什么、碰到什么底线、他会怎么动作；禁止只写“被逼急时”。',
    'advantage 必须写能直接进剧本的行动抓手：能调动谁、藏什么证据、递什么假消息、用什么规则反咬。',
    'advantage 和 weakness 都必须落到人、物、证据、规矩、位置或关系上；禁止“聪明、勇敢、实力强、资源多”这类空词。',
    'arc 必须写成：起点 → 触发事件 → 中段摇摆 → 代价选择 → 终局变化。',
    '禁止只写“最终背叛/最终战死/最终醒悟”；必须写清让他变化的条件、心理代价和选择成本。',
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

function buildSingleCharacterProfileV2AgentPrompt(input: {
  storyIntent: StoryIntentPackageDto
  faction: FactionDto
  placeholder: FactionDto['branches'][number]['characters'][number]
  branch: FactionDto['branches'][number]
  existingCharacter?: { name: string; biography: string; publicMask: string }
  marketProfile?: MarketProfileDto | null
}): string {
  const premise = input.storyIntent.sellingPremise || '待补'
  const coreConflict = input.storyIntent.coreConflict || '待补'
  const protagonist = input.storyIntent.protagonist || '主角'
  const antagonist = input.storyIntent.antagonist || '对手'
  const worldView = input.storyIntent.shortDramaConstitution?.worldViewBrief || '待补'

  const marketProfileSection = buildMarketProfilePromptSection({
    marketProfile: input.marketProfile,
    stage: 'characters'
  })

  return [
    '只输出一个人物的合法 JSON，不要解释，不要 markdown，不要代码块。',
    ...(marketProfileSection ? [marketProfileSection] : []),
    '绝对禁止改名、加人、跨势力补位。',
    `势力：${input.faction.name}`,
    `分支：${input.branch.name}`,
    `占位符ID：${input.placeholder.id}`,
    `占位名：${input.placeholder.name}`,
    `角色层级：${input.placeholder.depthLevel}`,
    `势力角色：${input.placeholder.roleInFaction}`,
    `占位身份：${input.placeholder.identity}`,
    `占位动机：${input.placeholder.coreMotivation}`,
    `故事前提：${premise}`,
    `核心冲突：${coreConflict}`,
    `主角：${protagonist}`,
    `对手：${antagonist}`,
    `世界观：${worldView}`,
    input.existingCharacter
      ? `旧版参考：${input.existingCharacter.name}｜${input.existingCharacter.biography}${input.existingCharacter.publicMask ? `｜表面演法：${input.existingCharacter.publicMask}` : ''}`
      : '旧版参考：无',
    '五维必填：appearance/personality/identity/values/plotFunction。',
    '如果 depthLevel=core，还必须补 hiddenPressure/fear/protectTarget/conflictTrigger/advantage/weakness/goal/arc/publicMask。',
    '字段可以短，但绝不能缺字段。',
    'biography 必须是一段自然人物小传，不要把 identity、values、plotFunction 硬拼；要写清压力、动作和戏剧功能。',
    'biography 必须融合五维：外在形象、身份处境、价值观、隐藏压力、剧中动作方式，不能像字段表。',
    'plotFunction 必须写清此人和谁形成对手戏，以及靠什么手段制造冲突。',
    'publicMask 必须写可拍演法：表面怎么装、怎么藏、怎么拖。',
    'conflictTrigger 必须写具体可拍场面；advantage 必须写能直接进剧本的行动抓手。',
    'arc 必须写成：起点 → 触发事件 → 中段摇摆 → 代价选择 → 终局变化，禁止只写“最终背叛/最终战死/最终醒悟”。',
    '输出结构：',
    '{',
    '  "characters": [',
    '    {',
    '      "id": "占位符ID原样返回",',
    '      "name": "优先沿用占位名；若必须改名，只允许更像正式人名，不允许改人物位次",',
    '      "depthLevel": "core|mid|extra",',
    '      "factionId": "当前势力ID原样返回",',
    '      "branchId": "当前分支ID原样返回",',
    '      "roleInFaction": "leader|enforcer|variable|functional",',
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

    const result = parsed as CharacterProfileV2Result
    return {
      characters: result.characters.map((character) => {
        const legacy = mapV2ToLegacyCharacterDraft(character)
        return {
          ...character,
          biography: legacy.biography,
          publicMask: legacy.publicMask,
          arc: character.depthLevel === 'core' ? legacy.arc : character.arc
        }
      })
    }
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

function buildFallbackCharacterProfileFromPlaceholder(input: {
  storyIntent: StoryIntentPackageDto
  faction: FactionDto
  branch: FactionBranchDto
  placeholder: CharacterPlaceholderDto
}): CharacterProfileV2Dto {
  const { storyIntent, faction, branch, placeholder } = input
  const protagonist = storyIntent.protagonist || '主角'
  const antagonist = storyIntent.antagonist || '对手'
  const placeholderText = [
    placeholder.name,
    placeholder.identity,
    placeholder.coreMotivation,
    placeholder.plotFunction,
    branch.name,
    branch.positioning,
    branch.coreDemand
  ].join('\n')
  const isSeniorDisciple = /亲传|大弟子|师兄|同门|师父|掌门派/u.test(placeholderText)
  const roleAction =
    placeholder.roleInFaction === 'leader'
      ? `拍板${faction.name}的关键选择`
      : placeholder.roleInFaction === 'enforcer'
        ? `把${branch.name}的压力落到${protagonist}身上`
        : placeholder.roleInFaction === 'variable'
          ? `在${protagonist}和${antagonist}之间制造立场反转`
          : `把${faction.name}的现场信息递到主线里`
  const pressureTarget =
    placeholder.coreMotivation || branch.coreDemand || faction.coreDemand || faction.coreValues
  const conflictTrigger =
    isSeniorDisciple
      ? `${protagonist}被逼到无路可退，或证据指向${branch.name}时`
      : placeholder.roleInFaction === 'leader'
      ? `${protagonist}动摇${faction.name}利益时`
      : placeholder.roleInFaction === 'enforcer'
        ? `${protagonist}拿到能反咬${branch.name}的证据时`
        : placeholder.roleInFaction === 'variable'
          ? `两边都逼他交出真实立场时`
          : `现场消息断掉或上层命令压下来时`
  const advantage =
    isSeniorDisciple
      ? '亲传大弟子的威望、同门人脉和戒律流程，能把门规压力变成现场缓冲'
      : placeholder.roleInFaction === 'leader'
      ? `调动${faction.name}资源压场`
      : placeholder.roleInFaction === 'enforcer'
        ? '熟悉门路、敢下脏手、能把刁难变成现场压力'
        : placeholder.roleInFaction === 'variable'
          ? '掌握两边都不敢公开的暗线消息'
          : '跑腿传话、探路放风、把风声带到台前'
  const hiddenPressure = isSeniorDisciple
    ? `${placeholder.name}夹在师父命令、同门规矩和对${protagonist}的关心之间，越按程序施压，越可能亲手把${protagonist}逼进绝境`
    : `${placeholder.name}夹在${branch.name}职责、${pressureTarget}和${protagonist}带来的现场变局之间，继续服从或临场改口都会留下代价`
  const fear = isSeniorDisciple
    ? `继续服从师命反而害死${protagonist}，也怕同门因一次放水被${antagonist}清算`
    : `失去${pressureTarget}，或在${protagonist}反击后替${branch.name}背下现场后果`
  const protectTarget = isSeniorDisciple
    ? `师父的托付、同门安危和${protagonist}尚未暴露前的退路`
    : `${pressureTarget}、${faction.name}的基本秩序，以及自己还能补救的现场关系`
  const weakness = isSeniorDisciple
    ? '太习惯按师命和同门规矩处理问题，一旦局势绕过程序，动作会慢半拍'
    : `过度依赖${faction.name}和${branch.name}给出的身份，一旦局势绕过程序就会慢半拍`
  const biography = isSeniorDisciple
    ? `${placeholder.name}是${placeholder.identity}，隶属${faction.name}${branch.name}。表面按门规把压力落到${protagonist}身上，私下却受师父托付和同门情义牵制，必须在执行命令与替${protagonist}留退路之间做选择。`
    : `${placeholder.name}是${placeholder.identity}，隶属${faction.name}${branch.name}。表面执行阵营命令，私下受${pressureTarget}牵制，负责${roleAction}。`

  return {
    id: placeholder.id,
    name: placeholder.name,
    depthLevel: placeholder.depthLevel,
    factionId: faction.id,
    branchId: branch.id,
    roleInFaction: placeholder.roleInFaction,
    appearance: `${placeholder.identity}，外在特征后续可重绘细化`,
    personality:
      placeholder.roleInFaction === 'enforcer'
        ? '行动直接，遇到阻力先压人再解释'
        : placeholder.roleInFaction === 'variable'
          ? '表面顺从，心里一直给自己留退路'
          : '受位置和职责驱动，习惯先按阵营利益判断',
    identity: placeholder.identity,
    values: pressureTarget,
    plotFunction: `${placeholder.plotFunction}，并负责${roleAction}`,
    hiddenPressure,
    fear,
    protectTarget,
    conflictTrigger,
    advantage,
    weakness,
    goal: placeholder.coreMotivation || `完成${faction.name}交代的任务`,
    arc: `起点：${placeholder.name}依靠${branch.name}给出的身份行动；触发：${conflictTrigger}；摇摆：${placeholder.name}发现继续服从会让自己背下现场后果；代价选择：守住${protectTarget}还是承认局势已经失控；终局变化：${placeholder.name}在关键选择后承担站队代价。`,
    publicMask: `${placeholder.identity}，按${faction.name}规矩办事`,
    biography
  }
}

function buildFallbackCharacterProfilesFromFaction(input: {
  storyIntent: StoryIntentPackageDto
  faction: FactionDto
  characterNames?: string[]
}): CharacterProfileV2Dto[] {
  const allowedNames = input.characterNames ? new Set(input.characterNames) : null
  return input.faction.branches.flatMap((branch) =>
    branch.characters
      .filter((placeholder) => (allowedNames ? allowedNames.has(placeholder.name) : true))
      .map((placeholder) =>
        buildFallbackCharacterProfileFromPlaceholder({
          storyIntent: input.storyIntent,
          faction: input.faction,
          branch,
          placeholder
        })
      )
  )
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
  const scopedCharacters =
    scopedMatrix.factions[0]?.branches.flatMap((branch) => branch.characters) ?? []
  const scopedExistingCharacters = input.existingCharacters?.filter((character) =>
    input.faction.branches.some((branch) =>
      branch.characters.some((placeholder) => placeholder.name === character.name)
    )
  )
  const singleCharacterBranch =
    scopedCharacters.length === 1
      ? scopedMatrix.factions[0]?.branches.find((branch) => branch.characters.length > 0)
      : undefined
  const singleCharacterPlaceholder =
    scopedCharacters.length === 1 && singleCharacterBranch
      ? singleCharacterBranch.characters[0]
      : undefined
  const marketProfile = input.storyIntent.marketProfile
  const prompt =
    singleCharacterPlaceholder && singleCharacterBranch
      ? buildSingleCharacterProfileV2AgentPrompt({
          storyIntent: input.storyIntent,
          faction: input.faction,
          branch: singleCharacterBranch,
          placeholder: singleCharacterPlaceholder,
          existingCharacter: scopedExistingCharacters?.find(
            (character) => character.name === singleCharacterPlaceholder.name
          ),
          marketProfile
        })
      : buildCharacterProfileV2AgentPrompt({
          storyIntent: input.storyIntent,
          factionMatrix: scopedMatrix,
          existingCharacters: scopedExistingCharacters,
          marketProfile
        })
  const maxOutputTokens =
    scopedCharacters.length === 1
      ? CHARACTER_PROFILE_V2_SINGLE_CHARACTER_MAX_OUTPUT_TOKENS
      : CHARACTER_PROFILE_V2_MAX_OUTPUT_TOKENS
  await input.log(
    `faction_start faction=${input.faction.name} characterCount=${scopedCharacters.length} promptChars=${prompt.length} timeoutMs=${resolveAiStageTimeoutMs('character_profile')} maxOutputTokens=${maxOutputTokens}`
  )

  let currentPrompt = prompt
  let parseIssues: string[] = []
  let retryMode: 'fresh' | 'retry_parse' | 'retry_runtime' = 'fresh'

  for (let attempt = 1; attempt <= CHARACTER_PROFILE_V2_MAX_ATTEMPTS; attempt += 1) {
    let resultText = ''

    try {
      const timeoutMs = resolveAiStageTimeoutMs('character_profile', {
        recoveryMode: retryMode
      })
      const result = await input.generateText(
        {
          task: 'character_profile',
          prompt: currentPrompt,
          allowFallback: false,
          responseFormat: 'json_object',
          temperature: attempt === 1 ? 0.5 : 0.35,
          timeoutMs,
          maxOutputTokens,
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
        if (shouldSplitFactionIntoSingleCharacterCalls(normalizedError.message)) {
          throw new Error(
            `character_profile_v2_generation_failed:${input.faction.name}:${normalizedError.message}`
          )
        }
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
    const isParseFailure = normalizedError.message.startsWith(
      `character_profile_v2_parse_failed:${input.faction.name}:`
    )

    if (
      (!isRuntimeFailure && !isParseFailure) ||
      (isRuntimeFailure && !shouldSplitFactionIntoSingleCharacterCalls(normalizedError.message))
    ) {
      throw normalizedError
    }

    const totalCharacters = input.faction.branches.flatMap((branch) => branch.characters)
    if (totalCharacters.length <= 1) {
      if (!isParseFailure) {
        throw normalizedError
      }
      await input.log(
        `faction_parse_fallback faction=${input.faction.name} elapsedMs=${Date.now() - input.startedAt} characterCount=${totalCharacters.length} reason=${normalizedError.message}`
      )
      return buildFallbackCharacterProfilesFromFaction({
        storyIntent: input.storyIntent,
        faction: input.faction
      })
    }

    await input.log(
      `faction_adaptive_split_start faction=${input.faction.name} elapsedMs=${Date.now() - input.startedAt} characterCount=${totalCharacters.length} reason=${normalizedError.message}`
    )

    const splitResults = await runWithConcurrencyLimit({
      items: totalCharacters,
      concurrency: CHARACTER_PROFILE_V2_SPLIT_CONCURRENCY_LIMIT,
      worker: async (character) => {
        try {
          return await generateCharacterProfileV2ForFaction({
            ...input,
            characterNames: [character.name]
          })
        } catch (splitError) {
          const normalizedSplitError =
            splitError instanceof Error ? splitError : new Error(String(splitError || 'unknown'))
          const splitParseFailure = normalizedSplitError.message.startsWith(
            `character_profile_v2_parse_failed:${input.faction.name}:`
          )
          if (!splitParseFailure) {
            throw normalizedSplitError
          }
          await input.log(
            `faction_parse_fallback faction=${input.faction.name} elapsedMs=${Date.now() - input.startedAt} character=${character.name} reason=${normalizedSplitError.message}`
          )
          return buildFallbackCharacterProfilesFromFaction({
            storyIntent: input.storyIntent,
            faction: input.faction,
            characterNames: [character.name]
          })
        }
      }
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
        await import('../../infrastructure/diagnostics/runtime-diagnostic-log.js')
      await appendRuntimeDiagnosticLog('character_profile_v2', message)
    })

  await log(
    `start totalEpisodes=${input.storyIntent.shortDramaConstitution?.episodeTotal ?? 0} factionCount=${input.factionMatrix.factions.length} concurrency=${CHARACTER_PROFILE_V2_FACTION_CONCURRENCY_LIMIT}`
  )

  if (input.factionMatrix.factions.length === 0) {
    throw new Error('character_profile_v2_generation_failed:no_factions')
  }

  const factionResults = await runWithConcurrencyLimit({
    items: input.factionMatrix.factions,
    concurrency: CHARACTER_PROFILE_V2_FACTION_CONCURRENCY_LIMIT,
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
