export function resolveAiStageTimeoutMs(stage: string): number {
  switch (stage) {
    case 'detailed_outline':
      return 120000
    case 'episode_control':
      return 90000
    case 'seven_questions':
      return 60000
    case 'outline_and_characters':
      return 180000
    default:
      return 60000
  }
}
