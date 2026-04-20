/**
 * src/main/application/workspace/faction-matrix-agent.ts
 *
 * 势力拆解表 Agent。
 *
 * 职责：从故事梗概和总集数中拆解出多层级势力矩阵，
 * 生成 1+2+X 人物编制和势力交叉渗透关系。
 *
 * 输入：故事梗概 + 总集数
 * 输出：FactionMatrixDto（严格 JSON）
 */

import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import { generateTextWithRuntimeRouter } from '../ai/generate-text'
import { resolveAiStageTimeoutMs } from '../ai/resolve-ai-stage-timeout'
import type { StoryIntentPackageDto } from '@shared/contracts/intake'
import type { FactionMatrixDto } from '@shared/contracts/faction-matrix'

export interface FactionMatrixAgentInput {
  storyIntent: StoryIntentPackageDto
  totalEpisodes: number
}

function resolveFactionMatrixMaxOutputTokens(totalEpisodes: number): number {
  if (totalEpisodes <= 24) {
    return 6000
  }

  return 8000
}

function normalizeJsonEnvelope(rawText: string): string {
  return rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim()
}

function resolveFactionMatrixThresholds(totalEpisodes: number): {
  minFactions: number
  minBranchesPerFaction: number
  minCharactersPerBranch: number
  minCrossRelations: number
} {
  if (totalEpisodes <= 24) {
    return {
      minFactions: 2,
      minBranchesPerFaction: 2,
      minCharactersPerBranch: 2,
      minCrossRelations: 1
    }
  }

  return {
    minFactions: 3,
    minBranchesPerFaction: 2,
    minCharactersPerBranch: 3,
    minCrossRelations: 2
  }
}

function summarizeFactionMatrixParseIssues(rawText: string, totalEpisodes: number): string[] {
  const issues: string[] = []
  const thresholds = resolveFactionMatrixThresholds(totalEpisodes)

  try {
    const cleaned = normalizeJsonEnvelope(rawText)
    const parsed = JSON.parse(cleaned)

    if (!parsed.title) {
      issues.push('title_missing')
    }

    if (!Array.isArray(parsed.factions)) {
      issues.push('factions_missing')
    } else {
      if (parsed.factions.length < thresholds.minFactions) {
        issues.push(`factions_short:${parsed.factions.length}/${thresholds.minFactions}`)
      }

      parsed.factions.forEach((faction: Record<string, unknown>, factionIndex: number) => {
        const branches = Array.isArray(faction.branches) ? faction.branches : []
        if (branches.length < thresholds.minBranchesPerFaction) {
          issues.push(
            `branches_short:faction_${factionIndex + 1}:${branches.length}/${thresholds.minBranchesPerFaction}`
          )
        }

        branches.forEach((branch: Record<string, unknown>, branchIndex: number) => {
          const characters = Array.isArray(branch.characters) ? branch.characters : []
          if (characters.length < thresholds.minCharactersPerBranch) {
            issues.push(
              `characters_short:faction_${factionIndex + 1}_branch_${branchIndex + 1}:${characters.length}/${thresholds.minCharactersPerBranch}`
            )
          }
        })
      })
    }

    if (!Array.isArray(parsed.crossRelations)) {
      issues.push('cross_relations_missing')
    } else if (parsed.crossRelations.length < thresholds.minCrossRelations) {
      issues.push(
        `cross_relations_short:${parsed.crossRelations.length}/${thresholds.minCrossRelations}`
      )
    }
  } catch {
    issues.push('json_parse_failed')
  }

  return issues
}

