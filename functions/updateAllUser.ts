// updateUser.ts
import cloud from '@lafjs/cloud'
import { updatePhoto } from '@/updatePhoto'

export default async function (ctx: FunctionContext) {
  const db = cloud.database()

  try {
    // 获取所有用户
    const { data: users } = await db.collection('user').limit(2000).get()
    // console.log('users:', users)

    if (!Array.isArray(users)) {
      throw new Error('Invalid users data')
    }

    // 按openid分组用户
    const userGroups: Record<string, any[]> = {}
    users.forEach(user => {
      if (user && typeof user === 'object' && 'openid' in user) {
        if (!userGroups[user.openid]) {
          userGroups[user.openid] = []
        }
        userGroups[user.openid].push(user)
      }
    })

    const results = []

    // 处理每个openid组
    for (const [openid, userGroup] of Object.entries(userGroups)) {
      try {
        if (userGroup.length > 1) {
          // 找出有userInfo的用户数据
          const userWithInfo = userGroup.find(user =>
            user && typeof user === 'object' && 'userInfo' in user && user.userInfo && user.userInfo !== ''
          )
          const othersToDelete = userGroup.filter(user => user !== userWithInfo)

          if (userWithInfo) {
            // 删除其他重复的用户数据
            const deletePromises = othersToDelete.map(user =>
              db.collection('user')
                .where({
                  openid: user.openid,
                  userInfo: user.userInfo
                })
                .remove()
            )
            await Promise.all(deletePromises)

            // 调用updatePhoto云函数
            const photoResult =await updatePhoto(openid)

            results.push({
              openid,
              status: 'success',
              message: `Processed ${othersToDelete.length} duplicate users and updated photos`
            })
          } else {
              continue
          }
        }
      } catch (error) {
        results.push({
          openid,
          status: 'error',
          message: error
        })
      }
    }

    return {
      code: 0,
      message: 'User update process completed',
      results
    }
  } catch (error) {
    console.error('Error updating users:', error)
    return {
      code: 1,
      error: String(error)
    }
  }
}