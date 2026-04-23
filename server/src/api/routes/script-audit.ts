/**
 * Script Audit 路由
 *
 * POST /api/script-audit/execute-repair - 执行剧本修复
 */
import { Router, type Request, type Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { CreditService } from '../../services/credit-service'
import { ProjectRepository } from '../../infrastructure/pocketbase/project-repository'
import {
  loadRuntimeProviderConfig,
  hasValidApiKey
} from '../../infrastructure/runtime-env/provider-config'
import type { ExecuteScriptRepairInputDto } from '@shared/contracts/script-audit'
import { executeScriptRepair } from '../../application/script-generation/repair/execute-script-repair'

export const scriptAuditRouter = Router()

const creditService = new CreditService()
const projectRepository = new ProjectRepository()

function requireUser(
  req: Request,
  res: Response
): { id: string; email: string; name: string } | null {
  if (!req.user) {
    res.status(401).json({
      error: 'not_authenticated',
      message: '请先登录'
    })
    return null
  }
  return req.user
}

/**
 * POST /api/script-audit/execute-repair
 *
 * 执行剧本修复 - 调用 AI 修复指定场景
 */
scriptAuditRouter.post('/execute-repair', authMiddleware, async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return

  const { projectId, ...repairInput } = req.body as {
    projectId: string
  } & ExecuteScriptRepairInputDto

  if (!projectId || typeof projectId !== 'string') {
    res.status(400).json({
      error: 'missing_project_id',
      message: '请提供项目 ID'
    })
    return
  }

  if (!repairInput.suggestions || repairInput.suggestions.length === 0) {
    res.status(400).json({
      error: 'missing_suggestions',
      message: '请提供修复建议'
    })
    return
  }

  // 检查积分
  try {
    const balance = await creditService.getBalance(user.id)
    const requiredCredits = repairInput.suggestions.length
    if (balance.balance < requiredCredits) {
      res.status(402).json({
        error: 'insufficient_credits',
        message: `积分不足，修复 ${requiredCredits} 个场景需要 ${requiredCredits} 积分，当前余额 ${balance.balance}`,
        balance: balance.balance,
        required: requiredCredits
      })
      return
    }
  } catch {
    res.status(500).json({
      error: 'credit_check_failed',
      message: '积分检查失败'
    })
    return
  }

  // 检查 AI 配置
  const runtimeConfig = loadRuntimeProviderConfig()
  if (!hasValidApiKey(runtimeConfig)) {
    res.status(503).json({
      error: 'ai_not_configured',
      message: '服务器未配置 AI API Key'
    })
    return
  }

  try {
    const project = await projectRepository.getProject(user.id, projectId)
    if (!project) {
      res.status(404).json({
        error: 'project_not_found',
        message: '项目不存在，或你没有权限访问'
      })
      return
    }

    // 执行修复
    const startedAt = Date.now()

    const result = await executeScriptRepair({
      repairInput,
      runtimeConfig
    })

    // 扣积分（按实际修复场景数）
    const originalScript = repairInput.script
    const repairedCount = result.repairedScript.filter(
      (s, i) => s.screenplay !== originalScript[i]?.screenplay
    ).length
    if (repairedCount > 0) {
      try {
        await creditService.deductCredits(user.id, repairedCount, {
          task: 'script_repair',
          projectId,
          lane: 'repair',
          model: 'repair',
          durationMs: Date.now() - startedAt
        })
      } catch {
        console.error('[ScriptAudit] credit deduction failed, but repair already executed')
      }
    }

    res.json({
      success: true,
      message: `已完成 ${repairedCount} 个场景的修复`,
      projectId,
      repairedCount,
      durationMs: Date.now() - startedAt,
      repairedScript: result.repairedScript,
      ledger: result.ledger
    })
  } catch (error) {
    console.error('[ScriptAudit] execute-repair failed:', error)
    res.status(500).json({
      error: 'execute_repair_failed',
      message: error instanceof Error ? error.message : '执行修复失败'
    })
  }
})