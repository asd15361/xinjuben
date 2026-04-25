/**
 * src/shared/domain/market-playbook/market-playbook-types.ts
 *
 * MarketPlaybook 领域类型。从合约层重新导出，供领域内部使用。
 */

export type {
  MarketPlaybookDto,
  MarketPatternDto,
  MarketPlaybookExampleDto,
  MarketPlaybookSelectionDto,
  MarketPlaybookStatus,
  MarketPatternType,
  AudienceLane
} from '../../contracts/market-playbook.ts'