function buildFactionMatrixRetryPrompt(input: {
  originalPrompt: string
  totalEpisodes: number
  parseIssues: string[]
}): string {
  const thresholds = resolveFactionMatrixThresholds(input.totalEpisodes)
  return [
    '你上一版势力矩阵没有通过结构校验。',
    '这次只输出合法 JSON，不要解释，不要 markdown，不要 ```json。',
    `最少要求：${thresholds.minFactions} 个一级势力、每个势力 ${thresholds.minBranchesPerFaction} 个分支、每个分支 ${thresholds.minCharactersPerBranch} 个角色、至少 ${thresholds.minCrossRelations} 条 crossRelations。`,
    `上一版问题：${input.parseIssues.join('、') || 'unknown'}`,
    '如果总集数较短，也必须优先保住结构完整，再压缩文案长度。',
    '',
    '只输出这个结构：',
    '{',
    '  "title": "string",',
    '  "totalEpisodes": 20,',
    '  "factions": [',
    '    {',
    '      "id": "faction_01",',
    '      "name": "string",',
    '      "positioning": "string",',
    '      "coreDemand": "string",',
    '      "coreValues": "string",',
    '      "mainMethods": ["string"],',
    '      "vulnerabilities": ["string"],',
    '      "branches": [',
    '        {',
    '          "id": "branch_01",',
    '          "name": "string",',
    '          "parentFactionId": "faction_01",',
    '          "positioning": "string",',
    '          "coreDemand": "string",',
    '          "characters": [',
    '            {',
    '              "id": "char_01",',
    '              "name": "string",',
    '              "roleInFaction": "leader",',
    '              "branchId": "branch_01",',
    '              "depthLevel": "core",',
    '              "identity": "string",',
    '              "coreMotivation": "string",',
    '              "plotFunction": "string",',
    '              "isSleeper": false,',
    '              "sleeperForFactionId": null',
    '            }',
    '          ]',
    '        }',
    '      ]',
    '    }',
    '  ],',
    '  "crossRelations": [',
    '    {',
    '      "id": "cross_01",',
    '      "relationType": "double_agent",',
    '      "fromFactionId": "faction_01",',
    '      "toFactionId": "faction_02",',
    '      "involvedCharacterIds": ["char_01"],',
    '      "description": "string",',
    '      "revealEpisodeRange": { "start": 5, "end": 8 }',
    '    }',
    '  ],',
    '  "landscapeSummary": "string",',
    '  "factionTimetable": [{ "factionId": "faction_01", "entryEpisode": 1, "entryDescription": "string" }]',
    '}',
    '',
    '项目上下文：',
    input.originalPrompt
  ].join('\n')
}

