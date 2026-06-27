/**
 * routes/download.js
 *
 * Gère le téléchargement des fichiers.
 * Le receiver arrive avec un id unique → on vérifie en DB
 * → on récupère le fichier depuis Supabase Storage
 * → on l'envoie au receiver → on met à jour le statut
 * → on supprime le fichier après un délai
 */

// On importe Express pour créer le router
const express = require('express');

// On importe notre connexion Supabase
const supabase = require('../services/supabase');

// On crée le router
const router = express.Router();

// GET /download/:id
// Vérifie l'id, récupère et envoie le fichier au receiver
router.get('/:id', async (req, res) => {

    // On récupère l'id depuis l'URL
    const { id } = req.params;

    // On cherche le transfert dans la table transfers
    const { data: transfer, error } = await supabase
        .from('transfers')
        .select('*')
        .eq('id', id)
        .single();

    // Si pas trouvé ou erreur → lien invalide
    if (error || !transfer) {
        return res.status(404).json({ error: 'Lien expiré ou invalide' });
    }

    // On vérifie si le lien n'a pas expiré
    if (new Date() > new Date(transfer.expires_at)) {
        return res.status(410).json({ error: 'Lien expiré' });
    }

    // On télécharge le fichier depuis Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
        .from('transfers')
        .download(transfer.file_url.split('/').pop());

    // Si le fichier n'est pas trouvé dans le storage
    if (downloadError) {
        return res.status(500).json({ error: 'Erreur lors de la récupération du fichier' });
    }

    // On convertit le fichier en buffer pour l'envoyer
    const buffer = Buffer.from(await fileData.arrayBuffer());

    // On envoie le fichier au receiver
    res.setHeader('Content-Disposition', `attachment; filename="${transfer.file_name}"`);
    res.setHeader('Content-Type', fileData.type);
    res.send(buffer);

    // On met downloaded = true dans la table
    await supabase
        .from('transfers')
        .update({ downloaded: true })
        .eq('id', id);

    // On supprime le fichier après 5 secondes
    setTimeout(async () => {
        await supabase.storage
            .from('transfers')
            .remove([transfer.file_url.split('/').pop()]);

        await supabase
            .from('transfers')
            .delete()
            .eq('id', id);
    }, 10000);

});

// On exporte le router
module.exports = router;