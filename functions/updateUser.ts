// updateUser.ts
import cloud from '@lafjs/cloud'
import { updatePhoto } from '@/updatePhoto'

export async function updateUser(openid:string) {
  const db = cloud.database()

  try {
    // 获取指定openid的所有用户数据
    const { data: users } = await db.collection('user')
      .where({ openid })
      .get()

    if (!Array.isArray(users)) {
      throw new Error('Invalid users data')
    }

    // 如果没有找到用户或只有一条记录
    if (users.length <= 1) {
      return {
        code: 0,
        message: 'No duplicate records found',
        openid
      }
    }

    // 找出有userInfo的用户数据
    const userWithInfo = users.find(user =>
      user && typeof user === 'object' && 'userInfo' in user && user.userInfo && user.userInfo !== ''
    )

    if (userWithInfo) {
      // 过滤出需要删除的用户记录
      const othersToDelete = users.filter(user => user !== userWithInfo)

      // 删除多余的用户记录
      const deletePromises = othersToDelete.map(user =>
        db.collection('user')
          .where({
            openid: user.openid,
            userInfo: user.userInfo
          })
          .remove()
      )
      await Promise.all(deletePromises)

      // 调用updatePhoto云函数清理照片
      await updatePhoto(openid)

      return {
        code: 0,
        message: `Successfully processed duplicate records`,
        openid,
        deletedCount: othersToDelete.length,
        remainingUser: userWithInfo
      }
    } else {
      // 如果没有找到带userInfo的记录，保留第一条记录
      const keepUser = users[0]
      const othersToDelete = users.slice(1)

      // 删除多余的用户记录
      const deletePromises = othersToDelete.map(user =>
        db.collection('user')
          .where({
            openid: user.openid,
            userInfo: user.userInfo
          })
          .remove()
      )
      await Promise.all(deletePromises)

      return {
        code: 0,
        message: `No user found with userInfo, kept first record`,
        openid,
        deletedCount: othersToDelete.length,
        remainingUser: keepUser
      }
    }

  } catch (error) {
    console.error(`Error processing user ${openid}:`, error)
    return {
      code: 1,
      error: String(error)
    }
  }
}

export default async function (ctx: FunctionContext) {
  const { openid } = ctx.body || {}

  if (!openid) {
    return {
      code: 1,
      error: 'openid is required'
    }
  }

  return await updateUser(openid)
  
}