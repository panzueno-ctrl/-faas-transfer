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

// On importe path et fs pour gérer les fichiers temporaires sur le disque
const path = require('path');
const fs = require('fs');

// On  importe uuid pour générer des ids uniques
const { v4: uuidv4 } = require('uuid');

// On importe notre connexion Supabase
const supabase = require('../services/supabase');

// On importe le middleware de validation des fichiers
const validateFile = require('../middlewares/fileHandler');

// On crée le router — c'est lui qui gère les routes de ce fichier
const router = express.Router();

// On configure multer pour stocker les fichiers sur le disque
// Beaucoup plus stable que memoryStorage pour les gros volumes
const storage = multer.diskStorage({
    // Dossier temporaire
    destination: (req, file, cb) => {
        cb(null, '/tmp');
    },
    // Nom unique pour éviter les conflits
    filename: (req, file, cb) => {
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${Date.now()}-${cleanName}`);
    }
});

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

    // On lit le fichier depuis le disque et on l'uploade dans Supabase
    const { data, error } = await supabase.storage
        .from('transfers')
        .upload(fileName, fs.readFileSync(req.file.path), {
            contentType: req.file.mimetype
        });

    console.log('data:', data);
    console.log('error:', error);

    // Si l'upload échoue on retourne une erreur
    if (error) {
        console.log(error);
        return res.status(500).json({ error: 'Erreur lors du stockage du fichier' });
    }

    // On supprime le fichier temporaire du disque après l'upload
    fs.unlinkSync(req.file.path);

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
        console.log('dbError:', dbError);
        return res.status(500).json({ error: 'Erreur lors de la sauvegarde des métadonnées' });
    }
    console.log('Insert réussi, id:', fileId);

    // Tout s'est bien passé — on retourne l'id et le lien de téléchargement
    res.status(201).json({
        id: fileId,
        downloadUrl: `https://faas-transfer-production.up.railway.app/download/${fileId}`
    });

});

// ─────────────────────────────────────────────
// POST /upload-multiple
// Reçoit plusieurs fichiers, les zippe et les stocke dans Supabase
// Retourne un id unique et un lien de téléchargement pour le ZIP
// ─────────────────────────────────────────────
router.post('/multiple', upload.array('files'), async (req, res) => {

    // On vérifie qu'au moins un fichier a été envoyé
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Aucun fichier reçu.' });
    }

    // On importe les modules nécessaires
    const fs = require('fs');
    const path = require('path');
    const { exec } = require('child_process');

    try {
        // Les fichiers sont déjà sur le disque grâce à diskStorage
        // On récupère juste leurs chemins
        const tempFiles = req.files.map(file => file.path);

        // On crée un ZIP avec tous les fichiers
        const zipPath = `/tmp/${Date.now()}-faas-transfer.zip`;
        const fileList = tempFiles.join(' ');

        await new Promise((resolve, reject) => {
            exec(`zip ${zipPath} ${fileList}`, (error) => {
                if (error) reject(error);
                else resolve(true);
            });
        });

        // On génère un id unique pour ce transfert
        const fileId = uuidv4();
        const zipName = `${fileId}-faas-transfer.zip`;

        // On lit le ZIP et on l'uploade dans Supabase Storage
        const zipBuffer = fs.readFileSync(zipPath);
        const { data, error } = await supabase.storage
            .from('transfers')
            .upload(zipName, zipBuffer, {
                contentType: 'application/zip'
            });

        if (error) {
            return res.status(500).json({ message: 'Erreur lors du stockage des fichiers.' });
        }

        // On récupère l'URL publique du ZIP
        const { data: urlData } = supabase.storage
            .from('transfers')
            .getPublicUrl(zipName);

        // On calcule la date d'expiration — 24 heures
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // On sauvegarde les métadonnées dans la table transfers
        const { error: dbError } = await supabase
            .from('transfers')
            .insert({
                id: fileId,
                file_name: `faas-transfer.zip (${req.files.length} fichiers)`,
                file_url: urlData.publicUrl,
                expires_at: expiresAt,
                downloaded: false
            });

        if (dbError) {
            console.log('dbError:', dbError);
            return res.status(500).json({ error: 'Erreur lors de la sauvegarde des métadonnées' });
        }
        console.log('Insert réussi, id:', fileId);

        // On supprime les fichiers temporaires
        tempFiles.forEach(f => fs.unlinkSync(f));
        fs.unlinkSync(zipPath);

        // On retourne l'id et le lien de téléchargement
        res.status(201).json({
            id: fileId,
            downloadUrl: `https://faas-transfer-production.up.railway.app/download/${fileId}`,
            fileCount: req.files.length,
        });

    } catch (error) {
        console.log('Erreur upload multiple:', error);
        return res.status(500).json({ message: 'Une erreur est survenue. Veuillez réessayer.' });
    }

});

// On exporte le router pour l'utiliser dans index.js
module.exports = router;
