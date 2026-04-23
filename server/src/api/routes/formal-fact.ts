/**
 * Formal Fact 路由
 *
 * POST /api/formal-fact/declare   - 声明正式事实
 * POST /api/formal-fact/confirm   - 确认正式事实
 * POST /api/formal-fact/remove    - 移除正式事实
 */
import { Router, type Request, type Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { ProjectRepository } from '../../infrastructure/pocketbase/project-repository'
import type {
  DeclareFormalFactForProjectInputDto,
  ConfirmFormalFactForProjectInputDto,
  RemoveFormalFactForProjectInputDto
} from '@shared/contracts/workspace'
import type { DeclareFormalFactInputDto } from '@shared/contracts/formal-fact'

export const formalFactRouter = Router()

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
 * POST /api/formal-fact/declare
 *
 * 声明正式事实 - 写入 outline.facts
 */
formalFactRouter.post('/declare', authMiddleware, async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return

  const input = req.body as DeclareFormalFactForProjectInputDto

  if (!input.projectId || typeof input.projectId !== 'string') {
    res.status(400).json({
      error: 'missing_project_id',
      message: '请提供项目 ID'
    })
    return
  }

  if (!input.declaration?.label?.trim() || !input.declaration?.description?.trim()) {
    res.status(400).json({
      error: 'invalid_declaration',
      message: '请提供有效的事实声明'
    })
    return
  }

  try {
    const project = await projectRepository.getProject(user.id, input.projectId)
    if (!project?.outlineDraft) {
      res.status(404).json({
        error: 'project_not_found',
        message: '项目不存在或缺少粗纲'
      })
      return
    }

    // 声明事实
    const now = new Date().toISOString()
    const declaration: DeclareFormalFactInputDto = input.declaration
    const newFact = {
      id: `fact_${Date.now().toString(36)}`,
      label: declaration.label.trim(),
      description: declaration.description.trim(),
      linkedToPlot: true,
      linkedToTheme: true,
      authorityType: 'user_declared' as const,
      status: 'confirmed' as const,
      level: declaration.level || 'core',
      declaredBy: 'user' as const,
      declaredStage: 'outline' as const,
      createdAt: now,
      updatedAt: now
    }

    const nextOutline = {
      ...project.outlineDraft,
      facts: [...project.outlineDraft.facts, newFact]
    }

    const nextProject = await projectRepository.saveOutlineDraft({
      userId: user.id,
      projectId: input.projectId,
      outlineDraft: nextOutline
    })

    res.json({ project: nextProject, fact: newFact })
  } catch (error) {
    console.error('[FormalFact] declare failed:', error)
    res.status(500).json({
      error: 'declare_fact_failed',
      message: error instanceof Error ? error.message : '声明事实失败'
    })
  }
})

/**
 * POST /api/formal-fact/confirm
 *
 * 确认正式事实 - 修改 fact.status 为 confirmed
 */
formalFactRouter.post('/confirm', authMiddleware, async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return

  const input = req.body as ConfirmFormalFactForProjectInputDto

  if (!input.projectId || typeof input.projectId !== 'string') {
    res.status(400).json({
      error: 'missing_project_id',
      message: '请提供项目 ID'
    })
    return
  }

  if (!input.confirmation?.factId) {
    res.status(400).json({
      error: 'missing_fact_id',
      message: '请提供事实 ID'
    })
    return
  }

  try {
    const project = await projectRepository.getProject(user.id, input.projectId)
    if (!project?.outlineDraft) {
      res.status(404).json({
        error: 'project_not_found',
        message: '项目不存在或缺少粗纲'
      })
      return
    }

    const factIndex = project.outlineDraft.facts.findIndex(
      (fact) => fact.id === input.confirmation.factId
    )
    if (factIndex === -1) {
      res.status(404).json({
        error: 'fact_not_found',
        message: '事实不存在'
      })
      return
    }

    const nextFacts = [...project.outlineDraft.facts]
    nextFacts[factIndex] = {
      ...nextFacts[factIndex],
      authorityType: 'user_declared',
      status: 'confirmed',
      declaredBy: 'user',
      declaredStage: 'outline',
      updatedAt: new Date().toISOString()
    }

    const nextOutline = {
      ...project.outlineDraft,
      facts: nextFacts
    }

    const nextProject = await projectRepository.saveOutlineDraft({
      userId: user.id,
      projectId: input.projectId,
      outlineDraft: nextOutline
    })

    res.json({ project: nextProject })
  } catch (error) {
    console.error('[FormalFact] confirm failed:', error)
    res.status(500).json({
      error: 'confirm_fact_failed',
      message: error instanceof Error ? error.message : '确认事实失败'
    })
  }
})

/**
 * POST /api/formal-fact/remove
 *
 * 移除正式事实 - 从 outline.facts 删除
 */
formalFactRouter.post('/remove', authMiddleware, async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return

  const input = req.body as RemoveFormalFactForProjectInputDto

  if (!input.projectId || typeof input.projectId !== 'string') {
    res.status(400).json({
      error: 'missing_project_id',
      message: '请提供项目 ID'
    })
    return
  }

  if (!input.removal?.factId) {
    res.status(400).json({
      error: 'missing_fact_id',
      message: '请提供事实 ID'
    })
    return
  }

  try {
    const project = await projectRepository.getProject(user.id, input.projectId)
    if (!project?.outlineDraft) {
      res.status(404).json({
        error: 'project_not_found',
        message: '项目不存在或缺少粗纲'
      })
      return
    }

    const factExists = project.outlineDraft.facts.some(
      (fact) => fact.id === input.removal.factId
    )
    if (!factExists) {
      res.status(404).json({
        error: 'fact_not_found',
        message: '事实不存在'
      })
      return
    }

    const nextOutline = {
      ...project.outlineDraft,
      facts: project.outlineDraft.facts.filter(
        (fact) => fact.id !== input.removal.factId
      )
    }

    const nextProject = await projectRepository.saveOutlineDraft({
      userId: user.id,
      projectId: input.projectId,
      outlineDraft: nextOutline
    })

    res.json({ project: nextProject })
  } catch (error) {
    console.error('[FormalFact] remove failed:', error)
    res.status(500).json({
      error: 'remove_fact_failed',
      message: error instanceof Error ? error.message : '移除事实失败'
    })
  }
})
