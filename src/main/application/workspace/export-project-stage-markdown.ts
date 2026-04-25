import path from 'node:path'
import type { App } from 'electron'

import type { ProjectSnapshotDto } from '../../../shared/contracts/project.ts'
import type {
  ExportProjectStageMarkdownInputDto,
  ExportableProjectStage
} from '../../../shared/contracts/workspace.ts'
import { buildScreenplayFromStructuredScene } from '../../../shared/domain/script/screenplay-format.ts'
import {
  collectOverflowScriptEpisodeNos,
  countCoveredScriptEpisodes
} from '../../../shared/domain/workflow/script-episode-coverage.ts'
import { resolveProjectEpisodeCount } from '../../../shared/domain/workflow/episode-count.ts'
import { buildPlaybookSectionMarkdown } from '../../../shared/domain/market-playbook/playbook-markdown.ts'

function sanitizeFilenamePart(value: string, fallback: string): string {
  const normalized = value.trim().replace(/[\\/:*?"<>|]+/g, '-')
  return normalized || fallback
}

function stageLabel(stage: ExportableProjectStage): string {
  switch (stage) {
    case 'outline':
      return '剧本骨架'
    case 'character':
      return '人物小传'
    case 'detailed_outline':
      return '详细大纲'
    case 'script':
      return '剧本'
  }
}

function buildOutlineMarkdown(project: ProjectSnapshotDto): string {
  const outline = project.outlineDraft
  const facts = outline?.facts ?? []
  const episodes = outline?.summaryEpisodes ?? []

  return [
    `# ${project.name || '未命名项目'}｜剧本骨架`,
    '',
    `- 项目ID：${project.id}`,
    `- 题材：${outline?.genre || project.genre || '未填写'}`,
    `- 目标集数：${resolveProjectEpisodeCount({ outline, storyIntent: project.storyIntent })} 集`,
    `- 主角：${outline?.protagonist || '未填写'}`,
    `- 主题：${outline?.theme || '未填写'}`,
    `- 主线冲突：${outline?.mainConflict || '未填写'}`,
    '',
    buildPlaybookSectionMarkdown(project),
    '## 总述',
    '',
    outline?.summary?.trim() || '当前还没有总述。',
    '',
    '## 逐集粗纲',
    '',
    ...(episodes.length > 0
      ? episodes.flatMap((episode) => [
          `### 第 ${episode.episodeNo} 集`,
          '',
          episode.summary?.trim() || '这一集还没写出内容。',
          ''
        ])
      : ['当前还没有逐集粗纲。', '']),
    '## 关键设定',
    '',
    ...(facts.length > 0
      ? facts.map(
          (fact, index) =>
            `${index + 1}. [${fact.status === 'confirmed' ? '已确认' : '待确认'}] ${fact.label || '未命名设定'}：${fact.description || '无描述'}`
        )
      : ['当前还没有关键设定。'])
  ].join('\n')
}

function buildCharacterMarkdown(project: ProjectSnapshotDto): string {
  const characters = project.characterDrafts ?? []

  return [
    `# ${project.name || '未命名项目'}｜人物小传`,
    '',
    `- 项目ID：${project.id}`,
    `- 角色数量：${characters.length}`,
    '',
    ...(characters.length > 0
      ? characters.flatMap((character, index) => [
          `## ${index + 1}. ${character.name || `未命名角色${index + 1}`}`,
          '',
          `- 小传：${character.biography || '未填写'}`,
          `- 表面：${character.publicMask || '未填写'}`,
          `- 暗里卡着：${character.hiddenPressure || '未填写'}`,
          `- 最怕失去：${character.fear || '未填写'}`,
          `- 最想守：${character.protectTarget || '未填写'}`,
          `- 一碰就炸：${character.conflictTrigger || '未填写'}`,
          `- 优势：${character.advantage || '未填写'}`,
          `- 短板：${character.weakness || '未填写'}`,
          `- 目标：${character.goal || '未填写'}`,
          `- 弧光：${character.arc || '未填写'}`,
          ''
        ])
      : ['当前还没有人物小传。'])
  ].join('\n')
}

function buildDetailedOutlineMarkdown(project: ProjectSnapshotDto): string {
  const segments = project.detailedOutlineSegments ?? []

  return [
    `# ${project.name || '未命名项目'}｜详细大纲`,
    '',
    `- 项目ID：${project.id}`,
    `- 目标集数：${resolveProjectEpisodeCount({
      outline: project.outlineDraft,
      storyIntent: project.storyIntent
    })} 集`,
    `- 已生成详纲段数：${segments.length}`,
    '',
    ...(segments.length > 0
      ? segments.flatMap((segment, index) => [
          `## ${index + 1}. ${stageLabel('detailed_outline')}·${segment.act}`,
          '',
          `- 钩子类型：${segment.hookType || '未填写'}`,
          '',
          segment.content?.trim() || '这一段还没写出内容。',
          '',
          ...(segment.episodeBeats?.length
            ? segment.episodeBeats.flatMap((beat) => [
                `### 第 ${beat.episodeNo} 集`,
                '',
                beat.summary?.trim() || '这一集还没写出细纲。',
                '',
                ...(beat.sceneByScene?.length
                  ? beat.sceneByScene.flatMap((scene) => [
                      `- 场 ${scene.sceneNo || 1}｜地点：${scene.location || '未填'}｜时间：${scene.timeOfDay || '未填'}`,
                      `  - 起手：${scene.setup || '未填'}`,
                      `  - 拉扯：${scene.tension || '未填'}`,
                      `  - 尾钩：${scene.hookEnd || '未填'}`
                    ])
                  : ['- 当前还没有逐场拆解。']),
                ''
              ])
            : ['当前这一段还没有逐集细纲。', ''])
        ])
      : ['当前还没有详细大纲。'])
  ].join('\n')
}

function buildScriptMarkdown(project: ProjectSnapshotDto): string {
  const targetEpisodes = resolveProjectEpisodeCount({
    outline: project.outlineDraft,
    storyIntent: project.storyIntent
  })
  const coveredEpisodes = countCoveredScriptEpisodes(project.scriptDraft ?? [], targetEpisodes)
  const overflowEpisodes = collectOverflowScriptEpisodeNos(
    project.scriptDraft ?? [],
    targetEpisodes
  )
  const orderedScript = [...(project.scriptDraft ?? [])].sort(
    (left, right) => left.sceneNo - right.sceneNo
  )

  return [
    `# ${project.name || '未命名项目'}｜剧本`,
    '',
    `- 项目ID：${project.id}`,
    `- 计划集数：${targetEpisodes} 集`,
    `- 已写到目标内：${coveredEpisodes}/${targetEpisodes} 集`,
    ...(overflowEpisodes.length > 0
      ? [`- 超出计划集数：第 ${overflowEpisodes.join('、')} 集`]
      : []),
    '',
    ...(orderedScript.length > 0
      ? orderedScript.flatMap((scene) => [
          `## 第 ${scene.sceneNo} 集${scene.sceneNo > targetEpisodes ? '（超出计划集数）' : ''}`,
          '',
          '```text',
          buildScreenplayFromStructuredScene(scene),
          '```',
          ''
        ])
      : ['当前还没有剧本正文。'])
  ].join('\n')
}

export function buildProjectStageMarkdown(
  project: ProjectSnapshotDto,
  stage: ExportableProjectStage
): string {
  switch (stage) {
    case 'outline':
      return buildOutlineMarkdown(project)
    case 'character':
      return buildCharacterMarkdown(project)
    case 'detailed_outline':
      return buildDetailedOutlineMarkdown(project)
    case 'script':
      return buildScriptMarkdown(project)
  }
}

export function buildProjectStageExportDraft(
  project: ProjectSnapshotDto,
  stage: ExportProjectStageMarkdownInputDto['stage'],
  app: App
): {
  defaultPath: string
  content: string
} {
  const fileName = `${sanitizeFilenamePart(project.name, project.id)}-${stage}.md`

  return {
    defaultPath: path.join(app.getPath('downloads'), fileName),
    content: buildProjectStageMarkdown(project, stage)
  }
}
