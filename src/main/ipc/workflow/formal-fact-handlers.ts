import { ipcMain } from 'electron'
import { evaluateFormalFactElevationUseCase } from '../../application/formal-fact/evaluate-formal-fact-elevation.ts'
import type { EvaluateFormalFactElevationInputDto } from '../../../shared/contracts/workspace.ts'

/**
 * Formal Fact IPC handlers
 *
 * 只保留纯计算、只读的校验能力。
 * declare/confirm/remove 已迁移到 HTTP server。
 */
export function registerFormalFactHandlers(): void {
  ipcMain.handle(
    'workflow:evaluate-formal-fact-elevation',
    (_event, input: EvaluateFormalFactElevationInputDto) =>
      evaluateFormalFactElevationUseCase(input)
  )
}