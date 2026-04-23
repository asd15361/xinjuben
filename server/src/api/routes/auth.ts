/**
 * 认证路由
 *
 * 用户注册、登录、获取当前用户信息
 */
import { Router, Request, Response } from 'express'
import {
  pb,
  APP_ID,
  TABLES,
  ensureUserAppBinding,
  ensureUserWallet,
  getUserWalletBalance
} from '../../infrastructure/pocketbase/client'
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
    // 创建用户（带 registerSource）
    const user = await pb.collection('users').create({
      email,
      password,
      passwordConfirm,
      name: name || email.split('@')[0],
      registerSource: APP_ID
    })

    // 注册成功后，自动登录
    const authResult = await pb.collection('users').authWithPassword(email, password)

    // 静默开户：创建 user_apps 绑定 + user_wallets 钱包
    await ensureUserAppBinding(user.id)
    const initialBalance = await ensureUserWallet(user.id, 100)

    // 记录注册奖励交易
    try {
      await pb.collection(TABLES.transactions).create({
        user: user.id,
        type: 'register_bonus',
        amount: 100,
        balanceBefore: 0,
        balanceAfter: initialBalance,
        description: '新用户注册奖励'
      })
    } catch {
      console.log('[Auth] Transaction record may already exist')
    }

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token: authResult.token,
      credits: {
        balance: initialBalance
      }
    })
  } catch (error: unknown) {
    console.error('[Auth] Registration error:', error)

    const errorData =
      error && typeof error === 'object' && 'data' in error
        ? (error as { data?: { data?: { email?: { code?: string } } } }).data?.data?.email?.code
        : undefined

    if (errorData === 'validation_invalid_email') {
      res.status(400).json({
        error: 'invalid_email',
        message: '邮箱格式不正确'
      })
      return
    }

    if (errorData === 'validation_not_unique') {
      // 邮箱已存在：引导登录流程
      res.status(400).json({
        error: 'email_exists',
        message: '该邮箱已在生态中注册，请直接登录',
        shouldLogin: true
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

    // 静默补绑：确保 user_apps 有当前项目绑定
    await ensureUserAppBinding(authResult.record.id)

    // 静默开户：确保 user_wallets 有当前项目钱包
    const balance = await ensureUserWallet(authResult.record.id, 0)

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
  } catch (error: unknown) {
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
    const balance = await getUserWalletBalance(req.user.id)

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name
      },
      credits: {
        balance,
        frozenBalance: 0
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
