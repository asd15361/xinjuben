/**
 * Xinjuben 后端服务器入口
 *
 * 整合所有路由和中间件，启动 HTTP 服务
 */
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'

import { authRouter } from './api/routes/auth'
import { creditsRouter } from './api/routes/credits'
import { generateRouter } from './api/routes/generate'
import { outlineCharactersRouter } from './api/routes/outline-characters'
import { detailedOutlineRouter } from './api/routes/detailed-outline'
import { scriptsRouter } from './api/routes/scripts'
import { projectsRouter } from './api/routes/projects'
import { payRouter } from './api/routes/pay'
import { stageContractRouter } from './api/routes/stage-contract'
import { formalFactRouter } from './api/routes/formal-fact'
import { scriptAuditRouter } from './api/routes/script-audit'

// 加载环境变量
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// 安全中间件
app.use(helmet())

// CORS 配置
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://xinjuben.com', 'https://app.xinjuben.com']
        : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true
  })
)

// JSON 解析
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// API 路由
app.use('/api/auth', authRouter)
app.use('/api/credits', creditsRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/generate', generateRouter)
app.use('/api/generate', outlineCharactersRouter)
app.use('/api/generate', detailedOutlineRouter)
app.use('/api/script-generation', scriptsRouter)
app.use('/api/stage', stageContractRouter)
app.use('/api/formal-fact', formalFactRouter)
app.use('/api/script-audit', scriptAuditRouter)
app.use('/api/pay', payRouter)

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    error: 'not_found',
    message: '接口不存在'
  })
})

// 错误处理
app.use((err: Error, req: express.Request, res: express.Response) => {
  console.error('[Server] Error:', err)

  res.status(500).json({
    error: 'internal_error',
    message: process.env.NODE_ENV === 'production' ? '服务器错误' : err.message
  })
})

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`[Server] Xinjuben backend running on port ${PORT}`)
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`[Server] PocketBase URL: ${process.env.POCKETBASE_URL || 'http://localhost:8090'}`)
})

// 服务器超时设置（15 分钟，匹配 AI 生成长任务）
server.setTimeout(900000)
server.keepAliveTimeout = 900000 + 5000
server.headersTimeout = 900000 + 10000

export default app
