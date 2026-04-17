/**
 * LEGACY / NON-PRODUCTION REPAIR HELPER
 *
 * This file is not the current production repair entry.
 *
 * Current production repair path stays in:
 * run-script-generation-batch -> repair-script-quality-with-agents -> finalize-script-postflight
 *
 * Keep this file only as historical repair logic reference until the script-generation boundary
 * cleanup is fully finished.
 */
import fs from 'node:fs'
import path from 'node:path'
import type { RuntimeProviderConfig } from '../../../infrastructure/runtime-env/provider-config'
import type { StartScriptGenerationInputDto } from '../../../../shared/contracts/script-generation'
import type {
  DetailedOutlineBlockDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  CharacterDraftDto,
  ScriptSegmentDto
} from '../../../../shared/contracts/workflow'
import {
  inspectScreenplayQualityBatch,
  inspectScreenplayQualityEpisode,
  scoreScreenplayQualityProblems
} from '../../../../shared/domain/script/screenplay-quality'
import {
  chooseBetterRepairedScene,
  compactOverlongScreenplay
} from '../../../../shared/domain/script/screenplay-repair-guard'
import { executeScriptRepair } from '../repair/execute-script-repair'
import { hasVoiceOverLeak } from '../../../../shared/domain/script/screenplay-format'
import { generateTextWithRuntimeRouter } from '../../ai/generate-text'
import { resolveAiStageTimeoutMs } from '../../ai/resolve-ai-stage-timeout'
import { EPISODE_CHAR_COUNT } from '../../../../shared/domain/workflow/contract-thresholds'

const MAX_QUALITY_REPAIR_PASSES = 2
/** 单集字数修复最大重试次数 */
const MAX_CHAR_REPAIR_PASSES = 3
const FAT_SCENE_CHAR_THRESHOLD = 1300
const VERY_FAT_SCENE_CHAR_THRESHOLD = 1600
const THIN_SCENE_CHAR_THRESHOLD = 750
const VERY_THIN_SCENE_CHAR_THRESHOLD = 500
function isCharCountInContract(charCount: number, sceneCount: number): boolean {
  const min = EPISODE_CHAR_COUNT.min(sceneCount)
  const max = EPISODE_CHAR_COUNT.max
  return charCount >= min && charCount <= max
}

/**
 * 生成单集（用于字数修复失败后的重新生成）
 * 传入原始 generationInput，返回只含目标集的新 prompt text
 */
async function regenerateSingleEpisodeCharCount(
  episodePlan: { episodeNo: number; lane: string; runtimeHints?: Record<string, unknown> },
  generationInput: StartScriptGenerationInputDto,
  charCountDirection: 'too_short' | 'too_long',
  runtimeConfig: RuntimeProviderConfig,
  outline: OutlineDraftDto,
  characters: CharacterDraftDto[]
): Promise<ScriptSegmentDto> {
  const singlePlan = generationInput.plan.episodePlans.filter(
    (p) => p.episodeNo === episodePlan.episodeNo
  )
  const singleInput: StartScriptGenerationInputDto = {
    ...generationInput,
    plan: { ...generationInput.plan, episodePlans: singlePlan }
  }

  const { createScriptGenerationPrompt } = await import('../prompt/create-script-generation-prompt.ts')
  const basePrompt = createScriptGenerationPrompt(singleInput, outline, characters, episodePlan.episodeNo, [])
  const min = EPISODE_CHAR_COUNT.min(3)
  const max = EPISODE_CHAR_COUNT.max
  const correction = charCountDirection === 'too_short'
    ? `【字数扩充要求】上一版字数不够，需要扩充。每场必须增加对手交锋、动作结果、局面变化。双方各至少1句硬对白，集尾落成已发生的结果。不准只补感叹句和解释句凑字数。目标：${min}-${max}字。`
    : `【字数压缩要求】上一版字数超了，需要压缩。优先删同义对白、重复动作、重复逼问。只删水词，不删实质冲突。集尾钩子不能削弱。目标：${min}-${max}字。`

  const prompt = [basePrompt, '', correction].join('\n')

  const response = await generateTextWithRuntimeRouter(
    {
      task: 'episode_script',
      prompt,
      allowFallback: false,
      temperature: 0.55,
      timeoutMs: resolveAiStageTimeoutMs('episode_script'),
      runtimeHints: { estimatedContextTokens: 8000, isRewriteMode: true }
    },
    runtimeConfig
  )

  const { parseGeneratedScene } = await import('./parse-generated-scene.ts')
  return parseGeneratedScene(response.text, episodePlan.episodeNo)
}

