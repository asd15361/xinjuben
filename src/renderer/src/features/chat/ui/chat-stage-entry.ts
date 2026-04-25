export function getChatStagePrimaryActionLabel(hasConfirmedStoryIntent: boolean): string {
  return hasConfirmedStoryIntent ? '进入人物小传' : '确认总结并进入人物小传'
}
