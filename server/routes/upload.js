const express = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../services/supabase');
const { s3Client } = require('../services/r2');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const router = express.Router();

// ─────────────────────────────────────────────
// POST /upload/request-url (Backward Compatibility - Single file)
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
            ContentType: contentType || 'application/octet-stream'
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        res.status(200).json({
            fileId,
            storageName,
            signedUrl
        });
    } catch (err) {
        console.error('Exception dans /request-url R2:', err);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// ─────────────────────────────────────────────
// POST /upload/request-urls (V2 - Batch Upload)
// Génère un ID de lot (batchId) et un ticket R2 pour chaque fichier
// ─────────────────────────────────────────────
router.post('/request-urls', async (req, res) => {
    try {
        const { files } = req.body; // array of { fileName, contentType }
        if (!files || !Array.isArray(files) || files.length === 0) {
            return res.status(400).json({ error: 'files manquant ou invalide' });
        }

        const batchId = uuidv4();
        const uploadTickets = [];

        for (let i = 0; i < files.length; i++) {
            const { fileName, contentType } = files[i];
            const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
            const storageName = `${batchId}-${i}-${cleanName}`;

            const command = new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: storageName,
                ContentType: contentType || 'application/octet-stream'
            });

            const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

            uploadTickets.push({
                originalName: fileName,
                storageName,
                signedUrl
            });
        }

        res.status(200).json({
            batchId,
            uploadTickets
        });
    } catch (err) {
        console.error('Exception dans /request-urls R2:', err);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// ─────────────────────────────────────────────
// POST /upload/confirm (Handles both Single and Batch modes)
// ─────────────────────────────────────────────
router.post('/confirm', async (req, res) => {
    try {
        const { fileId, originalName, storageName, userId, files } = req.body;
        
        // Single file mode fallback vs Batch mode
        if (!fileId) {
            return res.status(400).json({ error: 'fileId manquant' });
        }

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        let insertData = {
            id: fileId,
            expires_at: expiresAt,
            downloaded: false
        };

        if (files && Array.isArray(files) && files.length > 0) {
            // Batch Mode (V2)
            // files is expected to be an array of { originalName, storageName }
            insertData.file_name = `Lot de ${files.length} fichiers`;
            insertData.file_url = JSON.stringify(files); // Astuce: stocker le JSON dans la colonne text existante
        } else if (originalName && storageName) {
            // Single file Mode (V1)
            insertData.file_name = originalName;
            insertData.file_url = storageName;
        } else {
            return res.status(400).json({ error: 'Paramètres de fichier manquants (soit files, soit originalName+storageName)' });
        }

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