function charCountOf(scene: ScriptSegmentDto): number {
  return ((scene.screenplay || '').replace(/\s+/g, '')).length
}

/**
 * 判断单集字数是否在合同范围内
 */
function episodeCharCountInContract(scene: ScriptSegmentDto): boolean {
  const sceneCount = scene.screenplayScenes?.length || 3
  return isCharCountInContract(charCountOf(scene), sceneCount)
}

/**
 * VO 规则式自动修复
 * 将「李科：（画外音）让他进来。」重写为「△门外传来李科的声音："让他进来。"」
 */
function repairVoiceOver(scene: ScriptSegmentDto): ScriptSegmentDto {
  const screenplay = scene.screenplay || ''
  if (!hasVoiceOverLeak(screenplay)) {
    return scene
  }

  let fixed = screenplay

  // 规则 1: 替换「（画外音）」→「△传来声音」
  fixed = fixed.replace(/([^：:\n]+)：\s*（画外音[^）]*）\s*([^（\n]+)?/g, '△传来$1的声音："$2"')

  // 规则 2: 替换「（OS）」→「△传来声音」
  fixed = fixed.replace(/([^：:\n]+)：\s*（OS）\s*([^（)\n]+)/g, '△传来$1的声音："$2"')

  // 规则 3: 替换「（旁白）」→「△旁白声」
  fixed = fixed.replace(/([^：:\n]+)：\s*（旁白）\s*([^（)\n]+)/g, '△旁白声："$2"')

  // 规则 4: 替换「：（画外）」→「△传来声音」
  fixed = fixed.replace(/([^：:\n]+)：\s*（画外）\s*([^（)\n]+)/g, '△传来$1的声音："$2"')

  // 规则 5: 替换「V.O.」或「O.S.」标记
  fixed = fixed.replace(/([^：:\n]+)：\s*（V\.O\.）\s*([^（)\n]+)/g, '△传来$1的声音："$2"')
  fixed = fixed.replace(/([^：:\n]+)：\s*（O\.S\.）\s*([^（)\n]+)/g, '△传来$1的声音："$2"')

  // 如果修复后有变化，更新 screenplay
  if (fixed !== screenplay) {
    return {
      ...scene,
      screenplay: fixed,
      // 重建 action/dialogue/emotion
      action: fixed
        .split('\n')
        .filter((line) => line.startsWith('△'))
        .join('\n'),
      dialogue: fixed
        .split('\n')
        .filter((line) => /^[^△\n]+：/.test(line))
        .join('\n'),
      emotion: ''
    }
  }

  return scene
}

/**
 * AI 辅助字数修复
 * 调用大模型进行智能压缩或扩充
 */
