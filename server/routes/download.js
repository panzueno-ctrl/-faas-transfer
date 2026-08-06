const express = require('express');
const supabase = require('../services/supabase');
const { s3Client } = require('../services/r2');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const archiver = require('archiver');

const router = express.Router();

router.get('/:id', async (req, res) => {
    const { id } = req.params;

    const { data: transfer, error } = await supabase
        .from('transfers')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !transfer) {
        return res.status(404).json({ error: 'Lien expiré ou invalide' });
    }

    if (new Date() > new Date(transfer.expires_at)) {
        return res.status(410).json({ error: 'Lien expiré' });
    }

    // Le fichier a été consulté, on marque downloaded = true
    await supabase.from('transfers').update({ downloaded: true }).eq('id', id);

    // Rétrocompatibilité : si l'URL commence par http (vieux fichiers Supabase)
    if (transfer.file_url.startsWith('http')) {
        return res.redirect(transfer.file_url);
    }

    // NOUVEAU: Si file_url est un JSON, c'est un lot (Batch Upload V2)
    if (transfer.file_url.startsWith('[')) {
        try {
            const files = JSON.parse(transfer.file_url);
            
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="FaaS-Transfer-Lot-${id.substring(0, 5)}.zip"`);

            const archive = archiver('zip', {
                zlib: { level: 5 } // Niveau de compression équilibré
            });

            archive.on('error', function(err) {
                console.error('Erreur Archiver:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: err.message });
                }
            });

            // On branche l'archive directement sur la réponse HTTP
            archive.pipe(res);

            // On ajoute chaque fichier au stream de l'archive
            for (const file of files) {
                const command = new GetObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: file.storageName
                });
                
                const response = await s3Client.send(command);
                // response.Body est un ReadableStream
                archive.append(response.Body, { name: file.originalName });
            }

            // Finalise l'archive (ferme le flux Zip)
            await archive.finalize();
            return;
        } catch (err) {
            console.error('Erreur lors du streaming ZIP:', err);
            if (!res.headersSent) {
                return res.status(500).json({ error: 'Erreur lors de la création du ZIP' });
            }
            return;
        }
    }

    // ANCIEN: Mode Fichier Unique
    try {
        const safeFileName = transfer.file_name.split('(')[0].trim();
        
        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: transfer.file_url, // Contient le storageName généré par upload.js
            ResponseContentDisposition: `attachment; filename="${safeFileName}"`
        });

        // Génère un lien de téléchargement direct R2 valide pendant 1 heure
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        
        // Redirection 302 vers le CDN ultra-rapide de Cloudflare
        res.redirect(signedUrl);

    } catch (err) {
        console.error('Erreur génération lien R2:', err);
        return res.status(500).json({ error: 'Erreur lors de la récupération du fichier' });
    }
});

module.exports = router;