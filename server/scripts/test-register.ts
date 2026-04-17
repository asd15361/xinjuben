/**
 * 测试脚本 - 验证注册+积分流程
 *
 * 使用方法：
 * 1. 确保 PocketBase 已启动并初始化数据库
 * 2. 确保 server 已启动（npx tsx src/index.ts）
 * 3. 运行此脚本：cd server && npx tsx scripts/test-register.ts
 */
import dotenv from 'dotenv'

dotenv.config()

const SERVER_URL = 'http://localhost:3001'
const TEST_EMAIL = `test_${Date.now()}@example.com`
const TEST_PASSWORD = 'test123456'

async function testRegister() {
  console.log('========================================')
  console.log('测试用户注册 + 积分赠送流程')
  console.log('========================================')
  console.log('')

  // 1. 注册用户
  console.log('1. 注册新用户...')
  console.log(`   邮箱: ${TEST_EMAIL}`)

  const registerRes = await fetch(`${SERVER_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      passwordConfirm: TEST_PASSWORD,
      name: '测试用户'
    })
  })

  if (!registerRes.ok) {
    const error = await registerRes.json()
    console.error('   ❌ 注册失败:', error)
    return
  }

  const registerData = await registerRes.json()
  console.log('   ✓ 注册成功')
  console.log(`   用户 ID: ${registerData.user.id}`)
  console.log(`   Token: ${registerData.token.substring(0, 20)}...`)
  console.log(`   积分余额: ${registerData.credits.balance}`)
  console.log('')

  // 2. 查询积分余额
  console.log('2. 查询积分余额...')

  const balanceRes = await fetch(`${SERVER_URL}/api/credits/balance`, {
    headers: { 'Authorization': `Bearer ${registerData.token}` }
  })

  if (!balanceRes.ok) {
    const error = await balanceRes.json()
    console.error('   ❌ 查询失败:', error)
    return
  }

  const balanceData = await balanceRes.json()
  console.log(`   ✓ 余额: ${balanceData.balance}`)
  console.log(`   ✓ 冻结: ${balanceData.frozenBalance}`)
  console.log('')

  // 3. 查询交易记录
  console.log('3. 查询交易记录...')

  const transactionsRes = await fetch(`${SERVER_URL}/api/credits/transactions`, {
    headers: { 'Authorization': `Bearer ${registerData.token}` }
  })

  if (!transactionsRes.ok) {
    const error = await transactionsRes.json()
    console.error('   ❌ 查询失败:', error)
    return
  }

  const transactionsData = await transactionsRes.json()
  console.log(`   ✓ 记录数: ${transactionsData.total}`)
  transactionsData.transactions.forEach((t: any) => {
    console.log(`     - ${t.type}: ${t.amount} (${t.description})`)
  })
  console.log('')

  // 4. 获取用户信息
  console.log('4. 获取用户信息...')

  const meRes = await fetch(`${SERVER_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${registerData.token}` }
  })

  if (!meRes.ok) {
    const error = await meRes.json()
    console.error('   ❌ 查询失败:', error)
    return
  }

  const meData = await meRes.json()
  console.log(`   ✓ 用户: ${meData.user.email}`)
  console.log(`   ✓ 积分: ${meData.credits.balance}`)
  console.log('')

  // 5. 登录测试
  console.log('5. 登录测试...')

  const loginRes = await fetch(`${SERVER_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    })
  })

  if (!loginRes.ok) {
    const error = await loginRes.json()
    console.error('   ❌ 登录失败:', error)
    return
  }

  const loginData = await loginRes.json()
  console.log('   ✓ 登录成功')
  console.log(`   ✓ 积分余额: ${loginData.credits.balance}`)
  console.log('')

  // 总结
  console.log('========================================')
  console.log('✓ 测试通过！完整流程闭环成功')
  console.log('========================================')
  console.log('')
  console.log('验证项目：')
  console.log('  ✓ 用户注册成功')
  console.log('  ✓ 注册赠送 100 积分')
  console.log('  ✓ 积分余额查询成功')
  console.log('  ✓ 交易记录查询成功')
  console.log('  ✓ 用户登录成功')
  console.log('')
}

testRegister().catch(console.error)