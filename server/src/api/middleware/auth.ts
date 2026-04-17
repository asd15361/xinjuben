/**
 * 认证中间件
 *
 * 验证用户 JWT token，将用户信息注入 req.user
 */
import { Request, Response, NextFunction } from 'express'
import { validateUserToken } from '../../infrastructure/pocketbase/client'

// 扩展 Request 类型，添加 user 属性
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        name: string
      }
    }
  }
}

/**
 * 用户认证中间件
 *
 * 从 Authorization header 提取 token 并验证
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'missing_token',
      message: '请先登录'
    })
    return
  }

  const token = authHeader.slice(7)

  try {
    const user = await validateUserToken(token)
    req.user = user
    next()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'unknown_error'

    if (errorMessage === 'invalid_token' || errorMessage === 'token_expired') {
      res.status(401).json({
        error: errorMessage,
        message: errorMessage === 'token_expired' ? '登录已过期，请重新登录' : '无效的登录凭证'
      })
      return
    }

    console.error('[Auth] Token validation error:', error)
    res.status(500).json({
      error: 'auth_error',
      message: '认证服务异常'
    })
  }
}

/**
 * 可选认证中间件
 *
 * 尝试解析 token，但不强制要求登录
 */
export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    next()
    return
  }

  const token = authHeader.slice(7)

  try {
    const user = await validateUserToken(token)
    req.user = user
  } catch {
    // 忽略错误，继续处理
  }

  next()
}