async function repairCharCountWithAi(
  scene: ScriptSegmentDto,
  charCount: number,
  runtimeConfig: RuntimeProviderConfig,
  beatSummary?: string
): Promise<ScriptSegmentDto> {
  const sceneCount = scene.screenplayScenes?.length || 0
  const TARGET_MIN = EPISODE_CHAR_COUNT.min(sceneCount)
  const TARGET_MAX = EPISODE_CHAR_COUNT.max
  // Asymmetric thresholds:
  // - Overlong: > MAX+50 → catches 1200+ for 2-scene, 1200+ for 3-scene, 1200+ for 4-scene.
  //   Previous 50 caused胖集 to still fail quality (1150+) → widened to 50 only on the upper side.
  // - TooShort: < MIN-100 → keeps the original trigger point. Borderline thin (700-800)
  //   is handled by Step 2 repair instruction, not by AI rewrite. Avoids triggering on
  //   the 750-850 range that was already passing in v5.
  const isExtremeOverlong = charCount > TARGET_MAX + 0
  const isExtremeTooShort = charCount < TARGET_MIN - 100

  if (!isExtremeOverlong && !isExtremeTooShort) {
    return scene
  }

  const voBan =
    '绝对禁止使用画外音、旁白、OS、V.O.、O.S.，所有对白必须是在场人物说的。如果原文有画外音标记，必须改成△传来声音或在场对白。'
  const sceneStats = (scene.screenplayScenes || [])
    .map((item, index) => ({
      sceneNo: index + 1,
      bodyLength: (item.body || '').replace(/\s+/g, '').length
    }))
    .sort((a, b) => a.bodyLength - b.bodyLength)
  const shortestScene = sceneStats[0]
  const longestScene = sceneStats[sceneStats.length - 1]

  const prompt = isExtremeOverlong
    ? `【剧本压缩任务】
当前字数：${charCount}字
目标范围：${TARGET_MIN}-${TARGET_MAX} 字

压缩规则：
1. 删减重复的对白和动作描写
2. 缩短解释性段落，保留关键冲突
3. 保留集尾钩子，不能削弱
4. 不要改变剧情和人物关系
5. ${voBan}
6. ${longestScene ? `当前最胖的是第${longestScene.sceneNo}场，约${longestScene.bodyLength}字；优先删这一场的第二轮追打、重复解释、同义对白和多余翻盘。` : '优先删最胖场里的第二轮追打、重复解释、同义对白和多余翻盘。'}

原剧本：
${scene.screenplay}`
    : `【剧本扩充任务】
当前字数：${charCount}字
目标范围：${TARGET_MIN}-${TARGET_MAX} 字

扩充硬规则：
1. ${shortestScene ? `当前最短的是第${shortestScene.sceneNo}场，约${shortestScene.bodyLength}字；必须优先补这场。` : '必须优先补最短场。'}
2. 每场至少要有双方各1句实质性对白交锋，不能只有单方台词。
3. 补完对白后必须补结果：对方让步、失去筹码、被打断、被堵住、被迫认输或当场局势变化之一。
4. 集尾最后一句必须是已发生的结果（做了┄/倒下┄/说出┄/被按住┄），不能停在开放句。
5. 不准只补感叹句、解释句或“我方独白”凑字数；扩充必须是实质冲突交换。
6. ${voBan}
7. 不要改变剧情走向和人物关系，只在现有骨架里填实。

${beatSummary ? `本集核心：${beatSummary}` : ''}

原剧本：
${scene.screenplay}`

  try {
    const response = await generateTextWithRuntimeRouter(
      {
        task: 'episode_rewrite',
        prompt,
        allowFallback: false,
        temperature: 0.55,
        timeoutMs: resolveAiStageTimeoutMs('episode_rewrite'),
        runtimeHints: {
          episode: scene.sceneNo,
          estimatedContextTokens: 8000,
          strictness: 'strict',
          isRewriteMode: true,
          recoveryMode: 'retry_runtime'
        }
      },
      runtimeConfig
    )

    return {
      ...scene,
      screenplay: response.text,
      action: response.text
        .split('\n')
        .filter((line) => line.startsWith('△'))
        .join('\n'),
      dialogue: response.text
        .split('\n')
        .filter((line) => /^[^△\n]+：/.test(line))
        .join('\n'),
      emotion: ''
    }
  } catch (error) {
    // AI 修复失败，返回原剧本
    console.error(`[CharCount AI Repair Failed] Episode ${scene.sceneNo}:`, error)
    return scene
  }
}

