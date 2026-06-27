/**
 * routes/upload.js
 * 
 * Gère la réception et le stockage des fichiers uploadés.
 * Le client envoie un fichier → on le stocke dans Supabase Storage
 * → on sauvegarde les métadonnées dans la table transfers
 * → on retourne un id unique et un lien de téléchargement.
 */




// On importe Express pour créer le router
const express = require('express');

// On importe multer pour gérer la réception des fichiers
const multer = require('multer');

// On  importe uuid pour générer des ids uniques
const { v4: uuidv4 } = require('uuid');

// On importe notre connexion Supabase
const supabase = require('../services/supabase');

// On importe le middleware de validation des fichiers
const validateFile = require('../middlewares/fileHandler');

// On crée le router — c'est lui qui gère les routes de ce fichier
const router = express.Router();

// On configure multer pour stocker le fichier en mémoire temporairement
// avant de l'envoyer vers Supabase
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /upload
// Reçoit le fichier, le stocke dans Supabase, retourne un lien
router.post('/', upload.single('file'), validateFile, async (req, res) => {

    // On vérifie qu'un fichier a bien été envoyé
    if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier reçu' });
    }

    // On génère un nom unique pour le fichier
    // pour éviter les conflits si deux fichiers ont le même nom
    const fileId = uuidv4();
    const fileName = `${fileId}-${req.file.originalname}`;

    // On uploade le fichier dans le bucket "transfers" de Supabase
    const { data, error } = await supabase.storage
        .from('transfers')
        .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype
        });

    console.log('data:', data);
    console.log('error:', error);

    // Si l'upload échoue on retourne une erreur
    if (error) {
        console.log(error);
        return res.status(500).json({ error: 'Erreur lors du stockage du fichier' });
    }

    // On récupère l'URL publique du fichier dans Supabase
    const { data: urlData } = supabase.storage
        .from('transfers')
        .getPublicUrl(fileName);

    // On calcule la date d'expiration — 24 heures à partir de maintenant
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // On sauvegarde les métadonnées dans la table transfers
    const { error: dbError } = await supabase
        .from('transfers')
        .insert({
            id: fileId,
            file_name: req.file.originalname,
            file_url: urlData.publicUrl,
            expires_at: expiresAt,
            downloaded: false
        });

    // Si la sauvegarde en DB échoue on retourne une erreur
    if (dbError) {
        console.log('dbError:', dbError)
        return res.status(500).json({ error: 'Erreur lors de la sauvegarde des métadonnées' });
    }

    // Tout s'est bien passé — on retourne l'id et le lien de téléchargement
    res.status(201).json({
        id: fileId,
        downloadUrl: `${req.protocol}://${req.get('host')}/download/${fileId}`
    });

});

// On exporte le router pour l'utiliser dans index.js
module.exports = router;