/**
 * services/cleanup.js
 *
 * Job automatique de nettoyage des fichiers expirés.
 * Tourne en arrière plan sur le serveur toutes les heures.
 * Supprime les fichiers qui ont dépassé leur date d'expiration
 * et qui n'ont jamais été téléchargés.
 * Les utilisateurs ne voient pas ce processus.
 */

// On importe node-cron pour planifier le job automatique
const cron = require('node-cron');

// On importe notre connexion Supabase
const supabase = require('./supabase');

// La fonction qui fait le nettoyage
const cleanupExpiredFiles = async () => {

    console.log('🧹 Nettoyage des fichiers expirés...');

    // On cherche tous les fichiers expirés et non téléchargés
    // expires_at < maintenant = fichier expiré
    // downloaded = false = personne n'a téléchargé
    const { data: expiredFiles, error } = await supabase
        .from('transfers')
        .select('*')
        .lt('expires_at', new Date().toISOString())
        .eq('downloaded', false);

    // Si erreur ou aucun fichier expiré trouvé
    if (error || !expiredFiles || expiredFiles.length === 0) {
        console.log('✅ Aucun fichier expiré trouvé.');
        return;
    }

    console.log(`🗑️  ${expiredFiles.length} fichier(s) expiré(s) trouvé(s).`);

    // On traite chaque fichier expiré un par un
    for (const transfer of expiredFiles) {

        // On extrait le nom du fichier depuis l'URL stockée en DB
        const filePath = transfer.file_url.split('/').pop();

        // On supprime le fichier du bucket Supabase Storage
        const { error: storageError } = await supabase.storage
            .from('transfers')
            .remove([filePath]);

        if (storageError) {
            console.log(`❌ Erreur suppression fichier: ${transfer.file_name}`);
            continue; // On passe au fichier suivant si erreur
        }

        // On supprime les métadonnées de la table transfers
        await supabase
            .from('transfers')
            .delete()
            .eq('id', transfer.id);

        console.log(`✅ Fichier supprimé: ${transfer.file_name}`);
    }

    console.log('🧹 Nettoyage terminé.');
};

// On planifie le job — toutes les heures
// "0 * * * *" = à la minute 0 de chaque heure
cron.schedule('0 0 * * *', cleanupExpiredFiles);

// On exporte la fonction pour pouvoir la tester manuellement
module.exports = { cleanupExpiredFiles };