function flattenDetailedOutlineBlocks(
  blocks: DetailedOutlineBlockDto[] | undefined
): DetailedOutlineSegmentDto[] {
  return (blocks || []).flatMap((block) =>
    (block.sections || []).map((section) => ({
      act: (section.act === 'opening' ||
      section.act === 'midpoint' ||
      section.act === 'climax' ||
      section.act === 'ending'
        ? section.act
        : 'ending') as DetailedOutlineSegmentDto['act'],
      blockNo: block.blockNo,
      segmentNo: section.sectionNo,
      startEpisode: section.startEpisode,
      endEpisode: section.endEpisode,
      title: section.title,
      content: section.summary ?? block.summary ?? '',
      hookType: section.hookType ?? '',
      episodeBeats: section.episodeBeats
    }))
  )
}

function buildSceneRepairInstruction(input: {
  problems: string[]
  charCount: number
  sceneCount: number
  beatSummary?: string
  beatSceneBySceneCount: number
  screenplayScenes?: Array<{ sceneCode?: string; body?: string }>
}): string {
  const { problems, charCount, sceneCount, beatSummary, beatSceneBySceneCount, screenplayScenes } =
    input
  const lines = ['请把这一集修回短剧合同内，同时保持逐集细纲核心事件不变。']
  lines.push('绝对禁止使用画外音、旁白、OS、V.O.、O.S.，所有对白必须是在场人物说的。')
  if (beatSummary) {
    lines.push(`本集细纲核心：${beatSummary}`)
  }
  if (beatSceneBySceneCount > 0) {
    lines.push(
      `本集上游 sceneByScene 已经给出 ${beatSceneBySceneCount} 场，修复时优先把这些骨架真正展开出来，不准凭空加戏。`
    )
  }
  if (problems.some((problem) => /^字数超过\d+字合同$/.test(problem))) {
    const longestScene = (screenplayScenes || [])
      .map((scene, index) => ({
        sceneNo: index + 1,
        bodyLength: (scene.body || '').replace(/\s+/g, '').length
      }))
      .sort((a, b) => b.bodyLength - a.bodyLength)[0]
    if (charCount > VERY_FAT_SCENE_CHAR_THRESHOLD) {
      lines.push(
        '这是严重过肥集：必须先按场收口。每场只保留 1 个核心推进回合，删掉同场里的第二、第三次翻盘。'
      )
    } else if (charCount > FAT_SCENE_CHAR_THRESHOLD) {
      lines.push('这是偏肥集：优先削掉同义对白、重复动作和重复逼问，把多余回合拆掉。')
    }
    lines.push(
      '优先删掉解释句、重复动作、重复对白和余波句，但不要删掉关键对打和结果，把全集收回可拍长度。'
    )
    lines.push(
      '2 场集每场目标 420-560 字，3 场集每场目标 280-380 字，4 场集每场目标 220-300 字；超预算的场先收。'
    )
    if (longestScene) {
      lines.push(
        `当前最胖的是第${longestScene.sceneNo}场，约${longestScene.bodyLength}字；先削这一场的第二轮追打、重复解释、同义对白和多余翻盘。`
      )
    }
  }
  if (problems.some((problem) => problem.startsWith('字数低于'))) {
    const shortestScene = (screenplayScenes || [])
      .map((scene, index) => ({
        sceneNo: index + 1,
        bodyLength: (scene.body || '').replace(/\s+/g, '').length
      }))
      .sort((a, b) => a.bodyLength - b.bodyLength)[0]
    lines.push(`当前字数约${charCount}字，目标底线${EPISODE_CHAR_COUNT.min(sceneCount)}字，差${EPISODE_CHAR_COUNT.min(sceneCount) - charCount}字。`)
    if (charCount < VERY_THIN_SCENE_CHAR_THRESHOLD) {
      lines.push('这是严重过瘦集：不能只补解释，必须补对手回应、动作结果和当场代价。')
    } else if (charCount < THIN_SCENE_CHAR_THRESHOLD) {
      lines.push('这是偏瘦集：至少补一轮“我方动作 -> 对方回应 -> 局面变化”的冲突交换。')
    }
    lines.push('每场必须补足双方对白交锋：双方各至少一句实质性台词，不能只有单方发言。')
    lines.push('补完对白后必须补结果：对方让步、失去筹码、被打断、被堵住、被迫认输或当场局势变化之一。')
    lines.push('集尾最后一句必须是已发生的结果，不能停在开放句。')
    lines.push('禁止只补感叹句、解释句或"我方独白"凑字数；扩充必须是实质冲突交换。')
    lines.push('在不加水的前提下补足关键对打和结果，让全局密度到拍摄可用长度。')
    lines.push('如果当前只有 2 场，每场都要有独立变位；不能一场交代起因、一场交代结果就结束。')
    if (shortestScene) {
      lines.push(
        `当前最短的是第${shortestScene.sceneNo}场，约${shortestScene.bodyLength}字；最短场至少补到200字，增加1句硬对白和1段动作结果。禁止只补解释句或感叹句凑字数。`
      )
    }
  }
  if (problems.includes('含画外音/旁白/OS')) {
    lines.push(
      '把所有「（画外音）」改成动作或环境音：改为「△传来某某声音」或直接写成人物在场对白，不准保留任何画外音标记。'
    )
  }
  if (problems.includes('至少有一场对白不足2句')) {
    lines.push('对白不足的场次至少补到 2 句硬对白，让双方都开口。')
  }
  if (problems.includes('集尾钩子偏弱')) {
    lines.push('最后一个场次的末段必须落成已经发生的硬动作或直接威胁，不能停在气氛和半悬着状态。')
  }
  if (problems.includes('场次数不在2-4场')) {
    lines.push('严格收回到 2-4 场，逐集细纲给几场就写几场，不能只写两句就断。')
  }
  if (problems.includes('正文含截断残句')) {
    lines.push('把所有被省略号截断的残句补完整，不能留下“……”式半句。')
  }
  if (problems.includes('至少有一场缺人物表')) {
    lines.push('缺失的人物表必须补齐到对应场次。')
  }
  if (problems.includes('至少有一场缺△动作')) {
    lines.push('缺失动作的场次必须补足至少 1 条可拍的 △ 动作。')
  }
  if (sceneCount === 2) {
    lines.push('当前 2 场集：每场都必须完成一次独立变位，不准第一场铺垫、第二场收尾就结束。')
  }
  if (sceneCount >= 3) {
    lines.push('当前 3-4 场集：每场只保留一轮推进，不准把两轮追打或两轮嘴仗叠在同一场。')
  }
  return lines.join('')
}

