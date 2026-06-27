/**
 * routes/expire.js
 *
 * Gère la suppression manuelle des fichiers par le sender.
 * Le sender peut supprimer son fichier avant que quelqu'un
 * ne le télécharge. Le job automatique utilise aussi cette
 * logique pour nettoyer les fichiers expirés.
 */

// On importe Express pour créer le router
const express = require('express');

// On importe notre connexion Supabase
const supabase = require('../services/supabase');

// On crée le router
const router = express.Router();

// DELETE /expire/:id
// Supprime un fichier manuellement à la demande du sender
router.delete('/:id', async (req, res) => {

    // On récupère l'id depuis l'URL
    const { id } = req.params;

    // On cherche le fichier dans la table transfers
    const { data: transfer, error } = await supabase
        .from('transfers')
        .select('*')
        .eq('id', id)
        .single();

    // Si le fichier n'existe pas → message simple pour l'utilisateur
    if (error || !transfer) {
        return res.status(404).json({
            message: 'Ce fichier n\'existe plus ou a déjà été supprimé.'
        });
    }

    // Si le fichier a déjà été téléchargé → on informe le sender
    if (transfer.downloaded) {
        return res.status(200).json({
            message: 'Ce fichier a déjà été téléchargé et supprimé automatiquement.'
        });
    }

    // On extrait le nom du fichier depuis l'URL stockée en DB
    const filePath = transfer.file_url.split('/').pop();

    // On supprime le fichier du bucket Supabase Storage
    const { error: storageError } = await supabase.storage
        .from('transfers')
        .remove([filePath]);

    // Si la suppression du fichier échoue
    if (storageError) {
        return res.status(500).json({
            message: 'Une erreur est survenue. Veuillez réessayer.'
        });
    }

    // On supprime les métadonnées de la table transfers
    await supabase
        .from('transfers')
        .delete()
        .eq('id', id);

    // Tout s'est bien passé → message de confirmation
    res.status(200).json({
        message: 'Fichier supprimé avec succès.'
    });

});

// On exporte le router pour l'utiliser dans index.js
module.exports = router;