/**
 * 测试 getUserCredits 函数
 */
import dotenv from 'dotenv'
dotenv.config()

import { authenticateAdmin, getUserCredits, cachedAdminToken } from '../src/infrastructure/pocketbase/client'

async function test() {
  console.log('Testing getUserCredits...')

  await authenticateAdmin()
  console.log('Token:', cachedAdminToken.substring(0, 30) + '...')

  const userId = '96tryfm5w6kpx4q'
  console.log('UserId:', userId)

  try {
    const credits = await getUserCredits(userId)
    console.log('Credits:', JSON.stringify(credits))
  } catch (error) {
    console.error('Error:', error)
  }
}

test().catch(console.error)