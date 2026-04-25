import type {
  MarketPatternDto,
  MarketPlaybookDto,
  MarketPlaybookDraftDto
} from '../../contracts/market-playbook.ts'
import {
  activateMarketPlaybookDraft,
  validateMarketPlaybookBeforeActivation,
  type PlaybookValidationResult
} from './playbook-lifecycle.ts'
import { buildMarketPlaybookPromptBlock } from './playbook-prompt-block.ts'

export interface MarketPatternReviewEdit {
  id: string
  promptInstruction?: string
  qualitySignal?: string
  name?: string
  description?: string
}

export interface ApplyMarketPlaybookReviewEditsInput {
  draft: MarketPlaybookDraftDto
  name?: string
  sourceMonth?: string
  version?: string
  patterns?: MarketPatternReviewEdit[]
  antiPatternsText?: string
  reviewNotesText?: string
}

export interface MarketPlaybookActivationPreview {
  validation: PlaybookValidationResult
  playbook: MarketPlaybookDto | null
  promptPreview: string
}

export function applyMarketPlaybookReviewEdits(
  input: ApplyMarketPlaybookReviewEditsInput
): MarketPlaybookDraftDto {
  const editMap = new Map((input.patterns || []).map((edit) => [edit.id, edit]))
  const extractedPatterns = input.draft.extractedPatterns.map((pattern) =>
    applyPatternEdit(pattern, editMap.get(pattern.id))
  )
  const promptRules = extractedPatterns
    .map((pattern) => pattern.promptInstruction.trim())
    .filter(Boolean)
  const qualitySignals = extractedPatterns
    .map((pattern) => pattern.qualitySignal.trim())
    .filter(Boolean)

  return {
    ...input.draft,
    name: cleanText(input.name) || input.draft.name,
    sourceMonth: cleanText(input.sourceMonth) || input.draft.sourceMonth,
    version: cleanText(input.version) || input.draft.version,
    extractedPatterns,
    antiPatterns:
      input.antiPatternsText == null
        ? input.draft.antiPatterns
        : splitLines(input.antiPatternsText),
    promptRules,
    qualitySignals,
    reviewNotes:
      input.reviewNotesText == null ? input.draft.reviewNotes : splitLines(input.reviewNotesText),
    updatedAt: new Date().toISOString()
  }
}

export function buildMarketPlaybookActivationPreview(input: {
  draft: MarketPlaybookDraftDto
  activateAt?: string
  existingActivePlaybooks?: MarketPlaybookDto[]
}): MarketPlaybookActivationPreview {
  const validation = validateMarketPlaybookBeforeActivation({
    draft: input.draft,
    existingActivePlaybooks: input.existingActivePlaybooks
  })

  if (!validation.valid) {
    return { validation, playbook: null, promptPreview: '' }
  }

  const playbook = activateMarketPlaybookDraft({
    draft: input.draft,
    activateAt: input.activateAt
  })
  const promptPreview = buildMarketPlaybookPromptBlock({
    playbook,
    stage: 'episode_script'
  })

  return { validation, playbook, promptPreview }
}

function applyPatternEdit(
  pattern: MarketPatternDto,
  edit: MarketPatternReviewEdit | undefined
): MarketPatternDto {
  if (!edit) return pattern
  return {
    ...pattern,
    name: cleanText(edit.name) || pattern.name,
    description: cleanText(edit.description) || pattern.description,
    promptInstruction: cleanText(edit.promptInstruction) || pattern.promptInstruction,
    qualitySignal: cleanText(edit.qualitySignal) || pattern.qualitySignal
  }
}

function cleanText(value: string | undefined): string {
  return (value || '').trim()
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}
