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

            if (req.query.zip === 'true') {
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader('Content-Disposition', `attachment; filename="faas-transfer-${id}.zip"`);
                
                const archive = archiver('zip', { store: true });
                
                archive.on('error', (err) => {
                    console.error('Archive error:', err);
                });

                const { Readable } = require('stream');
                archive.pipe(res);

                for (const file of files) {
                    try {
                        const command = new GetObjectCommand({
                            Bucket: process.env.R2_BUCKET_NAME,
                            Key: file.storageName
                        });
                        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
                        
                        const response = await fetch(signedUrl);
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        
                        const nodeStream = Readable.fromWeb(response.body);
                        archive.append(nodeStream, { name: file.originalName });
                        
                        // Attendre que ce fichier soit entièrement ajouté au ZIP avant de passer au suivant
                        await new Promise((resolve, reject) => {
                            nodeStream.on('end', resolve);
                            nodeStream.on('error', reject);
                        });
                    } catch (err) {
                        console.error('Error streaming file to ZIP:', file.originalName, err.message);
                    }
                }
                
                await archive.finalize();
                return;
            }
            
            let html = `
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Télécharger le lot - FaaS Transfer</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #F8FAFC; color: #0F172A; display: flex; flex-direction: column; align-items: center; padding: 40px 20px; margin: 0; }
                    .container { background: #fff; padding: 30px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); max-width: 600px; width: 100%; box-sizing: border-box; }
                    h1 { font-size: 24px; margin-top: 0; color: #1E293B; }
                    p { color: #64748B; line-height: 1.5; margin-bottom: 24px; }
                    .file-list { list-style: none; padding: 0; margin: 0; }
                    .file-item { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid #E2E8F0; gap: 16px; }
                    .file-item:last-child { border-bottom: none; }
                    .file-name { font-weight: 500; font-size: 14px; word-break: break-all; flex: 1; }
                    .btn { background: #3B82F6; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; white-space: nowrap; transition: background 0.2s; }
                    .btn:hover { background: #2563EB; }
                    .btn-zip { background: #10B981; display: block; text-align: center; font-size: 16px; padding: 14px; margin-bottom: 24px; width: 100%; box-sizing: border-box; }
                    .btn-zip:hover { background: #059669; }
                    @media (max-width: 480px) {
                        .file-item { flex-direction: column; align-items: flex-start; gap: 12px; }
                        .btn { width: 100%; text-align: center; box-sizing: border-box; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Vos fichiers sont prêts</h1>
                    <p>Ce transfert contient ${files.length} fichiers. Téléchargez l'archive complète ou choisissez chaque fichier individuellement.</p>
                    
                    <a href="/download/${id}?zip=true" class="btn btn-zip">⬇️ Télécharger tout en .zip</a>
                    
                    <ul class="file-list">
            `;

            for (const file of files) {
                const safeFileName = file.originalName.replace(/"/g, '');
                const command = new GetObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: file.storageName,
                    ResponseContentDisposition: `attachment; filename="${safeFileName}"`
                });
                
                const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
                
                html += `
                    <li class="file-item">
                        <span class="file-name">${file.originalName}</span>
                        <a href="${signedUrl}" class="btn">Télécharger</a>
                    </li>
                `;
            }

            html += `
                    </ul>
                </div>
            </body>
            </html>
            `;
            
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(html);

        } catch (err) {
            console.error('Erreur lors de la génération de la page de lot/zip:', err);
            if (!res.headersSent) {
                res.removeHeader('Content-Type');
                res.removeHeader('Content-Disposition');
                return res.status(500).json({ error: 'Erreur lors de la préparation des liens' });
            }
            return res.end();
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

// NOUVELLE ROUTE : Obtenir les détails et prévisualisations
router.get('/:id/details', async (req, res) => {
    const { id } = req.params;

    try {
        const { data: transfer, error } = await supabase
            .from('transfers')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !transfer) {
            return res.status(404).json({ error: 'Transfert introuvable' });
        }

        let filesList = [];

        if (transfer.file_url.startsWith('[')) {
            const parsedFiles = JSON.parse(transfer.file_url);
            for (const f of parsedFiles) {
                const command = new GetObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: f.storageName
                });
                const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
                filesList.push({
                    name: f.originalName,
                    url: url,
                    isImage: f.originalName.match(/\.(jpeg|jpg|gif|png)$/i) != null,
                    isVideo: f.originalName.match(/\.(mp4|mov|avi)$/i) != null
                });
            }
        } else {
            const command = new GetObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: transfer.file_url
            });
            const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
            filesList.push({
                name: transfer.file_name,
                url: url,
                isImage: transfer.file_name.match(/\.(jpeg|jpg|gif|png)$/i) != null,
                isVideo: transfer.file_name.match(/\.(mp4|mov|avi)$/i) != null
            });
        }

        res.json({
            fileName: transfer.file_name,
            expiresAt: transfer.expires_at,
            files: filesList
        });
    } catch (err) {
        console.error('Erreur details:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;