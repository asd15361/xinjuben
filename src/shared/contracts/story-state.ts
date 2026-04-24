export interface StoryStateSnapshotDto {
  projectId: string
  audienceLane: string
  subgenre: string
  currentEpisode: number
  totalEpisodes: number
  protagonistState: {
    statusSummary: string
    emotionalArc: string
  }
  antagonistState: {
    statusSummary: string
    threatLevel: string
    currentGoal: string
  }
  relationshipState: {
    keyRelationship: string
    currentTension: string
  }
  activeProps: Array<{
    name: string
    status: 'held' | 'lost' | 'discovered' | 'used'
  }>
  unresolvedHooks: string[]
  activeForeshadowing: string[]
  continuityConstraints: string[]
  previousEpisodeEnding: string
}
