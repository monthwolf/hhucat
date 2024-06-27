import cloud from '@lafjs/cloud'
const db = cloud.mongo.db
export default async function (ctx: FunctionContext) {
  let list = await db.collection('photo').find().toArray();
  const bucket = cloud.storage.bucket('n0002i-cloud-bin');
  let res = await bucket.listFiles();
  let n = 0
  let files = [];
  console.log(files.push.apply(files, res.Contents.map(k=>k.Key)));
  while(res.IsTruncated){
    res = await bucket.listFiles({Marker:res.NextMarker});
    console.log(files.push.apply(files, res.Contents.map(k => k.Key)));
    // console.log(res)
  }
  for(const photo of list){
    let url = String(photo['photo_compressed']).replace("https://oss.laf.run/n0002i-cloud-bin/","");
    let p = String(photo['photo_id']).replace("https://oss.laf.run/n0002i-cloud-bin/", "");

    if((files.indexOf(url)==-1 && url!="") && (files.indexOf(p) !=-1)){
      console.log(url)
      await db.collection('photo').updateOne({ _id: photo._id }, { $set: { photo_compressed: "", photo_watermark:"" }})
      console.log('已还原图片id:', photo._id)
    }
  }
  // console.log(files.slice(1000,))
  for(const photo of list){
    let p = String(photo['photo_id']).replace("https://oss.laf.run/n0002i-cloud-bin/", "");
    if (files.indexOf(p) == -1){
      db.collection('photo').deleteOne({_id:photo._id})
      console.log("已删除图片id:",photo._id)
    }
  }
}
