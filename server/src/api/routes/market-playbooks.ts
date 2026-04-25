import { Router, type Request, type Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import type { SaveActiveMarketPlaybookInputDto } from '@shared/contracts/market-playbook'
import { MarketPlaybookRepository } from '../../infrastructure/pocketbase/market-playbook-repository'

export const marketPlaybooksRouter = Router()

const repository = new MarketPlaybookRepository()

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

marketPlaybooksRouter.use(authMiddleware)

marketPlaybooksRouter.get('/', async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return

  try {
    res.json({
      playbooks: await repository.listActivePlaybooks(user.id)
    })
  } catch (error) {
    console.error('[MarketPlaybooks] list failed:', error)
    res.status(500).json({
      error: 'market_playbook_list_failed',
      message: error instanceof Error ? error.message : '读取打法包失败'
    })
  }
})

marketPlaybooksRouter.post('/', async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return

  const input = req.body as SaveActiveMarketPlaybookInputDto
  if (!input?.playbook?.id) {
    res.status(400).json({
      error: 'invalid_market_playbook',
      message: 'active playbook 缺少 id'
    })
    return
  }

  try {
    const result = await repository.saveActivePlaybook({
      userId: user.id,
      playbook: input.playbook
    })
    res.json(result)
  } catch (error) {
    console.error('[MarketPlaybooks] save failed:', error)
    res.status(400).json({
      error: 'market_playbook_save_failed',
      message: error instanceof Error ? error.message : '保存打法包失败'
    })
  }
})
