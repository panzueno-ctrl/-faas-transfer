require('dotenv').config({ path: '../.env' });
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
});
async function run() {
    const data = await s3Client.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME }));
    const sorted = (data.Contents || []).sort((a,b) => b.LastModified - a.LastModified);
    sorted.slice(0, 5).forEach(f => console.log(f.Key, f.Size, f.LastModified));
}
run();