export function buildFactionMatrixAgentPrompt(input: FactionMatrixAgentInput): string {
  const premise = input.storyIntent.sellingPremise || '待补'
  const coreConflict = input.storyIntent.coreConflict || '待补'
  const protagonist = input.storyIntent.protagonist || '主角'
  const antagonist = input.storyIntent.antagonist || '反派'
  const genre = input.storyIntent.genre || '短剧'
  const worldView = input.storyIntent.shortDramaConstitution?.worldViewBrief || '待补'

  return [
    '【势力拆解表 Agent · 世界观矩阵生成指令】',
    '输出严格JSON，无文本、无解释。',
    '',
    '【核心铁律】',
    `1. 这是一个 ${input.totalEpisodes} 集${genre}项目，必须撑起足够复杂的多势力博弈。`,
    '2. 至少拆解出 3 个一级势力（如：正派、反派联盟、第三方中立），每个一级势力下至少 2 个二级分支（如：激进派、保守派）。',
    '3. 每个二级分支必须包含至少 3 个人物占位符：1个领袖（定策略）+ 1-2个干将（执行冲突）+ 1个变数/内鬼。',
    '4. 必须生成 crossRelations（势力交织表），明确指出：谁是安插在谁那里的卧底、谁和谁表面盟友实则死敌、谁是双面间谍。冲突从人升维到阵营。',
    '5. 势力格局不能写成好人打坏人，必须每个势力都有合理诉求和软肋。',
    '',
    '【1+2+X 编制铁律】',
    '每个二级分支的人物编制：',
    '  - 1 个领袖：定策略、拍板、分配资源',
    '  - 1-2 个干将：执行冲突、打手、冲锋陷阵',
    '  - 1 个变数/内鬼：立场摇摆、暗棋、可能倒戈',
    '  - X 个功能性龙套：只生成"身份+核心动机"一行字',
    '',
    '【势力交叉渗透铁律】',
    '  - 至少 2 个卧底关系（谁安插在谁那里）',
    '  - 至少 1 对表面盟友实为暗敌',
    '  - 至少 1 个双面间谍',
    '  - 每个交叉关系必须写明预计爆发集数区间',
    '',
    '【人员层级差异化】',
    '  - 核心人物（3-5人）：depthLevel="core"，需要超详尽的人物定义',
    '  - 势力中层人物：depthLevel="mid"，重点填身份+价值观+功能',
    '  - 功能性龙套：depthLevel="extra"，只生成一行"身份+核心动机"',
    '',
    '【故事前提】',
    `- 设定成交句：${premise}`,
    `- 核心冲突：${coreConflict}`,
    `- 主角方向：${protagonist}`,
    `- 对手方向：${antagonist}`,
    `- 世界观摘要：${worldView}`,
    `- 总集数：${input.totalEpisodes}`,
    '',
    '【输出格式】',
    '严格输出 JSON，不要 markdown，不要解释：',
    '{',
    '  "title": string,',
    '  "totalEpisodes": number,',
    '  "factions": [',
    '    {',
    '      "id": "faction_01",',
    '      "name": string,',
    '      "positioning": string,',
    '      "coreDemand": string,',
    '      "coreValues": string,',
    '      "mainMethods": [string],',
    '      "vulnerabilities": [string],',
    '      "branches": [',
    '        {',
    '          "id": "faction_01_branch_01",',
    '          "name": string,',
    '          "parentFactionId": "faction_01",',
    '          "positioning": string,',
    '          "coreDemand": string,',
    '          "characters": [',
    '            {',
    '              "id": "char_01",',
    '              "name": string,',
    '              "roleInFaction": "leader"|"enforcer"|"variable"|"functional",',
    '              "branchId": "faction_01_branch_01",',
    '              "depthLevel": "core"|"mid"|"extra",',
    '              "identity": string,',
    '              "coreMotivation": string,',
    '              "plotFunction": string,',
    '              "isSleeper": boolean,',
    '              "sleeperForFactionId": string | null',
    '            }',
    '          ]',
    '        }',
    '      ]',
    '    }',
    '  ],',
    '  "crossRelations": [',
    '    {',
    '      "id": "cross_01",',
    '      "relationType": "sleeper_agent"|"secret_ally"|"secret_enemy"|"pawn"|"defector"|"double_agent"|"hostage_bond"|"debtor",',
    '      "fromFactionId": string,',
    '      "toFactionId": string,',
    '      "involvedCharacterIds": [string],',
    '      "description": string,',
    '      "revealEpisodeRange": { "start": number, "end": number }',
    '    }',
    '  ],',
    '  "landscapeSummary": string,',
    '  "factionTimetable": [',
    '    { "factionId": string, "entryEpisode": number, "entryDescription": string }',
    '  ]',
    '}'
  ].join('\n')
}

export function parseFactionMatrixResponse(rawText: string): FactionMatrixDto | null {
  return parseFactionMatrixResponseWithEpisodeCount(rawText, 60)
}

export function parseFactionMatrixResponseWithEpisodeCount(
  rawText: string,
  totalEpisodes: number
): FactionMatrixDto | null {
  try {
    const cleaned = normalizeJsonEnvelope(rawText)
    const parsed = JSON.parse(cleaned)
    const thresholds = resolveFactionMatrixThresholds(totalEpisodes)

    if (!parsed.title || !Array.isArray(parsed.factions) || parsed.factions.length < thresholds.minFactions) {
      return null
    }

    for (const faction of parsed.factions) {
      if (!Array.isArray(faction.branches) || faction.branches.length < thresholds.minBranchesPerFaction) {
        return null
      }
      for (const branch of faction.branches) {
        if (!Array.isArray(branch.characters) || branch.characters.length < thresholds.minCharactersPerBranch) {
          return null
        }
      }
    }

    if (!Array.isArray(parsed.crossRelations) || parsed.crossRelations.length < thresholds.minCrossRelations) {
      return null
    }

    return parsed as FactionMatrixDto
  } catch {
    return null
  }
}

