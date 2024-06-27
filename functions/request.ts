import cloud from '@lafjs/cloud';
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

// 将数据保存为 JSON 文件并上传到 MinIO
async function saveAndUploadToMinio(collectionName, data) {
  const { OSS_ENDPOINT, OSS_PORT, OSS_BUCKET, OSS_SECRET_ID, OSS_SECRET_KEY } = await getAppSecret(false);
  const client = new Minio.Client({
    bucketName: OSS_BUCKET,
    endPoint: OSS_ENDPOINT,
    port: OSS_PORT,
    useSSL: true,
    accessKey: OSS_SECRET_ID,
    secretKey: OSS_SECRET_KEY,
  });
  let ossPath = `https://${OSS_ENDPOINT}:${OSS_PORT}/${OSS_BUCKET}/`
  if (OSS_SECRET_ID) {
    ossPath = `https://${OSS_BUCKET}.${OSS_ENDPOINT}:${OSS_PORT}/`
  }

  const objectName = `${collectionName}.json`;
  const jsonData = JSON.stringify(data, null, 2);

  await client.putObject(OSS_BUCKET, objectName, jsonData, jsonData.length, {
    'Content-Type': 'application/json'
  });

}


// 定义从 API 获取集合内容的函数
async function fetchCollectionData(collectionName) {
  const response = await fetch('https://sealaf.bja.sealos.run/v1/apps/p39mnqlt9f/databases/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NjQ3NWZlNzMxYTY0MGQzNWQxNmJhOWUiLCJpYXQiOjE3MTg0NzAwNjIsImV4cCI6MTcxOTA3NDg2Mn0.Yb5snBVzZZRNIrxkYT_QPAPVlyvQPKYCAAA9vxMUNHs'
    },
    body: JSON.stringify({
      action: "database.queryDocument",
      collectionName: collectionName,
      limit: 1000,
      query: {}
    })
  });

  const data = await response.json();
  return data;
}

// 主函数，获取集合名称并导入数据到本地数据库
async function importData() {
  try {
    // 获取所有集合名称
    const collectionNames = await fetchCollectionNames();
    const db = cloud.database();

    // 遍历每个集合名称并导入数据
    for (const collectionName of collectionNames) {
      const collectionData = await fetchCollectionData(collectionName);
      console.log(collectionData.data.list);
      // 将集合名称转换为小写
      if (collectionData.data.list.length > 0){
        // const lowerCaseCollectionName = collectionName.toLowerCase();
        // // 保存数据到本地数据库的同名集合中
        // await db.collection(collectionName).add(collectionData.data.list,{
        //   multi:true
        // });

        // console.log(`数据已成功保存到集合: ${collectionName}`);
        saveAndUploadToMinio(collectionName, collectionData.data);
      }
    }

    return {
      message: '所有数据保存成功',
    };
  } catch (error) {
    console.error('发生错误:', error);
    return {
      message: '数据保存失败',
      error: error,
    };
  }
}


export default async function (ctx: FunctionContext) {

  // // 发起 HTTP 请求获取数据
  // const response = await cloud.fetch(' https://api.example.com/data '); // 替换为实际的 API 地址

  // // 从响应中获取数据
  // const data = await response.data;

  // // 保存数据到指定集合
  // const db = cloud.database();

  // // 保存数据到指定集合
  // await db.collection('你的集合名称' ).add(data);

  // // 返回成功消息给调用方
  // return {
  //   message: '数据保存成功',
  //   data: data,
  // };
  importData().then(response => {
    console.log(response.message);
  }).catch(error => {
    console.error('发生错误:', error);
  });
  
}