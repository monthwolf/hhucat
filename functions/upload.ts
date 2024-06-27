import cloud from '@lafjs/cloud'
import * as Minio from 'minio';
import { getAppSecret } from "@/getAppSecret"

// 定义从 API 获取集合名称的函数
async function fetchCollectionNames() {
  const response = await fetch('https://sealaf.bja.sealos.run/v1/apps/p39mnqlt9f/collections', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NjQ3NWZlNzMxYTY0MGQzNWQxNmJhOWUiLCJpYXQiOjE3MTg0NzAwNjIsImV4cCI6MTcxOTA3NDg2Mn0.Yb5snBVzZZRNIrxkYT_QPAPVlyvQPKYCAAA9vxMUNHs'
    }
  });

  const data = await response.json();
  const res = data.data.map(collection => collection.name);
  console.log(res);
  return res;
}


// 从 OSS 存储桶中读取 JSON 文件
async function fetchJsonFromOss(client, bucketName, objectName) {
  const stream = await client.getObject(bucketName, objectName);

  return new Promise((resolve, reject) => {
    let data = '';
    stream.on('data', chunk => {
      data += chunk;
    });
    stream.on('end', () => {
      resolve(JSON.parse(data));
    });
    stream.on('error', err => {
      reject(err);
    });
  });
}

export default async function (ctx: FunctionContext) {
  try {
    // 获取所有集合名称
    const collectionNames = await fetchCollectionNames();
    const { OSS_ENDPOINT, OSS_PORT, OSS_BUCKET, OSS_SECRET_ID, OSS_SECRET_KEY } = await getAppSecret(false);
    const client = new Minio.Client({
      endPoint: OSS_ENDPOINT,
      port: OSS_PORT,
      useSSL: true,
      accessKey: OSS_SECRET_ID,
      secretKey: OSS_SECRET_KEY,
    });
    const db = cloud.database();
    // 遍历每个集合名称并导入数据到本地数据库
    for (const collectionName of collectionNames) {
      await db.collection(collectionName).remove({ multi: true });
      const objectName = `${collectionName}.json`;
      try{
        const collectionData = await fetchJsonFromOss(client, OSS_BUCKET, objectName);
        console.log(collectionData.list)
        if (collectionData.list.length) {
          for (var idx in collectionData.list) {
            console.log(idx)
            var record = collectionData.list[idx];
            var id = record._id;
            delete record._id;
            await db.collection(collectionName).doc(id).set(record);
          }
          console.log(`数据已成功保存到集合: ${collectionName}`);
        } else {
          console.error(`集合 ${collectionName} 数据格式不正确或为空`);
        }
      }catch(err){
        console.log('数据为空跳过')
      }
      
      
    }

    return {
      message: '所有数据导入成功',
    };
  } catch (error) {
    console.error('发生错误:', error);
    return {
      message: '数据导入失败',
      error: error,
    };
  }
}
