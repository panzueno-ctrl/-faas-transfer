require('dotenv').config();
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const supabase = require('./services/supabase');
const fs = require('fs');

const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    }
});

async function test() {
    const { data: transfers } = await supabase.from('transfers').select('*');
    const batch = transfers.find(t => t.file_url.startsWith('['));
    if (!batch) return console.log('No batch found');
    const files = JSON.parse(batch.file_url);
    const file = files[0];
    console.log('Testing with file:', file.storageName);

    const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: file.storageName
    });
    
    const response = await s3Client.send(command);
    console.log('Response Body constructor:', response.Body.constructor.name);
    console.log('Is Readable?', typeof response.Body.on === 'function');
    
    let totalSize = 0;
    if (typeof response.Body.on === 'function') {
        response.Body.on('data', chunk => totalSize += chunk.length);
        response.Body.on('end', () => console.log('Total bytes received:', totalSize));
    } else {
        console.log('Not a standard node stream!');
    }
}
test();
