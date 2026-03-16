import type { StoryIntentPackageDto } from './intake'
import type { ScriptStateLedgerDto } from './script-ledger'
import type { StoryContractDto, UserAnchorLedgerDto } from './story-contract'
import type { CharacterDraftDto, DetailedOutlineSegmentDto, OutlineDraftDto, ScriptSegmentDto } from './workflow'

export interface ScriptAuditIssueDto {
  code: string
  severity: 'low' | 'medium' | 'high'
  message: string
}

export interface ScriptAuditReportDto {
  passed: boolean
  score: number
  issues: ScriptAuditIssueDto[]
  storyContract?: StoryContractDto
  userAnchorLedger?: UserAnchorLedgerDto
}

export interface ScriptRepairSuggestionDto {
  targetSceneNo: number | null
  policyKey: string
  source: string
  focus: string[]
  evidenceHint: string
  instruction: string
}

export interface ScriptRepairPlanDto {
  shouldRepair: boolean
  suggestions: ScriptRepairSuggestionDto[]
}

export interface AuditScriptInputDto {
  storyIntent?: StoryIntentPackageDto | null
  outline?: OutlineDraftDto
  characters?: CharacterDraftDto[]
  script: ScriptSegmentDto[]
}

export interface ExecuteScriptRepairInputDto {
  storyIntent?: StoryIntentPackageDto | null
  outline?: OutlineDraftDto
  characters?: CharacterDraftDto[]
  segments?: DetailedOutlineSegmentDto[]
  script: ScriptSegmentDto[]
  suggestions: ScriptRepairSuggestionDto[]
}

export interface ExecuteScriptRepairResultDto {
  repairedScript: ScriptSegmentDto[]
  ledger?: ScriptStateLedgerDto | null
}
