// updatePhoto.ts
import cloud from '@lafjs/cloud'
import { deleteFiles } from '@/deleteFiles'


export async function updatePhoto(openid: string) {
  const db = cloud.database()

  try {
    // 获取该用户的所有照片
    const { data: photos } = await db.collection('photo')
      .where({ _openid: openid })
      .get()

    // 收集需要删除的图片链接
    const filesToDelete = []
    photos.forEach(photo => {
      if (photo.photo_compressed) {
        filesToDelete.push(photo.photo_compressed)
      }
      if (photo.photo_watermark) {
        filesToDelete.push(photo.photo_watermark)
      }
    })

    // 删除文件
    if (filesToDelete.length > 0) {
      await deleteFiles(filesToDelete)
    }

    // 更新数据库中的照片记录
    await db.collection('photo')
      .where({ _openid: openid })
      .update(
        {
          photo_compressed: '',
          photo_watermark: ''
        }, {
        multi: true
      })

    return {
      code: 0,
      message: `Successfully updated photos for openid: ${openid}`,
      processedPhotos: photos.length
    }
  } catch (error) {
    console.error(`Error updating photos for openid ${openid}:`, error)
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

  return await updatePhoto(openid)
}