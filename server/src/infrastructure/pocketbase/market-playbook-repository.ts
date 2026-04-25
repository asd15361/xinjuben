import type PocketBase from 'pocketbase'
import type {
  MarketPlaybookDto,
  MarketPlaybookSelectionDto
} from '@shared/contracts/market-playbook'
import { validateMarketPlaybookBeforeActivation } from '@shared/domain/market-playbook/playbook-lifecycle'
import { authenticateAdmin, pb, TABLES } from './client'

type PbRecord = {
  id: string
  created: string
  updated: string
  [key: string]: unknown
}

function parsePlaybook(record: PbRecord): MarketPlaybookDto | null {
  const raw = record.playbookJson
  try {
    return typeof raw === 'string'
      ? (JSON.parse(raw) as MarketPlaybookDto)
      : (raw as MarketPlaybookDto)
  } catch {
    return null
  }
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value)
}

export class MarketPlaybookRepository {
  constructor(private readonly pocketbase: PocketBase = pb) {}

  async ensureAdminReady(): Promise<void> {
    await authenticateAdmin()
  }

  async listActivePlaybooks(userId: string): Promise<MarketPlaybookDto[]> {
    await this.ensureAdminReady()
    try {
      const result = await this.pocketbase.collection(TABLES.marketPlaybooks).getList<PbRecord>(1, 500, {
        filter: `user="${userId}" && status="active"`,
        sort: '-sourceMonth,-updated',
        requestKey: null
      })
      return result.items
        .map(parsePlaybook)
        .filter((item): item is MarketPlaybookDto => item != null && item.status === 'active')
    } catch (error) {
      console.warn(
        `[MarketPlaybookRepository] custom playbooks unavailable, falling back to built-ins: ${error instanceof Error ? error.message : String(error)}`
      )
      return []
    }
  }

  async getPlaybookById(userId: string, playbookId: string): Promise<MarketPlaybookDto | null> {
    await this.ensureAdminReady()
    const result = await this.pocketbase.collection(TABLES.marketPlaybooks).getList<PbRecord>(1, 1, {
      filter: `user="${userId}" && playbookId="${playbookId}"`,
      requestKey: null
    })
    const playbook = result.items[0] ? parsePlaybook(result.items[0]) : null
    return playbook?.id === playbookId ? playbook : null
  }

  async saveActivePlaybook(input: {
    userId: string
    playbook: MarketPlaybookDto
  }): Promise<{ playbook: MarketPlaybookDto; selection: MarketPlaybookSelectionDto }> {
    await this.ensureAdminReady()
    const now = new Date().toISOString()
    const playbook: MarketPlaybookDto = {
      ...input.playbook,
      status: 'active',
      updatedAt: now,
      createdAt: input.playbook.createdAt || now
    }

    const validation = validateMarketPlaybookBeforeActivation({
      draft: {
        id: playbook.id,
        name: playbook.name,
        sourceSampleIds: [],
        audienceLane: playbook.audienceLane,
        subgenre: playbook.subgenre,
        sourceMonth: playbook.sourceMonth,
        version: playbook.version,
        status: 'draft',
        extractedPatterns: playbook.patterns,
        antiPatterns: playbook.antiPatterns,
        promptRules: playbook.promptRules,
        qualitySignals: playbook.qualitySignals,
        createdAt: playbook.createdAt,
        updatedAt: playbook.updatedAt
      }
    })
    if (!validation.valid) {
      throw new Error(`market_playbook_invalid:${validation.issues.join('|')}`)
    }

    const existing = await this.getRecordByPlaybookId(input.userId, playbook.id)
    const payload = {
      user: input.userId,
      playbookId: playbook.id,
      name: playbook.name,
      audienceLane: playbook.audienceLane,
      subgenre: playbook.subgenre,
      sourceMonth: playbook.sourceMonth,
      version: playbook.version,
      status: playbook.status,
      playbookJson: stringifyJson(playbook)
    }

    if (existing) {
      await this.pocketbase.collection(TABLES.marketPlaybooks).update(existing.id, payload)
    } else {
      await this.pocketbase.collection(TABLES.marketPlaybooks).create(payload)
    }

    return {
      playbook,
      selection: {
        selectedPlaybookId: playbook.id,
        selectionMode: 'manual',
        lockedAt: now,
        selectedVersion: playbook.version,
        selectedSourceMonth: playbook.sourceMonth
      }
    }
  }

  private async getRecordByPlaybookId(userId: string, playbookId: string): Promise<PbRecord | null> {
    const result = await this.pocketbase.collection(TABLES.marketPlaybooks).getList<PbRecord>(1, 1, {
      filter: `user="${userId}" && playbookId="${playbookId}"`,
      requestKey: null
    })
    return result.items[0] ?? null
  }
}
