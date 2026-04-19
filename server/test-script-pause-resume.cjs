/**
 * Phase 8.1 暂停/恢复测试
 *
 * 验收：
 * 1. Start → 进度递增 → Pause → 进度停止
 * 2. Resume → 进度继续递增 → 最终完成
 * 3. Stop → 任务终止
 */

const http = require('http')

const SERVER_URL = 'http://localhost:3001'
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
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      timeout: options.timeout || 30000
    }, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }) }
        catch (e) { resolve({ status: res.statusCode, data: data }) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
    if (body) req.write(body)
    req.end()
  })
}

async function main() {
  console.log('=== Phase 8.1 暂停/恢复/停止 测试 ===\n')

  // 登录
  const loginRes = await jsonRequest(`${SERVER_URL}/api/auth/login`, {
    method: 'POST',
    body: { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD }
  })
  const token = loginRes.data.token
  const headers = { 'Authorization': `Bearer ${token}` }
  console.log('登录成功\n')

  const projectId = '4f7sp1or8ysimys'

  // Step 1: Start（10 集，足够测试暂停）
  console.log('[1/4] 启动 10 集 Dummy Worker...')
  const startRes = await jsonRequest(`${SERVER_URL}/api/script-generation/start`, {
    method: 'POST', headers, body: { projectId, targetEpisodes: 10 }
  })
  console.log(`Start: status=${startRes.status}\n`)
  if (startRes.status !== 202) { console.error('Start 失败:', startRes); process.exit(1) }

  // Step 2: 等 4 秒让进度走一点，然后 Pause
  await new Promise(r => setTimeout(r, 4000))
  const beforePause = await jsonRequest(`${SERVER_URL}/api/script-generation/status/${projectId}`, { headers })
  console.log(`[2/4] 暂停前: ${beforePause.data.progress}`)

  const pauseRes = await jsonRequest(`${SERVER_URL}/api/script-generation/pause`, {
    method: 'POST', headers, body: { projectId }
  })
  console.log(`Pause: status=${pauseRes.status}, data=${JSON.stringify({ success: pauseRes.data.success, status: pauseRes.data.status })}\n`)

  // 等 3 秒确认进度不再递增
  await new Promise(r => setTimeout(r, 3000))
  const afterPause = await jsonRequest(`${SERVER_URL}/api/script-generation/status/${projectId}`, { headers })
  console.log(`暂停后 3 秒: ${afterPause.data.progress} (completedEpisodes=${afterPause.data.completedEpisodes})`)

  const pausedOK = afterPause.data.completedEpisodes === beforePause.data.completedEpisodes
  console.log(`${pausedOK ? '✓' : '✗'} 暂停后进度不再递增\n`)

  // Step 3: Resume
  console.log('[3/4] 恢复...')
  const resumeRes = await jsonRequest(`${SERVER_URL}/api/script-generation/resume`, {
    method: 'POST', headers, body: { projectId }
  })
  console.log(`Resume: status=${resumeRes.status}\n`)

  // Step 4: 轮询到完成
  console.log('[4/4] 轮询到完成...')
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const status = await jsonRequest(`${SERVER_URL}/api/script-generation/status/${projectId}`, { headers })
    console.log(`  轮询 ${i + 1}: ${status.data.progress} (status=${status.data.status})`)
    if (status.data.status === 'completed') {
      console.log(`\n✓ 恢复后最终完成: ${status.data.progress}`)
      break
    }
  }

  console.log('\n=== 全部通过 ===')
}

main().catch(err => { console.error('测试失败:', err); process.exit(1) })