function buildQualityRepairSuggestions(
  scenes: ReturnType<typeof inspectScreenplayQualityBatch>['weakEpisodes'],
  segments: DetailedOutlineSegmentDto[],
  script: ScriptSegmentDto[]
) {
  return scenes.map((scene) => {
    const currentBeat = segments
      .flatMap((segment) => segment.episodeBeats || [])
      .find((beat) => beat.episodeNo === scene.sceneNo)
    const currentScriptScene = script.find((item) => item.sceneNo === scene.sceneNo)
    return {
      targetSceneNo: scene.sceneNo,
      policyKey: 'real_quality_contract',
      source: '真实验收质量裁判',
      focus: ['字数收口', '对白密度', '场尾硬钩', '可拍性'],
      evidenceHint: `当前未过线问题：${scene.problems.join('；')}`,
      instruction: buildSceneRepairInstruction({
        problems: scene.problems,
        charCount: scene.charCount,
        sceneCount: scene.sceneCount,
        beatSummary: currentBeat?.summary,
        beatSceneBySceneCount: currentBeat?.sceneByScene?.length || 0,
        screenplayScenes: currentScriptScene?.screenplayScenes
      })
    }
  })
}

function writeQualityRepairSnapshot(
  pass: number,
  stage: 'before' | 'after',
  scenes: ScriptSegmentDto[]
): void {
  const outDir = path.resolve(process.cwd(), '.codex')
  fs.mkdirSync(outDir, { recursive: true })
  for (const scene of scenes) {
    fs.writeFileSync(
      path.join(outDir, `script-quality-repair-pass${pass}-${stage}-scene-${scene.sceneNo}.txt`),
      scene.screenplay || '',
      'utf8'
    )
  }
}

