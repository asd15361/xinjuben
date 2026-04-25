import type { ProjectEntityStoreDto } from '../../../../../shared/contracts/entities.ts'
import type {
  FormalFact,
  OutlineDraftDto,
  OutlineEpisodeDto
} from '../../../../../shared/contracts/workflow.ts'
import { ensureOutlineEpisodeShape } from '../../../../../shared/domain/workflow/outline-episodes.ts'

function clean(value: unknown): string {
  return String(value ?? '').trim()
}

function line(label: string, value: unknown): string[] {
  const text = clean(value)
  return text ? [`${label}：${text}`] : []
}

function block(title: string, lines: string[]): string {
  return [`## ${title}`, ...lines.filter(Boolean)].join('\n')
}

export function buildOutlineEpisodeCopyText(episode: OutlineEpisodeDto): string {
  return block(`第 ${episode.episodeNo} 集`, [
    ...line('剧情', episode.summary),
    ...(episode.sceneByScene?.length
      ? [
          '场次：',
          episode.sceneByScene
            .map((scene, index) =>
              [
                `- 场 ${scene.sceneNo ?? index + 1}`,
                clean(scene.sceneHeading || scene.location) ? `  场景：${clean(scene.sceneHeading || scene.location)}` : '',
                clean(scene.setup) ? `  铺垫：${clean(scene.setup)}` : '',
                clean(scene.tension) ? `  冲突：${clean(scene.tension)}` : '',
                clean(scene.hookEnd) ? `  钩子：${clean(scene.hookEnd)}` : '',
                clean(scene.body) ? `  正文：${clean(scene.body)}` : ''
              ]
                .filter(Boolean)
                .join('\n')
            )
            .join('\n')
        ]
      : [])
  ])
}

export function buildOutlineBasicsCopyText(outline: OutlineDraftDto): string {
  const normalized = ensureOutlineEpisodeShape(outline)

  return [
    '# 剧本骨架',
    ...line('剧本名称', normalized.title),
    ...line('题材类型', normalized.genre),
    ...line('核心主题', normalized.theme),
    ...line('主角设定', normalized.protagonist),
    ...line('核心冲突', normalized.mainConflict),
    ...line('总述', normalized.summary),
    '',
    '# 分集剧情',
    normalized.summaryEpisodes.length > 0
      ? normalized.summaryEpisodes.map(buildOutlineEpisodeCopyText).join('\n\n')
      : '暂无分集剧情'
  ]
    .filter(Boolean)
    .join('\n')
    .trim()
}

export function buildFormalFactsCopyText(facts: FormalFact[] = []): string {
  if (facts.length === 0) return '# 核心设定\n暂无核心设定'

  return [
    '# 核心设定',
    facts
      .map((fact) =>
        block(fact.label || '未命名设定', [
          ...line('内容', fact.description),
          ...line('级别', fact.level),
          ...line('状态', fact.status)
        ])
      )
      .join('\n\n')
  ].join('\n')
}

export function buildEntityStoreCopyText(entityStore: ProjectEntityStoreDto | null): string {
  if (!entityStore) return '# 世界底账\n暂无世界底账'

  const factions = entityStore.factions.map((item) => `- ${item.name}：${item.summary || '暂无摘要'}`)
  const characters = entityStore.characters.map((item) => `- ${item.name}：${item.summary || '暂无摘要'}`)
  const relations = entityStore.relations.map((item) => `- ${item.name}：${item.summary || '暂无摘要'}`)
  const items = entityStore.items.map((item) => `- ${item.name}：${item.summary || '暂无摘要'}`)
  const locations = entityStore.locations.map((item) => `- ${item.name}：${item.summary || '暂无摘要'}`)

  return [
    '# 世界底账',
    '## 势力',
    factions.length ? factions.join('\n') : '暂无势力',
    '## 人物',
    characters.length ? characters.join('\n') : '暂无人物',
    '## 关系',
    relations.length ? relations.join('\n') : '暂无关系',
    '## 物件',
    items.length ? items.join('\n') : '暂无物件',
    '## 地点',
    locations.length ? locations.join('\n') : '暂无地点'
  ].join('\n')
}

export function buildOutlineStageCopyText(input: {
  outline: OutlineDraftDto
  entityStore: ProjectEntityStoreDto | null
}): string {
  return [
    buildOutlineBasicsCopyText(input.outline),
    '',
    buildEntityStoreCopyText(input.entityStore),
    '',
    buildFormalFactsCopyText(input.outline.facts)
  ]
    .join('\n')
    .trim()
}
