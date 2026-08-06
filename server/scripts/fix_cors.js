require('dotenv').config({ path: '../.env' }); // On charge le .env du dossier server
const { s3Client } = require('../services/r2');
const { PutBucketCorsCommand } = require('@aws-sdk/client-s3');

async function fixCors() {
    // Si R2_BUCKET_NAME n'est pas trouvé parce que le chemin du .env est relatif au lancement
    // on relance dotenv en cherchant dans le dossier courant si besoin.
    require('dotenv').config();

    console.log("Bucket ciblé :", process.env.R2_BUCKET_NAME);
    
    try {
        const command = new PutBucketCorsCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ['*'],
                        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                        AllowedOrigins: [
                            '*' // On autorise toutes les origines pour l'instant (localhost, vercel, mobile)
                        ],
                        ExposeHeaders: ['ETag'],
                        MaxAgeSeconds: 3600
                    }
                ]
            }
        });

        await s3Client.send(command);
        console.log('✅ Règles CORS configurées avec succès sur Cloudflare R2 !');
    } catch (error) {
        console.error('❌ Erreur lors de la configuration du CORS :', error);
    }
}

fixCors();
