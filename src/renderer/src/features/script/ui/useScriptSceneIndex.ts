import { useMemo } from 'react'
import type { ScriptSegmentDto } from '../../../../../shared/contracts/workflow'
import { buildScreenplayFromStructuredScene } from '../../../../../shared/domain/script/screenplay-format'
import { inspectSceneQuality, ScriptSceneQuality } from '../model/script-scene-quality-audit'

// 轻量摘要 - 用于列表渲染
export interface ScriptSceneSummary {
  signature: string
  sceneNo: number
  preview: string
  searchText: string
  missing: string[]
  legacyFormat: boolean
  structuredSceneGap: boolean
}

const summaryCache = new Map<string, ScriptSceneSummary>()

function collectMissingFields(screenplay: string): string[] {
  const missing: string[] = []
  if (!screenplay.trim()) missing.push('剧本正文')
  return missing
}

function buildPreview(screenplay: string): string {
  const firstUsefulLine = screenplay
    .split('\n')
    .find((line) => line.trim() && !/^第.+集$/.test(line.trim()))

  if (!firstUsefulLine) return '这一集还没有可预览的剧本内容。'
  return firstUsefulLine.length > 80 ? `${firstUsefulLine.slice(0, 80)}...` : firstUsefulLine
}

function buildSceneSignature(scene: ScriptSegmentDto): string {
  return [
    scene.sceneNo,
    scene.screenplay?.trim() || '',
    scene.action?.trim() || '',
    scene.dialogue?.trim() || '',
    scene.emotion?.trim() || '',
    scene.legacyFormat ? '1' : '0',
    String(scene.screenplayScenes?.length || 0)
  ].join('\u0001')
}

// 只做轻量计算，不含质量检查
function buildSceneSummary(scene: ScriptSegmentDto): ScriptSceneSummary {
  const signature = buildSceneSignature(scene)
  const cached = summaryCache.get(signature)
  if (cached) return cached

  const screenplay = buildScreenplayFromStructuredScene(scene)
  const summary: ScriptSceneSummary = {
    signature,
    sceneNo: scene.sceneNo,
    preview: buildPreview(screenplay),
    searchText: `${scene.sceneNo}\n${screenplay}`.toLowerCase(),
    missing: collectMissingFields(screenplay),
    legacyFormat: Boolean(scene.legacyFormat),
    structuredSceneGap: !screenplay.trim() || (scene.screenplayScenes?.length || 0) === 0
  }
  summaryCache.set(signature, summary)
  return summary
}

export function useScriptSceneIndex(script: ScriptSegmentDto[]): ScriptSceneSummary[] {
  return useMemo(() => script.map((scene) => buildSceneSummary(scene)), [script])
}

// 按需获取质量检查结果
export function useScriptSceneQuality(
  script: ScriptSegmentDto[],
  sceneNo: number
): ScriptSceneQuality | null {
  const scene = script.find((s) => s.sceneNo === sceneNo)
  if (!scene) return null
  return useMemo(() => inspectSceneQuality(scene), [scene])
}