export async function generateFactionMatrix(input: {
  storyIntent: StoryIntentPackageDto
  totalEpisodes: number
  runtimeConfig: RuntimeProviderConfig
  generateText?: typeof generateTextWithRuntimeRouter
  signal?: AbortSignal
  diagnosticLogger?: (message: string) => Promise<void>
}): Promise<FactionMatrixDto> {
  const generateText = input.generateText ?? generateTextWithRuntimeRouter
  const prompt = buildFactionMatrixAgentPrompt({
    storyIntent: input.storyIntent,
    totalEpisodes: input.totalEpisodes
  })
  const startedAt = Date.now()
  const timeoutMs = resolveAiStageTimeoutMs('faction_matrix')
  const maxOutputTokens = resolveFactionMatrixMaxOutputTokens(input.totalEpisodes)

  const log =
    input.diagnosticLogger ??
    (async (message: string) => {
      const { appendRuntimeDiagnosticLog } = await import(
        '../../infrastructure/diagnostics/runtime-diagnostic-log.js'
      )
      await appendRuntimeDiagnosticLog('faction_matrix', message)
    })

  await log(
    `start totalEpisodes=${input.totalEpisodes} promptChars=${prompt.length} timeoutMs=${timeoutMs} maxOutputTokens=${maxOutputTokens}`
  )

  let currentPrompt = prompt
  let parseIssues: string[] = []

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let result
    try {
      result = await generateText(
        {
          task: 'faction_matrix',
          prompt: currentPrompt,
          allowFallback: false,
          responseFormat: 'json_object',
          temperature: attempt === 1 ? 0.55 : 0.35,
          timeoutMs,
          maxOutputTokens,
          runtimeHints: {
            strictness: 'strict',
            totalEpisodes: input.totalEpisodes,
            recoveryMode: attempt === 1 ? 'fresh' : 'retry_parse'
          }
        },
        input.runtimeConfig,
        { signal: input.signal }
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || 'unknown')
      if (/^ai_request_timeout:\d+ms$/i.test(message)) {
        await log(
          `timeout elapsedMs=${Date.now() - startedAt} attempt=${attempt} timeoutMs=${timeoutMs} error=${message}`
        )
        throw new Error(`faction_matrix_timeout:${timeoutMs}ms`)
      }

      await log(
        `runtime_failed elapsedMs=${Date.now() - startedAt} attempt=${attempt} timeoutMs=${timeoutMs} error=${message}`
      )
      throw new Error(`faction_matrix_generation_failed:${message}`)
    }

    const parsed = parseFactionMatrixResponseWithEpisodeCount(result.text, input.totalEpisodes)
    const responsePreview = result.text.replace(/\s+/g, ' ').trim()

    if (parsed) {
      await log(
        `finish elapsedMs=${Date.now() - startedAt} attempt=${attempt} responseChars=${result.text.length} parsed=yes responseHead=${responsePreview.slice(0, 200)} responseTail=${responsePreview.slice(-200)}`
      )
      return parsed
    }

    parseIssues = summarizeFactionMatrixParseIssues(result.text, input.totalEpisodes)
    await log(
      `parse_failed elapsedMs=${Date.now() - startedAt} attempt=${attempt} responseChars=${result.text.length} issues=${parseIssues.join(',') || 'unknown'} responseHead=${responsePreview.slice(0, 200)} responseTail=${responsePreview.slice(-200)}`
    )

    if (attempt < 2) {
      currentPrompt = buildFactionMatrixRetryPrompt({
        originalPrompt: prompt,
        totalEpisodes: input.totalEpisodes,
        parseIssues
      })
    }
  }

  throw new Error(`faction_matrix_parse_failed:${parseIssues.join(',') || 'unknown'}`)
}

