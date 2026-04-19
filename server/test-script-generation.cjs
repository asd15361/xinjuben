/**
 * Phase 8.1 异步脱壳测试
 *
 * 验收三项：
 * 1. POST /api/script-generation/start 立即返回 202
 * 2. 后台 Dummy Worker 每 3 秒更新进度
 * 3. 轮询 GET /api/script-generation/status 能看到进度递增
 */

const http = require('http')

const SERVER_URL = 'http://localhost:3001'
const POCKETBASE_URL = 'http://localhost:8091'
const ADMIN_EMAIL = 'stage6-admin2@example.com'
const ADMIN_PASSWORD = 'Stage6Admin123'
const TEST_USER_EMAIL = 'test123@example.com'
const TEST_USER_PASSWORD = 'test123456'

async function jsonRequest(url, options = {}) {
  const urlObj = new URL(url)
  const body = options.body ? JSON.stringify(options.body) : undefined

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      timeout: options.timeout || 30000
    }, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) })
        } catch (e) {
          resolve({ status: res.statusCode, data: data || '(empty body)' })
        }
      })
    })

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })

    if (body) req.write(body)
    req.end()
  })
}

async function main() {
  console.log('=== Phase 8.1 异步脱壳测试 ===\n')

  // Step 1: 登录获取 token（普通用户登录）
  console.log('[1/5] 登录...')
  const loginRes = await jsonRequest(`${SERVER_URL}/api/auth/login`, {
    method: 'POST',
    body: { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD }
  })

  if (loginRes.status !== 200 || !loginRes.data.token) {
    console.error('登录失败:', loginRes)
    process.exit(1)
  }
  const token = loginRes.data.token
  const userId = loginRes.data.user?.id
  console.log(`登录成功: userId=${userId}\n`)

  // Step 2: 获取已有项目
  console.log('[2/5] 获取项目列表...')
  const projectsRes = await jsonRequest(`${SERVER_URL}/api/projects`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  if (projectsRes.status !== 200 || !projectsRes.data.projects?.length) {
    console.error('获取项目失败:', projectsRes)
    process.exit(1)
  }
  const projectId = projectsRes.data.projects[0].id
  console.log(`使用项目: ${projectId}\n`)

  // Step 3: 调用 Start（5 集即可，验证流程）
  console.log('[3/5] 启动 Dummy Worker（5 集）...')
  const startTime = Date.now()
  const startRes = await jsonRequest(`${SERVER_URL}/api/script-generation/start`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: { projectId, targetEpisodes: 5 }
  })

  const startLatency = Date.now() - startTime
  console.log(`Start 响应: status=${startRes.status}, 耗时=${startLatency}ms`)

  if (startRes.status !== 202) {
    console.error('Start 未返回 202:', startRes)
    process.exit(1)
  }

  const board = startRes.data.board
  console.log(`初始进度板: ${board.episodeStatuses.length} 集, batchContext.status=${board.batchContext.status}`)
  console.log(`必须在 500ms 内返回（异步标志）\n`)

  if (startLatency > 500) {
    console.error(`警告: Start 响应耗时 ${startLatency}ms，超过 500ms，不算立即返回`)
  }

  // Step 4: 轮询 status（最多 30 秒）
  console.log('[4/5] 开始轮询进度（每 3 秒）...')
  let lastCompleted = 0
  let pollCount = 0
  const maxPolls = 10

  for (let i = 0; i < maxPolls; i++) {
    await new Promise(r => setTimeout(r, 3000))

    const statusRes = await jsonRequest(`${SERVER_URL}/api/script-generation/status/${projectId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (statusRes.status !== 200) {
      console.log(`  轮询 ${i + 1}: status=${statusRes.status}`)
      continue
    }

    pollCount++
    const { completedEpisodes, totalEpisodes, status, progress } = statusRes.data
    console.log(`  轮询 ${i + 1}: ${progress} (status=${status})`)

    // 验证进度在递增
    if (completedEpisodes > lastCompleted) {
      console.log(`    ✓ 进度递增: ${lastCompleted} → ${completedEpisodes}`)
      lastCompleted = completedEpisodes
    }

    if (status === 'completed') {
      console.log(`\n✓ 全部完成！最终进度: ${completedEpisodes}/${totalEpisodes}`)
      break
    }
  }

  // Step 5: 验证结果
  console.log('\n[5/5] 验收检查:')
  const checks = {
    'Start 返回 202': startRes.status === 202,
    'Start 快速返回 (<500ms)': startLatency < 500,
    '进度板有 episodeStatuses': board?.episodeStatuses?.length > 0,
    '轮询能看到进度递增': lastCompleted > 0,
    '最终完成 (5/5)': lastCompleted >= 5
  }

  for (const [check, passed] of Object.entries(checks)) {
    console.log(`  ${passed ? '✓' : '✗'} ${check}`)
  }

  const allPassed = Object.values(checks).every(v => v)
  console.log(`\n${allPassed ? '✓ 全部通过！' : '✗ 存在失败项'} (总耗时 ${((Date.now() - startTime) / 1000).toFixed(1)}s)`)
  process.exit(allPassed ? 0 : 1)
}

main().catch(err => {
  console.error('测试失败:', err)
  process.exit(1)
})
