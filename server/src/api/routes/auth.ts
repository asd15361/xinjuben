/**
 * 认证路由
 *
 * 用户注册、登录、获取当前用户信息
 */
import { Router, Request, Response } from 'express'
import { pb, PB_URL, authenticateAdmin, cachedAdminToken } from '../../infrastructure/pocketbase/client'
import { authMiddleware } from '../middleware/auth'

export const authRouter = Router()

/**
 * 用户注册
 *
 * POST /api/auth/register
 * Body: { email, password, passwordConfirm, name }
 */
authRouter.post('/register', async (req: Request, res: Response) => {
  const { email, password, passwordConfirm, name } = req.body

  if (!email || !password) {
    res.status(400).json({
      error: 'missing_fields',
      message: '请提供邮箱和密码'
    })
    return
  }

  if (password !== passwordConfirm) {
    res.status(400).json({
      error: 'password_mismatch',
      message: '两次输入的密码不一致'
    })
    return
  }

  try {
    // 创建用户
    const user = await pb.collection('users').create({
      email,
      password,
      passwordConfirm,
      name: name || email.split('@')[0]
    })

    // 注册成功后，PocketBase hooks 会自动创建积分账户（见 PocketBase main.js）
    // 如果 hooks 未配置，这里手动创建备用
    try {
      await pb.collection('credits').create({
        user: user.id,
        balance: 100,
        frozenBalance: 0
      })
    } catch (e) {
      // 积分账户可能已由 hooks 创建，忽略错误
      console.log('[Auth] Credits account may already exist for user:', user.id)
    }

    // 记录注册奖励交易
    try {
      await pb.collection('transactions').create({
        user: user.id,
        type: 'register_bonus',
        amount: 100,
        balanceBefore: 0,
        balanceAfter: 100,
        description: '新用户注册奖励'
      })
    } catch (e) {
      console.log('[Auth] Transaction record may already exist')
    }

    // 登录获取 token
    const authResult = await pb.collection('users').authWithPassword(email, password)

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token: authResult.token,
      credits: {
        balance: 100
      }
    })
  } catch (error: any) {
    console.error('[Auth] Registration error:', error)

    if (error.data?.data?.email?.code === 'validation_invalid_email') {
      res.status(400).json({
        error: 'invalid_email',
        message: '邮箱格式不正确'
      })
      return
    }

    if (error.data?.data?.email?.code === 'validation_not_unique') {
      res.status(400).json({
        error: 'email_exists',
        message: '该邮箱已被注册'
      })
      return
    }

    res.status(500).json({
      error: 'registration_failed',
      message: '注册失败，请稍后重试'
    })
  }
})

/**
 * 用户登录
 *
 * POST /api/auth/login
 * Body: { email, password }
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({
      error: 'missing_fields',
      message: '请提供邮箱和密码'
    })
    return
  }

  try {
    const authResult = await pb.collection('users').authWithPassword(email, password)

    // 获取积分余额（使用 HTTP API）
    let balance = 0
    try {
      await authenticateAdmin()
      const creditsRes = await fetch(`${PB_URL}/api/collections/credits/records?filter=user.id='${authResult.record.id}'`, {
        headers: { 'Authorization': cachedAdminToken }
      })
      if (creditsRes.ok) {
        const creditsData = await creditsRes.json()
        if (creditsData.items && creditsData.items.length > 0) {
          balance = creditsData.items[0].balance
        }
      }
    } catch {
      // 积分账户不存在，返回 0
    }

    res.json({
      user: {
        id: authResult.record.id,
        email: authResult.record.email,
        name: authResult.record.name
      },
      token: authResult.token,
      credits: {
        balance
      }
    })
  } catch (error: any) {
    console.error('[Auth] Login error:', error)

    res.status(401).json({
      error: 'invalid_credentials',
      message: '邮箱或密码错误'
    })
  }
})

/**
 * 获取当前用户信息
 *
 * GET /api/auth/me
 * Header: Authorization: Bearer <token>
 */
authRouter.get('/me', authMiddleware, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      error: 'not_authenticated',
      message: '请先登录'
    })
    return
  }

  try {
    // 获取积分余额（使用 HTTP API）
    await authenticateAdmin()
    const creditsRes = await fetch(`${PB_URL}/api/collections/credits/records?filter=user.id='${req.user.id}'`, {
      headers: { 'Authorization': cachedAdminToken }
    })

    let balance = 0
    let frozenBalance = 0
    if (creditsRes.ok) {
      const creditsData = await creditsRes.json()
      if (creditsData.items && creditsData.items.length > 0) {
        balance = creditsData.items[0].balance
        frozenBalance = creditsData.items[0].frozenBalance || 0
      }
    }

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name
      },
      credits: {
        balance,
        frozenBalance
      }
    })
  } catch {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name
      },
      credits: {
        balance: 0,
        frozenBalance: 0
      }
    })
  }
})

/**
 * 刷新 token
 *
 * POST /api/auth/refresh
 * Header: Authorization: Bearer <token>
 */
authRouter.post('/refresh', authMiddleware, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      error: 'not_authenticated',
      message: '请先登录'
    })
    return
  }

  try {
    const authResult = await pb.collection('users').authRefresh()

    res.json({
      token: authResult.token,
      user: {
        id: authResult.record.id,
        email: authResult.record.email,
        name: authResult.record.name
      }
    })
  } catch {
    res.status(401).json({
      error: 'token_expired',
      message: '登录已过期，请重新登录'
    })
  }
})