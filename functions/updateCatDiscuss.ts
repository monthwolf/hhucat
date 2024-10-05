import cloud from '@lafjs/cloud';
const db = cloud.database();

export default async function (ctx: FunctionContext) {
  try {
    // 获取所有猫的数据
    const cats = await db.collection('cat').get();
    const page_settings = (await db.collection('setting').doc('pages').get()).data;
    const photoPopWeight = page_settings.genealogy.photoPopWeight ? page_settings.genealogy.photoPopWeight:10;
    // 更新每只猫的 catDiscuss 属性
    for (let cat of cats.data) {
      const catDiscuss = (cat.popularity ? cat.popularity + (cat.photo_count_total ? cat.photo_count_total * photoPopWeight : 0) :0) + (cat.followCount?cat.followCount:0) * 50;
      await db.collection('cat').doc(cat._id).update({
        catDiscuss: catDiscuss
      });
    }
    console.log('catDiscuss 属性更新成功');

  } catch (error) {
    console.error('更新 catDiscuss 属性时出错:', error);
  }
  return "";
}
