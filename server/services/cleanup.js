/**
 * services/cleanup.js
 *
 * Job automatique de nettoyage des fichiers expirés.
 * Tourne en arrière plan sur le serveur toutes les heures.
 * Supprime les fichiers de Cloudflare R2 qui ont dépassé leur date d'expiration
 * et qui n'ont jamais été téléchargés, puis efface leurs métadonnées.
 */

const cron = require('node-cron');
const supabase = require('./supabase');
const { s3Client } = require('./r2');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const cleanupExpiredFiles = async () => {
    console.log('🧹 Nettoyage des fichiers expirés (Cloudflare R2)...');

    const { data: expiredFiles, error } = await supabase
        .from('transfers')
        .select('*')
        .lt('expires_at', new Date().toISOString())
        .eq('downloaded', false);

    if (error || !expiredFiles || expiredFiles.length === 0) {
        console.log('✅ Aucun fichier expiré trouvé.');
        return;
    }

    console.log(`🗑️  ${expiredFiles.length} fichier(s) expiré(s) trouvé(s).`);

    for (const transfer of expiredFiles) {
        const filePath = transfer.file_url.split('/').pop();

        try {
            // Suppression du bucket R2
            const deleteCmd = new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: filePath
            });
            await s3Client.send(deleteCmd);

            // Suppression des métadonnées de la table transfers
            await supabase
                .from('transfers')
                .delete()
                .eq('id', transfer.id);

            console.log(`✅ Fichier supprimé de R2: ${transfer.file_name}`);
        } catch (err) {
            console.error(`❌ Erreur suppression R2 pour ${transfer.file_name}:`, err);
        }
    }

    console.log('🧹 Nettoyage terminé.');
};

// On planifie le job — toutes les heures (à la minute 0)
cron.schedule('0 * * * *', cleanupExpiredFiles);

module.exports = { cleanupExpiredFiles };