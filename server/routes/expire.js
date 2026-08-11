/**
 * routes/expire.js
 *
 * Gère la suppression manuelle des fichiers par le sender.
 * Le sender peut supprimer son fichier avant que quelqu'un
 * ne le télécharge.
 */

const express = require('express');
const supabase = require('../services/supabase');
const { s3Client } = require('../services/r2');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

const router = express.Router();

// DELETE /expire/:id
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { data: transfer, error } = await supabase
            .from('transfers')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !transfer) {
            return res.status(404).json({ message: 'Ce transfert n\'existe plus ou a déjà été supprimé.' });
        }

        if (transfer.downloaded) {
            return res.status(200).json({ message: 'Ce transfert a déjà été téléchargé et supprimé.' });
        }

        // Suppression R2 (Gestion Single et Batch)
        if (transfer.file_url.startsWith('[')) {
            const files = JSON.parse(transfer.file_url);
            for (const file of files) {
                const command = new DeleteObjectCommand({
                    Bucket: process.env.R2_BUCKET_NAME,
                    Key: file.storageName
                });
                await s3Client.send(command).catch(e => console.error('Erreur suppression R2 lot:', e));
            }
        } else {
            const command = new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: transfer.file_url
            });
            await s3Client.send(command).catch(e => console.error('Erreur suppression R2 single:', e));
        }

        // Suppression des métadonnées
        await supabase
            .from('transfers')
            .delete()
            .eq('id', id);

        res.status(200).json({ message: 'Fichiers supprimés avec succès.' });

    } catch (err) {
        console.error('Exception dans /expire:', err);
        res.status(500).json({ message: 'Erreur interne du serveur lors de la suppression' });
    }
});

module.exports = router;