export function getChatStagePrimaryActionLabel(hasConfirmedStoryIntent: boolean): string {
  return hasConfirmedStoryIntent ? '进入七问确认' : '生成前先确认信息'
}
