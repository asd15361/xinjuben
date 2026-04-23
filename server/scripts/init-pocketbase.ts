/**
 * PocketBase 数据库初始化脚本（分步延迟）
 */
import dotenv from 'dotenv'

dotenv.config()

const PB_URL = process.env.POCKETBASE_URL || 'http://localhost:8090'
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL!
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD!

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  console.log('========================================')
  console.log('Xinjuben PocketBase 数据库初始化')
  console.log('========================================')

  // 1. 管理员登录
  console.log('管理员登录...')
  const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  })
  const authData = await authRes.json()
  const token = authData.token
  console.log('✓ 登录成功')

  // Helper: 创建集合（带延迟）
  async function createCollection(name: string, schema: any[]) {
    console.log(`创建 ${name} 表...`)

    // 等待上一步完成
    await delay(1000)

    const res = await fetch(`${PB_URL}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token
      },
      body: JSON.stringify({ name, type: 'base', schema, indexes: [] })
    })

    const data = await res.json()

    if (!res.ok) {
      if (data.message?.includes('already exists') || data.code === 400) {
        console.log(`✓ ${name} 表已存在或创建成功`)
        return
      }
      console.log(`  创建 ${name} 返回: ${JSON.stringify(data)}`)
      return
    }

    console.log(`✓ ${name} 表创建成功 (ID: ${data.id})`)
  }

  // 2. 分步创建表（每步间隔 1 秒）
  try {
    await createCollection('credits', [
      {
        name: 'user',
        type: 'relation',
        required: true,
        options: { collectionId: '_pb_users_auth_', cascadeDelete: true }
      },
      { name: 'balance', type: 'number', required: true },
      { name: 'frozenBalance', type: 'number', required: false }
    ])
  } catch (e) {
    console.log('  credits 可能已存在')
  }

  await delay(2000)

  try {
    await createCollection('transactions', [
      {
        name: 'user',
        type: 'relation',
        required: true,
        options: { collectionId: '_pb_users_auth_', cascadeDelete: true }
      },
      {
        name: 'type',
        type: 'select',
        required: true,
        options: { values: ['register_bonus', 'api_call', 'payment', 'refund', 'admin_adjust'] }
      },
      { name: 'amount', type: 'number', required: true },
      { name: 'balanceBefore', type: 'number', required: true },
      { name: 'balanceAfter', type: 'number', required: true },
      { name: 'reference', type: 'text', required: false },
      { name: 'description', type: 'text', required: false },
      { name: 'metadata', type: 'json', required: false }
    ])
  } catch (e) {
    console.log('  transactions 可能已存在')
  }

  await delay(2000)

  try {
    await createCollection('api_call_logs', [
      {
        name: 'user',
        type: 'relation',
        required: true,
        options: { collectionId: '_pb_users_auth_', cascadeDelete: true }
      },
      { name: 'project', type: 'text', required: false },
      { name: 'task', type: 'text', required: true },
      { name: 'lane', type: 'text', required: false },
      { name: 'model', type: 'text', required: false },
      { name: 'inputTokens', type: 'number', required: false },
      { name: 'outputTokens', type: 'number', required: false },
      { name: 'costCredits', type: 'number', required: true },
      { name: 'durationMs', type: 'number', required: false },
      { name: 'success', type: 'bool', required: true },
      { name: 'errorMessage', type: 'text', required: false }
    ])
  } catch (e) {
    console.log('  api_call_logs 可能已存在')
  }

  await delay(2000)

  try {
    await createCollection('payment_orders', [
      {
        name: 'user',
        type: 'relation',
        required: true,
        options: { collectionId: '_pb_users_auth_', cascadeDelete: true }
      },
      { name: 'amount', type: 'number', required: true },
      { name: 'credits', type: 'number', required: true },
      {
        name: 'status',
        type: 'select',
        required: true,
        options: { values: ['pending', 'paid', 'failed', 'refunded'] }
      },
      { name: 'alipayTradeNo', type: 'text', required: false },
      { name: 'qrcodeUrl', type: 'text', required: false },
      { name: 'paidAt', type: 'datetime', required: false },
      { name: 'expiredAt', type: 'datetime', required: false }
    ])
  } catch (e) {
    console.log('  payment_orders 可能已存在')
  }

  // 3. 验证创建结果
  console.log('')
  console.log('验证表是否创建成功...')

  await delay(1000)

  const listRes = await fetch(`${PB_URL}/api/collections`, {
    headers: { Authorization: token }
  })
  const collections = await listRes.json()

  const targetTables = ['credits', 'transactions', 'api_call_logs', 'payment_orders']
  const existingTables = collections.map((c: any) => c.name)

  console.log('')
  console.log('已存在的表：')
  targetTables.forEach((name) => {
    if (existingTables.includes(name)) {
      console.log(`  ✓ ${name}`)
    } else {
      console.log(`  ❌ ${name} (未创建)`)
    }
  })

  console.log('')
  console.log('========================================')
  console.log('初始化完成！')
  console.log('========================================')
}

main().catch((err) => {
  console.error('错误:', err.message)
  process.exit(1)
})
