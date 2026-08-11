const archiver = require('archiver');
const https = require('https');
const { GetObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

async function test() {
    try {
        const s3Client = new S3Client({ region: 'us-east-1' });
        const archive = archiver('zip', { store: true });
        archive.on('error', err => console.error(err));
        
        const files = [{ storageName: 'test', originalName: 'test.jpg' }];
        
        for (const file of files) {
            try {
                const command = new GetObjectCommand({ Bucket: 'b', Key: file.storageName });
                const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
                console.log('URL generated:', signedUrl);
                
                await new Promise((resolve, reject) => {
                    const req = https.get(signedUrl, (httpRes) => {
                        console.log('HTTP Status:', httpRes.statusCode);
                        archive.append(httpRes, { name: file.originalName });
                        httpRes.on('end', resolve);
                        httpRes.on('error', reject);
                    });
                    req.on('error', reject);
                });
            } catch (err) {
                console.error('Inner error:', err.message);
                throw err; // Let's see if it propagates!
            }
        }
        await archive.finalize();
        console.log('Done');
    } catch (err) {
        console.error('Outer error:', err.message);
    }
}
test();
