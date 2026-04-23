/**
 * 直接测试 PocketBase API
 */
import dotenv from 'dotenv'
dotenv.config()

const PB_URL = process.env.POCKETBASE_URL || 'http://localhost:8090'
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || ''
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || ''

console.log('PB_URL:', PB_URL)
console.log('ADMIN_EMAIL:', ADMIN_EMAIL)
console.log('ADMIN_PASSWORD:', ADMIN_PASSWORD ? '已设置' : '未设置')

async function main() {
  // 1. 管理员登录
  console.log('\n1. 管理员登录...')
  const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  })

  console.log('Auth response status:', authRes.status)
  const authData = await authRes.json()
  console.log('Token:', authData.token?.substring(0, 30) + '...')

  const token = authData.token

  // 2. 查询积分
  const userId = '96tryfm5w6kpx4q'
  const creditsUrl = `${PB_URL}/api/collections/credits/records?filter=user.id='${userId}'`
  console.log('\n2. 查询积分...')
  console.log('URL:', creditsUrl)

  const creditsRes = await fetch(creditsUrl, {
    headers: { Authorization: token }
  })

  console.log('Credits response status:', creditsRes.status)
  const creditsData = await creditsRes.json()
  console.log('Credits data:', JSON.stringify(creditsData))
}

main().catch(console.error)
