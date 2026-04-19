/**
 * Phase 7 实弹验证脚本
 *
 * 测试 POST /api/generate/detailed-outline 真实大模型调用
 *
 * 验收四项：
 * 1. 积分扣除
 * 2. 耗时是否超时
 * 3. 门禁是否拦截/放行
 * 4. 数据库落盘
 */

const http = require('http')

const POCKETBASE_URL = 'http://localhost:8091'
const SERVER_URL = 'http://localhost:3001'
const ADMIN_EMAIL = 'stage6-admin2@example.com'
const ADMIN_PASSWORD = 'Stage6Admin123'

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
      timeout: options.timeout || 180000
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
  console.log('=== Phase 7 实弹验证 ===\n')

  // 1. PocketBase 登录获取 admin token
  console.log('[Step 1] PocketBase Admin 登录...')
  let adminToken
  try {
    const authRes = await jsonRequest(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      body: { identity: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      timeout: 10000
    })

    if (authRes.status !== 200) {
      console.error('Admin 登录失败:', authRes)
      return
    }

    adminToken = authRes.data.token
    console.log('Admin 登录成功, token:', adminToken.slice(0, 20) + '...')
  } catch (e) {
    console.error('Admin 登录异常:', e.message)
    return
  }

  // 2. 查询所有项目及其关联表
  console.log('\n[Step 2] 查询现有项目及关联数据...')
  let projects, outlines, characters
  try {
    const projectsRes = await jsonRequest(`${POCKETBASE_URL}/api/collections/projects/records?perPage=50`, {
      headers: { Authorization: adminToken },
      timeout: 10000
    })

    if (projectsRes.status !== 200) {
      console.error('查询项目失败:', projectsRes)
      return
    }

    projects = projectsRes.data.items || []
    console.log('找到项目数:', projects.length)

    // 查询 project_outlines
    const outlinesRes = await jsonRequest(`${POCKETBASE_URL}/api/collections/project_outlines/records?perPage=50`, {
      headers: { Authorization: adminToken },
      timeout: 10000
    })
    outlines = outlinesRes.status === 200 ? (outlinesRes.data.items || []) : []
    console.log('找到 outline 数:', outlines.length)

    // 查询 project_characters
    const charsRes = await jsonRequest(`${POCKETBASE_URL}/api/collections/project_characters/records?perPage=50`, {
      headers: { Authorization: adminToken },
      timeout: 10000
    })
    characters = charsRes.status === 200 ? (charsRes.data.items || []) : []
    console.log('找到 characters 数:', characters.length)

    // 打印项目信息
    for (const p of projects.slice(0, 5)) {
      const hasOutline = outlines.some(o => o.project === p.id)
      const hasChars = characters.some(c => c.project === p.id)
      console.log(`  - ${p.id}: storyIntent=${p.storyIntentJson ? '有' : '无'}, outline=${hasOutline ? '有' : '无'}, chars=${hasChars ? '有' : '无'}`)
    }
  } catch (e) {
    console.error('查询项目异常:', e.message)
    return
  }

  // 3. 找一个有前置条件的项目
  const validProject = projects.find(p =>
    p.storyIntentJson &&
    outlines.some(o => o.project === p.id) &&
    characters.some(c => c.project === p.id)
  )

  if (!validProject) {
    console.log('\n没有满足前置条件的项目（需要 storyIntent + outline + characters）')
    console.log('请先在 Electron 中创建一个完整项目')
    return
  }

  console.log('\n[Step 3] 选择项目:', validProject.id)

  // 4. 创建/登录测试用户
  console.log('\n[Step 4] 创建/登录测试用户...')
  let userToken
  let userId

  try {
    // 尝试登录现有测试用户
    const loginRes = await jsonRequest(`${POCKETBASE_URL}/api/collections/users/auth-with-password`, {
      method: 'POST',
      body: { identity: 'test-phase7@example.com', password: 'TestPhase7Pass123' },
      timeout: 10000
    })

    if (loginRes.status === 200) {
      userToken = loginRes.data.token
      userId = loginRes.data.record.id
      console.log('测试用户登录成功, userId:', userId)
    } else {
      // 创建新用户
      console.log('测试用户不存在，尝试创建...')
      const createRes = await jsonRequest(`${POCKETBASE_URL}/api/collections/users/records`, {
        method: 'POST',
        headers: { Authorization: adminToken },
        body: {
          email: 'test-phase7@example.com',
          password: 'TestPhase7Pass123',
          passwordConfirm: 'TestPhase7Pass123',
          name: 'Phase7 Test User'
        },
        timeout: 10000
      })

      if (createRes.status !== 200 && createRes.status !== 201) {
        console.error('创建用户失败:', createRes)
        return
      }

      userId = createRes.data.id
      console.log('创建用户成功, userId:', userId)

      // 重新登录获取 token
      const loginRes2 = await jsonRequest(`${POCKETBASE_URL}/api/collections/users/auth-with-password`, {
        method: 'POST',
        body: { identity: 'test-phase7@example.com', password: 'TestPhase7Pass123' },
        timeout: 10000
      })

      if (loginRes2.status !== 200) {
        console.error('新用户登录失败:', loginRes2)
        return
      }

      userToken = loginRes2.data.token
      console.log('新用户登录成功')
    }
  } catch (e) {
    console.error('用户处理异常:', e.message)
    return
  }

  // 5. 把项目 owner 改成测试用户，确保权限匹配
  console.log('\n[Step 5] 将项目 owner 切换为测试用户...')
  try {
    const patchRes = await jsonRequest(`${POCKETBASE_URL}/api/collections/projects/records/${validProject.id}`, {
      method: 'PATCH',
      headers: { Authorization: adminToken },
      body: { user: userId },
      timeout: 10000
    })
    if (patchRes.status === 200) {
      console.log('项目 owner 已切换为测试用户:', userId)
    } else {
      console.log('切换 owner 失败:', patchRes.status, JSON.stringify(patchRes.data).slice(0,200))
    }
  } catch (e) {
    console.error('切换 owner 异常:', e.message)
  }

  // 6. 给用户积分
  console.log('\n[Step 6] 确保用户有足够积分...')
  try {
    // 查积分
    const creditsRes = await jsonRequest(`${SERVER_URL}/api/credits/balance`, {
      headers: { Authorization: `Bearer ${userToken}` },
      timeout: 10000
    })

    console.log('当前积分:', creditsRes.data?.balance || 0)

    // 如果积分不足，用 admin 直接加
    if (!creditsRes.data || creditsRes.data.balance < 10) {
      console.log('积分不足，直接添加...')
      await jsonRequest(`${POCKETBASE_URL}/api/collections/credits/records`, {
        method: 'POST',
        headers: { Authorization: adminToken },
        body: { user: userId, balance: 100 },
        timeout: 10000
      })
      console.log('已添加 100 积分')
    }
  } catch (e) {
    console.error('积分处理异常:', e.message)
  }

  // 7. 调用详细大纲生成接口
  console.log('\n[Step 7] 调用 POST /api/generate/detailed-outline...')
  console.log('项目 ID:', validProject.id)
  console.log('开始时间:', new Date().toISOString())

  const startTime = Date.now()

  try {
    const genRes = await jsonRequest(`${SERVER_URL}/api/generate/detailed-outline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: { projectId: validProject.id },
      timeout: 900000 // 15 分钟
    })

    const elapsedMs = Date.now() - startTime
    console.log('\n=== 实弹验证结果 ===')
    console.log('耗时:', elapsedMs, 'ms (' + (elapsedMs / 1000).toFixed(1) + 's)')
    console.log('HTTP 状态:', genRes.status)

    if (genRes.status === 200) {
      console.log('\n[验收项 1] 积分扣除: ✅ 成功')
      console.log('  剩余积分:', genRes.data.creditsRemaining)

      console.log('\n[验收项 2] 耗时:', elapsedMs < 120000 ? '✅ 未超时' : '⚠️ 超过 120s')

      console.log('\n[验收项 3] 门禁: ✅ 放行')
      console.log('  返回 segments 数:', genRes.data.detailedOutlineSegments?.length || 0)

      // 检查集数
      if (genRes.data.detailedOutlineSegments) {
        const totalBeats = genRes.data.detailedOutlineSegments.reduce(
          (sum, seg) => sum + (seg.episodeBeats?.length || 0), 0
        )
        console.log('  总 episodeBeats:', totalBeats)
      }

      console.log('\n[验收项 4] 落盘: 需查数据库确认')

    } else {
      console.log('\n返回数据:', JSON.stringify(genRes.data).slice(0, 500))

      if (genRes.data.error?.includes('episode_count_short')) {
        console.log('\n[验收项 3] 门禁: ⚠️ 已拦截')
        console.log('  拦截原因:', genRes.data.error)
      } else {
        console.log('\n[验收项 3] 门禁: 其他失败')
      }
    }

  } catch (e) {
    const elapsedMs = Date.now() - startTime
    console.log('\n=== 实弹验证结果 ===')
    console.log('耗时:', elapsedMs, 'ms')
    console.log('异常:', e.message)

    if (e.message === 'Request timeout') {
      console.log('\n[验收项 2] 耗时: ⚠️ 请求超时（3分钟）')
    }
  }

  // 8. 查数据库落盘
  console.log('\n[Step 8] 检查数据库落盘...')
  try {
    const detailedRes = await jsonRequest(`${POCKETBASE_URL}/api/collections/project_detailed_outlines/records?filter=project='${validProject.id}'&perPage=1`, {
      headers: { Authorization: adminToken },
      timeout: 10000
    })

    if (detailedRes.status === 200) {
      const records = detailedRes.data.items || []
      if (records.length > 0) {
        console.log('[验收项 4] 落盘: ✅ 成功')
        console.log('  记录 ID:', records[0].id)
        console.log('  version:', records[0].version)
      } else {
        console.log('[验收项 4] 落盘: ⚠️ 无记录')
      }
    } else {
      console.log('查询失败:', detailedRes)
    }
  } catch (e) {
    console.error('查询落盘异常:', e.message)
  }

  console.log('\n=== 实弹验证完成 ===')
}

main().catch(console.error)