function writeFinalQualityReportToEvidence(
  report: ReturnType<typeof inspectScreenplayQualityBatch>
): void {
  const caseId = process.env.E2E_CASE_ID
  if (!caseId) return
  try {
    const outDir = path.resolve(process.cwd(), 'tools', 'e2e', 'out', `evidence-${caseId}`)
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(
      path.join(outDir, 'final-quality-report.json'),
      JSON.stringify(report, null, 2),
      'utf8'
    )
  } catch {
    // non-blocking
  }
}

export async function repairGeneratedScenes(input: {
  generationInput: StartScriptGenerationInputDto
  runtimeConfig: RuntimeProviderConfig
  outline: OutlineDraftDto
  generatedScenes: ScriptSegmentDto[]
}): Promise<{
  generatedScenes: ScriptSegmentDto[]
  qualityReport: ReturnType<typeof inspectScreenplayQualityBatch>
}> {
  const segments = flattenDetailedOutlineBlocks(input.generationInput.detailedOutlineBlocks)
  if (segments.length === 0 || input.generatedScenes.length === 0) {
    return {
      generatedScenes: input.generatedScenes,
      qualityReport: inspectScreenplayQualityBatch(input.generatedScenes)
    }
  }

  let repairedScenes = input.generatedScenes.map((scene) => ({ ...scene }))

  // 记录哪些集已被步骤 2 修复过，步骤 3 跳过这些集
  const charCountRepairedSceneNos = new Set<number>()

  // 【步骤 1】字数循环修复：任何超出合同的集都修，最多 3 次
  const initialQualityReport = inspectScreenplayQualityBatch(repairedScenes)
  const charCountProblemSceneNos = new Set<number>()

  for (const weakEpisode of initialQualityReport.weakEpisodes) {
    const sceneIndex = repairedScenes.findIndex((s) => s.sceneNo === weakEpisode.sceneNo)
    if (sceneIndex === -1) continue

    const sceneNo = weakEpisode.sceneNo
    if (sceneNo === null || sceneNo === undefined) continue
    const hasCharCountProblem = weakEpisode.problems.some(
      (p) => /^字数超过\d+字合同$/.test(p) || /^字数低于\d+字合同$/.test(p)
    )
    if (!hasCharCountProblem) continue
    charCountProblemSceneNos.add(sceneNo)
  }

  // 如果没有任何字数问题，直接跳过整个修复流程
  if (charCountProblemSceneNos.size > 0) {
    console.log(`[repair] 发现 ${charCountProblemSceneNos.size} 集有字数问题，开始修复`)
    for (const sceneNo of charCountProblemSceneNos) {
      const sceneIndex = repairedScenes.findIndex((s) => s.sceneNo === sceneNo)
      if (sceneIndex === -1) continue

      let currentScene = repairedScenes[sceneIndex]
      let repaired = false

      for (let pass = 1; pass <= MAX_CHAR_REPAIR_PASSES; pass += 1) {
        if (episodeCharCountInContract(currentScene)) break

        const sceneCount = currentScene.screenplayScenes?.length || 3
        const currentCount = charCountOf(currentScene)
        const direction = currentCount < EPISODE_CHAR_COUNT.min(sceneCount) ? 'too_short' : 'too_long'
        void direction

        console.log(`[repair] 第${sceneNo}集第${pass}次修复，当前${currentCount}字`)
        const currentBeat = segments
          .flatMap((seg) => seg.episodeBeats || [])
          .find((beat) => beat.episodeNo === sceneNo)

        const repairedScene = await repairCharCountWithAi(
          currentScene,
          currentCount,
          input.runtimeConfig,
          currentBeat?.summary
        )

        const repairedQuality = scoreScreenplayQualityProblems(inspectScreenplayQualityEpisode(repairedScene))
        const originalQuality = scoreScreenplayQualityProblems(inspectScreenplayQualityEpisode(currentScene))

        if (repairedQuality <= originalQuality) {
          currentScene = repairedScene
          if (episodeCharCountInContract(currentScene)) {
            repaired = true
            console.log(`[repair] 第${sceneNo}集修复成功，最终${charCountOf(currentScene)}字`)
            break
          }
        } else {
          console.log(`[repair] 第${sceneNo}集第${pass}次修复质量下降，保留原版`)
        }
      }

      // 3 次修复后仍未达标 → 对该集重新生成（带字数纠错提示）
      if (!repaired && !episodeCharCountInContract(currentScene)) {
        console.log(`[repair] 第${sceneNo}集3次修复未达标，重新生成该集`)
        const episodePlan = input.generationInput.plan.episodePlans.find(
          (p) => p.episodeNo === sceneNo
        )
        if (episodePlan) {
          try {
            const regenerated = await regenerateSingleEpisodeCharCount(
              episodePlan,
              input.generationInput,
              charCountOf(currentScene) < EPISODE_CHAR_COUNT.min(3) ? 'too_short' : 'too_long',
              input.runtimeConfig,
              input.outline,
              input.generationInput.characters
            )
            repairedScenes[sceneIndex] = regenerated
            charCountRepairedSceneNos.add(sceneNo)
            console.log(`[repair] 第${sceneNo}集重新生成完成，${charCountOf(regenerated)}字`)
          } catch (err) {
            console.error(`[repair] 第${sceneNo}集重新生成失败，保留原版:`, err)
          }
        }
      } else if (repaired) {
        repairedScenes[sceneIndex] = currentScene
        charCountRepairedSceneNos.add(sceneNo)
      }
    }
  }

  // 【步骤 2】通用质量修复（AI 重写，处理钩子弱、对白不足等问题）
  // 跳过步骤 1 已成功修复字数的集，避免二次 AI 覆盖
  let qualityReport = inspectScreenplayQualityBatch(repairedScenes)

  for (let pass = 1; pass <= MAX_QUALITY_REPAIR_PASSES; pass += 1) {
    if (qualityReport.pass) break
    writeQualityRepairSnapshot(pass, 'before', repairedScenes)
    const baselineScenes = repairedScenes.map((scene) => ({ ...scene }))

    // 过滤掉步骤 1 已修好的集，只修剩余问题集
    const remainingWeakEpisodes = qualityReport.weakEpisodes.filter(
      (ep) => ep.sceneNo != null && !charCountRepairedSceneNos.has(ep.sceneNo)
    )
    if (remainingWeakEpisodes.length === 0) break

    const result = await executeScriptRepair(
      {
        storyIntent: input.generationInput.storyIntent,
        outline: input.outline,
        characters: input.generationInput.characters,
        detailedOutlineBlocks: input.generationInput.detailedOutlineBlocks,
        segments,
        script: repairedScenes,
        suggestions: buildQualityRepairSuggestions(remainingWeakEpisodes, segments, repairedScenes)
      },
      input.runtimeConfig
    )
    repairedScenes = result.repairedScript.map((scene, index) => {
      const baseline = baselineScenes[index] || scene
      const guarded = chooseBetterRepairedScene(baseline, scene)
      return compactOverlongScreenplay(guarded)
    })
    writeQualityRepairSnapshot(pass, 'after', repairedScenes)
    qualityReport = inspectScreenplayQualityBatch(repairedScenes)
  }

  // 【步骤 3】规则式 VO 自动修复（放最后，确保 AI 不会再写回 VO）
  repairedScenes = repairedScenes.map((scene) => repairVoiceOver(scene))

  // 最终质量报告
  qualityReport = inspectScreenplayQualityBatch(repairedScenes)

  writeFinalQualityReportToEvidence(qualityReport)

  return {
    generatedScenes: repairedScenes,
    qualityReport
  }
}
