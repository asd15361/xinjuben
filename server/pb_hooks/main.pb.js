// pb_hooks/main.pb.js
/**
 * PocketBase 自动化钩子
 *
 * 功能：
 * - 用户注册时自动创建积分账户（送 100 积分）
 * - 记录注册奖励交易
 */

// 用户注册后自动送积分
onRecordAfterCreateRequest((e) => {
  if (e.collection.name === 'users') {
    try {
      // 创建积分账户
      $app.dao().saveRecord(
        new Record(
          $app.dao().findCollectionByNameOrId('credits'),
          {
            user: e.record.id,
            balance: 100,
            frozenBalance: 0
          }
        )
      )

      // 记录交易
      $app.dao().saveRecord(
        new Record(
          $app.dao().findCollectionByNameOrId('transactions'),
          {
            user: e.record.id,
            type: 'register_bonus',
            amount: 100,
            balanceBefore: 0,
            balanceAfter: 100,
            description: '新用户注册奖励'
          }
        )
      )

      console.log('[Hooks] 用户 ' + e.record.id + ' 注册成功，赠送 100 积分')
    } catch (err) {
      console.error('[Hooks] 创建积分账户失败:', err)
    }
  }
}, "users")