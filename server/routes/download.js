const express = require('express');
const supabase = require('../services/supabase');
const { s3Client } = require('../services/r2');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

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