require('dotenv').config();
const { S3Client } = require('@aws-sdk/client-s3');

// Cloudflare R2 utilise l'API standard AWS S3
const s3Client = new S3Client({
    region: 'auto', // R2 requiert 'auto' comme région
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    }
});

module.exports = { s3Client };
