const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../services/supabase');
const { s3Client } = require('../services/r2');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Upload } = require('@aws-sdk/lib-storage');
const validateFile = require('../middlewares/fileHandler');

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, '/tmp');
    },
    filename: (req, file, cb) => {
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${Date.now()}-${cleanName}`);
    }
});
const upload = multer({ storage });

// ─────────────────────────────────────────────
// POST /upload/multiple
// Reçoit plusieurs fichiers, les zippe et les stocke dans Cloudflare R2
// ─────────────────────────────────────────────
router.post('/multiple', upload.array('files'), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Aucun fichier reçu.' });
    }

    const { exec } = require('child_process');

    try {
        const tempFiles = req.files.map(file => file.path);
        const zipPath = `/tmp/${Date.now()}-faas-transfer.zip`;
        const fileList = tempFiles.map(f => `"${f}"`).join(' ');

        await new Promise((resolve, reject) => {
            exec(`zip -j "${zipPath}" ${fileList}`, (error) => {
                if (error) reject(error);
                else resolve(true);
            });
        });

        const fileId = uuidv4();
        const zipName = `${fileId}-faas-transfer.zip`;

        const fileStream = fs.createReadStream(zipPath);

        // Upload stream vers Cloudflare R2
        const parallelUpload = new Upload({
            client: s3Client,
            params: {
                Bucket: process.env.R2_BUCKET_NAME,
                Key: zipName,
                Body: fileStream,
                ContentType: 'application/zip'
            },
        });

        await parallelUpload.done();

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // On sauvegarde `zipName` au lieu d'une URL publique
        const insertData = {
            id: fileId,
            file_name: `Archive de ${req.files.length} fichiers.zip`,
            file_url: zipName, 
            expires_at: expiresAt,
            downloaded: false
        };

        if (req.body.userId) {
            insertData.user_id = req.body.userId;
        }

        const { error: dbError } = await supabase
            .from('transfers')
            .insert(insertData);

        if (dbError) {
            return res.status(500).json({ error: 'Erreur lors de la sauvegarde des métadonnées' });
        }

        tempFiles.forEach(f => fs.unlinkSync(f));
        fs.unlinkSync(zipPath);

        res.status(201).json({
            id: fileId,
            downloadUrl: `https://faas-transfer.onrender.com/download/${fileId}`,
            fileCount: req.files.length,
        });

    } catch (error) {
        console.log('Erreur upload multiple R2:', error);
        return res.status(500).json({ message: 'Une erreur est survenue.' });
    }
});

// ─────────────────────────────────────────────
// POST /upload/request-url
// Génère un ticket sécurisé (Signed URL) R2 pour uploader directement
// ─────────────────────────────────────────────
router.post('/request-url', async (req, res) => {
    try {
        const { fileName, contentType } = req.body;
        if (!fileName) {
            return res.status(400).json({ error: 'fileName manquant' });
        }

        const fileId = uuidv4();
        const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storageName = `${fileId}-${cleanName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: storageName,
            ContentType: contentType
        });

        // URL pré-signée valable 3600 secondes (1 heure)
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        res.status(200).json({
            fileId,
            storageName,
            signedUrl: signedUrl
        });
    } catch (err) {
        console.error('Exception dans /request-url R2:', err);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// ─────────────────────────────────────────────
// POST /upload/confirm
// ─────────────────────────────────────────────
router.post('/confirm', async (req, res) => {
    try {
        const { fileId, originalName, storageName, userId } = req.body;
        
        if (!fileId || !originalName || !storageName) {
            return res.status(400).json({ error: 'Paramètres manquants' });
        }
        
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // On sauvegarde storageName dans file_url, download.js gèrera la redirection R2
        const insertData = {
            id: fileId,
            file_name: originalName,
            file_url: storageName,
            expires_at: expiresAt,
            downloaded: false
        };

        if (userId) {
            insertData.user_id = userId;
        }

        const { error: dbError } = await supabase
            .from('transfers')
            .insert(insertData);

        if (dbError) {
            console.error('Erreur insertion confirm:', dbError);
            return res.status(500).json({ error: 'Erreur lors de la sauvegarde des métadonnées' });
        }

        res.status(201).json({
            id: fileId,
            downloadUrl: `https://faas-transfer.onrender.com/download/${fileId}`
        });
    } catch (err) {
        console.error('Exception dans /confirm R2:', err);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

module.exports = router;
