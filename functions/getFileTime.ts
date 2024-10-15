import cloud from '@lafjs/cloud'
import axios from 'axios';
import * as Minio from 'minio';
import { getAppSecret } from "@/getAppSecret"
import ExifParser from 'exif-parser';

function formatDateTime(dateTime) {
  if (!dateTime) return { date: null, time: null };
  const date = new Date(dateTime * 1000);
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const datePart = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;
  const timePart = `${parts.find(p => p.type === 'hour').value}:${parts.find(p => p.type === 'minute').value}`;

  return { date: datePart, time: timePart };
}


function extractKeyFromUrl(url) {
  // 去掉协议和域名部分，只保留路径
  const parts = url.split('.com/');
  if (parts.length > 1) {
    return decodeURIComponent(parts[1]);
  }
  return null;
}
async function getExifData(client, bucket, key) {
  return new Promise((resolve, reject) => {
    client.getObject(bucket, key, (err, dataStream) => {
      if (err) {
        console.error(`Error fetching object ${key}:`, err);
        return reject(null);
      }

      const chunks = [];
      dataStream.on('data', chunk => chunks.push(chunk));
      dataStream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const parser = ExifParser.create(buffer);
        const result = parser.parse();
        const dateTimeOriginal = result.tags.DateTimeOriginal || null;
        resolve(formatDateTime(dateTimeOriginal));
      });
      dataStream.on('error', err => {
        console.error(`Error reading data stream for ${key}:`, err);
        reject(null);
      });
    });
  });
}


export default async function (ctx) {
  console.log(ctx)
  const { body } = ctx
  const { OSS_ENDPOINT, OSS_PORT, OSS_BUCKET, OSS_SECRET_ID, OSS_SECRET_KEY } = await getAppSecret(false);

  const client = new Minio.Client({
    endPoint: OSS_ENDPOINT,
    port: OSS_PORT,
    useSSL: true,
    accessKey: OSS_SECRET_ID,
    secretKey: OSS_SECRET_KEY,
    pathStyle: false
  });

  if (OSS_ENDPOINT === "oss.laf.run") {
    client.pathStyle = true;
  }
  console.log(body)
  const mediaArray = body.data; // 假设输入在请求体中
  console.log(mediaArray)
  const results = [];

  for (const media of mediaArray) {
    if (media.type === 'image' || media.type === 'video') {
      const key = extractKeyFromUrl(media.url);
      if (key) {
        const dateTimeOriginal = await getExifData(client, OSS_BUCKET, key);
        results.push(dateTimeOriginal );
      } else {
        continue;
      }
    }
  }

  return { data: results };
}