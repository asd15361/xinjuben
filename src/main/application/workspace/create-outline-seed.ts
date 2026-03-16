import type { OutlineSeedDto } from '../../../shared/contracts/workspace'
import type { ProjectSnapshotDto } from '../../../shared/contracts/project'

function pickFirst(list: string[] | undefined, fallback = ''): string {
  return list?.find(Boolean)?.trim() || fallback
}

export function createOutlineSeed(project: ProjectSnapshotDto): OutlineSeedDto {
  const storyIntent = project.storyIntent
  const protagonist = storyIntent?.protagonist || pickFirst(storyIntent?.officialKeyCharacters, '待定义主角')
  const antagonist = storyIntent?.antagonist || pickFirst(storyIntent?.lockedCharacterNames, '待定义对手')
  const conflict = storyIntent?.coreConflict || `${protagonist} 与 ${antagonist} 的核心冲突仍待明确`
  const theme = pickFirst(storyIntent?.themeAnchors, '正式事实与人物弧光共同推进主题落地')

  return {
    title: storyIntent?.titleHint || `${project.name}·粗纲种子`,
    genre: storyIntent?.genre || project.genre || '待定义题材',
    protagonist,
    mainConflict: conflict,
    theme,
    source: 'story_intent_seed'
  }
}
